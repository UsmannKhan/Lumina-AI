from typing import List, Union
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import models
from .. import schemas
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

# class MCQQuestion(BaseModel):
#     type: str = "mcq"
#     question: str
#     options: List[str]
#     correct_index: int
#     explanation: str


# class TrueFalseQuestion(BaseModel):
#     type: str = "true_false"
#     statement: str
#     correct_answer: bool
#     explanation: str


# class ShortAnswerQuestion(BaseModel):
#     type: str = "short_answer"
#     question: str
#     ideal_answer: str  # For reference, AI will grade flexibly
#     key_points: List[str]  # Key concepts that should be mentioned


# class QuizResponse(BaseModel):
#     chat_id: int
#     video_title: str
#     questions: List[dict]


# class GradeRequest(BaseModel):
#     question: str
#     ideal_answer: str
#     key_points: List[str]
#     user_answer: str


# class GradeResponse(BaseModel):
#     correct: bool
#     score: int  # 0-100
#     feedback: str


# ============== Prompts ==============

def get_quiz_prompt(transcript: str) -> str:
    return f"""Analyze this video transcript and create a quiz with mixed question types.

CREATE EXACTLY:
- 4 multiple choice questions (MCQ)
- 3 true/false questions
- 3 short answer questions

RULES:
- Questions should test understanding of key concepts
- MCQ should have 4 options with only 1 correct answer
- True/False statements should be clear, not tricky
- Short answer questions should require 1-3 sentence responses
- All questions should be answerable from the transcript
- Include brief explanations for MCQ and T/F answers
- For short answer, include the ideal answer and 2-4 key points to look for
- Never start a question or the brief explanation with "According to the transcript" or similar phrases, rather use "Based on the content" or "According to the video" etc. if really needed.

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

@router.get("/{chat_id}", response_model=schemas.QuizResponse)
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
        
        return {
            "chat_id": chat_id,
            "video_title": chat.session_name,
            "questions": questions
        }
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse quiz: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate quiz: {str(e)}")


@router.post("/grade", response_model=schemas.GradeResponse)
def grade_short_answer(request: schemas.GradeRequest, user: user_dependency):
    """Grade a short answer response using AI"""
    
    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=get_grading_prompt(
                request.question,
                request.ideal_answer,
                request.key_points,
                request.user_answer
            )
        )
        
        result = parse_grade_response(response.text)
        
        return {
            "correct": result.get('correct', result.get('score', 0) >= 70),
            "score": result.get('score', 0),
            "feedback": result.get('feedback', 'Answer evaluated.')
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to grade answer: {str(e)}")