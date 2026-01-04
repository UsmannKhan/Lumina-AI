from typing import List
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
import json

router = APIRouter(
    prefix='/flashcards',
    tags=['Flashcards']
)


class FlashcardGenerateRequest(BaseModel):
    """Request body for generating flashcards with options"""
    count: int = 10  # 5-25 cards
    topic_ids: List[int] = []  # Empty = all topics
    focus_prompt: str = None  # Optional focus instructions
    set_name: str = None  # Name for this set of flashcards


def get_flashcard_prompt(timed_transcript: str, count: int = 10, focus_prompt: str = None, topics: List[str] = None) -> str:
    topic_instruction = ""
    if topics:
        topic_instruction = f"\n- Focus on these specific topics: {', '.join(topics)}"
    
    focus_instruction = ""
    if focus_prompt:
        focus_instruction = f"\n- Special focus: {focus_prompt}"
    
    return f"""Analyze this video transcript and create flashcards for the key concepts.

RULES:
- Create exactly {count} flashcards
- Questions should test understanding, not just recall
- Answers should be 1-3 sentences
- Difficulty should be: easy, medium, or hard
- Hints should be varied and helpful. Use different formats depending on the question like:
  - Key terms: "Divine will, blood clot, Tatar"
  - Thinking prompts: "Think about how large numbers can impact storage."
  - Process hints: "Involves finding the largest item less than a given value."
  - Context clues: "Related to the aftermath of his father's death."
  - Category hints: "It's a type of sorting algorithm."
  Keep hints concise (under 15 words) but make them genuinely helpful for recalling the answer.
- Explain why the answer is correct using the transcript and provide the exact timestamp in the video where the answer can be found{topic_instruction}{focus_instruction}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

Example format:
[
  {{"question": "What was the actual condition of the Mongols shortly after Yesugei's death, contrasting with their future glory?", "answer": "They were not a rising power—many were slaves of the Jin Dynasty, Yesugei's family was abandoned, and the Mongols were a fragmented, subject people on the margins of Chinese power.", "difficulty": "easy", "hint": "Think about their status relative to Chinese dynasties at that time.", "timestamp": "02:15", "explanation": "After Yesugei's death, the Mongols were not a burgeoning power; many were common slaves of the Jin Dynasty, and Yesugei's family was abandoned by their clan. This period saw the Mongols as a fractured, subject people on the outskirts of Chinese power, far from the unified empire they would later become."}},
  {{"question": "Why is binary search more efficient than linear search?", "answer": "Binary search eliminates half of the remaining elements with each comparison, resulting in O(log n) time complexity compared to O(n) for linear search.", "difficulty": "medium", "hint": "Consider what happens to the search space after each comparison.", "timestamp": "05:30", "explanation": "Binary search works by repeatedly dividing the sorted array in half, which means it only needs log₂(n) comparisons in the worst case."}}
]

TRANSCRIPT:
{timed_transcript}

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
                'difficulty': str(card.get('difficulty', 'medium')),
                'hint': str(card.get('hint', '')),
                'timestamp': str(card.get('timestamp', '')),
                'explanation': str(card.get('explanation', ''))
            })
    
    if not cleaned:
        raise ValueError("No valid flashcards found in response")
    
    return cleaned


def generate_and_save_flashcards(
    chat: models.Chat, 
    user_id: int, 
    db: Session,
    count: int = 10,
    focus_prompt: str = None,
    topics: List[str] = None,
    set_name: str = None
) -> List[models.Flashcard]:
    """Generate flashcards using AI and save to database"""
    
    timed_transcript = chat.youtube_transcript_timed[:15000] if chat.youtube_transcript_timed else chat.youtube_transcript[:15000]
    
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=get_flashcard_prompt(timed_transcript, count, focus_prompt, topics)
    )
    
    flashcards_data = parse_flashcards_response(response.text)
    
    created_flashcards = []
    for card_data in flashcards_data:
        flashcard = models.Flashcard(
            chat_id=chat.id,
            user_id=user_id,
            question=card_data['question'],
            answer=card_data['answer'],
            difficulty=card_data['difficulty'],
            hint=card_data['hint'],
            timestamp=card_data['timestamp'],
            explanation=card_data['explanation'],
            set_name=set_name
        )
        db.add(flashcard)
        created_flashcards.append(flashcard)
    
    db.commit()
    
    for card in created_flashcards:
        db.refresh(card)
    
    return created_flashcards



@router.get("/{chat_id}", response_model=schemas.FlashcardsResponse)
def get_flashcards(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get existing flashcards for a video. Does NOT auto-generate."""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Return existing flashcards only (no auto-generation)
    existing = db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == chat_id,
        models.Flashcard.user_id == user['id']
    ).order_by(models.Flashcard.created_at.desc()).all()
    
    return {
        "chat_id": chat_id,
        "video_title": chat.session_name,
        "flashcards": existing
    }



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


@router.post("/{chat_id}/generate")
def generate_flashcards_with_options(
    chat_id: int, 
    request: FlashcardGenerateRequest,
    user: user_dependency, 
    db: Session = Depends(get_db)
):
    """Generate flashcards with custom options (count, topics, focus)"""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get topic titles if topic_ids provided
    topics = None
    if request.topic_ids:
        concepts = db.query(models.KeyConcept).filter(
            models.KeyConcept.id.in_(request.topic_ids),
            models.KeyConcept.chat_id == chat_id
        ).all()
        topics = [c.title for c in concepts]
    
    # Generate flashcards with options
    try:
        flashcards = generate_and_save_flashcards(
            chat=chat,
            user_id=user['id'],
            db=db,
            count=min(max(request.count, 5), 25),  # Clamp between 5-25
            focus_prompt=request.focus_prompt,
            topics=topics,
            set_name=request.set_name
        )
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "set_name": request.set_name,
            "flashcards": [
                {
                    "id": f.id,
                    "question": f.question,
                    "answer": f.answer,
                    "difficulty": f.difficulty,
                    "hint": f.hint,
                    "timestamp": f.timestamp,
                    "explanation": f.explanation,
                    "set_name": f.set_name
                }
                for f in flashcards
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate flashcards: {str(e)}")
