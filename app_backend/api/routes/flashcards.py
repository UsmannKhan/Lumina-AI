from typing import List
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime, timedelta
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
from google.genai import types
from ..rate_limit import limiter
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


def get_flashcard_prompt_youtube(content: str, count: int = 10, focus_prompt: str = None, topics: List[str] = None) -> str:
    """Prompt for YouTube videos with timestamps"""
    topic_instruction = ""
    if topics:
        topic_instruction = f"\n- Focus on these specific topics: {', '.join(topics)}"
    
    focus_instruction = ""
    if focus_prompt:
        focus_instruction = f"\n- Special focus: {focus_prompt}"
    
    return f"""Analyze this video transcript and create flashcards for the key concepts.

RULES:
- Create exactly {count} flashcards
- Questions should test understanding, not just recall.
- Answers should be 1-3 sentences
- Difficulty should be: easy, medium, or hard
- Hints should be varied and helpful. Use different formats depending on the question like:
  - Key terms: "Divine will, blood clot, Tatar"
  - Thinking prompts: "Think about how large numbers can impact storage."
  - Process hints: "Involves finding the largest item less than a given value."
  - Context clues: "Related to the aftermath of his father's death."
  - Category hints: "It's a type of sorting algorithm."
  Keep hints concise (under 15 words) but make them genuinely helpful for recalling the answer.
- Explanations should be clean prose explaining WHY the answer is correct. You can include timestamps in explanations but do not spam them.
- Provide the exact timestamp where the concept is discussed. Format: MM:SS{topic_instruction}{focus_instruction}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no explanation, just the JSON.

Example format:
[
  {{"question": "What was the condition of the Mongols after Yesugei's death?", "answer": "They were not a rising power—many were slaves of the Jin Dynasty, Yesugei's family was abandoned, and the Mongols were a fragmented, subject people on the margins of Chinese power.", "difficulty": "easy", "hint": "Think about their status relative to Chinese dynasties at that time.", "timestamp": "02:15", "explanation": "After Yesugei's death, the Mongols were not a burgeoning power; many were common slaves of the Jin Dynasty, and Yesugei's family was abandoned by their clan. This period saw the Mongols as a fractured, subject people on the outskirts of Chinese power, far from the unified empire they would later become."}},
  {{"question": "Why is binary search more efficient than linear search?", "answer": "Binary search eliminates half of remaining elements with each comparison, resulting in O(log n) time complexity.", "difficulty": "medium", "hint": "Consider what happens to the search space after each comparison.", "timestamp": "05:30", "explanation": "Binary search works by repeatedly dividing the sorted array in half, requiring only log₂(n) comparisons in the worst case, compared to n comparisons for linear search."}}
]

TRANSCRIPT:
{content}

JSON ARRAY:"""


def get_flashcard_prompt_pdf(content: str, count: int = 10, focus_prompt: str = None, topics: List[str] = None) -> str:
    """Prompt for PDFs and text content (no timestamps)"""
    topic_instruction = ""
    if topics:
        topic_instruction = f"\n- Focus on these specific topics: {', '.join(topics)}"
    
    focus_instruction = ""
    if focus_prompt:
        focus_instruction = f"\n- Special focus: {focus_prompt}"
    
    return f"""Analyze this document and create flashcards for the key concepts.

RULES:
- Create exactly {count} flashcards
- Questions should test understanding, not just recall.
- Answers should be 1-3 sentences
- Difficulty should be: easy, medium, or hard
- Hints should be varied and helpful (under 15 words)
- Explanations should be clean prose explaining WHY the answer is correct.{topic_instruction}{focus_instruction}

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks.

Example format:
[
  {{"question": "What was the condition of the Mongols after Yesugei's death?", "answer": "They were a fragmented, subject people - many were slaves of the Jin Dynasty, and Yesugei's family was abandoned.", "difficulty": "easy", "hint": "Think about their status relative to Chinese dynasties.", "explanation": "After Yesugei's death, the Mongols were not a rising power. Many were common slaves of the Jin Dynasty, and the family was abandoned by their clan. They were a fractured people on the outskirts of Chinese power."}},
  {{"question": "Why is binary search more efficient than linear search?", "answer": "Binary search eliminates half of remaining elements with each comparison, resulting in O(log n) time complexity.", "difficulty": "medium", "hint": "Consider what happens to the search space after each comparison.", "explanation": "Binary search works by repeatedly dividing the sorted array in half, requiring only log₂(n) comparisons in the worst case, compared to n comparisons for linear search."}}
]

DOCUMENT:
{content}

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
    
    # Get content (use timed transcript for YouTube, source_content for others).
    # 150k chars ≈ ~37k tokens — comfortably fits Gemini's window even for
    # 2-3 hour lectures or 30-page papers, while leaving room for the prompt
    # and output. Generated flashcards should now cover the full source.
    content = chat.timed_content[:150000] if chat.timed_content else chat.source_content[:150000]
    
    # Pick the right prompt based on source type
    is_youtube = chat.source_type == 'youtube'
    if is_youtube:
        prompt = get_flashcard_prompt_youtube(content, count, focus_prompt, topics)
    else:
        prompt = get_flashcard_prompt_pdf(content, count, focus_prompt, topics)
    
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=prompt,
        config=types.GenerateContentConfig(
            thinking_config=types.ThinkingConfig(thinking_level="MEDIUM")
        ),
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
            timestamp=card_data.get('timestamp', '') if is_youtube else '',  # No timestamps for PDFs
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
@limiter.limit("10/hour")  # AI flashcard generation
def generate_flashcards_with_options(
    request: Request,
    chat_id: int, 
    body: FlashcardGenerateRequest,
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
    if body.topic_ids:
        concepts = db.query(models.KeyConcept).filter(
            models.KeyConcept.id.in_(body.topic_ids),
            models.KeyConcept.chat_id == chat_id
        ).all()
        topics = [c.title for c in concepts]
    
    # Generate flashcards with options
    try:
        flashcards = generate_and_save_flashcards(
            chat=chat,
            user_id=user['id'],
            db=db,
            count=min(max(body.count, 5), 25),  # Clamp between 5-25
            focus_prompt=body.focus_prompt,
            topics=topics,
            set_name=body.set_name
        )
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "set_name": body.set_name,
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


# ============== CRUD Endpoints ==============

class FlashcardUpdateRequest(BaseModel):
    """Request body for updating a flashcard"""
    question: str = None
    answer: str = None
    hint: str = None
    explanation: str = None
    timestamp: str = None
    difficulty: str = None

class FlashcardCreateRequest(BaseModel):
    """Request body for creating a manual flashcard"""
    question: str
    answer: str
    hint: str = ""
    explanation: str = ""
    timestamp: str = ""
    difficulty: str = "medium"
    set_name: str

class SetRenameRequest(BaseModel):
    """Request body for renaming a set"""
    chat_id: int
    old_name: str
    new_name: str

class ReorderRequest(BaseModel):
    """Request body for reordering flashcards"""
    card_ids: List[int]  # List of card IDs in new order


@router.put("/card/{card_id}")
def update_flashcard(
    card_id: int,
    request: FlashcardUpdateRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Update a flashcard's content"""
    flashcard = db.query(models.Flashcard).filter(
        models.Flashcard.id == card_id,
        models.Flashcard.user_id == user['id']
    ).first()
    
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    # Update only provided fields
    if request.question is not None:
        flashcard.question = request.question
    if request.answer is not None:
        flashcard.answer = request.answer
    if request.hint is not None:
        flashcard.hint = request.hint
    if request.explanation is not None:
        flashcard.explanation = request.explanation
    if request.timestamp is not None:
        flashcard.timestamp = request.timestamp
    if request.difficulty is not None:
        flashcard.difficulty = request.difficulty
    
    db.commit()
    
    return {
        "id": flashcard.id,
        "question": flashcard.question,
        "answer": flashcard.answer,
        "difficulty": flashcard.difficulty,
        "hint": flashcard.hint,
        "timestamp": flashcard.timestamp,
        "explanation": flashcard.explanation,
        "set_name": flashcard.set_name
    }


@router.delete("/card/{card_id}")
def delete_flashcard(
    card_id: int,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Delete a single flashcard"""
    flashcard = db.query(models.Flashcard).filter(
        models.Flashcard.id == card_id,
        models.Flashcard.user_id == user['id']
    ).first()
    
    if not flashcard:
        raise HTTPException(status_code=404, detail="Flashcard not found")
    
    db.delete(flashcard)
    db.commit()
    
    return {"message": "Flashcard deleted", "id": card_id}


@router.post("/{chat_id}/card")
def create_flashcard(
    chat_id: int,
    request: FlashcardCreateRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Create a manual flashcard"""
    # Verify chat ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    flashcard = models.Flashcard(
        chat_id=chat_id,
        user_id=user['id'],
        question=request.question,
        answer=request.answer,
        hint=request.hint,
        explanation=request.explanation,
        timestamp=request.timestamp,
        difficulty=request.difficulty,
        set_name=request.set_name
    )
    
    db.add(flashcard)
    db.commit()
    db.refresh(flashcard)
    
    return {
        "id": flashcard.id,
        "question": flashcard.question,
        "answer": flashcard.answer,
        "difficulty": flashcard.difficulty,
        "hint": flashcard.hint,
        "timestamp": flashcard.timestamp,
        "explanation": flashcard.explanation,
        "set_name": flashcard.set_name
    }


@router.put("/set/rename")
def rename_set(
    request: SetRenameRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Rename a flashcard set"""
    # Update all flashcards with the old set name
    updated = db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == request.chat_id,
        models.Flashcard.user_id == user['id'],
        models.Flashcard.set_name == request.old_name
    ).update({"set_name": request.new_name})
    
    if updated == 0:
        raise HTTPException(status_code=404, detail="Set not found")
    
    db.commit()
    
    return {"message": f"Set renamed from '{request.old_name}' to '{request.new_name}'", "updated_count": updated}


@router.delete("/set/{chat_id}/{set_name}")
def delete_set(
    chat_id: int,
    set_name: str,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Delete an entire flashcard set"""
    deleted = db.query(models.Flashcard).filter(
        models.Flashcard.chat_id == chat_id,
        models.Flashcard.user_id == user['id'],
        models.Flashcard.set_name == set_name
    ).delete()
    
    if deleted == 0:
        raise HTTPException(status_code=404, detail="Set not found")
    
    db.commit()
    
    return {"message": f"Set '{set_name}' deleted", "deleted_count": deleted}


@router.put("/reorder")
def reorder_flashcards(
    request: ReorderRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Reorder flashcards - card_ids should be in desired order"""
    # Verify all cards belong to user and get them
    cards = db.query(models.Flashcard).filter(
        models.Flashcard.id.in_(request.card_ids),
        models.Flashcard.user_id == user['id']
    ).all()
    
    if len(cards) != len(request.card_ids):
        raise HTTPException(status_code=400, detail="Some flashcards not found or not owned by user")
    
    # Create ID to card mapping for efficient lookup
    card_map = {c.id: c for c in cards}
    
    # Update order (we'll use the card ID order as implicit ordering)
    # Since SQLAlchemy doesn't have a built-in order column, we'll return the reordered list
    # The frontend will maintain the display order
    reordered = [card_map[cid] for cid in request.card_ids if cid in card_map]
    
    return {
        "message": "Reorder successful",
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
            for f in reordered
        ]
    }

