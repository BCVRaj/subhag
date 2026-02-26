"""
User model (simplified for file-based auth)
"""
from typing import Optional
from pydantic import BaseModel


class User(BaseModel):
    """User model"""
    username: str
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: str = "operator"  # operator, developer, investor
    disabled: bool = False
    hashed_password: str


class UserInDB(User):
    """User with hashed password"""
    pass
