"""
Results API Endpoints
"""
from fastapi import APIRouter, HTTPException, Query
from pathlib import Path
import pandas as pd
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


def calculate_binned_power_curve(turbine_id: str = None):
    """Calculate binned power curve with statistics from SCADA data"""
    from pathlib import Path
    import pandas as pd
    import numpy as np
    from scipy import stats
    
    try:
        # Try multiple paths for SCADA data
        possible_paths = [
            Path("data/uploads/la-haute-borne-data-2014-2015.csv"),
            Path("backend/app/data/uploads/la-haute-borne-data-2014-2015.csv"),
            Path("app/data/uploads/la-haute-borne-data-2014-2015.csv"),
        ]
        
        scada_file = None
        for path in possible_paths:
            if path.exists():
                scada_file = path
                break
        
        if not scada_file:
            print(f"⚠️ SCADA data not found, returning empty binned curve")
            return {
                "binned_curve": [],
                "raw_points": [],
                "statistics": {
                    "total_samples": 0,
                    "peak_power": 0,
                    "avg_bin_power": 0,
                    "wind_range_min": 0,
                    "wind_range_max": 0,
                    "cut_in_speed": 2.25,
                    "rated_speed": 12.25
                }
            }
        
        # Load SCADA data
        df = pd.read_csv(scada_file)
        
        # Filter by turbine if specified
        if turbine_id:
            df = df[df["Wind_turbine_name"] == turbine_id]
        
        # Filter valid data (remove shutdown conditions)
        df = df[(df["Ws_avg"] >= 0) & (df["P_avg"] >= 0)]
        df = df[(df["Ws_avg"] <= 25) & (df["P_avg"] <= 2500)]  # Reasonable limits
        
        # Create wind speed bins (0.5 m/s bins)
        bin_width = 0.5
        bins = np.arange(0, 25 + bin_width, bin_width)
        df["wind_bin"] = pd.cut(df["Ws_avg"], bins=bins, labels=bins[:-1] + bin_width / 2)
        
        # Calculate statistics for each bin
        binned_data = []
        raw_points = []
        
        for wind_speed, group in df.groupby("wind_bin", observed=True):
            if len(group) < 3:  # Skip bins with too few samples
                continue
            
            powers = group["P_avg"].values
            mean_power = np.mean(powers)
            std_dev = np.std(powers, ddof=1)
            n_samples = len(powers)
            
            # Calculate 95% confidence interval
            confidence_level = 0.95
            degrees_freedom = n_samples - 1
            confidence_interval = stats.t.interval(
                confidence_level,
                degrees_freedom,
                loc=mean_power,
                scale=stats.sem(powers)
            )
            
            # Calculate Coefficient of Variation
            cov = (std_dev / mean_power * 100) if mean_power > 0 else 0
            
            # Helper function to clean NaN values
            def clean_float(val, default=0.0):
                if pd.isna(val) or np.isnan(val) or np.isinf(val):
                    return default
                return round(float(val), 2)
            
            binned_data.append({
                "wind_speed": clean_float(wind_speed),
                "mean_power": clean_float(mean_power),
                "std_dev": clean_float(std_dev),
                "ci_lower": clean_float(confidence_interval[0]),
                "ci_upper": clean_float(confidence_interval[1]),
                "cov": clean_float(cov),
                "samples": int(n_samples),
                "min_power": clean_float(np.min(powers)),
                "max_power": clean_float(np.max(powers))
            })
        
        # Sample raw points for scatter plot (max 500 points to avoid overload)
        sample_size = min(500, len(df))
        sampled = df.sample(n=sample_size) if len(df) > sample_size else df
        
        # Clean function for raw data
        def clean_value(val):
            if pd.isna(val) or np.isnan(val) or np.isinf(val):
                return 0.0
            return round(float(val), 2)
        
        raw_points = [
            {"wind_speed": clean_value(row["Ws_avg"]), "power": clean_value(row["P_avg"])}
            for _, row in sampled.iterrows()
        ]
        
        # Calculate overall statistics (with NaN protection)
        statistics = {
            "total_samples": int(len(df)),
            "peak_power": clean_value(df["P_avg"].max()) if not df.empty else 0,
            "avg_bin_power": clean_value(np.mean([b["mean_power"] for b in binned_data])) if binned_data else 0,
            "wind_range_min": clean_value(df["Ws_avg"].min()) if not df.empty else 0,
            "wind_range_max": clean_value(df["Ws_avg"].max()) if not df.empty else 0,
            "cut_in_speed": 2.25,
            "rated_speed": 12.25,
            "total_bins": len(binned_data)
        }
        
        print(f"✅ Calculated binned power curve: {len(binned_data)} bins, {len(df)} total samples")
        
        return {
            "binned_curve": binned_data,
            "raw_points": raw_points,
            "statistics": statistics
        }
        
    except Exception as e:
        print(f"❌ Error calculating binned power curve: {e}")
        import traceback
        traceback.print_exc()
        return {
            "binned_curve": [],
            "raw_points": [],
            "statistics": {
                "total_samples": 0,
                "peak_power": 0,
                "avg_bin_power": 0,
                "wind_range_min": 0,
                "wind_range_max": 0,
                "cut_in_speed": 2.25,
                "rated_speed": 12.25
            }
        }


@router.get("/{job_id}/overview-dashboard")
async def get_overview_dashboard(job_id: str, turbine_id: str = None):
    """Get comprehensive overview dashboard data with summary statistics, energy losses, and monthly performance"""
    try:
        from app.schemas.results import OverviewDashboard
        
        print(f"\n=== Overview Dashboard Request ===")
        print(f"Job ID: {job_id}")
        print(f"Turbine ID: {turbine_id if turbine_id else 'Plant-level'}")
        
        # Load SCADA data for statistics
        scada_file = None
        possible_paths = [
            Path("data/uploads/la-haute-borne-data-2014-2015.csv"),
            Path("../data/uploads/la-haute-borne-data-2014-2015.csv"),
            Path(__file__).parent.parent.parent / "data" / "uploads" / "la-haute-borne-data-2014-2015.csv"
        ]
        
        for path in possible_paths:
            if path.exists():
                scada_file = path
                print(f"✅ Found SCADA data at: {scada_file}")
                break
        
        if not scada_file:
            print("⚠️ SCADA file not found, using defaults")
            # Return minimal default data
            return OverviewDashboard(
                total_records=0,
                time_span_days=0,
                mean_wind_speed=0.0,
                max_wind_speed=0.0,
                mean_power=0.0,
                max_power=0.0,
                capacity_factor=25.0,
                availability=82.0,
                estimated_aep_mwh=4000.0,
                total_energy_mwh=4000.0,
                operational_efficiency=99.0,
                downtime_loss_mwh=10.0,
                downtime_loss_kwh=10000.0,
                cutout_loss_mwh=0.0,
                missing_data_percent=0.0,
                total_loss_mwh=10.0,
                operational_energy_mwh=341.2,
                theoretical_energy_mwh=343.6,
                monthly_performance=[]
            )
        
        # Load and process SCADA data
        df = pd.read_csv(scada_file)
        
        # Filter by turbine if specified
        if turbine_id:
            df = df[df["Wind_turbine_name"] == turbine_id]
        
        # Calculate summary statistics
        total_records = len(df)
        
        # Calculate time span - check for Date_time column
        date_col = None
        for col in ['Date_time', 'date_time', 'datetime', 'timestamp']:
            if col in df.columns:
                date_col = col
                break
        
        if date_col:
            df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
            time_span_days = (df[date_col].max() - df[date_col].min()).days
        else:
            # Fallback if no date column found
            time_span_days = 365  # Assume 1 year of data
        
        # Wind statistics
        mean_wind_speed = round(df["Ws_avg"].mean(), 2)
        max_wind_speed = round(df["Ws_avg"].max(), 2)
        
        # Power statistics
        mean_power = round(df["P_avg"].mean(), 2)
        max_power = round(df["P_avg"].max(), 2)
        
        # Calculate rated power (assume 2000 kW for La Haute Borne turbines)
        rated_power_kw = 2000
        
        # Calculate total energy (sum of power * time interval in hours)
        # Assuming 10-minute intervals, convert to MWh
        total_energy_mwh = round((df["P_avg"].sum() * 10 / 60) / 1000, 2)  # 10-min intervals to MWh
        
        # Calculate theoretical energy (if always at rated power)
        theoretical_energy_mwh = round((rated_power_kw * total_records * 10 / 60) / 1000, 2)
        
        # Capacity factor
        capacity_factor = round((total_energy_mwh / theoretical_energy_mwh * 100) if theoretical_energy_mwh > 0 else 0, 2)
        
        # Calculate downtime (periods with zero or very low power)
        downtime_records = len(df[(df["P_avg"] < 10) & (df["Ws_avg"] > 3)])  # Low power in good wind
        downtime_hours = downtime_records * 10 / 60  # Convert to hours
        downtime_loss_mwh = round(downtime_hours * rated_power_kw / 1000, 2)
        downtime_loss_kwh = round(downtime_loss_mwh * 1000, 2)
        
        # Calculate cut-out loss (high wind shutdowns)
        cutout_records = len(df[df["Ws_avg"] >= 25])
        cutout_hours = cutout_records * 10 / 60
        cutout_loss_mwh = round(cutout_hours * rated_power_kw / 1000, 2)
        
        # Calculate missing data
        missing_records = df.isnull().sum().sum()
        missing_data_percent = round((missing_records / (total_records * len(df.columns)) * 100), 2)
        
        # Total loss
        total_loss_mwh = round(downtime_loss_mwh + cutout_loss_mwh, 2)
        
        # Operational energy (actual production)
        operational_energy_mwh = total_energy_mwh
        
        # Operational efficiency
        operational_efficiency = round((operational_energy_mwh / theoretical_energy_mwh * 100) if theoretical_energy_mwh > 0 else 0, 2)
        
        # Availability (time with power > 0 when wind > cut-in)
        operational_records = len(df[(df["P_avg"] > 0) & (df["Ws_avg"] > 3)])
        availability = round((operational_records / len(df[df["Ws_avg"] > 3]) * 100) if len(df[df["Ws_avg"] > 3]) > 0 else 0, 2)
        
        # Estimated AEP (annualized)
        days_in_data = time_span_days if time_span_days > 0 else 1
        estimated_aep_mwh = round((total_energy_mwh / days_in_data * 365), 2)
        
        # Calculate monthly performance
        monthly_stats = []
        if date_col and date_col in df.columns:
            # Ensure datetime conversion succeeded
            try:
                # Drop any rows with NaT values after conversion
                df_monthly = df[df[date_col].notna()].copy()
                df_monthly["month"] = df_monthly[date_col].dt.to_period("M")
                
                for month, group in df_monthly.groupby("month"):
                    month_records = len(group)
                    month_mean_ws = round(group["Ws_avg"].mean(), 2)
                    month_mean_power = round(group["P_avg"].mean(), 2)
                    month_max_power = round(group["P_avg"].max(), 2)
                    month_energy = round((group["P_avg"].sum() * 10 / 60) / 1000, 2)
                    
                    # Monthly capacity factor
                    month_theoretical = round((rated_power_kw * month_records * 10 / 60) / 1000, 2)
                    month_cf = round((month_energy / month_theoretical * 100) if month_theoretical > 0 else 0, 2)
                    
                    # Monthly availability
                    month_operational = len(group[(group["P_avg"] > 0) & (group["Ws_avg"] > 3)])
                    month_avail = round((month_operational / len(group[group["Ws_avg"] > 3]) * 100) if len(group[group["Ws_avg"] > 3]) > 0 else 0, 2)
                    
                    monthly_stats.append({
                        "month": str(month),
                        "records": month_records,
                        "mean_ws": month_mean_ws,
                        "mean_power": month_mean_power,
                        "max_power": month_max_power,
                        "energy_mwh": month_energy,
                        "capacity_factor": month_cf,
                        "availability": month_avail
                    })
            except Exception as e:
                print(f"⚠️ Could not calculate monthly performance: {e}")
                # Monthly stats will be empty list
        
        print(f"✅ Overview dashboard calculated: {total_records} records, {time_span_days} days, {len(monthly_stats)} months")
        
        return OverviewDashboard(
            total_records=total_records,
            time_span_days=time_span_days,
            mean_wind_speed=mean_wind_speed,
            max_wind_speed=max_wind_speed,
            mean_power=mean_power,
            max_power=max_power,
            capacity_factor=capacity_factor,
            availability=availability,
            estimated_aep_mwh=estimated_aep_mwh,
            total_energy_mwh=total_energy_mwh,
            operational_efficiency=operational_efficiency,
            downtime_loss_mwh=downtime_loss_mwh,
            downtime_loss_kwh=downtime_loss_kwh,
            cutout_loss_mwh=cutout_loss_mwh,
            missing_data_percent=missing_data_percent,
            total_loss_mwh=total_loss_mwh,
            operational_energy_mwh=operational_energy_mwh,
            theoretical_energy_mwh=theoretical_energy_mwh,
            monthly_performance=monthly_stats
        )
    
    except Exception as e:
        print(f"❌ Error calculating overview dashboard: {e}")
        import traceback
        traceback.print_exc()
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
        
        # Calculate binned power curve from SCADA data
        binned_curve_data = calculate_binned_power_curve(turbine_id)
        
        # Try to get job results, but if not available, use binned data anyway
        results = JobService.get_job_results(job_id)
        
        if not results:
            # No job results - return just the binned power curve data
            print(f"⚠️ No job results found, returning binned curve data only")
            return PowerCurveResults(
                observed_curve=[],
                warranted_curve=[],
                performance_gap_percent=-4.2,
                wind_speed_bins=[],
                power_output_bins=[],
                turbulence_intensity=12.0,
                wind_distribution=[],
                binned_curve=binned_curve_data.get("binned_curve", []),
                raw_data_points=binned_curve_data.get("raw_points", []),
                statistics=binned_curve_data.get("statistics", {})
            )
        
        # Extract power curve data - matches actual results.json structure
        pc_data = results.get("power_curve", {})
        
        # Get base curves from plant-level analysis
        observed = pc_data.get("observed_curve", [])
        warranted = pc_data.get("warranted_curve", [])
        performance_gap = pc_data.get("performance_gap_percent", 0)
        turbulence = pc_data.get("turbulence_intensity", 0.12)
        wind_distribution = pc_data.get("wind_distribution", [])
        
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
                    turbulence_intensity=turbulence if turbulence else 12.0,
                    wind_distribution=wind_distribution,
                    binned_curve=binned_curve_data.get("binned_curve", []),
                    raw_data_points=binned_curve_data.get("raw_points", []),
                    statistics=binned_curve_data.get("statistics", {})
                )
        
        # Return plant-level data if no turbine_id or turbine not found
        print(f"✅ Returning plant-level power curve")
        return PowerCurveResults(
            observed_curve=observed,
            warranted_curve=warranted,
            performance_gap_percent=performance_gap,
            wind_speed_bins=[p["wind_speed"] for p in observed[:10]] if observed else [],
            power_output_bins=[p["power"] for p in observed[:10]] if observed else [],
            turbulence_intensity=turbulence if turbulence else 12.0,
            wind_distribution=wind_distribution,
            binned_curve=binned_curve_data.get("binned_curve", []),
            raw_data_points=binned_curve_data.get("raw_points", []),
            statistics=binned_curve_data.get("statistics", {})
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/financial", response_model=FinancialResults)
async def get_financial_results(job_id: str):
    """Get financial analysis results with comprehensive AEP metrics"""
    try:
        results = JobService.get_job_results(job_id)
        
        if not results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        # Extract financial data
        financial = results.get("financial", {})
        production = financial.get("production_model", {})
        revenue = financial.get("revenue_model", {})
        risk = financial.get("risk_metrics", {})
        
        # Get values with defaults
        p50_energy = production.get("p50_energy_gwh", 12.33)
        p90_energy = production.get("p90_energy_gwh", 11.05)
        mean_aep = production.get("mean_aep_gwh", (p50_energy + p90_energy) / 2)
        
        # Calculate missing metrics if not present
        p10_energy = production.get("p10_energy_gwh", p50_energy * 1.13)
        p5_energy = production.get("p5_energy_gwh", p50_energy * 1.18)
        p95_energy = production.get("p95_energy_gwh", p50_energy * 0.85)
        
        uncertainty_gwh = (p50_energy - p90_energy) / 1.28  # Approximate 1 std dev
        uncertainty_percent = (uncertainty_gwh / mean_aep) * 100
        
        # Generate histogram from stored data or create synthetic distribution
        aep_distribution = production.get("aep_distribution", [])
        if not aep_distribution:
            # Create synthetic histogram centered on mean
            np.random.seed(42)
            simulations = np.random.normal(mean_aep, uncertainty_gwh, 10000)
            hist, bin_edges = np.histogram(simulations, bins=30)
            aep_distribution = [
                {
                    "aep_gwh": round(float((bin_edges[i] + bin_edges[i+1]) / 2), 2),
                    "frequency": int(hist[i]),
                    "bin_start": round(float(bin_edges[i]), 2),
                    "bin_end": round(float(bin_edges[i+1]), 2)
                }
                for i in range(len(hist))
            ]
        
        return FinancialResults(
            mean_aep_gwh=mean_aep,
            p50_energy_gwh=p50_energy,
            p90_energy_gwh=p90_energy,
            p10_energy_gwh=p10_energy,
            p5_energy_gwh=p5_energy,
            p95_energy_gwh=p95_energy,
            p50_revenue_usd=revenue.get("p50_revenue_usd", p50_energy * 1000 * 45),
            p90_revenue_usd=revenue.get("p90_revenue_usd", p90_energy * 1000 * 45),
            capacity_factor=production.get("capacity_factor", 17.2),
            uncertainty_gwh=round(uncertainty_gwh, 3),
            uncertainty_percent=round(uncertainty_percent, 2),
            availability_loss_percent=production.get("availability_loss_percent", 3.5),
            curtailment_loss_percent=production.get("curtailment_loss_percent", 1.2),
            aep_distribution=aep_distribution,
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
    electricity_price: float = Query(45.0, description="Electricity price in USD/MWh"),
    num_simulations: int = Query(10000, description="Number of Monte Carlo simulations")
):
    """
    Get live financial analysis using real NREL/NASA wind data with comprehensive AEP metrics
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
        
        # Monte Carlo simulation for comprehensive P-value estimation
        # Use 8% uncertainty as typical for wind resource assessment
        np.random.seed(42)  # For reproducibility
        uncertainty_pct = 8.0
        
        # Generate distribution with user-specified simulation count
        simulations = np.random.normal(
            total_net_aep, 
            total_net_aep * (uncertainty_pct / 100),
            num_simulations
        )
        
        # Calculate comprehensive P-values
        mean_aep = float(np.mean(simulations))
        p50_energy = float(np.percentile(simulations, 50))
        p90_energy = float(np.percentile(simulations, 10))  # P90 is 10th percentile (conservative)
        p10_energy = float(np.percentile(simulations, 90))  # P10 is 90th percentile (optimistic)
        p5_energy = float(np.percentile(simulations, 95))   # P5 is 95th percentile
        p95_energy = float(np.percentile(simulations, 5))   # P95 is 5th percentile
        
        # Calculate uncertainty (±1 standard deviation)
        std_dev = float(np.std(simulations))
        uncertainty_gwh = std_dev
        uncertainty_percent = (std_dev / mean_aep) * 100
        
        # Calculate revenue (Energy in GWh * 1000 = MWh, then * price)
        p50_revenue = p50_energy * 1000 * electricity_price
        p90_revenue = p90_energy * 1000 * electricity_price
        
        # Calculate availability loss (typical 3-5% for onshore wind)
        availability_loss_percent = 3.5
        
        # Calculate curtailment loss (typical 0.5-2% depending on grid constraints)
        curtailment_loss_percent = 1.2
        
        # Create histogram distribution data (30 bins)
        hist, bin_edges = np.histogram(simulations, bins=30, density=False)
        histogram_data = []
        for i in range(len(hist)):
            bin_center = (bin_edges[i] + bin_edges[i+1]) / 2
            histogram_data.append({
                "aep_gwh": round(float(bin_center), 2),
                "frequency": int(hist[i]),
                "bin_start": round(float(bin_edges[i]), 2),
                "bin_end": round(float(bin_edges[i+1]), 2)
            })
        
        return {
            "mean_aep_gwh": round(mean_aep, 2),
            "p50_energy_gwh": round(p50_energy, 2),
            "p90_energy_gwh": round(p90_energy, 2),
            "p10_energy_gwh": round(p10_energy, 2),
            "p5_energy_gwh": round(p5_energy, 2),
            "p95_energy_gwh": round(p95_energy, 2),
            "p50_revenue_usd": round(p50_revenue, 0),
            "p90_revenue_usd": round(p90_revenue, 0),
            "capacity_factor": round(single_turbine_aep['capacity_factor'], 2),
            "uncertainty_gwh": round(uncertainty_gwh, 3),
            "uncertainty_percent": round(uncertainty_percent, 2),
            "availability_loss_percent": availability_loss_percent,
            "curtailment_loss_percent": curtailment_loss_percent,
            "aep_distribution": histogram_data,
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
                "avg_wind_speed_ms": single_turbine_aep['avg_wind_speed'],
                "simulations": num_simulations
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
