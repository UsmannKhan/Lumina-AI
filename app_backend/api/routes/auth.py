from datetime import timedelta, datetime, timezone
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session 
from pydantic import BaseModel
from fastapi.security import OAuth2PasswordRequestForm
from jose import jwt
import os
from ..models import User
from ..database import get_db
from ..config import bcrypt_context
from ..schemas import UserCreateRequest, Token
from ..rate_limit import limiter

router = APIRouter(
    prefix='/auth',
    tags=['Auth']
)

SECRET_KEY = os.getenv("AUTH_SECRET_KEY")
ALGORITHM = os.getenv("AUTH_ALGORITHM")

def authenticate_user(username: str, password: str, db):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user

def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {'sub': username, 'id': user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({'exp': expires})
    return jwt.encode(encode, SECRET_KEY, algorithm = ALGORITHM)

@router.post("/", status_code=status.HTTP_201_CREATED)
@limiter.limit("3/minute")  # Prevent registration spam
async def create_user(request: Request, create_user_request: UserCreateRequest, db: Session = Depends(get_db)):
    create_user_model = User(
        email=create_user_request.email,
        username=create_user_request.username,
        hashed_password=bcrypt_context.hash(create_user_request.password)
    )
    db.add(create_user_model)
    db.commit()

@router.post('/token', response_model=Token)
@limiter.limit("5/minute")  # Prevent brute force login attacks
async def login_for_access_token(request: Request, form_data: Annotated[OAuth2PasswordRequestForm, Depends()], db: Session = Depends(get_db)):
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate user")
    token = create_access_token(user.username, user.id, timedelta(minutes=45))

    return {'access_token': token, 'token_type': 'bearer'}