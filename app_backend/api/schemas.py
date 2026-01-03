from pydantic import BaseModel
from datetime import datetime

class VideoRequest(BaseModel):
    youtube_link:str

class CreateChat(BaseModel):
    youtube_link: str

class ChatOut(BaseModel):
    id: int
    session_name: str
    youtube_id: str
    youtube_transcript: str
    prompt: str
    notes: str
    user_id: int

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
    
    class Config:
        from_attributes = True


class FlashcardsResponse(BaseModel):
    chat_id: int
    video_title: str
    flashcards: List[FlashcardOut]

# Quiz

class MCQQuestion(BaseModel):
    type: str = "mcq"
    question: str
    options: List[str]
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
    key_points: List[str]  # Key concepts that should be mentioned


class QuizResponse(BaseModel):
    chat_id: int
    video_title: str
    questions: List[dict]


class GradeRequest(BaseModel):
    question: str
    ideal_answer: str
    key_points: List[str]
    user_answer: str


class GradeResponse(BaseModel):
    correct: bool
    score: int  # 0-100
    feedback: str

