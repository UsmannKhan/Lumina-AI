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
from fastapi import HTTPException, Depends
from sqlalchemy.orm import Session 
from starlette import status
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db
from ..config import user_dependency
from ..gemini_client import client

router = APIRouter(
    prefix='/messages',
    tags=['Messages']
)

# Improved conversational prompt
CHAT_PROMPT = """You are a knowledgeable assistant helping someone understand and discuss a YouTube video they just watched or are watching currently.

## Your Personality:
- Friendly and conversational, like a smart friend explaining things
- Confident in your answers but open to discussion
- You CAN share opinions and perspectives when asked - users want engagement, not disclaimers
- Use casual language, contractions, and natural speech patterns

## Rules:
- Base answers on the video transcript provided, the prior conversation history as the primary focus but also your own knowledge if helpful to supplement the answer
- If asked for opinions (e.g., "do you agree?", "what do you think?"), engage thoughtfully - analyze pros/cons, share a perspective
- Don't start responses with "Great question!" or similar filler
- Don't say "As an AI..." or give disclaimers about being AI
- Use markdown formatting: **bold** for emphasis, bullet points for lists
- Keep responses focused - if the answer is simple, keep it short
- If something isn't in the transcript, tell the user that the video doesn't cover it if they do not know and use your own vast knowledge to answer if helpful

## Video Transcript:
{transcript}

{conversation_history}

## User: {question}

## Your response:"""


@router.post("/")
def create_message(message: schemas.CreateMessage, user: user_dependency, db: Session = Depends(get_db)):
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
    
    # Generate response
    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=CHAT_PROMPT.format(
            transcript=chat.youtube_transcript,
            question=message.input,
            conversation_history=conversation_history
        ),
    )
    output = response.text

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