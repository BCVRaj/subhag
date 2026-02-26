"""
Analysis request/response schemas
"""
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
from datetime import datetime


class AnalysisRequest(BaseModel):
    """Request to start an analysis"""
    session_id: str
    analysis_type: str  # "aep", "wake_loss", "power_curve", etc.
    parameters: Dict[str, Any] = Field(default_factory=dict)


class AnalysisResponse(BaseModel):
    """Analysis job creation response"""
    job_id: str
    session_id: str
    analysis_type: str
    status: str
    message: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class JobStatusResponse(BaseModel):
    """Job status polling response"""
    job_id: str
    status: str
    progress: int  # 0-100
    message: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error: Optional[str] = None


class AnalysisResults(BaseModel):
    """Generic analysis results"""
    job_id: str
    analysis_type: str
    status: str
    data: Dict[str, Any]
    plots: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    completed_at: datetime
