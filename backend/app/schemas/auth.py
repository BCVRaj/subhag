"""
Pydantic schemas for API requests/responses
"""
from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """JWT Token response"""
    access_token: str
    token_type: str = "bearer"
    user: dict


class TokenData(BaseModel):
    """Token payload data"""
    username: Optional[str] = None


class UserLogin(BaseModel):
    """User login request"""
    username: str
    password: str


class UserCreate(BaseModel):
    """User registration"""
    username: str
    email: str
    password: str
    full_name: Optional[str] = None
    role: str = "operator"


class UserResponse(BaseModel):
    """User response (no password)"""
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str
