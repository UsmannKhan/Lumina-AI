from typing import List, Optional
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from .. import models
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
from google.genai import types
from ..rate_limit import limiter
import json
from datetime import datetime

router = APIRouter(
    prefix='/code',
    tags=['Code Practice']
)


# ============== Schemas ==============

class CodeProblemResponse(BaseModel):
    id: int
    title: str
    description: str
    difficulty: str
    examples: List[dict]
    hints: List[str]
    solution: Optional[str] = None

class CodeProblemsListResponse(BaseModel):
    is_cs_video: bool
    problems: List[CodeProblemResponse]

class CodeEvaluateRequest(BaseModel):
    problem_id: int
    code: str
    language: str

class CodeEvaluationResponse(BaseModel):
    score: int  # 0-100
    is_correct: bool
    feedback: str
    suggestions: List[str]


# ============== Prompts ==============

def get_cs_check_prompt(transcript: str) -> str:
    return f"""Analyze this video transcript and determine if it is about programming, coding, computer science, or software development.

TRANSCRIPT:
{transcript[:3000]}

Reply with ONLY "yes" or "no" - nothing else."""


def get_problems_prompt(transcript: str) -> str:
    return f"""Analyze this programming/CS video transcript and create 3 coding problems based on the content.

TRANSCRIPT:
{transcript}

Create exactly 3 problems with these difficulties:
1. EASY - A simple problem to practice basic concepts
2. MEDIUM - A moderate problem requiring understanding of the topic
3. HARD - A challenging problem that tests deep understanding

For each problem, provide:
- title: Short descriptive title
- description: Clear problem statement with requirements
- examples: 2-3 input/output examples
- hints: 2-3 progressive hints (from vague to more specific)
- solution: A reference solution in Python

IMPORTANT:
- Problems should be directly related to concepts taught in the video
- Use practical, realistic scenarios
- Make problems self-contained and clearly defined
- Include edge cases in harder problems

Return as JSON array:
[
  {{
    "title": "Problem Title",
    "description": "Full problem description...",
    "difficulty": "easy",
    "examples": [
      {{"input": "example input", "output": "expected output", "explanation": "optional explanation"}}
    ],
    "hints": ["First hint", "Second hint", "Third hint"],
    "solution": "def solution(...):\\n    # code here"
  }},
  ...
]

Return ONLY the JSON array, no other text."""


def get_evaluation_prompt(problem: dict, code: str, language: str) -> str:
    return f"""Evaluate this code submission for a programming problem.

PROBLEM:
Title: {problem['title']}
Description: {problem['description']}
Difficulty: {problem['difficulty']}

Expected behavior (examples):
{json.dumps(problem.get('examples', []), indent=2)}

Reference solution:
{problem.get('solution', 'Not provided')}

USER'S SUBMISSION ({language}):
```{language}
{code}
```

Evaluate the submission and provide:
1. score: 0-100 based on correctness, efficiency, and code quality
2. is_correct: true if the solution would work for all cases, false otherwise
3. feedback: Detailed explanation of what's good and what needs improvement
4. suggestions: List of specific improvements

Consider:
- Does the logic solve the problem correctly?
- Are edge cases handled?
- Is the code readable and well-structured?
- Is it reasonably efficient?

Return as JSON:
{{
  "score": 85,
  "is_correct": true,
  "feedback": "Your solution correctly implements... However...",
  "suggestions": ["Consider using...", "You could improve..."]
}}

Return ONLY the JSON object, no other text."""


# ============== Endpoints ==============

@router.get("/{chat_id}", response_model=CodeProblemsListResponse)
async def get_code_problems(
    chat_id: int,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Get existing coding problems for a chat, with CS video check"""
    user_id = user.get('id')
    
    # Check if chat exists and belongs to user
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user_id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get existing problems
    problems = db.query(models.CodingProblem).filter(
        models.CodingProblem.chat_id == chat_id,
        models.CodingProblem.user_id == user_id
    ).all()
    
    if problems:
        # Already have problems, return them
        result = []
        for p in problems:
            result.append(CodeProblemResponse(
                id=p.id,
                title=p.title,
                description=p.description,
                difficulty=p.difficulty,
                examples=json.loads(p.examples) if p.examples else [],
                hints=json.loads(p.hints) if p.hints else [],
                solution=p.solution
            ))
        return CodeProblemsListResponse(is_cs_video=True, problems=result)
    
    # No problems yet - check cached is_cs_content first
    if chat.is_cs_content is not None:
        # Use cached value (instant!)
        return CodeProblemsListResponse(is_cs_video=chat.is_cs_content, problems=[])
    
    # Not cached yet - check with AI
    transcript = chat.source_content or ""
    if not transcript:
        # No content, cache as not CS
        chat.is_cs_content = False
        db.commit()
        return CodeProblemsListResponse(is_cs_video=False, problems=[])
    
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=get_cs_check_prompt(transcript),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="MINIMAL")
            ),
        )
        is_cs = response.text.strip().lower() == "yes"
        
        # Cache the result for future requests
        chat.is_cs_content = is_cs
        db.commit()
        
        return CodeProblemsListResponse(is_cs_video=is_cs, problems=[])
    except Exception as e:
        print(f"CS check error: {e}")
        # On error, don't cache - allow retry later
        return CodeProblemsListResponse(is_cs_video=True, problems=[])


@router.post("/{chat_id}/generate", response_model=CodeProblemsListResponse)
@limiter.limit("5/hour")  # AI code problem generation
async def generate_code_problems(
    request: Request,
    chat_id: int,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Generate 3 coding problems (easy, medium, hard) from video content"""
    user_id = user.get('id')
    
    # Check if chat exists
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user_id
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    transcript = chat.source_content or ""
    if not transcript:
        raise HTTPException(status_code=400, detail="No content available")
    
    # Generate problems using AI
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=get_problems_prompt(transcript),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="HIGH")
            ),
        )
        
        response_text = response.text.strip()
        # Clean up markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        problems_data = json.loads(response_text)
        
        # Save to database
        result = []
        for p in problems_data:
            problem = models.CodingProblem(
                chat_id=chat_id,
                user_id=user_id,
                title=p.get('title', 'Untitled'),
                description=p.get('description', ''),
                difficulty=p.get('difficulty', 'medium'),
                examples=json.dumps(p.get('examples', [])),
                hints=json.dumps(p.get('hints', [])),
                solution=p.get('solution', '')
            )
            db.add(problem)
            db.flush()  # Get the ID
            
            result.append(CodeProblemResponse(
                id=problem.id,
                title=problem.title,
                description=problem.description,
                difficulty=problem.difficulty,
                examples=p.get('examples', []),
                hints=p.get('hints', []),
                solution=p.get('solution', '')
            ))
        
        db.commit()
        return CodeProblemsListResponse(is_cs_video=True, problems=result)
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {e}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to generate problems: {e}")


@router.post("/{chat_id}/evaluate", response_model=CodeEvaluationResponse)
@limiter.limit("20/hour")  # AI code evaluation
async def evaluate_code(
    http_request: Request,
    chat_id: int,
    request: CodeEvaluateRequest,
    user: user_dependency,
    db: Session = Depends(get_db)
):
    """Evaluate user's code submission using AI"""
    user_id = user.get('id')
    
    # Get the problem
    problem = db.query(models.CodingProblem).filter(
        models.CodingProblem.id == request.problem_id,
        models.CodingProblem.user_id == user_id
    ).first()
    
    if not problem:
        raise HTTPException(status_code=404, detail="Problem not found")
    
    # Build problem dict for evaluation
    problem_dict = {
        'title': problem.title,
        'description': problem.description,
        'difficulty': problem.difficulty,
        'examples': json.loads(problem.examples) if problem.examples else [],
        'solution': problem.solution
    }
    
    try:
        response = client.models.generate_content(
            model="gemini-3-flash-preview",
            contents=get_evaluation_prompt(problem_dict, request.code, request.language),
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_level="HIGH")
            ),
        )
        
        response_text = response.text.strip()
        # Clean up markdown code blocks if present
        if response_text.startswith("```"):
            response_text = response_text.split("```")[1]
            if response_text.startswith("json"):
                response_text = response_text[4:]
        
        eval_result = json.loads(response_text)
        
        # Save submission
        submission = models.CodingSubmission(
            problem_id=problem.id,
            user_id=user_id,
            code=request.code,
            language=request.language,
            score=eval_result.get('score', 0),
            feedback=eval_result.get('feedback', ''),
            is_correct=1 if eval_result.get('is_correct', False) else 0
        )
        db.add(submission)
        db.commit()
        
        return CodeEvaluationResponse(
            score=eval_result.get('score', 0),
            is_correct=eval_result.get('is_correct', False),
            feedback=eval_result.get('feedback', 'Unable to evaluate'),
            suggestions=eval_result.get('suggestions', [])
        )
        
    except json.JSONDecodeError as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse evaluation: {e}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {e}")
