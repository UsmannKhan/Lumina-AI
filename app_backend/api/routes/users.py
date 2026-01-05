from fastapi import Depends
from sqlalchemy.orm import Session 
from .. import models
from .. import schemas
from fastapi import APIRouter
from ..database import get_db

router = APIRouter(
    prefix='/users',
    tags=['Users']
)

# @router.post("/")
# def create_user(user: schemas.CreateUser, db: Session = Depends(get_db)):
#     new_user = models.User(
#         username = user.username,
#         password = user.password,
#         email = user.email
#     )
#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)
#     return new_user

@router.delete("/{id}")
def delete_user(id, db:Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id == id
    ).first()

    db.delete(user)
    db.commit()

@router.get("/{id}", response_model=schemas.UserOut)
def get_user(id, db:Session = Depends(get_db)):
    user = db.query(models.User).filter(
        models.User.id == id
    ).first()

    return user