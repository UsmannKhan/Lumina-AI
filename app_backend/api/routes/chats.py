from typing import List, Optional
from fastapi import HTTPException, Depends, UploadFile, File, Form, Request
from fastapi.responses import RedirectResponse
from ..rate_limit import limiter
from sqlalchemy.orm import Session 
from starlette import status
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
import requests
import json
import os
import fitz  # PyMuPDF
import uuid
import io
import tempfile
from docx import Document
from supabase import create_client, Client
import cloudmersive_convert_api_client
from cloudmersive_convert_api_client.rest import ApiException

# Supabase Storage client
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # Use service key for storage operations
PDF_BUCKET = "pdfs"  # Bucket name in Supabase Storage

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

# Cloudmersive API client for document conversion
CLOUDMERSIVE_API_KEY = os.getenv("CLOUDMERSIVE_API_KEY")
cloudmersive_config = None
if CLOUDMERSIVE_API_KEY:
    cloudmersive_config = cloudmersive_convert_api_client.Configuration()
    cloudmersive_config.api_key['Apikey'] = CLOUDMERSIVE_API_KEY

router = APIRouter(
    prefix='/chats',
    tags=['Chats']
)

# RapidAPI credentials
RAPIDAPI_KEY = os.getenv("RAPIDAPI_KEY")
RAPIDAPI_HOST = os.getenv("RAPIDAPI_HOST")

# Prompts
NOTES_PROMPT = """Analyze this YouTube video transcript and provide comprehensive, detailed, and well-structured notes.

## Instructions:
1. Start with a **Summary**
2. List the **Key Takeaways** (main points the viewer should remember)
3. Provide **Detailed Notes** organized by topic/section
4. Include any **Action Items** or practical tips mentioned
5. Note any **Resources/Links** mentioned (if any). This DOES NOT include unrelated sponsors of the video.
6. DO NOT include any sponsors, promotional content, patreon links, or unrelated information in any section.
7. End with a **Key Concepts** section listing all the main topics/concepts covered

## Formatting:
- Use clear headings
- Keep it scannable and easy to read
- Highlight important terms or concepts in bold
- Do not start your response with opening phrases like "Here are comprehensive, well-structured notes from the YouTube video transcript:"
- For the Key Concepts section, use this EXACT format for each concept on its own line:
  - **ConceptName** (MM:SS - MM:SS): Brief one-line description
- IMPORTANT: Each concept MUST start with `- **` (dash, space, double asterisk). Do NOT use `*` bullet points.

## Transcript (with timestamps):
{timed_transcript}
"""


def get_video_title(video_url: str) -> str:
    """Get video title using YouTube oEmbed API (free, no API key needed)"""
    try:
        oembed_url = f"https://www.youtube.com/oembed?url={video_url}&format=json"
        response = requests.get(oembed_url, timeout=5)
        if response.status_code == 200:
            return response.json().get("title", "Untitled Video")
    except Exception as e:
        print(f"Failed to get video title via oEmbed: {e}")
    return "Untitled Video"


def parse_key_concepts(notes: str) -> list:
    """
    Parse key concepts from the notes.
    Expected format: - **[Concept Title]** (MM:SS - MM:SS): Brief description
    """
    import re
    
    concepts = []
    
    print(f"\n=== DEBUG: Parsing key concepts ===")
    print(f"Notes length: {len(notes)}")
    
    # Look for the Key Concepts section
    key_concepts_match = re.search(r'##\s*Key Concepts.*?(?=##|\Z)', notes, re.DOTALL | re.IGNORECASE)
    if not key_concepts_match:
        print("DEBUG: No '## Key Concepts' section found in notes")
        # Try alternative patterns
        alt_match = re.search(r'\*\*Key Concepts\*\*.*?(?=\*\*[A-Z]|\Z)', notes, re.DOTALL | re.IGNORECASE)
        if alt_match:
            print(f"DEBUG: Found alt pattern '**Key Concepts**': {alt_match.group()[:200]}...")
        return concepts
    
    key_concepts_section = key_concepts_match.group()
    print(f"DEBUG: Found Key Concepts section ({len(key_concepts_section)} chars):")
    print(key_concepts_section[:500])
    
    # PATTERN 1: YouTube format with timestamps
    # Format: - **ConceptName** (MM:SS - MM:SS): Description
    # Handles both - and * list markers for robustness
    timestamp_pattern = r'(?:[-*]\s*)\*\*([^*]+)\*\*\s*\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)\s*:\s*(.+?)(?=\n\s*[-*]\s*\*\*|\n\n|\Z)'
    matches = re.findall(timestamp_pattern, key_concepts_section, re.DOTALL)
    print(f"DEBUG: Found {len(matches)} matches with timestamp pattern (YouTube)")
    
    if matches:
        # Convert MM:SS to seconds helper
        def time_to_seconds(time_str):
            parts = time_str.strip().split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            return 0
        
        for title, start_str, end_str, description in matches:
            concepts.append({
                'title': title.strip(),
                'description': description.strip(),
                'start_time': time_to_seconds(start_str),
                'end_time': time_to_seconds(end_str),
                'importance': 2
            })
            print(f"DEBUG: Extracted concept (YouTube): {title.strip()}")
    else:
        # PATTERN 2: PDF format without timestamps
        # Format: - **ConceptName**: Description
        no_timestamp_pattern = r'(?:[-*]\s*)\*\*([^*]+)\*\*\s*:\s*(.+?)(?=\n\s*[-*]\s*\*\*|\n\n|\Z)'
        no_ts_matches = re.findall(no_timestamp_pattern, key_concepts_section, re.DOTALL)
        print(f"DEBUG: Found {len(no_ts_matches)} matches with no-timestamp pattern (PDF)")
        
        for title, description in no_ts_matches:
            concepts.append({
                'title': title.strip(),
                'description': description.strip(),
                'start_time': None,
                'end_time': None,
                'importance': 2
            })
            print(f"DEBUG: Extracted concept (PDF): {title.strip()}")
    
    print(f"=== DEBUG: Parsed {len(concepts)} concepts ===\n")
    return concepts


def get_videoid(url):
    if '=' in url:
        parts = url.split('=')
        if len(parts) > 1:
            video_id = parts[1]
            if '&' in video_id:
                video_id = video_id.split('&')[0]
            return video_id
    return ""



def get_transcript_data(video_url: str) -> dict:
    """Get transcript with timestamps using RapidAPI YouTube Transcript service"""
    url = "https://youtube-transcripts.p.rapidapi.com/youtube/transcript"
    
    querystring = {
        "url": video_url,
        "text": "false"  # Get segments with timing data
    }
    
    headers = {
        "x-rapidapi-key": RAPIDAPI_KEY,
        "x-rapidapi-host": RAPIDAPI_HOST
    }
    
    response = requests.get(url, headers=headers, params=querystring)
    
    if response.status_code == 429:
        raise HTTPException(status_code=429, detail="Rate limit reached. Please try again later.")
    
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch transcript: {response.text}")
    
    data = response.json()
    
    print("Transcript API response structure:", type(data), "content" in data if isinstance(data, dict) else "N/A")
    
    if "content" in data and isinstance(data["content"], list):
        segments = data["content"]
        
        # Plain text for AI processing
        plain_text = " ".join(segment.get("text", "") for segment in segments)
        
        # Timed segments for interactive display (convert ms to seconds)
        timed_segments = []
        for segment in segments:
            timed_segments.append({
                "text": segment.get("text", ""),
                "start": segment.get("offset", 0) / 1000,  # ms to seconds
                "duration": segment.get("duration", 0) / 1000  # ms to seconds
            })
        
        return {
            "plain_text": plain_text,
            "timed_segments": timed_segments
        }
    
    # Fallback for plain text response
    if "content" in data and isinstance(data["content"], str):
        return {
            "plain_text": data["content"],
            "timed_segments": []
        }
    
    if isinstance(data, str):
        return {
            "plain_text": data,
            "timed_segments": []
        }
    
    raise HTTPException(status_code=500, detail="Unexpected response format from transcript API")


@router.post("/")
@limiter.limit("5/hour")  # Expensive: fetches transcript + generates notes
@limiter.limit("20/day")  # Daily cap to prevent abuse
def create_chat(request: Request, chat: schemas.CreateChat, user: user_dependency, db: Session = Depends(get_db)):
    video_id = get_videoid(chat.youtube_link)

    print("Video ID:", video_id)

    transcript_data = get_transcript_data(chat.youtube_link)
    plain_text = transcript_data["plain_text"]
    timed_segments = transcript_data["timed_segments"]

    print("Transcript length:", len(plain_text))
    print("Timed segments count:", len(timed_segments))

    # Format timed transcript for AI with timestamps
    def format_timed_transcript(segments):
        """Format segments as: [MM:SS] text"""
        formatted = []
        for seg in segments:
            start = seg.get('start', 0)
            mins = int(start // 60)
            secs = int(start % 60)
            formatted.append(f"[{mins:02d}:{secs:02d}] {seg.get('text', '')}")
        return "\n".join(formatted)
    
    timed_transcript_text = format_timed_transcript(timed_segments) if timed_segments else plain_text

    # Generate notes with improved prompt (using timed transcript)
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=NOTES_PROMPT.format(timed_transcript=timed_transcript_text),
    )
    notes = response.text
    
    # Get video title using YouTube oEmbed (fast, no LLM needed)
    session_name = get_video_title(chat.youtube_link)

    new_chat = models.Chat(
        source_type="youtube",
        source_id=video_id,
        source_url=chat.youtube_link,
        source_content=plain_text,
        timed_content=json.dumps(timed_segments) if timed_segments else None,
        prompt=NOTES_PROMPT.format(timed_transcript="[transcript]"),
        notes=notes,
        user_id=user['id'],
        space_id=chat.space_id,  # Optional space assignment
        session_name=session_name
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    # Parse and save key concepts from notes
    concepts_data = parse_key_concepts(notes)
    saved_concepts = []
    for concept in concepts_data:
        key_concept = models.KeyConcept(
            chat_id=new_chat.id,
            title=concept['title'],
            description=concept['description'],
            start_time=concept['start_time'],
            end_time=concept['end_time'],
            importance=concept['importance']
        )
        db.add(key_concept)
        saved_concepts.append({
            'title': concept['title'],
            'description': concept['description'],
            'start_time': concept['start_time'],
            'end_time': concept['end_time']
        })
    
    if concepts_data:
        db.commit()
        print(f"Saved {len(concepts_data)} key concepts")
    
    return {
        "id": new_chat.id,
        "video_id": video_id,
        "notes": notes,
        "transcript": plain_text,
        "transcript_timed": timed_segments,
        "session_name": session_name,
        "key_concepts": saved_concepts
    }


# PDF Notes Prompt
PDF_NOTES_PROMPT = """Analyze this PDF document and provide comprehensive, detailed, and well-structured notes.

## Instructions:
1. Start with a **Summary** of the document
2. List the **Key Takeaways** (main points the reader should remember)
3. Provide **Detailed Notes** organized by topic/section
4. Include any **Action Items** or practical tips mentioned
5. Note any **Important Definitions** or terminology
6. End with a **Key Concepts** section listing all the main topics/concepts covered

## Formatting:
- Use clear headings
- Keep it scannable and easy to read
- Highlight important terms or concepts in bold
- Do not start your response with opening phrases like "Here are comprehensive notes:"
- For the Key Concepts section, use this EXACT format for each concept on its own line:
  - **ConceptName**: Brief one-line description
- IMPORTANT: Each concept MUST start with `- **` (dash, space, double asterisk). Do NOT use `*` bullet points.

## Document Content:
{content}
"""


def extract_pdf_text(pdf_bytes: bytes) -> str:
    """Extract text from PDF using PyMuPDF"""
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    text_parts = []
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        text = page.get_text()
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} ---\n{text}")
    
    doc.close()
    return "\n\n".join(text_parts)


# Allowed file extensions for document uploads
ALLOWED_FILE_EXTENSIONS = {'.pdf', '.txt', '.docx', '.pptx'}


def convert_docx_to_pdf(file_bytes: bytes, filename: str) -> bytes:
    """Convert DOCX to PDF using Cloudmersive API"""
    if not cloudmersive_config:
        raise Exception("Cloudmersive API key not configured")
    
    api_client = cloudmersive_convert_api_client.ApiClient(cloudmersive_config)
    api_instance = cloudmersive_convert_api_client.ConvertDocumentApi(api_client)
    
    # Write to temp file (Cloudmersive requires file path)
    with tempfile.NamedTemporaryFile(delete=False, suffix='.docx') as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    
    try:
        result = api_instance.convert_document_docx_to_pdf(tmp_path)
        # Result is a file path or bytes
        if isinstance(result, str):
            with open(result, 'rb') as f:
                return f.read()
        return result
    finally:
        os.unlink(tmp_path)


def convert_pptx_to_pdf(file_bytes: bytes, filename: str) -> bytes:
    """Convert PPTX to PDF using Cloudmersive API"""
    if not cloudmersive_config:
        raise Exception("Cloudmersive API key not configured")
    
    api_client = cloudmersive_convert_api_client.ApiClient(cloudmersive_config)
    api_instance = cloudmersive_convert_api_client.ConvertDocumentApi(api_client)
    
    with tempfile.NamedTemporaryFile(delete=False, suffix='.pptx') as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name
    
    try:
        result = api_instance.convert_document_pptx_to_pdf(tmp_path)
        
        # Handle different response types
        if isinstance(result, bytes):
            return result
        elif isinstance(result, str):
            if os.path.exists(result):
                with open(result, 'rb') as f:
                    return f.read()
            # Try encoding as bytes
            return result.encode('latin-1')
        elif hasattr(result, 'read'):
            return result.read()
        else:
            raise Exception(f"Unknown result type: {type(result)}")
    finally:
        os.unlink(tmp_path)

@router.post("/pdf")  # Keep endpoint path for backwards compatibility
@limiter.limit("5/hour")  # Expensive: processes file + generates notes
@limiter.limit("20/day")  # Daily cap to prevent abuse
def create_chat_from_file(
    request: Request,
    user: user_dependency,
    db: Session = Depends(get_db),
    file: UploadFile = File(...),
    space_id: Optional[str] = Form(None),
):
    """Create a new chat from an uploaded file (PDF or TXT)"""
    
    # Convert space_id from string to int if provided
    space_id_int: Optional[int] = None
    if space_id and space_id.strip():
        try:
            space_id_int = int(space_id)
        except ValueError:
            pass
    
    # Get file extension
    filename = file.filename or ""
    ext = ('.' + filename.lower().rsplit('.', 1)[-1]) if '.' in filename else ''
    
    # Validate file type
    if ext not in ALLOWED_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_FILE_EXTENSIONS)}"
        )
    
    # Read file content
    file_bytes = file.file.read()
    
    # Check file size (max 5MB)
    if len(file_bytes) > 5 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large. Maximum size is 5MB"
        )
    
    # Extract text based on file type
    if ext == '.pdf':
        try:
            file_text = extract_pdf_text(file_bytes)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to extract text from PDF: {str(e)}"
            )
        source_type = "pdf"
    elif ext == '.txt':
        try:
            file_text = file_bytes.decode('utf-8', errors='ignore')
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to read text file: {str(e)}"
            )
        source_type = "txt"
    elif ext == '.docx':
        # Convert DOCX to PDF using Cloudmersive
        try:
            pdf_bytes = convert_docx_to_pdf(file_bytes, filename)
            file_text = extract_pdf_text(pdf_bytes)
            file_bytes = pdf_bytes  # Use converted PDF for storage
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to convert DOCX to PDF: {str(e)}"
            )
        source_type = "pdf"  # Stored as PDF
    elif ext == '.pptx':
        # Convert PPTX to PDF using Cloudmersive
        try:
            pdf_bytes = convert_pptx_to_pdf(file_bytes, filename)
            file_text = extract_pdf_text(pdf_bytes)
            file_bytes = pdf_bytes  # Use converted PDF for storage
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to convert PPTX to PDF: {str(e)}"
            )
        source_type = "pdf"  # Stored as PDF
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type")
    
    if not file_text.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No text could be extracted from the file."
        )
    
    # Truncate if too long for the AI (keep first ~100k chars)
    content_for_ai = file_text[:100000]
    
    # Generate notes using AI
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=PDF_NOTES_PROMPT.format(content=content_for_ai),
        )
        notes = response.text
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate notes: {str(e)}"
        )
    
    # Use filename as session name (without extension)
    session_name = filename.rsplit('.', 1)[0] if filename else "Untitled File"
    
    # For PDFs, upload to Supabase Storage for viewer
    # For TXT, we just store the text content (no need for storage)
    source_id = None
    if source_type == "pdf":
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Storage not configured"
            )
        
        pdf_id = str(uuid.uuid4())
        try:
            storage_path = f"{user['id']}/{pdf_id}.pdf"
            supabase.storage.from_(PDF_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/pdf"}
            )
            source_id = pdf_id
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload PDF: {str(e)}"
            )
    elif source_type == "docx":
        if not supabase:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Storage not configured"
            )
        
        docx_id = str(uuid.uuid4())
        try:
            storage_path = f"{user['id']}/{docx_id}.docx"
            supabase.storage.from_(PDF_BUCKET).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
            )
            source_id = docx_id
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload DOCX: {str(e)}"
            )
    
    # Create chat record
    new_chat = models.Chat(
        source_type=source_type,
        source_id=source_id,  # UUID for PDFs, None for TXT
        source_url=None,
        source_content=file_text,
        timed_content=None,
        prompt=PDF_NOTES_PROMPT.format(content="[document content]"),
        notes=notes,
        user_id=user['id'],
        space_id=space_id_int,
        session_name=session_name
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    # Parse and save key concepts from notes
    concepts_data = parse_key_concepts(notes)
    saved_concepts = []
    for concept in concepts_data:
        key_concept = models.KeyConcept(
            chat_id=new_chat.id,
            title=concept['title'],
            description=concept['description'],
            start_time=None,  # No timestamps for documents
            end_time=None,
            importance=concept['importance']
        )
        db.add(key_concept)
        saved_concepts.append({
            'title': concept['title'],
            'description': concept['description']
        })
    
    if concepts_data:
        db.commit()
    
    return {
        "id": new_chat.id,
        "notes": notes,
        "content": file_text,
        "session_name": session_name,
        "source_type": source_type,
        "key_concepts": saved_concepts
    }


@router.get("/{chat_id}/pdf")
def get_chat_pdf(chat_id: int, db: Session = Depends(get_db), token: Optional[str] = None):
    """Redirect to Supabase signed URL for PDF (accepts token via query param for embedding)"""
    try:
        from ..config import SECRET_KEY, ALGORITHM
        from jose import jwt, JWTError
        
        # Verify token from query param
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: int = payload.get('id')
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        chat = db.query(models.Chat).filter(
            models.Chat.id == chat_id,
            models.Chat.user_id == user_id
        ).first()
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if chat.source_type != "pdf" or not chat.source_id:
            raise HTTPException(status_code=404, detail="No PDF associated with this chat")
        
        if not supabase:
            raise HTTPException(status_code=500, detail="Storage not configured")
        
        # Generate signed URL (valid for 1 hour)
        storage_path = f"{user_id}/{chat.source_id}.pdf"
        try:
            result = supabase.storage.from_(PDF_BUCKET).create_signed_url(storage_path, 3600)
            signed_url = result.get("signedURL") or result.get("signedUrl")
            if not signed_url:
                raise HTTPException(status_code=404, detail="PDF file not found in storage")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get PDF: {str(e)}")
        
        # Redirect to the signed URL
        return RedirectResponse(url=signed_url)
    except Exception as e:
        import traceback
        traceback.print_exc()  # prints full error to terminal
        raise


@router.get("/{chat_id}/docx")
def get_chat_docx(chat_id: int, db: Session = Depends(get_db), token: Optional[str] = None):
    """Redirect to Supabase signed URL for DOCX (accepts token via query param for embedding)"""
    try:
        from ..config import SECRET_KEY, ALGORITHM
        from jose import jwt, JWTError
        
        # Verify token from query param
        if not token:
            raise HTTPException(status_code=401, detail="Not authenticated")
        
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id: int = payload.get('id')
            if user_id is None:
                raise HTTPException(status_code=401, detail="Invalid token")
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        chat = db.query(models.Chat).filter(
            models.Chat.id == chat_id,
            models.Chat.user_id == user_id
        ).first()
        
        if not chat:
            raise HTTPException(status_code=404, detail="Chat not found")
        
        if chat.source_type != "docx" or not chat.source_id:
            raise HTTPException(status_code=404, detail="No DOCX associated with this chat")
        
        if not supabase:
            raise HTTPException(status_code=500, detail="Storage not configured")
        
        # Generate signed URL (valid for 1 hour)
        storage_path = f"{user_id}/{chat.source_id}.docx"
        try:
            result = supabase.storage.from_(PDF_BUCKET).create_signed_url(storage_path, 3600)
            signed_url = result.get("signedURL") or result.get("signedUrl")
            if not signed_url:
                raise HTTPException(status_code=404, detail="DOCX file not found in storage")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to get DOCX: {str(e)}")
        
        # Redirect to the signed URL
        return RedirectResponse(url=signed_url)
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise

@router.get("/", response_model=List[schemas.ChatOut])
def get_user_chats(user: user_dependency, db: Session = Depends(get_db)):
    chats = db.query(models.Chat).filter(models.Chat.user_id == user['id']).all()
    return chats


@router.delete("/{chat_id}")
def delete_user_chat(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Delete PDF from Supabase storage if this is a PDF chat
    if chat.source_type == "pdf" and chat.source_id and supabase:
        try:
            storage_path = f"{user['id']}/{chat.source_id}.pdf"
            supabase.storage.from_(PDF_BUCKET).remove([storage_path])
        except Exception as e:
            # Log error but continue with deletion
            print(f"Warning: Failed to delete PDF from storage: {e}")
    
    # Delete all messages associated with this chat
    db.query(models.Message).filter(
        models.Message.chat_id == chat_id
    ).delete()

    # Delete all flashcards associated with this chat
    db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == chat_id
    ).delete()
    
    # Delete all key concepts associated with this chat
    db.query(models.KeyConcept).filter(
        models.KeyConcept.chat_id == chat_id
    ).delete()
    
    # Delete all quizzes and their questions
    quizzes = db.query(models.Quiz).filter(models.Quiz.chat_id == chat_id).all()
    for quiz in quizzes:
        db.query(models.QuizQuestion).filter(
            models.QuizQuestion.quiz_id == quiz.id
        ).delete()
    db.query(models.Quiz).filter(models.Quiz.chat_id == chat_id).delete()
    
    # Delete all coding problems and their submissions
    problems = db.query(models.CodingProblem).filter(models.CodingProblem.chat_id == chat_id).all()
    for problem in problems:
        db.query(models.CodingSubmission).filter(
            models.CodingSubmission.problem_id == problem.id
        ).delete()
    db.query(models.CodingProblem).filter(models.CodingProblem.chat_id == chat_id).delete()
    
    # Delete the chat
    db.delete(chat)
    db.commit()
    
    return {"message": "Chat deleted successfully"}


@router.get("/{chat_id}/concepts")
def get_chat_concepts(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get all key concepts for a chat"""
    # Verify ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    concepts = db.query(models.KeyConcept).filter(
        models.KeyConcept.chat_id == chat_id
    ).order_by(models.KeyConcept.start_time).all()
    
    return [
        {
            "id": c.id,
            "title": c.title,
            "description": c.description,
            "start_time": c.start_time,
            "end_time": c.end_time,
            "importance": c.importance
        }
        for c in concepts
    ]


@router.put("/{chat_id}/style")
def update_chat_style(chat_id: int, request: schemas.ChatStyleUpdate, user: user_dependency, db: Session = Depends(get_db)):
    """Update the chat style and custom instructions for a chat."""
    # Verify ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Validate style
    valid_styles = ["study", "conversational", "concise", "custom"]
    if request.style not in valid_styles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid style. Must be one of: {', '.join(valid_styles)}"
        )
    
    # Update chat
    chat.chat_style = request.style
    if request.style == "custom":
        chat.custom_instructions = request.custom_instructions
    else:
        chat.custom_instructions = None
    
    db.commit()
    
    return {
        "message": "Chat style updated",
        "chat_id": chat_id,
        "style": chat.chat_style,
        "custom_instructions": chat.custom_instructions
    }


@router.put("/{chat_id}/manual-notes")
def update_manual_notes(chat_id: int, request: schemas.ManualNotesRequest, user: user_dependency, db: Session = Depends(get_db)):
    """Update the user's manual notes for a chat."""
    # Verify ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat not found"
        )
    
    # Update manual notes
    chat.manual_notes = request.content
    db.commit()
    
    return {
        "message": "Manual notes saved",
        "chat_id": chat_id,
        "manual_notes": chat.manual_notes
    }
