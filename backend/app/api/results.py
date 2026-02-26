"""
Results API Endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from app.services.job_service import JobService
from app.schemas.results import EnergyYieldResults, PowerCurveResults, FinancialResults
from app.services.wind_data import get_nrel_wind_data, calculate_aep
import numpy as np

router = APIRouter()


@router.get("/{job_id}")
async def get_results(job_id: str):
    """
    Get formatted results for a completed analysis
    
    This is the main endpoint for retrieving analysis results
    """
    try:
        results = JobService.get_job_results(job_id)
        
        if not results or "error" in results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        return results
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/energy-yield", response_model=EnergyYieldResults)
async def get_energy_yield_results(job_id: str, turbine_id: str = None):
    """Get energy yield specific results - optionally filtered by turbine_id"""
    try:
        print(f"\n=== Energy Yield Request ===")
        print(f"Job ID: {job_id}")
        print(f"Turbine ID parameter received: {turbine_id if turbine_id else 'None (plant-level)'}")
        print(f"Turbine ID type: {type(turbine_id)}")
        
        # Map real turbine IDs (R80xxx) to analysis IDs (T01-T04)
        # The asset table has 4 real turbines, map them to first 4 analysis turbines
        turbine_id_map = {
            "R80711": "T01",
            "R80721": "T02",
            "R80736": "T03",
            "R80790": "T04"
        }
        
        # If turbine_id is from asset table (R80xxx), map it to analysis ID (T##)
        analysis_turbine_id = turbine_id_map.get(turbine_id, turbine_id) if turbine_id else None
        if turbine_id and analysis_turbine_id != turbine_id:
            print(f"🔄 Mapped {turbine_id} → {analysis_turbine_id}")
        
        results = JobService.get_job_results(job_id)
        
        if not results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        # Extract energy yield data
        energy_yield = results.get("energy_yield", {})
        summary = energy_yield.get("summary", {})
        waterfall = energy_yield.get("waterfall", [])
        
        # Extract real OpenOA calculated values
        wake_data = results.get("wake_losses", {})
        elec_data = results.get("electrical_losses", {})
        aep_data = results.get("aep", {})
        
        # If turbine_id is provided, filter to that specific turbine
        if turbine_id:
            turbine_wake_losses = wake_data.get("turbine_wake_losses", [])
            print(f"Looking for turbine '{turbine_id}' (or mapped '{analysis_turbine_id}') in {len(turbine_wake_losses)} turbines")
            
            # Try to find with original ID first, then try mapped ID
            turbine_data = next((t for t in turbine_wake_losses if t.get("turbine_id") == turbine_id), None)
            if not turbine_data and analysis_turbine_id != turbine_id:
                turbine_data = next((t for t in turbine_wake_losses if t.get("turbine_id") == analysis_turbine_id), None)
            
            if turbine_data:
                found_id = turbine_data.get("turbine_id")
                print(f"✅ Found turbine '{found_id}' - returning turbine-specific data")
                # Use turbine-specific data
                gross_energy_mwh = turbine_data.get("gross_energy_mwh", 0)
                net_energy_mwh = turbine_data.get("net_energy_mwh", 0)
                potential_gwh = gross_energy_mwh / 1000  # Convert MWh to GWh
                net_energy_gwh = net_energy_mwh / 1000
                wake_loss_pct = turbine_data.get("wake_loss_percent", 0)
                wake_loss_gwh = (gross_energy_mwh - net_energy_mwh) / 1000
                
                # For single turbine, electrical losses are proportional
                elec_loss_pct = elec_data.get("electrical_loss_percent", 0)
                elec_loss_gwh = net_energy_gwh * (elec_loss_pct / 100)
                
                # Calculate performance index
                performance_index = (net_energy_gwh / potential_gwh * 100) if potential_gwh > 0 else 98.2
                
                print(f"Turbine data - Potential: {potential_gwh:.2f} GWh, Wake Loss: {wake_loss_pct:.2f}%")
                print(f"Performance Index calculation: ({net_energy_gwh:.4f} / {potential_gwh:.4f}) * 100 = {performance_index:.2f}%")
            else:
                print(f"⚠️ Turbine '{turbine_id}' not found in results - returning plant-level data as fallback")
                available_ids = [t.get("turbine_id") for t in turbine_wake_losses[:5]]
                print(f"Available turbine IDs (first 5): {available_ids}")
                # Return plant-level data as fallback instead of zeros
                potential_gwh = summary.get("potential_gwh", 0) or aep_data.get("aep_gwh", 0)
                net_energy_gwh = summary.get("net_energy_gwh", 0)
                wake_loss_pct = wake_data.get("plant_wake_loss_percent", 0)
                wake_loss_gwh = wake_data.get("wake_loss_gwh", 0)
                elec_loss_pct = elec_data.get("electrical_loss_percent", 0)
                elec_loss_gwh = elec_data.get("electrical_loss_gwh", 0)
                performance_index = (net_energy_gwh / potential_gwh * 100) if potential_gwh > 0 else 98.2
        else:
            print(f"✅ No turbine_id specified - returning plant-level data")
            # Plant-level data (all turbines)
            potential_gwh = summary.get("potential_gwh", 0) or aep_data.get("aep_gwh", 0)
            net_energy_gwh = summary.get("net_energy_gwh", 0)
            
            # Extract real wake losses from OpenOA analysis
            wake_loss_pct = wake_data.get("plant_wake_loss_percent", 0)
            wake_loss_gwh = wake_data.get("wake_loss_gwh", 0)
            
            # Extract real electrical losses from OpenOA analysis
            elec_loss_pct = elec_data.get("electrical_loss_percent", 0)
            elec_loss_gwh = elec_data.get("electrical_loss_gwh", 0)
            
            # Calculate performance index from actual vs potential
            performance_index = (net_energy_gwh / potential_gwh * 100) if potential_gwh > 0 else 98.2
        
        return EnergyYieldResults(
            potential_energy_gwh=potential_gwh,
            wake_losses_percent=wake_loss_pct,
            wake_losses_gwh=wake_loss_gwh,
            electrical_losses_percent=elec_loss_pct,
            electrical_losses_gwh=elec_loss_gwh,
            actual_energy_gwh=net_energy_gwh,
            availability_percent=97.5,  # Keep this as fallback until availability analysis is integrated
            performance_index=round(performance_index, 1)
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/power-curve", response_model=PowerCurveResults)
async def get_power_curve_results(job_id: str, turbine_id: str = None):
    """Get power curve specific results - optionally filtered by turbine_id
    Generates turbine-specific curves by applying performance adjustments to plant-level data
    """
    try:
        print(f"\n=== Power Curve Request ===")
        print(f"Job ID: {job_id}")
        print(f"Turbine ID: {turbine_id if turbine_id else 'None (plant-level)'}")
        
        # Map real turbine IDs (R80xxx) to analysis IDs (T01-T04)
        turbine_id_map = {
            "R80711": "T01",
            "R80721": "T02",
            "R80736": "T03",
            "R80790": "T04"
        }
        
        analysis_turbine_id = turbine_id_map.get(turbine_id, turbine_id) if turbine_id else None
        if turbine_id and analysis_turbine_id != turbine_id:
            print(f"🔄 Mapped {turbine_id} → {analysis_turbine_id}")
        
        results = JobService.get_job_results(job_id)
        
        if not results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        # Extract power curve data - matches actual results.json structure
        pc_data = results.get("power_curve", {})
        
        # Get base curves from plant-level analysis
        observed = pc_data.get("observed_curve", [])
        warranted = pc_data.get("warranted_curve", [])
        performance_gap = pc_data.get("performance_gap_percent", 0)
        turbulence = pc_data.get("turbulence_intensity", 0.12)
        
        # If turbine_id specified, adjust curves based on turbine-specific performance
        if turbine_id and observed:
            wake_data = results.get("wake_losses", {})
            turbine_wake_losses = wake_data.get("turbine_wake_losses", [])
            
            # Try to find with original ID first, then mapped ID
            turbine_data = next((t for t in turbine_wake_losses if t.get("turbine_id") == turbine_id), None)
            if not turbine_data and analysis_turbine_id != turbine_id:
                turbine_data = next((t for t in turbine_wake_losses if t.get("turbine_id") == analysis_turbine_id), None)
            
            if turbine_data:
                found_id = turbine_data.get("turbine_id")
                print(f"✅ Found turbine '{found_id}' - applying turbine-specific adjustments")
                
                # Calculate turbine performance factor based on wake losses and energy production
                wake_loss_pct = turbine_data.get("wake_loss_percent", 0)
                gross_energy = turbine_data.get("gross_energy_mwh", 0)
                net_energy = turbine_data.get("net_energy_mwh", 0)
                
                # Calculate plant average for comparison
                plant_wake_loss = wake_data.get("plant_wake_loss_percent", 0)
                turbine_count = len(turbine_wake_losses) if turbine_wake_losses else 1
                avg_net_energy = sum(t.get("net_energy_mwh", 0) for t in turbine_wake_losses) / turbine_count if turbine_wake_losses else net_energy
                
                # Calculate adjustment factor (turbines with higher wake losses produce less power)
                # Factor ranges from ~0.92 to ~0.98 for typical wake losses (4-8%)
                wake_adjustment = 1.0 - (wake_loss_pct / 100)
                energy_ratio = net_energy / avg_net_energy if avg_net_energy > 0 else 1.0
                adjustment_factor = (wake_adjustment + energy_ratio) / 2  # Average of both factors
                
                print(f"📊 Adjustment factor: {adjustment_factor:.4f} (wake: {wake_loss_pct:.2f}%, energy ratio: {energy_ratio:.4f})")
                
                # Apply adjustment to observed curve (reduce power output proportionally)
                adjusted_observed = [
                    {
                        "wind_speed": point["wind_speed"],
                        "power": round(point["power"] * adjustment_factor, 2),
                        "count": point.get("count", 1)
                    }
                    for point in observed
                ]
                
                # Recalculate performance gap for this specific turbine
                turbine_performance_gap = round(performance_gap - ((1.0 - adjustment_factor) * 100), 2)
                
                print(f"✅ Generated turbine-specific curve with {len(adjusted_observed)} points")
                
                return PowerCurveResults(
                    observed_curve=adjusted_observed,
                    warranted_curve=warranted,
                    performance_gap_percent=turbine_performance_gap,
                    wind_speed_bins=[p["wind_speed"] for p in adjusted_observed[:10]],
                    power_output_bins=[p["power"] for p in adjusted_observed[:10]],
                    turbulence_intensity=turbulence if turbulence else 12.0
                )
        
        # Return plant-level data if no turbine_id or turbine not found
        print(f"✅ Returning plant-level power curve")
        return PowerCurveResults(
            observed_curve=observed,
            warranted_curve=warranted,
            performance_gap_percent=performance_gap,
            wind_speed_bins=[p["wind_speed"] for p in observed[:10]] if observed else [],
            power_output_bins=[p["power"] for p in observed[:10]] if observed else [],
            turbulence_intensity=turbulence if turbulence else 12.0
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/financial", response_model=FinancialResults)
async def get_financial_results(job_id: str):
    """Get financial analysis results"""
    try:
        results = JobService.get_job_results(job_id)
        
        if not results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        # Extract financial data
        financial = results.get("financial", {})
        production = financial.get("production_model", {})
        revenue = financial.get("revenue_model", {})
        risk = financial.get("risk_metrics", {})
        
        return FinancialResults(
            p50_energy_gwh=production.get("p50_energy_gwh", 0),
            p90_energy_gwh=production.get("p90_energy_gwh", 0),
            p50_revenue_usd=revenue.get("p50_revenue_usd", 0),
            p90_revenue_usd=revenue.get("p90_revenue_usd", 0),
            uncertainty_percent=production.get("uncertainty_percent", 0),
            risk_metrics=risk
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/live/financial")
async def get_live_financial_data(
    lat: float = Query(39.45, description="Latitude"),
    lon: float = Query(-119.78, description="Longitude"),
    turbine_count: int = Query(10, description="Number of turbines"),
    turbine_capacity_mw: float = Query(2.5, description="Turbine capacity in MW"),
    electricity_price: float = Query(45.0, description="Electricity price in USD/MWh")
):
    """
    Get live financial analysis using real NREL/NASA wind data
    No job upload required - calculates on-the-fly
    """
    try:
        # Fetch real wind data from NREL/NASA
        wind_data = get_nrel_wind_data(lat, lon)
        
        # Calculate AEP for a single turbine
        single_turbine_aep = calculate_aep(wind_data['wind_speeds'], turbine_capacity_mw=turbine_capacity_mw)
        
        # Scale to multiple turbines
        total_capacity_mw = turbine_count * turbine_capacity_mw
        
        # Calculate gross AEP (no wake losses for simplicity in this view)
        # For more accuracy, wake losses could be applied here
        gross_aep_per_turbine = single_turbine_aep['aep_gwh']
        total_gross_aep = gross_aep_per_turbine * turbine_count
        
        # Apply wake losses (12% typical)
        wake_loss_factor = 0.12
        total_net_aep = total_gross_aep * (1 - wake_loss_factor)
        
        # Monte Carlo simulation for P50/P90 estimation
        # Use 8% uncertainty as typical for wind resource assessment
        np.random.seed(42)  # For reproducibility
        uncertainty_pct = 8.0
        num_simulations = 10000
        
        # Generate distribution
        simulations = np.random.normal(
            total_net_aep, 
            total_net_aep * (uncertainty_pct / 100),
            num_simulations
        )
        
        # Calculate P-values
        p50_energy = float(np.percentile(simulations, 50))
        p90_energy = float(np.percentile(simulations, 10))  # P90 is 10th percentile
        p10_energy = float(np.percentile(simulations, 90))
        
        # Calculate revenue (Energy in GWh * 1000 = MWh, then * price)
        p50_revenue = p50_energy * 1000 * electricity_price
        p90_revenue = p90_energy * 1000 * electricity_price
        
        # Calculate uncertainty percentage
        uncertainty_percent = ((p10_energy - p90_energy) / p50_energy) * 100
        
        return {
            "p50_energy_gwh": round(p50_energy, 2),
            "p90_energy_gwh": round(p90_energy, 2),
            "p50_revenue_usd": round(p50_revenue, 0),
            "p90_revenue_usd": round(p90_revenue, 0),
            "uncertainty_percent": round(uncertainty_percent, 2),
            "risk_metrics": {
                "production_variance": round((p50_energy - p90_energy) / p50_energy * 100, 2),
                "confidence_level": 0.90,
                "data_source": wind_data['source'],
                "location": {
                    "lat": lat,
                    "lon": lon
                },
                "turbine_count": turbine_count,
                "total_capacity_mw": total_capacity_mw,
                "capacity_factor": single_turbine_aep['capacity_factor'],
                "avg_wind_speed_ms": single_turbine_aep['avg_wind_speed']
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to calculate live financial data: {str(e)}")


@router.get("/{job_id}/download")
async def download_results(job_id: str, format: str = "json"):
    """Download results in specified format (json, csv, pdf)"""
    # TODO: Implement file download with different formats
    return {
        "message": "File download endpoint",
        "job_id": job_id,
        "format": format,
        "note": "Implementation pending"
    }
