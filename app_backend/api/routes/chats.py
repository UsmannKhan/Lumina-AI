# from typing import List
# from fastapi import HTTPException, Depends
# from sqlalchemy.orm import Session 
# from starlette import status
# from .. import models
# from .. import schemas
# from fastapi import APIRouter
# from ..database import get_db
# from ..config import user_dependency
# from youtube_transcript_api import YouTubeTranscriptApi
# from ..gemini_client import client
# import json

# router = APIRouter(
#     prefix='/chats',
#     tags=['Chats']
# )

# def get_videoid(url):
#       if '=' in url:
#         parts = url.split('=')
#         if len(parts) > 1:  # Check if there are parts after the first '='
#           video_id = parts[1]
#           if '&' in video_id:  # Check for additional parameters after video ID
#             video_id = video_id.split('&')[0]  # Extract only video ID
#           return video_id
#       return ""

# @router.post("/")
# def create_chat(chat: schemas.CreateChat, user: user_dependency, db: Session = Depends(get_db)):
#     video_id = get_videoid(chat.youtube_link)

#     print ("Video ID:", video_id)

#     transcript_data = YouTubeTranscriptApi.get_transcript(video_id)

#     print("Transcript Data:", json.dumps(transcript_data, indent=2))

#     transcript = " ".join(segment['text'] for segment in transcript_data)

#     print("Transcript Text:", transcript)

#     response = client.models.generate_content(
#       model="gemini-2.5-flash",
#       contents=f"Please provide notes and analysis on the following Youtube transcript: {transcript}",
#     )
#     notes = response.text
#     response2 = client.models.generate_content(
#       model="gemini-2.5-flash",
#       contents=f"Please provide a short descriptive title for the following notes. Give the answer directly: {notes}",
#     )
#     session_name = response2.text


#     new_chat = models.Chat(
#         youtube_id = video_id,
#         youtube_transcript = transcript,
#         prompt = "Please provide notes and analysis on the following Youtube transcript",
#         notes = notes,
#         user_id = user['id'],
#         session_name = session_name
#     )
#     db.add(new_chat)
#     db.commit()
#     db.refresh(new_chat)
#     return {
#         "id": new_chat.id,
#         "video_id": video_id,
#         "notes": notes,
#         "transcript": transcript,
#         "session_name": session_name
#     }

# @router.get("/", response_model=List[schemas.ChatOut])
# def get_user_chats(user: user_dependency, db:Session = Depends(get_db)):
#   chats = db.query(models.Chat).filter(models.Chat.user_id == user['id']).all()

#   return chats

# @router.delete("/{chat_id}")
# def delete_user_chat(chat_id: int, user: user_dependency, db:Session = Depends(get_db)):
#   chat = db.query(models.Chat).filter(
#     models.Chat.id == chat_id,
#     models.Chat.user_id == user['id']
#   ).first()
#   if chat:
#     db.delete(chat)
#     db.commit()
#   return chat



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


# def get_videoid(url):
#     if '=' in url:
#         parts = url.split('=')
#         if len(parts) > 1:
#             video_id = parts[1]
#             if '&' in video_id:
#                 video_id = video_id.split('&')[0]
#             return video_id
#     return ""


# def get_transcript(video_url: str) -> str:
#     """Get transcript using RapidAPI YouTube Transcript service"""
#     url = "https://youtube-transcripts.p.rapidapi.com/youtube/transcript"
    
#     querystring = {
#         "url": video_url,
#         "text": "true"  # Get plain text transcript
#     }
    
#     headers = {
#         "x-rapidapi-key": RAPIDAPI_KEY,
#         "x-rapidapi-host": RAPIDAPI_HOST
#     }
    
#     response = requests.get(url, headers=headers, params=querystring)
    
#     if response.status_code == 429:
#         raise HTTPException(status_code=429, detail="Rate limit reached. Please try again later.")
    
#     if response.status_code != 200:
#         raise HTTPException(status_code=response.status_code, detail=f"Failed to fetch transcript: {response.text}")
    
#     data = response.json()
    
#     # Handle different response formats
#     if "content" in data:
#         content = data["content"]
#         # If content is a list of segments
#         if isinstance(content, list):
#             return " ".join(segment.get("text", "") for segment in content)
#         # If content is already text
#         elif isinstance(content, str):
#             return content
    
#     # If response is directly the transcript text
#     if isinstance(data, str):
#         return data
    
#     raise HTTPException(status_code=500, detail="Unexpected response format from transcript API")


# @router.post("/")
# def create_chat(chat: schemas.CreateChat, user: user_dependency, db: Session = Depends(get_db)):
#     video_id = get_videoid(chat.youtube_link)

#     print("Video ID:", video_id)

#     transcript = get_transcript(chat.youtube_link)

#     print("Transcript length:", len(transcript))

#     response = client.models.generate_content(
#         model="gemini-2.5-flash",
#         contents=f"Please provide notes and analysis on the following Youtube transcript: {transcript}",
#     )
#     notes = response.text
    
#     response2 = client.models.generate_content(
#         model="gemini-2.5-flash",
#         contents=f"Please provide a short descriptive title for the following notes. Give the answer directly: {notes}",
#     )
#     session_name = response2.text

#     new_chat = models.Chat(
#         youtube_id=video_id,
#         youtube_transcript=transcript,
#         prompt="Please provide notes and analysis on the following Youtube transcript",
#         notes=notes,
#         user_id=user['id'],
#         session_name=session_name
#     )
#     db.add(new_chat)
#     db.commit()
#     db.refresh(new_chat)
    
#     return {
#         "id": new_chat.id,
#         "video_id": video_id,
#         "notes": notes,
#         "transcript": transcript,
#         "session_name": session_name
#     }


# @router.get("/", response_model=List[schemas.ChatOut])
# def get_user_chats(user: user_dependency, db: Session = Depends(get_db)):
#     chats = db.query(models.Chat).filter(models.Chat.user_id == user['id']).all()
#     return chats


# @router.delete("/{chat_id}")
# def delete_user_chat(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == chat_id,
#         models.Chat.user_id == user['id']
#     ).first()
#     if chat:
#         db.delete(chat)
#         db.commit()
#     return chat


# Prompts
NOTES_PROMPT = """Analyze this YouTube video transcript and provide comprehensive, detailed, and well-structured notes.

## Instructions:
1. Start with a **Summary**
2. List the **Key Takeaways** (main points the viewer should remember)
3. Provide **Detailed Notes** organized by topic/section
4. Include any **Action Items** or practical tips mentioned
5. Note any **Resources/Links** mentioned (if any)

## Formatting:
- Use clear headings
- Keep it scannable and easy to read
- Highlight important terms or concepts in bold
- Do not start your response with opening phrases like "Here are comprehensive, well-structured notes from the YouTube video transcript:"

## Transcript:
{transcript}
"""

TITLE_PROMPT = """Generate a short, descriptive title (5-10 words max) for these notes. 
Return ONLY the title, nothing else.

Notes:
{notes}
"""


def get_videoid(url):
    if '=' in url:
        parts = url.split('=')
        if len(parts) > 1:
            video_id = parts[1]
            if '&' in video_id:
                video_id = video_id.split('&')[0]
            return video_id
    return ""


def get_transcript(video_url: str) -> str:
    """Get transcript using RapidAPI YouTube Transcript service"""
    url = "https://youtube-transcripts.p.rapidapi.com/youtube/transcript"
    
    querystring = {
        "url": video_url,
        "text": "true"
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
    
    if "content" in data:
        content = data["content"]
        if isinstance(content, list):
            return " ".join(segment.get("text", "") for segment in content)
        elif isinstance(content, str):
            return content
    
    if isinstance(data, str):
        return data
    
    raise HTTPException(status_code=500, detail="Unexpected response format from transcript API")


@router.post("/")
def create_chat(chat: schemas.CreateChat, user: user_dependency, db: Session = Depends(get_db)):
    video_id = get_videoid(chat.youtube_link)

    print("Video ID:", video_id)

    transcript = get_transcript(chat.youtube_link)

    print("Transcript length:", len(transcript))

    # Generate notes with improved prompt
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=NOTES_PROMPT.format(transcript=transcript),
    )
    notes = response.text
    
    # Generate title
    response2 = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=TITLE_PROMPT.format(notes=notes),
    )
    session_name = response2.text.strip()

    new_chat = models.Chat(
        youtube_id=video_id,
        youtube_transcript=transcript,
        prompt=NOTES_PROMPT.format(transcript="[transcript]"),
        notes=notes,
        user_id=user['id'],
        session_name=session_name
    )
    db.add(new_chat)
    db.commit()
    db.refresh(new_chat)
    
    return {
        "id": new_chat.id,
        "video_id": video_id,
        "notes": notes,
        "transcript": transcript,
        "session_name": session_name
    }


@router.get("/", response_model=List[schemas.ChatOut])
def get_user_chats(user: user_dependency, db: Session = Depends(get_db)):
    chats = db.query(models.Chat).filter(models.Chat.user_id == user['id']).all()
    return chats


# @router.delete("/{chat_id}")
# def delete_user_chat(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == chat_id,
#         models.Chat.user_id == user['id']
#     ).first()
#     if chat:
#         db.delete(chat)
#         db.commit()
#     return chat

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
    
    # Delete all messages associated with this chat first
    db.query(models.Message).filter(
        models.Message.chat_id == chat_id
    ).delete()
    
    # Then delete the chat
    db.delete(chat)
    db.commit()




