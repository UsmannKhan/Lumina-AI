# # from .database import Base
# # from sqlalchemy import Column, Integer, String, text, TIMESTAMP, ForeignKey

# # class User(Base):
# #     __tablename__ = "users"

# #     id = Column(Integer, primary_key=True, nullable=False)
# #     username = Column(String, nullable=False, unique=True)
# #     hashed_password = Column(String, nullable=False)
# #     email = Column(String, nullable=False)

# # class Chat(Base):
# #     __tablename__ = "chats"

# #     id = Column(Integer, primary_key=True, nullable=False)
# #     youtube_id = Column(String, nullable=False)
# #     youtube_transcript = Column(String, nullable=False)
# #     prompt = Column(String, nullable=False)
# #     notes = Column(String, nullable=False)
# #     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
# #     session_name = Column(String, nullable=False)



# # class Message(Base):
# #     __tablename__ = "messages"

# #     id = Column(Integer, primary_key=True, nullable=False)
# #     input = Column(String, nullable=False)
# #     output = Column(String, nullable=False)
# #     chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
# #     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


# from .database import Base
# from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
# from datetime import datetime

# class User(Base):
#     __tablename__ = "users"

#     id = Column(Integer, primary_key=True, nullable=False)
#     username = Column(String, nullable=False, unique=True)
#     hashed_password = Column(String, nullable=False)
#     email = Column(String, nullable=False)


# class Chat(Base):
#     __tablename__ = "chats"

#     id = Column(Integer, primary_key=True, nullable=False)
#     youtube_id = Column(String, nullable=False)
#     youtube_transcript = Column(String, nullable=False)
#     prompt = Column(String, nullable=False)
#     notes = Column(String, nullable=False)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
#     session_name = Column(String, nullable=False)


# class Message(Base):
#     __tablename__ = "messages"

#     id = Column(Integer, primary_key=True, nullable=False)
#     input = Column(String, nullable=False)
#     output = Column(String, nullable=False)
#     chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


# class Flashcard(Base):
#     __tablename__ = "flashcards"

#     id = Column(Integer, primary_key=True, nullable=False)
#     chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
#     user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
#     question = Column(String, nullable=False)
#     answer = Column(String, nullable=False)
#     difficulty = Column(String, default="medium")  # easy, medium, hard
#     created_at = Column(DateTime, default=datetime.utcnow)


from .database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from datetime import datetime


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
    youtube_transcript = Column(Text, nullable=False)  # Plain text for AI
    youtube_transcript_timed = Column(Text, nullable=True)  # JSON string of timed segments
    prompt = Column(String, nullable=False)
    notes = Column(Text, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    session_name = Column(String, nullable=False)


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, nullable=False)
    input = Column(Text, nullable=False)
    output = Column(Text, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)


class Flashcard(Base):
    __tablename__ = "flashcards"

    id = Column(Integer, primary_key=True, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    difficulty = Column(String, default="medium")  # easy, medium, hard
    hint = Column(Text, nullable=True)  
    timestamp = Column(String, nullable=True)  
    explanation = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
