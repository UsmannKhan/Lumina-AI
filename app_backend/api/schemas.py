from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class VideoRequest(BaseModel):
    youtube_link:str

class CreateChat(BaseModel):
    youtube_link: str
    space_id: Optional[int] = None  # Optional: assign to a space on creation

class ChatOut(BaseModel):
    id: int
    session_name: str
    source_type: str = "youtube"
    source_id: Optional[str] = None
    source_url: Optional[str] = None
    source_content: str
    timed_content: Optional[str] = None
    prompt: str
    notes: str
    user_id: int
    space_id: Optional[int] = None
    chat_style: Optional[str] = "study"
    custom_instructions: Optional[str] = None
    manual_notes: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        orm_mode = True

class UserOut(BaseModel):
    id: int
    username: str
    created_at: datetime

    class Config:
        orm_mode = True

class CreateMessage(BaseModel):
    input: str
    chat_id: int
    use_web_search: bool = False

class ChatStyleUpdate(BaseModel):
    style: str  # study, conversational, concise, custom
    custom_instructions: Optional[str] = None

class MessageOut(BaseModel):
    id: int
    input: str
    output: str
    chat_id: int
    user_id: int

class UserCreateRequest(BaseModel):
    email: str
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

# Flashcards
class FlashcardOut(BaseModel):
    id: int
    question: str
    answer: str
    difficulty: str
    hint: Optional[str] = None 
    timestamp: Optional[str] = None 
    explanation: Optional[str] = None
    set_name: Optional[str] = None
    
    class Config:
        from_attributes = True


class FlashcardsResponse(BaseModel):
    chat_id: int
    video_title: str
    flashcards: list[FlashcardOut]

# Quiz

class MCQQuestion(BaseModel):
    type: str = "mcq"
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class TrueFalseQuestion(BaseModel):
    type: str = "true_false"
    statement: str
    correct_answer: bool
    explanation: str


class ShortAnswerQuestion(BaseModel):
    type: str = "short_answer"
    question: str
    ideal_answer: str  # For reference, AI will grade flexibly
    key_points: list[str]  # Key concepts that should be mentioned


class QuizResponse(BaseModel):
    chat_id: int
    video_title: str
    questions: list[dict]


class GradeRequest(BaseModel):
    question: str
    ideal_answer: str
    key_points: list[str]
    user_answer: str


class GradeResponse(BaseModel):
    correct: bool
    score: int  # 0-100
    feedback: str

# Manual Notes
class ManualNotesRequest(BaseModel):
    content: str

