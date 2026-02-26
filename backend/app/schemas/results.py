"""
Results schemas
"""
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime


class EnergyYieldResults(BaseModel):
    """Energy yield analysis results"""
    potential_energy_gwh: float
    wake_losses_percent: float
    wake_losses_gwh: float
    electrical_losses_percent: float
    electrical_losses_gwh: float
    actual_energy_gwh: float
    availability_percent: Optional[float] = None
    performance_index: Optional[float] = None


class PowerCurveResults(BaseModel):
    """Power curve analysis results"""
    observed_curve: List[Dict[str, float]]
    warranted_curve: List[Dict[str, float]]
    performance_gap_percent: float
    wind_speed_bins: List[float]
    power_output_bins: List[float]
    turbulence_intensity: Optional[float] = None


class TurbinePerformance(BaseModel):
    """Individual turbine performance"""
    turbine_id: str
    turbine_name: str
    availability_percent: float
    capacity_factor_percent: float
    energy_produced_mwh: float
    wake_loss_percent: float
    status: str  # "optimal", "warning", "alert", "offline"


class FinancialResults(BaseModel):
    """Financial analysis results"""
    p50_energy_gwh: float
    p90_energy_gwh: float
    p50_revenue_usd: float
    p90_revenue_usd: float
    uncertainty_percent: float
    risk_metrics: Dict[str, Any]
