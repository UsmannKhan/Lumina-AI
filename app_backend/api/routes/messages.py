# from typing import List
# from fastapi import HTTPException, Depends
# from sqlalchemy.orm import Session 
# from starlette import status
# from .. import models
# from .. import schemas
# from fastapi import APIRouter
# from ..database import get_db
# from ..config import user_dependency
# from ..gemini_client import client

# router = APIRouter(
#     prefix='/messages',
#     tags=['Messages']
# )

# # @router.post("/")
# # def create_message(message: schemas.CreateMessage, user: user_dependency, db: Session = Depends(get_db)):
# #     chat = db.query(models.Chat).filter(models.Chat.id == message.chat_id, models.Chat.user_id == user['id']).first()
# #     if not chat:
# #         raise HTTPException(status_code=404, detail="Chat not found")
    
# #     transcript = chat.youtube_transcript
# #     response_message = client.models.generate_content(
# #           model="gemini-2.5-flash",
# #           contents=f"{message.input} for reference: {transcript}",
# #         )
# #     output = response_message.text

# #     new_message = models.Message(
# #         input = message.input,
# #         output = output,
# #         chat_id = message.chat_id,
# #         user_id = user['id']
# #     )
# #     db.add(new_message)
# #     db.commit()
# #     db.refresh(new_message)
# #     return {
# #         "id": new_message.id,
# #         "input": message.input,
# #         "output": output,
# #         "chat_id": new_message.chat_id,
# #         "user_id": new_message.user_id
# #     }


# # # Chat prompt template
# # CHAT_PROMPT = """You are a helpful AI assistant that answers questions about a YouTube video.

# # ## Context:
# # You have access to the full transcript of the video. Use it to provide accurate, helpful answers.

# # ## Instructions:
# # - Answer the user's question based on the video content
# # - Be concise but thorough
# # - If the answer isn't in the transcript, say so
# # - Use quotes from the transcript when relevant
# # - Format your response with markdown for readability

# # ## Video Transcript:
# # {transcript}

# # ## User Question:
# # {question}

# # ## Your Answer:
# # """


# # @router.post("/")
# # def create_message(message: schemas.CreateMessage, user: user_dependency, db: Session = Depends(get_db)):
# #     # Get the chat and verify ownership
# #     chat = db.query(models.Chat).filter(
# #         models.Chat.id == message.chat_id, 
# #         models.Chat.user_id == user['id']
# #     ).first()
    
# #     if not chat:
# #         raise HTTPException(status_code=404, detail="Chat not found")
    
# #     # Generate response with improved prompt
# #     response = client.models.generate_content(
# #         model="gemini-2.5-flash",
# #         contents=CHAT_PROMPT.format(
# #             transcript=chat.youtube_transcript,
# #             question=message.input
# #         ),
# #     )
# #     output = response.text

# #     # Save message
# #     new_message = models.Message(
# #         input=message.input,
# #         output=output,
# #         chat_id=message.chat_id,
# #         user_id=user['id']
# #     )
# #     db.add(new_message)
# #     db.commit()
# #     db.refresh(new_message)
    
# #     return {
# #         "id": new_message.id,
# #         "input": new_message.input,
# #         "output": new_message.output,
# #         "chat_id": new_message.chat_id
# #     }


# # Chat prompt template
# CHAT_PROMPT = """You are a helpful AI assistant that answers questions about a YouTube video.

# ## Context:
# You have access to the full transcript of the video and the previous conversation history. Use it to provide accurate, helpful answers.

# ## Instructions:
# - Answer the user's question based on the video content and the previous conversation
# - Be concise but thorough
# - If the answer isn't in the transcript, say so
# - Use quotes from the transcript when relevant
# - Format your response with markdown for readability

# ## Video Transcript:
# {transcript}

# {conversation_history}

# ## User Question:
# {question}

# ## Your Answer:
# """


# @router.post("/")
# def create_message(message: schemas.CreateMessage, user: user_dependency, db: Session = Depends(get_db)):
#     # Get the chat and verify ownership
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == message.chat_id, 
#         models.Chat.user_id == user['id']
#     ).first()
    
#     if not chat:
#         raise HTTPException(status_code=404, detail="Chat not found")
    
#     # Get all previous messages for context
#     previous_messages = db.query(models.Message).filter(
#         models.Message.chat_id == message.chat_id,
#         models.Message.user_id == user['id']
#     ).order_by(models.Message.id).all()
    
#     # Build conversation history
#     conversation_history = ""
#     if previous_messages:
#         conversation_history = "## Previous Conversation:\n"
#         for msg in previous_messages:
#             conversation_history += f"\n**User:** {msg.input}\n\n**Assistant:** {msg.output}\n"
    
#     # Generate response with conversation context
#     response = client.models.generate_content(
#         model="gemini-2.5-flash",
#         contents=CHAT_PROMPT.format(
#             transcript=chat.youtube_transcript,
#             question=message.input,
#             conversation_history=conversation_history
#         ),
#     )
#     output = response.text

#     # Save message
#     new_message = models.Message(
#         input=message.input,
#         output=output,
#         chat_id=message.chat_id,
#         user_id=user['id']
#     )
#     db.add(new_message)
#     db.commit()
#     db.refresh(new_message)
    
#     return {
#         "id": new_message.id,
#         "input": new_message.input,
#         "output": new_message.output,
#         "chat_id": new_message.chat_id
#     }


# @router.get("/{chat_id}", response_model=List[schemas.MessageOut])
# def get_chat_messages(chat_id, user: user_dependency, db:Session = Depends(get_db)):
#     chat = db.query(models.Chat).filter(
#         models.Chat.id == chat_id,
#         models.Chat.user_id == user['id']
#     ).first()

#     chat_messages = db.query(models.Message).filter(
#         models.Message.chat_id == chat_id,
#         models.Message.user_id == user['id']
#     ).all()

#     return chat_messages


from typing import List
from fastapi import HTTPException, Depends, Request
from sqlalchemy.orm import Session 
from starlette import status
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client
from ..rate_limit import limiter
from google.genai import types

router = APIRouter(
    prefix='/messages',
    tags=['Messages']
)

# ============== Chat Style Prompts ==============

STYLE_PROMPTS = {
    "study": """You are an expert tutor helping someone deeply understand the content of "{content_title}".

## Your Approach:
- Provide detailed explanations with examples when helpful
- Break down complex concepts into digestible parts
- Use analogies to connect new ideas to familiar ones
- Encourage deeper thinking with follow-up questions when appropriate
- Cite specific parts of the {source_type_label} when relevant

## Rules:
- Base answers on the {source_type_label} content provided and conversation history
- Use markdown: **bold** for key terms, bullet points for steps/lists, `code` for technical terms
- If something isn't covered in the {source_type_label}, say so and supplement with your knowledge
- Don't start with filler like "Great question!"
- Don't say "As an AI..." or give disclaimers

## {source_type_label_cap} Content:
{transcript}

{conversation_history}

## Student's Question: {question}

## Your explanation:""",

    "conversational": """You are a knowledgeable friend chatting about "{content_title}".

## Your Personality:
- Casual and friendly, like texting with a smart friend
- Use contractions & natural speech patterns
- Share opinions when asked - be engaging, not robotic
- Keep it chill but informative

## Rules:
- Base answers on the {source_type_label} content and prior conversation
- Keep responses focused - short answers for simple questions
- Use markdown when helpful: **bold**, bullet points
- If the {source_type_label} doesn't cover something, say so and share what you know
- No filler phrases, no AI disclaimers

## {source_type_label_cap} Content:
{transcript}

{conversation_history}

## User: {question}

## Your response:""",

    "concise": """You are a helpful assistant providing brief, direct answers about "{content_title}".

## Rules:
- Be direct and to the point - no fluff
- Use bullet points for multiple items
- One-sentence answers when possible
- Only elaborate if the question requires it
- Base answers on the {source_type_label} content
- If not in the {source_type_label}, briefly supplement from your knowledge

## {source_type_label_cap} Content:
{transcript}

{conversation_history}

## Question: {question}

## Answer:"""
}

def get_chat_prompt(chat, question: str, conversation_history: str) -> str:
    """Get the appropriate prompt based on chat style."""
    style = getattr(chat, 'chat_style', 'study') or 'study'
    
    # Determine source type label based on chat.source_type
    source_type = getattr(chat, 'source_type', 'video') or 'video'
    source_type_labels = {
        'video': 'video',
        'pdf': 'PDF document',
        'youtube': 'video',
    }
    source_type_label = source_type_labels.get(source_type, 'content')
    source_type_label_cap = source_type_label.capitalize() if source_type_label != 'PDF document' else 'PDF Document'
    
    # Get content title from session_name
    content_title = getattr(chat, 'session_name', 'Untitled') or 'Untitled'
    
    if style == 'custom':
        custom_instructions = getattr(chat, 'custom_instructions', '') or ''
        if custom_instructions.strip():
            # Custom style uses user's instructions as the base prompt
            return f"""{custom_instructions}

## Content Title: {content_title}

## Content:
{chat.source_content}

{conversation_history}

## User: {question}

## Your response:"""
        else:
            # Fall back to study if no custom instructions
            style = 'study'
    
    template = STYLE_PROMPTS.get(style, STYLE_PROMPTS['study'])
    return template.format(
        transcript=chat.source_content,
        question=question,
        conversation_history=conversation_history,
        content_title=content_title,
        source_type_label=source_type_label,
        source_type_label_cap=source_type_label_cap
    )


@router.post("/")
@limiter.limit("30/hour")  # AI chat messages - allow smooth chatting
def create_message(request: Request, message: schemas.CreateMessage, user: user_dependency, db: Session = Depends(get_db)):
    
    # Get the chat and verify ownership
    chat = db.query(models.Chat).filter(
        models.Chat.id == message.chat_id, 
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Get previous messages for context (limit to last 10 to avoid token overflow)
    previous_messages = db.query(models.Message).filter(
        models.Message.chat_id == message.chat_id,
        models.Message.user_id == user['id']
    ).order_by(models.Message.id.desc()).limit(10).all()
    
    # Reverse to get chronological order
    previous_messages = list(reversed(previous_messages))
    
    # Build conversation history
    conversation_history = ""
    if previous_messages:
        conversation_history = "## Conversation so far:\n"
        for msg in previous_messages:
            conversation_history += f"User: {msg.input}\n"
            conversation_history += f"You: {msg.output}\n\n"
    
    prompt = get_chat_prompt(chat, message.input, conversation_history)
    
    # Configure grounding with Google Search if enabled
    config = None
    if message.use_web_search:
        grounding_tool = types.Tool(google_search=types.GoogleSearch())
        config = types.GenerateContentConfig(tools=[grounding_tool])
    
    # Generate response
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
        config=config
    )
    output = response.text
    
    # Extract citations if grounding was used
    citations = []
    if message.use_web_search and response.candidates:
        candidate = response.candidates[0]
        if hasattr(candidate, 'grounding_metadata') and candidate.grounding_metadata:
            metadata = candidate.grounding_metadata
            if hasattr(metadata, 'grounding_chunks') and metadata.grounding_chunks:
                for i, chunk in enumerate(metadata.grounding_chunks):
                    if hasattr(chunk, 'web') and chunk.web:
                        citations.append({
                            "index": i + 1,
                            "title": chunk.web.title if hasattr(chunk.web, 'title') else "",
                            "uri": chunk.web.uri if hasattr(chunk.web, 'uri') else ""
                        })
    
    # Append citations to output if any
    if citations:
        output += "\n\n---\n**Sources:**\n"
        for cite in citations:
            output += f"- [{cite['title']}]({cite['uri']})\n"

    # Save message
    new_message = models.Message(
        input=message.input,
        output=output,
        chat_id=message.chat_id,
        user_id=user['id']
    )
    db.add(new_message)
    db.commit()
    db.refresh(new_message)
    
    return {
        "id": new_message.id,
        "input": new_message.input,
        "output": new_message.output,
        "chat_id": new_message.chat_id
    }


@router.get("/{chat_id}", response_model=List[schemas.MessageOut])
def get_chat_messages(chat_id: int, user: user_dependency, db: Session = Depends(get_db)):
    chat = db.query(models.Chat).filter(
        models.Chat.id == chat_id,
        models.Chat.user_id == user['id']
    ).first()
    
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")

    chat_messages = db.query(models.Message).filter(
        models.Message.chat_id == chat_id,
        models.Message.user_id == user['id']
    ).order_by(models.Message.id.asc()).all()

    return chat_messages