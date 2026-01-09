from .database import Base
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Boolean
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
    chat_style = Column(String, default="study")  # study, conversational, concise, custom
    custom_instructions = Column(Text, nullable=True)  # User's custom prompt when style is "custom"
    manual_notes = Column(Text, nullable=True)  # User's own notes


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
    set_name = Column(String, nullable=True)  # For grouping flashcard sets
    created_at = Column(DateTime, default=datetime.utcnow)


class KeyConcept(Base):
    __tablename__ = "key_concepts"

    id = Column(Integer, primary_key=True, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(Float, nullable=True)  # Start timestamp in seconds
    end_time = Column(Float, nullable=True)    # End timestamp in seconds
    importance = Column(Integer, default=2)    # 1=essential, 2=important, 3=supplementary
    created_at = Column(DateTime, default=datetime.utcnow)


class Quiz(Base):
    __tablename__ = "quizzes"
    
    id = Column(Integer, primary_key=True, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    set_name = Column(String, nullable=True)
    mcq_count = Column(Integer, default=5)
    tf_count = Column(Integer, default=3)
    short_answer_count = Column(Integer, default=2)
    difficulty = Column(String, default="mixed")
    total_questions = Column(Integer, nullable=True)
    score = Column(Integer, nullable=True)  # User's score after completion
    completed = Column(Integer, default=0)  # 0=not started, 1=in progress, 2=completed
    created_at = Column(DateTime, default=datetime.utcnow)


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"
    
    id = Column(Integer, primary_key=True, nullable=False)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"), nullable=False)
    question_type = Column(String, nullable=False)  # 'mcq', 'true_false', 'short_answer'
    question_text = Column(Text, nullable=False)
    options = Column(JSON, nullable=True)  # JSON for MCQ options (stored as JSONB in PostgreSQL)
    correct_answer = Column(Text, nullable=False)
    explanation = Column(Text, nullable=True)
    user_answer = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=True)  # True=correct, False=wrong
    points = Column(Integer, default=1)


class CodingProblem(Base):
    __tablename__ = "coding_problems"
    
    id = Column(Integer, primary_key=True, nullable=False)
    chat_id = Column(Integer, ForeignKey("chats.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    difficulty = Column(String, nullable=False)  # 'easy', 'medium', 'hard'
    examples = Column(Text, nullable=True)  # JSON string with input/output examples
    hints = Column(Text, nullable=True)  # JSON array of hints
    solution = Column(Text, nullable=True)  # Reference solution
    created_at = Column(DateTime, default=datetime.utcnow)


class CodingSubmission(Base):
    __tablename__ = "coding_submissions"
    
    id = Column(Integer, primary_key=True, nullable=False)
    problem_id = Column(Integer, ForeignKey("coding_problems.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    code = Column(Text, nullable=False)
    language = Column(String, nullable=False)  # 'python', 'javascript', etc.
    score = Column(Integer, nullable=True)  # 0-100
    feedback = Column(Text, nullable=True)  # AI feedback
    is_correct = Column(Integer, default=0)  # 0=incorrect, 1=correct
    created_at = Column(DateTime, default=datetime.utcnow)

