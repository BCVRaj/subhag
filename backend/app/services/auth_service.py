"""
Authentication Service
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status

from app.config import settings
from app.models.user import User, UserInDB
from app.schemas.auth import TokenData

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """Handles authentication and authorization"""
    
    # Mock user database (replace with actual database in production)
    # Password for all demo users: "windops123"
    # Pre-hashed to avoid bcrypt issues during initialization
    USERS_DB = {
        "operator": UserInDB(
            username="operator",
            email="operator@windops.pro",
            full_name="Site Operator",
            role="operator",
            disabled=False,
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7NqYXS5sby"  # windops123
        ),
        "developer": UserInDB(
            username="developer",
            email="dev@windops.pro",
            full_name="Data Engineer",
            role="developer",
            disabled=False,
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7NqYXS5sby"  # windops123
        ),
        "investor": UserInDB(
            username="investor",
            email="investor@windops.pro",
            full_name="Investment Analyst",
            role="investor",
            disabled=False,
            hashed_password="$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5NU7NqYXS5sby"  # windops123
        )
    }
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify a password against a hash"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """Hash a password"""
        return pwd_context.hash(password)
    
    @staticmethod
    def get_user(username: str) -> Optional[UserInDB]:
        """Get user from database by username"""
        return AuthService.USERS_DB.get(username)
    
    @staticmethod
    def get_user_by_email(email: str) -> Optional[UserInDB]:
        """Get user from database by email"""
        for user in AuthService.USERS_DB.values():
            if user.email == email:
                return user
        return None
    
    @staticmethod
    def authenticate_user(username_or_email: str, password: str) -> Optional[UserInDB]:
        """Authenticate a user by username or email"""
        # Try username first
        user = AuthService.get_user(username_or_email)
        
        # If not found, try email
        if not user:
            user = AuthService.get_user_by_email(username_or_email)
        
        if not user:
            return None
        if not AuthService.verify_password(password, user.hashed_password):
            return None
        return user
    
    @staticmethod
    def create_user(username: str, email: str, password: str, full_name: str = None, role: str = "operator") -> UserInDB:
        """Create a new user"""
        # Check if username already exists
        if username in AuthService.USERS_DB:
            raise ValueError("Username already exists")
        
        # Check if email already exists
        if AuthService.get_user_by_email(email):
            raise ValueError("Email already exists")
        
        # Create new user
        hashed_password = AuthService.get_password_hash(password)
        new_user = UserInDB(
            username=username,
            email=email,
            full_name=full_name or username,
            role=role,
            disabled=False,
            hashed_password=hashed_password
        )
        
        # Add to database
        AuthService.USERS_DB[username] = new_user
        return new_user
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """Create a JWT access token"""
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> TokenData:
        """Decode and verify JWT token"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Could not validate credentials"
                )
            return TokenData(username=username)
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    
    @staticmethod
    def get_current_user(token: str) -> User:
        """Get current user from token"""
        token_data = AuthService.decode_token(token)
        user = AuthService.get_user(token_data.username)
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        if user.disabled:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Inactive user"
            )
        return user
