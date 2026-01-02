# from typing import List
# from fastapi import HTTPException, Depends
# from sqlalchemy.orm import Session
# from pydantic import BaseModel
# from .. import models
# from fastapi import APIRouter
# from ..database import get_db
# from ..config import user_dependency
# from ..gemini_client import client
# import json

# router = APIRouter(
#     prefix='/flashcards',
#     tags=['Flashcards']
# )


# # Response schema
# class Flashcard(BaseModel):
#     question: str
#     answer: str
#     difficulty: str  # easy, medium, hard


# class FlashcardsResponse(BaseModel):
#     chat_id: int
#     video_title: str
#     flashcards: List[Flashcard]


# # Prompt for generating flashcards
# FLASHCARD_PROMPT = """Analyze this video transcript and create flashcards for the key concepts, facts, and takeaways.

# ## Rules:
# - Create 8-15 flashcards depending on content density
# - Questions should test understanding, not just recall
# - Answers should be concise but complete (1-3 sentences)
# - Include a mix of difficulties (easy, medium, hard)
# - Focus on the most important/useful information
# - Make questions specific, not vague

# ## Return format:
# Return ONLY a valid JSON array, no other text or markdown. Example:
# [
#   {"question": "What are the three criteria for selecting exercises?", "answer": "High tension in stretched position, feels good (no joint pain), and potential for progressive overload.", "difficulty": "easy"},
#   {"question": "Why are seated hamstring curls more effective than lying curls?", "answer": "The seated position pre-stretches the hamstring at the start of the movement, leading to approximately 1.5x more muscle growth.", "difficulty": "medium"}
# ]

# ## Transcript:
# {transcript}
# """


# def parse_flashcards_response(response_text: str) -> List[dict]:
#     """Parse the AI response to extract flashcards JSON"""
#     text = response_text.strip()
    
#     # Remove markdown code blocks if present
#     if '```json' in text:
#         text = text.split('```json')[1].split('```')[0]
#     elif '```' in text:
#         text = text.split('```')[1].split('```')[0]
    
#     # Find the JSON array
#     start = text.find('[')
#     end = text.rfind(']') + 1
    
#     if start == -1 or end == 0:
#         raise ValueError("No JSON array found in response")
    
#     json_str = text[start:end]
#     flashcards = json.loads(json_str)
    
#     # Validate and clean
#     cleaned = []
#     for card in flashcards:
#         if 'question' in card and 'answer' in card:
#             cleaned.append({
#                 'question': card['question'],
#                 'answer': card['answer'],
#                 'difficulty': card.get('difficulty', 'medium')
#             })
    
#     return cleaned


# @router.get("/{chat_id}", response_model=FlashcardsResponse)
# def generate_flashcards(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
#     """Generate flashcards for a video on-demand"""
    
#     # Get the chat and verify ownership
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == chat_id,
#         models.Chat.user_id == user['id']
#     ).first()
    
#     if not chat:
#         raise HTTPException(status_code=404, detail="Chat not found")
    
#     # Generate flashcards using AI
#     try:
#         response = client.models.generate_content(
#             model="gemini-2.5-flash",
#             contents=FLASHCARD_PROMPT.format(transcript=chat.youtube_transcript)
#         )
        
#         flashcards = parse_flashcards_response(response.text)
        
#     except json.JSONDecodeError as e:
#         raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")
    
#     return {
#         "chat_id": chat_id,
#         "video_title": chat.session_name,
#         "flashcards": flashcards
#     }



# from typing import List
# from fastapi import HTTPException, Depends
# from sqlalchemy.orm import Session
# from pydantic import BaseModel
# from .. import models
# from fastapi import APIRouter
# from ..database import get_db
# from ..config import user_dependency
# from ..gemini_client import client
# import json
# import re

# router = APIRouter(
#     prefix='/flashcards',
#     tags=['Flashcards']
# )


# class Flashcard(BaseModel):
#     question: str
#     answer: str
#     difficulty: str


# class FlashcardsResponse(BaseModel):
#     chat_id: int
#     video_title: str
#     flashcards: List[Flashcard]


# def get_flashcard_prompt(transcript: str) -> str:
#     return f"""Analyze this video transcript and create flashcards for the key concepts.

# RULES:
# - Create 8-12 flashcards
# - Questions should test understanding, not just recall
# - Answers should be 1-3 sentences
# - Difficulty should be: easy, medium, or hard

# IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

# Example format:
# [
#   {{"question": "What is the main topic?", "answer": "The main topic is...", "difficulty": "easy"}},
#   {{"question": "Why is X important?", "answer": "X is important because...", "difficulty": "medium"}}
# ]

# TRANSCRIPT:
# {transcript}

# JSON ARRAY:"""


# def parse_flashcards_response(response_text: str) -> List[dict]:
#     """Parse the AI response to extract flashcards JSON"""
#     text = response_text.strip()
    
#     print(f"Raw AI response (first 500 chars): {text[:500]}")
    
#     # Remove markdown code blocks if present
#     if '```json' in text:
#         text = text.split('```json')[1].split('```')[0]
#     elif '```' in text:
#         parts = text.split('```')
#         if len(parts) >= 2:
#             text = parts[1]
#             # Remove language identifier if present
#             if text.startswith('json'):
#                 text = text[4:]
    
#     text = text.strip()
    
#     # Find the JSON array
#     start = text.find('[')
#     end = text.rfind(']') + 1
    
#     if start == -1 or end <= start:
#         print(f"Could not find JSON array in: {text[:200]}")
#         raise ValueError("No JSON array found in response")
    
#     json_str = text[start:end]
    
#     print(f"Extracted JSON (first 300 chars): {json_str[:300]}")
    
#     # Parse JSON
#     flashcards = json.loads(json_str)
    
#     # Validate and clean
#     cleaned = []
#     for card in flashcards:
#         if isinstance(card, dict) and 'question' in card and 'answer' in card:
#             cleaned.append({
#                 'question': str(card['question']),
#                 'answer': str(card['answer']),
#                 'difficulty': str(card.get('difficulty', 'medium'))
#             })
    
#     if not cleaned:
#         raise ValueError("No valid flashcards found in response")
    
#     print(f"Successfully parsed {len(cleaned)} flashcards")
#     return cleaned


# @router.get("/{chat_id}", response_model=FlashcardsResponse)
# def generate_flashcards(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
#     """Generate flashcards for a video on-demand"""
    
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == chat_id,
#         models.Chat.user_id == user['id']
#     ).first()
    
#     if not chat:
#         raise HTTPException(status_code=404, detail="Chat not found")
    
#     try:
#         # Truncate transcript if too long (keep first 15000 chars)
#         transcript = chat.youtube_transcript[:15000]
        
#         response = client.models.generate_content(
#             model="gemini-2.5-flash",
#             contents=get_flashcard_prompt(transcript)
#         )
        
#         print(f"Gemini response received, length: {len(response.text)}")
        
#         flashcards = parse_flashcards_response(response.text)
        
#         return {
#             "chat_id": chat_id,
#             "video_title": chat.session_name,
#             "flashcards": flashcards
#         }
        
#     except json.JSONDecodeError as e:
#         print(f"JSON decode error: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
#     except ValueError as e:
#         print(f"Value error: {e}")
#         raise HTTPException(status_code=500, detail=str(e))
#     except Exception as e:
#         print(f"Unexpected error: {type(e).__name__}: {e}")
#         raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


from typing import List
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from .. import models
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
import json

router = APIRouter(
    prefix='/flashcards',
    tags=['Flashcards']
)


class FlashcardOut(BaseModel):
    id: int
    question: str
    answer: str
    difficulty: str
    
    class Config:
        from_attributes = True


class FlashcardsResponse(BaseModel):
    chat_id: int
    video_title: str
    flashcards: List[FlashcardOut]


def get_flashcard_prompt(transcript: str) -> str:
    return f"""Analyze this video transcript and create flashcards for the key concepts.

RULES:
- Create 8-12 flashcards
- Questions should test understanding, not just recall
- Answers should be 1-3 sentences
- Difficulty should be: easy, medium, or hard

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

Example format:
[
  {{"question": "What is the main topic?", "answer": "The main topic is...", "difficulty": "easy"}},
  {{"question": "Why is X important?", "answer": "X is important because...", "difficulty": "medium"}}
]

TRANSCRIPT:
{transcript}

JSON ARRAY:"""


def parse_flashcards_response(response_text: str) -> List[dict]:
    """Parse the AI response to extract flashcards JSON"""
    text = response_text.strip()
    
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    elif '```' in text:
        parts = text.split('```')
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith('json'):
                text = text[4:]
    
    text = text.strip()
    start = text.find('[')
    end = text.rfind(']') + 1
    
    if start == -1 or end <= start:
        raise ValueError("No JSON array found in response")
    
    json_str = text[start:end]
    flashcards = json.loads(json_str)
    
    cleaned = []
    for card in flashcards:
        if isinstance(card, dict) and 'question' in card and 'answer' in card:
            cleaned.append({
                'question': str(card['question']),
                'answer': str(card['answer']),
                'difficulty': str(card.get('difficulty', 'medium'))
            })
    
    if not cleaned:
        raise ValueError("No valid flashcards found in response")
    
    return cleaned


def generate_and_save_flashcards(chat: models.Chat, user_id: int, db: Session) -> List[models.Flashcard]:
    """Generate flashcards using AI and save to database"""
    
    transcript = chat.youtube_transcript[:15000]
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=get_flashcard_prompt(transcript)
    )
    
    flashcards_data = parse_flashcards_response(response.text)
    
    created_flashcards = []
    for card_data in flashcards_data:
        flashcard = models.Flashcard(
            chat_id=chat.id,
            user_id=user_id,
            question=card_data['question'],
            answer=card_data['answer'],
            difficulty=card_data['difficulty']
        )
        db.add(flashcard)
        created_flashcards.append(flashcard)
    
    db.commit()
    
    for card in created_flashcards:
        db.refresh(card)
    
    return created_flashcards


@router.get("/{chat_id}", response_model=FlashcardsResponse)
def get_flashcards(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get flashcards for a video. Generates them if they don't exist."""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Check if flashcards already exist
    existing = db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == chat_id,
        models.Flashcard.user_id == user['id']
    ).all()
    
    if existing:
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "flashcards": existing
        }
    
    # Generate new flashcards
    try:
        flashcards = generate_and_save_flashcards(chat, user['id'], db)
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "flashcards": flashcards
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")


@router.delete("/{chat_id}")
def delete_flashcards(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Delete all flashcards for a video"""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    deleted = db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == chat_id,
        models.Flashcard.user_id == user['id']
    ).delete()
    
    db.commit()
    
    return {"deleted": deleted}