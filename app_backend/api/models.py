from .database import Base
from sqlalchemy import Column, Integer, String, text, TIMESTAMP, ForeignKey

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, nullable=False)
    username = Column(String, nullable=False, unique=True)
    hashed_password = Column(String, nullable=False)
    email = Column(String, nullable=False)

class Chat(Base):
    __tablename__ = "chats"

    id = Column(Integer, primary_key=True, nullable=False)
    youtube_id = Column(String, nullable=False)
    youtube_transcript = Column(String, nullable=False)
    prompt = Column(String, nullable=False)
    notes = Column(String, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_name = Column(String, nullable=False)



class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, nullable=False)
    input = Column(String, nullable=False)
    output = Column(String, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
