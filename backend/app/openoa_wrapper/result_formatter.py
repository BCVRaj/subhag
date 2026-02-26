"""
Result Formatter - Converts OpenOA results to frontend-friendly JSON format
"""
from typing import Dict, Any, List, Optional
import numpy as np


class ResultFormatter:
    """Formats OpenOA analysis results for API responses"""
    
    @staticmethod
    def format_aep_results(aep_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format AEP analysis results"""
        return {
            "analysis_type": "aep",
            "metrics": {
                "aep": {
                    "value": aep_data.get("aep_gwh"),
                    "unit": "GWh",
                    "label": "Annual Energy Production"
                },
                "p50": {
                    "value": aep_data.get("p50_gwh"),
                    "unit": "GWh",
                    "label": "P50 Estimate"
                },
                "p90": {
                    "value": aep_data.get("p90_gwh"),
                    "unit": "GWh",
                    "label": "P90 (Conservative)"
                },
                "uncertainty": {
                    "value": aep_data.get("uncertainty_percent"),
                    "unit": "%",
                    "label": "Uncertainty"
                }
            },
            "chart_data": {
                "monthly": aep_data.get("monthly_breakdown", []),
                "distribution": aep_data.get("distribution", {})
            }
        }
    
    @staticmethod
    def format_energy_yield_results(
        aep_data: Dict[str, Any],
        wake_data: Dict[str, Any],
        elec_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Format combined energy yield waterfall"""
        
        # Calculate waterfall values
        potential_energy = aep_data.get("aep_gwh", 150)
        wake_loss_percent = wake_data.get("plant_wake_loss_percent", 8.5)
        elec_loss_percent = elec_data.get("electrical_loss_percent", 1.8)
        
        after_wake = potential_energy * (1 - wake_loss_percent / 100)
        after_elec = after_wake * (1 - elec_loss_percent / 100)
        
        return {
            "waterfall": [
                {
                    "category": "Potential Energy",
                    "value": round(potential_energy, 2),
                    "percentage": 100.0
                },
                {
                    "category": "Wake Losses",
                    "value": -round(potential_energy * wake_loss_percent / 100, 2),
                    "percentage": -wake_loss_percent
                },
                {
                    "category": "After Wake",
                    "value": round(after_wake, 2),
                    "percentage": round((after_wake / potential_energy) * 100, 1)
                },
                {
                    "category": "Electrical Losses",
                    "value": -round(after_wake * elec_loss_percent / 100, 2),
                    "percentage": -elec_loss_percent
                },
                {
                    "category": "Net Energy",
                    "value": round(after_elec, 2),
                    "percentage": round((after_elec / potential_energy) * 100, 1)
                }
            ],
            "summary": {
                "potential_gwh": round(potential_energy, 2),
                "net_energy_gwh": round(after_elec, 2),
                "total_losses_gwh": round(potential_energy - after_elec, 2),
                "total_losses_percent": round(((potential_energy - after_elec) / potential_energy) * 100, 2)
            }
        }
    
    @staticmethod
    def format_power_curve_results(pc_data: Dict[str, Any]) -> Dict[str, Any]:
        """Format power curve analysis results"""
        return {
            "curves": {
                "observed": pc_data.get("observed_curve", []),
                "warranted": pc_data.get("warranted_curve", [])
            },
            "metrics": {
                "performance_gap": {
                    "value": pc_data.get("performance_gap_percent"),
                    "unit": "%",
                    "label": "Performance Gap",
                    "status": "normal" if abs(pc_data.get("performance_gap_percent", 0)) < 3 else "warning"
                },
                "turbulence_intensity": {
                    "value": pc_data.get("turbulence_intensity"),
                    "unit": "",
                    "label": "Turbulence Intensity"
                },
                "data_points": {
                    "value": pc_data.get("data_points"),
                    "unit": "",
                    "label": "Data Points"
                }
            },
            "wind_distribution": pc_data.get("wind_distribution", [])
        }
    
    @staticmethod
    def format_turbine_performance(
        turbine_data: List[Dict[str, Any]],
        wake_data: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """Format turbine-level performance data"""
        formatted_turbines = []
        
        for turbine in turbine_data:
            # Determine status based on performance
            energy = turbine.get("ideal_energy_gwh", 0) or turbine.get("energy_produced_mwh", 0) / 1000
            avg_energy = 8.0  # Average turbine energy
            
            if energy < avg_energy * 0.85:
                status = "alert"
            elif energy < avg_energy * 0.95:
                status = "warning"
            else:
                status = "optimal"
            
            formatted_turbines.append({
                "turbine_id": turbine.get("turbine_id"),
                "turbine_name": turbine.get("turbine_name"),
                "status": status,
                "metrics": {
                    "energy_gwh": round(energy, 3),
                    "capacity_factor": turbine.get("capacity_factor_percent", 0),
                    "availability": turbine.get("availability_percent", 98.5),
                    "wake_loss": turbine.get("wake_loss_percent", 0)
                }
            })
        
        return formatted_turbines
    
    @staticmethod
    def format_financial_results(
        aep_data: Dict[str, Any],
        electricity_price: float = 45.0  # $/MWh
    ) -> Dict[str, Any]:
        """Format financial analysis results"""
        
        p50_energy = aep_data.get("p50_gwh", 0)
        p90_energy = aep_data.get("p90_gwh", 0)
        
        # Calculate revenue (GWh * 1000 = MWh, then * price)
        p50_revenue = p50_energy * 1000 * electricity_price
        p90_revenue = p90_energy * 1000 * electricity_price
        
        return {
            "production_model": {
                "p50_energy_gwh": round(p50_energy, 2),
                "p90_energy_gwh": round(p90_energy, 2),
                "uncertainty_percent": aep_data.get("uncertainty_percent", 0)
            },
            "revenue_model": {
                "electricity_price_usd_mwh": electricity_price,
                "p50_revenue_usd": round(p50_revenue, 0),
                "p90_revenue_usd": round(p90_revenue, 0),
                "revenue_at_risk_usd": round(p50_revenue - p90_revenue, 0)
            },
            "risk_metrics": {
                "production_variance": round((p50_energy - p90_energy) / p50_energy * 100, 2),
                "confidence_level": aep_data.get("confidence_level", 0.95)
            }
        }
    
    @staticmethod
    def ensure_serializable(data: Any) -> Any:
        """Ensure data is JSON serializable"""
        if isinstance(data, dict):
            return {k: ResultFormatter.ensure_serializable(v) for k, v in data.items()}
        elif isinstance(data, list):
            return [ResultFormatter.ensure_serializable(item) for item in data]
        elif isinstance(data, (np.integer, np.floating)):
            return float(data)
        elif isinstance(data, np.ndarray):
            return data.tolist()
        else:
            return data
