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

