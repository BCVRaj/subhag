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


class OverviewDashboard(BaseModel):
    """Comprehensive overview dashboard data"""
    # Summary Statistics (10 cards)
    total_records: int
    time_span_days: int
    mean_wind_speed: float
    max_wind_speed: float
    mean_power: float
    max_power: float
    capacity_factor: float
    availability: float
    estimated_aep_mwh: float
    total_energy_mwh: float
    
    # Energy Loss Breakdown
    operational_efficiency: float
    downtime_loss_mwh: float
    downtime_loss_kwh: float
    cutout_loss_mwh: float
    missing_data_percent: float
    total_loss_mwh: float
    operational_energy_mwh: float
    theoretical_energy_mwh: float
    
    # Monthly Performance
    monthly_performance: List[Dict[str, Any]]


class PowerCurveResults(BaseModel):
    """Power curve analysis results"""
    observed_curve: List[Dict[str, float]]
    warranted_curve: List[Dict[str, float]]
    performance_gap_percent: float
    wind_speed_bins: List[float]
    power_output_bins: List[float]
    turbulence_intensity: Optional[float] = None
    wind_distribution: Optional[List[Dict[str, float]]] = None
    binned_curve: Optional[List[Dict[str, Any]]] = None  # Binned power curve with statistics
    raw_data_points: Optional[List[Dict[str, float]]] = None  # Individual scatter points
    statistics: Optional[Dict[str, Any]] = None  # Overall statistics


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
