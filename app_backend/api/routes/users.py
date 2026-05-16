from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from .chats import supabase, PDF_BUCKET, AUDIO_BUCKET

router = APIRouter(
    prefix='/users',
    tags=['Users']
)


def _cleanup_user_storage(db: Session, user_id: int) -> None:
    """Delete all Supabase Storage files (PDFs, audio) belonging to this user.

    Called before user deletion so we still have access to source_id values.
    Storage failures are logged but do NOT block account deletion — orphan
    files in storage are recoverable manually; half-deleted accounts aren't.
    """
    if not supabase:
        return

    chats = db.query(models.Chat).filter(
        models.Chat.user_id == user_id,
        models.Chat.source_type.in_(["pdf", "audio"]),
        models.Chat.source_id.isnot(None),
    ).all()

    # PDFs and audio live in separate buckets — collect into two lists and
    # remove from each with a single round-trip per bucket.
    pdf_paths: list[str] = []
    audio_paths: list[str] = []
    for chat in chats:
        if chat.source_type == "pdf":
            pdf_paths.append(f"{user_id}/{chat.source_id}.pdf")
        elif chat.source_type == "audio":
            ext = chat.source_url or ".mp3"
            audio_paths.append(f"{user_id}/{chat.source_id}{ext}")

    if pdf_paths:
        try:
            supabase.storage.from_(PDF_BUCKET).remove(pdf_paths)
        except Exception as e:
            print(f"Warning: Failed to clean up PDF storage for user {user_id}: {e}")

    if audio_paths:
        try:
            supabase.storage.from_(AUDIO_BUCKET).remove(audio_paths)
        except Exception as e:
            print(f"Warning: Failed to clean up audio storage for user {user_id}: {e}")


def _cleanup_user_db_rows(db: Session, user_id: int) -> None:
    """Delete all DB rows that reference this user before deleting the user.

    Required because most child tables (chats, messages, flashcards, etc.)
    have FOREIGN KEY user_id with no ON DELETE CASCADE. Without manual cleanup,
    db.delete(user) would raise IntegrityError.
    Spaces are handled by the SQLAlchemy ORM cascade on User.spaces.
    """
    # Collect chat IDs owned by this user
    chat_ids = [
        c.id for c in db.query(models.Chat.id)
        .filter(models.Chat.user_id == user_id)
        .all()
    ]

    if chat_ids:
        # Coding submissions -> coding_problems (delete grandchildren first)
        problem_ids = [
            p.id for p in db.query(models.CodingProblem.id)
            .filter(models.CodingProblem.chat_id.in_(chat_ids))
            .all()
        ]
        if problem_ids:
            db.query(models.CodingSubmission).filter(
                models.CodingSubmission.problem_id.in_(problem_ids)
            ).delete(synchronize_session=False)
        db.query(models.CodingProblem).filter(
            models.CodingProblem.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)

        # Quiz questions -> quizzes
        quiz_ids = [
            q.id for q in db.query(models.Quiz.id)
            .filter(models.Quiz.chat_id.in_(chat_ids))
            .all()
        ]
        if quiz_ids:
            db.query(models.QuizQuestion).filter(
                models.QuizQuestion.quiz_id.in_(quiz_ids)
            ).delete(synchronize_session=False)
        db.query(models.Quiz).filter(
            models.Quiz.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)

        # Direct chat children
        db.query(models.Message).filter(
            models.Message.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)
        db.query(models.Flashcard).filter(
            models.Flashcard.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)
        db.query(models.KeyConcept).filter(
            models.KeyConcept.chat_id.in_(chat_ids)
        ).delete(synchronize_session=False)

        # The chats themselves
        db.query(models.Chat).filter(
            models.Chat.id.in_(chat_ids)
        ).delete(synchronize_session=False)

    # Catch any straggler rows referencing user_id directly (shouldn't exist
    # in practice since they're all tied to chats, but the FK still blocks)
    db.query(models.CodingSubmission).filter(
        models.CodingSubmission.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(models.Flashcard).filter(
        models.Flashcard.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(models.Message).filter(
        models.Message.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(models.Quiz).filter(
        models.Quiz.user_id == user_id
    ).delete(synchronize_session=False)
    db.query(models.CodingProblem).filter(
        models.CodingProblem.user_id == user_id
    ).delete(synchronize_session=False)


@router.delete("/{id}")
def delete_user(id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Delete the authenticated user's own account.

    Cleans up Supabase Storage files and all child DB rows before deletion.
    """
    # Auth: a user can only delete their own account
    if user['id'] != id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own account"
        )

    target = db.query(models.User).filter(models.User.id == id).first()
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # 1. Clean up Supabase Storage (must happen before chats are deleted,
    #    we need source_id values from the chat rows).
    _cleanup_user_storage(db, id)

    # 2. Manually delete child DB rows (no ON DELETE CASCADE on most user_id FKs).
    _cleanup_user_db_rows(db, id)

    # 3. Delete the user. Spaces cascade automatically via User.spaces relationship.
    db.delete(target)
    db.commit()

    return {"message": "Account deleted"}


@router.get("/{id}", response_model=schemas.UserOut)
def get_user(id, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id == id
    ).first()

    return user
