"""
Result data models
"""
from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AnalysisResult(BaseModel):
    """Generic analysis result"""
    job_id: str
    analysis_type: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any]
    plots: Optional[Dict[str, Any]] = None
    summary: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class AEPResult(BaseModel):
    """AEP Analysis Result"""
    aep_gwh: float
    p50_gwh: float
    p90_gwh: float
    uncertainty_percent: float
    confidence_level: float
    num_simulations: int
    monthly_breakdown: Optional[List[Dict[str, Any]]] = None


class PowerCurveResult(BaseModel):
    """Power Curve Analysis Result"""
    observed_curve: List[Dict[str, float]]
    warranted_curve: List[Dict[str, float]]  
    performance_gap_percent: float
    wind_distribution: List[Dict[str, float]]
    turbulence_intensity: Optional[float] = None
    outliers_count: int = 0
