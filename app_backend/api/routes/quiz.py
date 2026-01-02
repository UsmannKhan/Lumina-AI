from typing import List, Optional, Union
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import models
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
import json

router = APIRouter(
    prefix='/quiz',
    tags=['Quiz']
)


# ============== Schemas ==============

class MCQQuestion(BaseModel):
    type: str = "mcq"
    question: str
    options: List[str]  # 4 options
    correct_index: int  # 0-3
    explanation: str


class TrueFalseQuestion(BaseModel):
    type: str = "true_false"
    statement: str
    correct_answer: bool
    explanation: str


class FillBlankQuestion(BaseModel):
    type: str = "fill_blank"
    question: str  # Contains _____ for blanks
    correct_answers: List[str]  # Acceptable answers
    explanation: str


QuizQuestion = Union[MCQQuestion, TrueFalseQuestion, FillBlankQuestion]


class QuizResponse(BaseModel):
    chat_id: int
    video_title: str
    questions: List[dict]  # Mixed question types


class AnswerSubmission(BaseModel):
    question_index: int
    answer: Union[int, bool, str]  # MCQ index, T/F bool, or text


class QuizResult(BaseModel):
    correct: bool
    correct_answer: Union[int, bool, str, List[str]]
    explanation: str


# ============== Prompt ==============

def get_quiz_prompt(transcript: str) -> str:
    return f"""Analyze this video transcript and create a quiz with mixed question types.

CREATE EXACTLY:
- 4 multiple choice questions (MCQ)
- 3 true/false questions
- 3 fill-in-the-blank questions

RULES:
- Questions should test understanding of key concepts
- MCQ should have 4 options with only 1 correct answer
- True/False statements should be clear, not tricky
- Fill-in-blank should have 1-2 blanks represented by _____
- All questions should be answerable from the transcript
- Include brief explanations for each answer

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
  "fill_blank": [
    {{
      "question": "The _____ hamstring curl pre-stretches the muscle for better growth.",
      "correct_answers": ["seated"],
      "explanation": "Seated position puts the hamstring in a stretched position at the start."
    }}
  ]
}}

TRANSCRIPT:
{transcript}

JSON:"""


# ============== Parser ==============

def parse_quiz_response(response_text: str) -> List[dict]:
    """Parse AI response into list of questions"""
    text = response_text.strip()
    
    # Remove markdown code blocks
    if '```json' in text:
        text = text.split('```json')[1].split('```')[0]
    elif '```' in text:
        parts = text.split('```')
        if len(parts) >= 2:
            text = parts[1]
            if text.startswith('json'):
                text = text[4:]
    
    text = text.strip()
    
    # Find JSON object
    start = text.find('{')
    end = text.rfind('}') + 1
    
    if start == -1 or end <= start:
        raise ValueError("No JSON object found in response")
    
    json_str = text[start:end]
    data = json.loads(json_str)
    
    # Combine all questions into a single list with type markers
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
    
    for q in data.get('fill_blank', []):
        questions.append({
            'type': 'fill_blank',
            'question': q['question'],
            'correct_answers': q['correct_answers'],
            'explanation': q['explanation']
        })
    
    if not questions:
        raise ValueError("No valid questions found")
    
    # Shuffle questions so types are mixed
    import random
    random.shuffle(questions)
    
    return questions


# ============== Endpoints ==============

@router.get("/{chat_id}", response_model=QuizResponse)
def generate_quiz(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    """Generate a quiz for a video"""
    
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    try:
        transcript = chat.youtube_transcript[:15000]
        
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=get_quiz_prompt(transcript)
        )
        
        questions = parse_quiz_response(response.text)
        
        # Return questions WITHOUT correct answers (for client-side quiz)
        # We'll strip answers for the response
        client_questions = []
        for q in questions:
            if q['type'] == 'mcq':
                client_questions.append({
                    'type': 'mcq',
                    'question': q['question'],
                    'options': q['options']
                })
            elif q['type'] == 'true_false':
                client_questions.append({
                    'type': 'true_false',
                    'statement': q['statement']
                })
            elif q['type'] == 'fill_blank':
                client_questions.append({
                    'type': 'fill_blank',
                    'question': q['question']
                })
        
        # Store full questions in memory/cache for answer checking
        # For simplicity, we'll return everything and let frontend handle it
        # In production, you'd store this server-side
        
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "questions": questions  # Frontend will hide answers until submission
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse quiz: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/{chat_id}/check")
def check_answer(
    chat_id: int, 
    submission: AnswerSubmission,
    user: user_dependency, 
    db: Session = Depends(get_db)
):
    """
    Check a single answer (optional endpoint if you want server-side validation)
    For now, since we return all answers, this is optional.
    Frontend can validate locally.
    """
    pass  # Implement if needed for server-side validation