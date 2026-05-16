from typing import List, Optional
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime
from .. import models
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency

router = APIRouter(
    prefix='/spaces',
    tags=['Spaces']
)


# ============== Schemas ==============

class SpaceCreate(BaseModel):
    name: str


class SpaceUpdate(BaseModel):
    name: Optional[str] = None


class SpaceOut(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    chat_count: int = 0

    class Config:
        from_attributes = True


class ChatBrief(BaseModel):
    """Brief chat info for space listing"""
    id: int
    session_name: str
    source_type: str = "youtube"
    source_id: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SpaceWithChats(BaseModel):
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    chats: List[ChatBrief]

    class Config:
        from_attributes = True


class MoveChatRequest(BaseModel):
    chat_id: int
    space_id: Optional[int] = None  # None = remove from space


# ============== Endpoints ==============

@router.get("/", response_model=List[SpaceOut])
def get_spaces(user: user_dependency, db: Session = Depends(get_db)):
    """Get all spaces for the current user with chat counts"""
    user_id = user.get('id')
    
    spaces = db.query(models.Space).filter(
        models.Space.user_id == user_id
    ).order_by(models.Space.created_at.desc()).all()
    
    # Add chat count to each space
    result = []
    for space in spaces:
        chat_count = db.query(models.Chat).filter(
            models.Chat.space_id == space.id
        ).count()
        
        result.append({
            "id": space.id,
            "name": space.name,
            "created_at": space.created_at,
            "updated_at": space.updated_at,
            "chat_count": chat_count
        })
    
    return result


@router.post("/", response_model=SpaceOut)
def create_space(space: SpaceCreate, user: user_dependency, db: Session = Depends(get_db)):
    """Create a new space"""
    user_id = user.get('id')
    
    new_space = models.Space(
        user_id=user_id,
        name=space.name
    )
    
    db.add(new_space)
    db.commit()
    db.refresh(new_space)
    
    return {
        "id": new_space.id,
        "name": new_space.name,
        "created_at": new_space.created_at,
        "updated_at": new_space.updated_at,
        "chat_count": 0
    }


@router.get("/{space_id}", response_model=SpaceWithChats)
def get_space(space_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get a specific space with all its chats"""
    user_id = user.get('id')
    
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    chats = db.query(models.Chat).filter(
        models.Chat.space_id == space_id
    ).order_by(models.Chat.created_at.desc()).all()
    
    return {
        "id": space.id,
        "name": space.name,
        "created_at": space.created_at,
        "updated_at": space.updated_at,
        "chats": [
            {
                "id": chat.id,
                "session_name": chat.session_name,
                "source_type": chat.source_type,
                "source_id": chat.source_id,
                "created_at": chat.created_at
            }
            for chat in chats
        ]
    }


@router.put("/{space_id}", response_model=SpaceOut)
def update_space(space_id: int, space_update: SpaceUpdate, user: user_dependency, db: Session = Depends(get_db)):
    """Update a space (rename)"""
    user_id = user.get('id')
    
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    if space_update.name is not None:
        space.name = space_update.name
    
    db.commit()
    db.refresh(space)
    
    chat_count = db.query(models.Chat).filter(
        models.Chat.space_id == space.id
    ).count()
    
    return {
        "id": space.id,
        "name": space.name,
        "created_at": space.created_at,
        "updated_at": space.updated_at,
        "chat_count": chat_count
    }


@router.delete("/{space_id}")
def delete_space(space_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Delete a space. Chats in the space will become unassigned (not deleted)."""
    user_id = user.get('id')
    
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()
    
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")
    
    # Chats will be unassigned automatically due to ON DELETE SET NULL
    db.delete(space)
    db.commit()
    
    return {"message": "Space deleted", "id": space_id}


@router.post("/move-chat")
def move_chat_to_space(request: MoveChatRequest, user: user_dependency, db: Session = Depends(get_db)):
    """Move a chat to a space, or remove from space (space_id=null)"""
    user_id = user.get('id')
    
    # Verify chat ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == request.chat_id,
        models.Chat.user_id == user_id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # If moving to a space, verify space ownership
    if request.space_id is not None:
        space = db.query(models.Space).filter(
            models.Space.id == request.space_id,
            models.Space.user_id == user_id
        ).first()
        
        if not space:
            raise HTTPException(status_code=404, detail="Space not found")
    
    # Update chat
    chat.space_id = request.space_id 
    db.commit()
    
    return {
        "message": "Chat moved successfully",
        "chat_id": request.chat_id,
        "space_id": request.space_id
    }


@router.get("/{space_id}/chats")
def get_space_chats(space_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get all chats in a space (full chat objects)"""
    user_id = user.get('id')

    # Verify space ownership
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()

    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    chats = db.query(models.Chat).filter(
        models.Chat.space_id == space_id
    ).order_by(models.Chat.created_at.desc()).all()

    return chats


@router.get("/{space_id}/flashcards")
def get_space_flashcards(space_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get all flashcards across all chats in this space, with source metadata.

    Aggregates per-source flashcards (no separate space-level cards exist yet).
    Each card carries chat_name + chat_source_type so the frontend can group by
    source and link back to the originating chat.
    """
    user_id = user.get('id')

    # Verify ownership
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    rows = (
        db.query(models.Flashcard, models.Chat)
        .join(models.Chat, models.Flashcard.chat_id == models.Chat.id)
        .filter(
            models.Chat.space_id == space_id,
            models.Flashcard.user_id == user_id,
        )
        .order_by(models.Flashcard.id.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "chat_id": f.chat_id,
            "chat_name": c.session_name,
            "chat_source_type": c.source_type,
            "set_name": f.set_name,
            "question": f.question,
            "answer": f.answer,
            "difficulty": f.difficulty,
            "hint": f.hint,
            "explanation": f.explanation,
            "timestamp": f.timestamp,
            "created_at": f.created_at.isoformat() if f.created_at else None,
        }
        for f, c in rows
    ]


@router.get("/{space_id}/quizzes")
def get_space_quizzes(space_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get all quizzes (metadata only, not questions) across all chats in this space.

    Lightweight summary list — clients can fetch full quiz contents via
    /quiz/{chat_id} when the user opens an individual quiz.
    """
    user_id = user.get('id')

    # Verify ownership
    space = db.query(models.Space).filter(
        models.Space.id == space_id,
        models.Space.user_id == user_id
    ).first()
    if not space:
        raise HTTPException(status_code=404, detail="Space not found")

    rows = (
        db.query(models.Quiz, models.Chat)
        .join(models.Chat, models.Quiz.chat_id == models.Chat.id)
        .filter(
            models.Chat.space_id == space_id,
            models.Quiz.user_id == user_id,
        )
        .order_by(models.Quiz.id.desc())
        .all()
    )

    return [
        {
            "id": q.id,
            "chat_id": q.chat_id,
            "chat_name": c.session_name,
            "chat_source_type": c.source_type,
            "set_name": q.set_name,
            "total_questions": q.total_questions,
            "score": q.score,
            "completed": q.completed,
            "difficulty": q.difficulty,
            "created_at": q.created_at.isoformat() if q.created_at else None,
        }
        for q, c in rows
    ]
