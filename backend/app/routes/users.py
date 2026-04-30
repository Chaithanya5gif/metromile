from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User, UserRole
from pydantic import BaseModel
from typing import Optional

router = APIRouter(prefix="/users", tags=["Users"])

class UserCreate(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = "rider"

class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    phone: Optional[str]
    role: str
    class Config:
        from_attributes = True

@router.post("/", response_model=UserResponse)
def create_or_get_user(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.id == user.id).first()
    if existing:
        # Update name if it's currently a placeholder or missing
        if user.full_name and (not existing.full_name or existing.full_name in ["Rider", "Driver", "User", "Metro Driver"]):
            existing.full_name = user.full_name
            db.commit()
            db.refresh(existing)
        return existing
    
    new_user = User(id=user.id, email=user.email, full_name=user.full_name or "User", phone=user.phone, role=UserRole.rider)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}/role")
def update_user_role(user_id: str, role: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    user.role = role
    db.commit()
    return {"message": "Role updated", "role": role}

@router.put("/{user_id}")
def update_user(user_id: str, data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if data.full_name: user.full_name = data.full_name
    if data.phone: user.phone = data.phone
    db.commit()
    return user
