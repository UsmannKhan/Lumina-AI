from typing import List
from fastapi import HTTPException, Depends
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
- For the Key Concepts section, use this EXACT format for each concept:
  - **[Concept Title]** (MM:SS - MM:SS): Brief one-line description

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
    
    # Pattern: Handles both:
    # - **Title** (MM:SS - MM:SS): Description  (dash list)
    # *   **Title** (MM:SS - MM:SS): Description  (asterisk list)
    # The key is matching **Title** followed by timestamp and description
    pattern = r'(?:[-*]\s*)\*\*([^*]+)\*\*\s*\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)\s*:\s*(.+?)(?=\n\s*[-*]\s*\*\*|\n\n|\Z)'
    
    matches = re.findall(pattern, key_concepts_section, re.DOTALL)
    print(f"DEBUG: Found {len(matches)} matches with primary pattern")
    
    if not matches:
        # Fallback: Even more flexible pattern for edge cases
        alt_pattern = r'\*\*([^*]+)\*\*\s*\((\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\)\s*:\s*(.+?)(?=\n.*?\*\*|\n\n|\Z)'
        matches = re.findall(alt_pattern, key_concepts_section, re.DOTALL)
        print(f"DEBUG: Found {len(matches)} matches with alt pattern")
    
    for match in matches:
        title, start_str, end_str, description = match
        
        # Convert MM:SS to seconds
        def time_to_seconds(time_str):
            parts = time_str.strip().split(':')
            if len(parts) == 2:
                return int(parts[0]) * 60 + int(parts[1])
            return 0
        
        concepts.append({
            'title': title.strip(),
            'description': description.strip(),
            'start_time': time_to_seconds(start_str),
            'end_time': time_to_seconds(end_str),
            'importance': 2  # Default importance
        })
        print(f"DEBUG: Extracted concept: {title.strip()}")
    
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
def create_chat(chat: schemas.CreateChat, user: user_dependency, db: Session = Depends(get_db)):
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
        youtube_id=video_id,
        youtube_transcript=plain_text,
        youtube_transcript_timed=json.dumps(timed_segments) if timed_segments else None,
        prompt=NOTES_PROMPT.format(timed_transcript="[transcript]"),
        notes=notes,
        user_id=user['id'],
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

