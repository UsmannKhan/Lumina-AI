from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI 
from fastapi.middleware.cors import CORSMiddleware 
from .models import Base
from .database import engine
from .routes import users, chats, messages, auth, flashcards, quiz

# Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(chats.router)
app.include_router(messages.router)
app.include_router(flashcards.router)
app.include_router(quiz.router)



