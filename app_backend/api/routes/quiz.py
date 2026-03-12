from typing import List, Union, Optional
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
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
    prefix='/quiz',
    tags=['Quiz']
)


# ============== Schemas ==============

class QuizGenerateRequest(BaseModel):
    mcq_count: int = 5
    tf_count: int = 3
    short_answer_count: int = 2
    difficulty: str = "mixed"  # easy, medium, hard, mixed
    topic_ids: List[int] = []
    focus_prompt: Optional[str] = None
    set_name: Optional[str] = None


# ============== Prompts ==============

def get_quiz_prompt(
    transcript: str, 
    mcq_count: int = 5, 
    tf_count: int = 3, 
    short_count: int = 2,
    difficulty: str = "mixed",
    topics: List[str] = None,
    focus_prompt: str = None
) -> str:
    topic_instruction = ""
    if topics:
        topic_instruction = f"\nFOCUS ON THESE TOPICS: {', '.join(topics)}\n"
    
    focus_instruction = ""
    if focus_prompt:
        focus_instruction = f"\nADDITIONAL FOCUS: {focus_prompt}\n"
    
    difficulty_instruction = ""
    if difficulty != "mixed":
        difficulty_instruction = f"\nDIFFICULTY LEVEL: All questions should be {difficulty} difficulty.\n"
    
    return f"""Analyze this content and create a quiz with mixed question types.

CREATE EXACTLY:
- {mcq_count} multiple choice questions (MCQ)
- {tf_count} true/false questions
- {short_count} short answer questions
{topic_instruction}{focus_instruction}{difficulty_instruction}
RULES:
- Questions should test understanding of key concepts
- MCQ should have 4 options with only 1 correct answer
- True/False statements should be clear, not tricky
- Short answer questions should require 1-3 sentence responses
- All questions should be answerable from the content
- Include brief explanations for MCQ and T/F answers
- For short answer, include the ideal answer and 2-4 key points to look for
- Never start with "According to the transcript" - use "Based on the content" or "According to the video" if needed.

Return ONLY valid JSON in this exact format:
{{
  "mcq": [
    {{
      "question": "What is the recommended rep tempo range?",
      "options": ["1-2 seconds", "2-8 seconds", "10-15 seconds", "20-30 seconds"],
      "correct_index": 1,
      "explanation": "The video recommends 2-8 seconds per rep for optimal muscle growth."
    }}
  ],
  "true_false": [
    {{
      "statement": "Lying hamstring curls are more effective than seated curls.",
      "correct_answer": false,
      "explanation": "Seated curls pre-stretch the hamstring, leading to ~1.5x more growth."
    }}
  ],
  "short_answer": [
    {{
      "question": "Explain why seated hamstring curls are preferred over lying curls.",
      "ideal_answer": "Seated hamstring curls are preferred because the seated position pre-stretches the hamstring at the start of the movement. This pre-stretch leads to approximately 1.5x more muscle growth compared to lying curls.",
      "key_points": ["pre-stretch", "seated position", "more growth", "1.5x"]
    }}
  ]
}}

TRANSCRIPT:
{transcript}

JSON:"""



def get_grading_prompt(question: str, ideal_answer: str, key_points: List[str], user_answer: str) -> str:
    return f"""Grade this short answer response.

QUESTION: {question}

IDEAL ANSWER: {ideal_answer}

KEY POINTS TO LOOK FOR: {', '.join(key_points)}

USER'S ANSWER: {user_answer}

GRADING RULES:
- Be lenient with wording - focus on concepts in the video transcript, not exact phrasing
- Give partial credit for partially correct answers
- Score from 0-100
- 70+ is considered "correct"
- Provide brief, encouraging feedback
- Primarily match the answer against the teachings and the concepts from the video transcript and not general knowledge so if a concept or an answer is generally also correct but not mentioned, or a different technique, concept or answer is in the transcript, do not award a lot of points for it and explain to the user like "Based on the video content...".

Return ONLY valid JSON:
{{
  "score": 85,
  "correct": true,
  "feedback": "Good answer! You correctly identified that..."
}}

JSON:"""


# ============== Parser ==============

def parse_quiz_response(response_text: str) -> List[dict]:
    """Parse AI response into list of questions"""
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
    start = text.find('{')
    end = text.rfind('}') + 1
    
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in response")
    
    json_str = text[start:end]
    data = json.loads(json_str)
    
    questions = []
    
    for q in data.get('mcq', []):
        questions.append({
            'type': 'mcq',
            'question': q['question'],
            'options': q['options'],
            'correct_index': q['correct_index'],
            'explanation': q['explanation']
        })
    
    for q in data.get('true_false', []):
        questions.append({
            'type': 'true_false',
            'statement': q['statement'],
            'correct_answer': q['correct_answer'],
            'explanation': q['explanation']
        })
    
    for q in data.get('short_answer', []):
        questions.append({
            'type': 'short_answer',
            'question': q['question'],
            'ideal_answer': q['ideal_answer'],
            'key_points': q['key_points']
        })
    
    if not questions:
        raise ValueError("No valid questions found")
    
    import random
    random.shuffle(questions)
    
    return questions


def parse_grade_response(response_text: str) -> dict:
    """Parse AI grading response"""
    text = response_text.strip()
    
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    elif '```' in text:
        parts = text.split('```')
        if len(parts) >= 2:
            text = parts[1]
    
    text = text.strip()
    start = text.find('{')
    end = text.rfind('}') + 1
    
    if start == -1 or end <= start:
        raise ValueError("No JSON object found")
    
    return json.loads(text[start:end])


# ============== Endpoints ==============

@router.get("/{chat_id}")
def get_quizzes(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Get existing quizzes for a chat. Does NOT auto-generate."""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get existing quizzes with their questions
    quizzes = db.query(models.Quiz).filter(
        models.Quiz.chat_id == chat_id,
        models.Quiz.user_id == user['id']
    ).order_by(models.Quiz.created_at.desc()).all()
    
    result = []
    for quiz in quizzes:
        questions = db.query(models.QuizQuestion).filter(
            models.QuizQuestion.quiz_id == quiz.id
        ).all()
        
        result.append({
            "id": quiz.id,
            "set_name": quiz.set_name,
            "total_questions": quiz.total_questions,
            "score": quiz.score,
            "completed": quiz.completed,
            "difficulty": quiz.difficulty,
            "created_at": quiz.created_at.isoformat() if quiz.created_at else None,
            "questions": [
                {
                    "id": q.id,
                    "type": q.question_type,
                    "question": q.question_text,
                    "options": q.options,  # JSON column auto-deserializes to list
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation,
                    "user_answer": q.user_answer,
                    "is_correct": q.is_correct
                } for q in questions
            ]
        })
    
    return {
        "chat_id": chat_id,
        "video_title": chat.session_name,
        "quizzes": result
    }


@router.post("/{chat_id}/generate")
@limiter.limit("10/hour")  # AI quiz generation
def generate_quiz(
    http_request: Request,
    chat_id: int, 
    request: QuizGenerateRequest,
    user: user_dependency, 
    db: Session = Depends(get_db)
):
    """Generate a new quiz with custom options."""
    
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
            models.KeyConcept.id.in_(request.topic_ids)
        ).all()
        topics = [c.title for c in concepts]
    
    try:
        transcript = chat.source_content[:15000]
        
        # Generate quiz with AI
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=get_quiz_prompt(
                transcript,
                mcq_count=request.mcq_count,
                tf_count=request.tf_count,
                short_count=request.short_answer_count,
                difficulty=request.difficulty,
                topics=topics,
                focus_prompt=request.focus_prompt
            ),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="MEDIUM")
            ),
        )
        
        questions = parse_quiz_response(response.text)
        
        # Create Quiz record
        total = request.mcq_count + request.tf_count + request.short_answer_count
        quiz = models.Quiz(
            chat_id=chat_id,
            user_id=user['id'],
            set_name=request.set_name or f"Quiz {len(db.query(models.Quiz).filter(models.Quiz.chat_id == chat_id).all()) + 1}",
            mcq_count=request.mcq_count,
            tf_count=request.tf_count,
            short_answer_count=request.short_answer_count,
            difficulty=request.difficulty,
            total_questions=total,
            completed=0
        )
        db.add(quiz)
        db.commit()
        db.refresh(quiz)
        
        # Create QuizQuestion records
        for q in questions:
            q_type = q['type']
            if q_type == 'mcq':
                question = models.QuizQuestion(
                    quiz_id=quiz.id,
                    question_type='mcq',
                    question_text=q['question'],
                    options=q['options'],  # Pass raw list for JSONB
                    correct_answer=str(q['correct_index']),
                    explanation=q.get('explanation')
                )
            elif q_type == 'true_false':
                question = models.QuizQuestion(
                    quiz_id=quiz.id,
                    question_type='true_false',
                    question_text=q['statement'],
                    correct_answer=str(q['correct_answer']).lower(),
                    explanation=q.get('explanation')
                )
            elif q_type == 'short_answer':
                question = models.QuizQuestion(
                    quiz_id=quiz.id,
                    question_type='short_answer',
                    question_text=q['question'],
                    correct_answer=q['ideal_answer'],
                    explanation=json.dumps(q.get('key_points', []))
                )
            else:
                continue
            db.add(question)
        
        db.commit()
        
        # Return the quiz with questions
        saved_questions = db.query(models.QuizQuestion).filter(
            models.QuizQuestion.quiz_id == quiz.id
        ).all()
        
        return {
            "id": quiz.id,
            "chat_id": chat_id,
            "set_name": quiz.set_name,
            "total_questions": quiz.total_questions,
            "questions": [
                {
                    "id": q.id,
                    "type": q.question_type,
                    "question": q.question_text,
                    "options": q.options,  # JSON column auto-deserializes to list
                    "correct_answer": q.correct_answer,
                    "explanation": q.explanation
                } for q in saved_questions
            ]
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse quiz: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/grade", response_model=schemas.GradeResponse)
@limiter.limit("30/hour")  # AI grading - allow smooth quiz taking
def grade_short_answer(http_request: Request, request: schemas.GradeRequest, user: user_dependency):
    """Grade a short answer response using AI"""
    
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=get_grading_prompt(
                request.question,
                request.ideal_answer,
                request.key_points,
                request.user_answer
            ),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="LOW")
            ),
        )
        
        result = parse_grade_response(response.text)
        
        return {
            "correct": result.get('correct', result.get('score', 0) >= 70),
            "score": result.get('score', 0),
            "feedback": result.get('feedback', 'Answer evaluated.')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade answer: {str(e)}")


@router.delete("/{quiz_id}")
def delete_quiz(
    quiz_id: int,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Delete a quiz and all its questions"""
    
    quiz = db.query(models.Quiz).filter(
        models.Quiz.id == quiz_id,
        models.Quiz.user_id == user['id']
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Delete all questions first
    db.query(models.QuizQuestion).filter(
        models.QuizQuestion.quiz_id == quiz_id
    ).delete()
    
    # Delete the quiz
    db.delete(quiz)
    db.commit()
    
    return {"message": f"Quiz '{quiz.set_name}' deleted", "id": quiz_id}


class QuizCompleteRequest(BaseModel):
    score: int


@router.put("/{quiz_id}/complete")
def complete_quiz(
    quiz_id: int,
    request: QuizCompleteRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Save the score when a quiz is completed"""
    
    quiz = db.query(models.Quiz).filter(
        models.Quiz.id == quiz_id,
        models.Quiz.user_id == user['id']
    ).first()
    
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    
    # Update score and mark as completed
    quiz.score = request.score
    quiz.completed = 2  # 2 = completed
    db.commit()
    
    return {
        "message": "Quiz score saved",
        "quiz_id": quiz_id,
        "score": request.score,
        "total_questions": quiz.total_questions
    }


