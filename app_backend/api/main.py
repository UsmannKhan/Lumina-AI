from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from .models import Base
from .database import engine
from .rate_limit import limiter
from .routes import users, chats, messages, auth, flashcards, quiz, code, spaces

# Base.metadata.create_all(bind=engine)

app = FastAPI()

# Register limiter with app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=['http://localhost:3000'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(spaces.router)
app.include_router(chats.router)
app.include_router(messages.router)
app.include_router(flashcards.router)
app.include_router(quiz.router)
app.include_router(code.router)
