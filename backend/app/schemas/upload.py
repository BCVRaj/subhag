"""
Upload schemas
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


class FileUploadResponse(BaseModel):
    """Response after file upload"""
    session_id: str
    filename: str
    file_type: str
    size_bytes: int
    path: str
    original_filename: Optional[str] = None
    status: Optional[str] = None
    uploaded_at: Optional[datetime] = None
    
    class Config:
        extra = "ignore"  # Allow extra fields without validation error


class DataValidationRequest(BaseModel):
    """Request to validate uploaded data"""
    session_id: str
    scada_file: Optional[str] = None
    meter_file: Optional[str] = None
    tower_file: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    class Config:
        extra = "ignore"  # Allow extra fields


class ValidationResult(BaseModel):
    """Validation results"""
    is_valid: bool
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list)
    column_mapping: Dict[str, str] = Field(default_factory=dict)
    row_count: int = 0
    time_range: Optional[Dict[str, str]] = None
    files: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    class Config:
        extra = "ignore"  # Allow extra fields
