"""
Turbine-specific API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query

from app.services.availability_calc import AvailabilityCalc
from app.schemas.results import TurbinePerformance

router = APIRouter()


@router.get("/list")
async def list_turbines():
    """Get list of all turbines from latest analysis or asset table"""
    from pathlib import Path
    import json
    import pandas as pd
    import os
    
    turbines = []
    
    # STRATEGY: Load from asset table FIRST to get real turbine IDs (R80xxx),
    # then we'll use those IDs consistently everywhere
    try:
        asset_file = Path("data/uploads/la-haute-borne_asset_table.csv")
        if asset_file.exists():
            print(f"✅ Loading turbine list from asset table: {asset_file}")
            df = pd.read_csv(asset_file)
            for idx, row in df.iterrows():
                turbines.append({
                    "turbine_id": row["Wind_turbine_name"],  # R80711, R80721, etc.
                    "turbine_name": f"Turbine-{row['Wind_turbine_name']}",
                    "model": f"{row['Manufacturer']} {row['Model']}",
                    "capacity_mw": row["Rated_power"] / 1000,
                    "location": {
                        "x": idx * 150,
                        "y": 0
                    }
                })
            
            if turbines:
                print(f"✅ Returning {len(turbines)} turbines from asset table")
                print(f"   IDs: {[t['turbine_id'] for t in turbines]}")
                return {
                    "turbines": turbines,
                    "count": len(turbines)
                }
    except Exception as e:
        print(f"⚠️ Error loading turbine list from asset table: {e}")
        import traceback
        traceback.print_exc()
    
    # Fallback to results.json if asset table fails
    try:
        results_dir = Path("data/results")
        if results_dir.exists():
            result_files = sorted(list(results_dir.glob("*/results.json")), 
                                  key=lambda x: x.stat().st_mtime, reverse=True)
            
            if result_files and len(result_files) > 0:
                print(f"✅ Loading turbine list from: {result_files[0]}")
                with open(result_files[0], 'r') as f:
                    results = json.load(f)
                
                wake_losses = results.get("wake_losses", {})
                turbine_data = wake_losses.get("turbine_wake_losses", [])
                
                if turbine_data and len(turbine_data) > 0:
                    print(f"✅ Found {len(turbine_data)} turbines in results")
                    for idx, turbine in enumerate(turbine_data):
                        turbines.append({
                            "turbine_id": turbine.get("turbine_id"),
                            "turbine_name": turbine.get("turbine_name"),
                            "model": "Senvion MM82",
                            "capacity_mw": 2.05,
                            "wake_loss_percent": turbine.get("wake_loss_percent", 0),
                            "location": {
                                "x": idx * 150,
                                "y": 0
                            }
                        })
                    
                    print(f"✅ Returning {len(turbines)} turbines from results")
                    return {
                        "turbines": turbines,
                        "count": len(turbines)
                    }
    except Exception as e:
        print(f"⚠️ Error loading turbine list from results: {e}")
        import traceback
        traceback.print_exc()
    
    # Final fallback: Use R80xxx IDs to match asset table
    print("⚠️ Using hardcoded fallback turbine list (R80711-R80790)")
    default_turbines = ["R80711", "R80721", "R80736", "R80790"]
    for idx, turbine_id in enumerate(default_turbines):
        turbines.append({
            "turbine_id": turbine_id,
            "turbine_name": f"Turbine-{turbine_id}",
            "model": "Senvion MM82",
            "capacity_mw": 2.05,
            "location": {
                "x": idx * 150,
                "y": 0
            }
        })

    print(f"✅ Returning {len(turbines)} fallback turbines")
    return {
        "turbines": turbines,
        "count": len(turbines)
    }
    
    return {
        "turbines": turbines,
        "count": len(turbines)
    }


@router.get("/performance", response_model=List[TurbinePerformance])
async def get_turbines_performance(turbine_id: str = None):
    """Get performance metrics for all turbines or a specific turbine"""
    # Map real turbine IDs (R80xxx) to analysis IDs (T01-T04) if needed
    turbine_id_map = {
        "R80711": "T01",
        "R80721": "T02",
        "R80736": "T03",
        "R80790": "T04"
    }
    analysis_turbine_id = turbine_id_map.get(turbine_id, turbine_id) if turbine_id else None
    
    # Get availability data
    turbine_data = AvailabilityCalc.calculate_turbine_availability(None)
    
    # Filter by analysis_turbine_id if provided
    if analysis_turbine_id:
        turbine_data = [t for t in turbine_data if t["turbine_id"] == analysis_turbine_id or t["turbine_id"] == turbine_id]
    
    performance_list = []
    for turbine in turbine_data:
        # Calculate capacity factor from availability (rough estimate: CF ≈ 0.4 × Availability)
        # This is a proxy until we have full per-turbine analysis
        availability = turbine["availability_percent"]
        estimated_cf = round(availability * 0.42, 1)  # Wind farms typically operate at ~40-45% CF
        
        # Estimate energy production based on availability and typical 3.4MW turbine
        # Annual hours * capacity * availability * typical CF adjustment
        estimated_energy = round(8760 * 3.4 * (availability / 100) * 0.42, 1)
        
        performance_list.append(
            TurbinePerformance(
                turbine_id=turbine["turbine_id"],
                turbine_name=turbine["turbine_name"],
                availability_percent=turbine["availability_percent"],
                capacity_factor_percent=estimated_cf,
                energy_produced_mwh=estimated_energy,
                wake_loss_percent=0,  # Per-turbine wake loss requires detailed position analysis
                status=turbine["status"]
            )
        )
    
    return performance_list


@router.get("/{turbine_id}")
async def get_turbine_details(turbine_id: str):
    """Get detailed information for a specific turbine from asset table and latest SCADA"""
    from pathlib import Path
    import pandas as pd
    from datetime import datetime
    
    try:
        # Load asset table for technical specifications
        asset_file = Path("data/uploads/la-haute-borne_asset_table.csv")
        if not asset_file.exists():
            raise HTTPException(status_code=404, detail="Asset table not found")
        
        df_asset = pd.read_csv(asset_file)
        turbine_row = df_asset[df_asset["Wind_turbine_name"] == turbine_id]
        
        if turbine_row.empty:
            raise HTTPException(status_code=404, detail=f"Turbine {turbine_id} not found")
        
        turbine_row = turbine_row.iloc[0]
        
        # Load latest SCADA data for current status
        scada_file = Path("data/uploads/la-haute-borne-data-2014-2015.csv")
        current_status = {"status": "operational", "power_kw": 0, "wind_speed_ms": 0}
        
        if scada_file.exists():
            df_scada = pd.read_csv(scada_file)
            turbine_scada = df_scada[df_scada["Wind_turbine_name"] == turbine_id]
            if not turbine_scada.empty:
                latest = turbine_scada.iloc[-1]
                current_status = {
                    "status": "operational" if float(latest["P_avg"]) > 0 else "standby",
                    "power_kw": float(round(latest["P_avg"], 1)),
                    "wind_speed_ms": float(round(latest["Ws_avg"], 1)),
                    "wind_direction_deg": float(round(latest["Va_avg"], 1)),
                    "temperature_c": float(round(latest["Ot_avg"], 1)),
                    "last_updated": str(latest["Date_time"])
                }
        
        return {
            "turbine_id": turbine_id,
            "turbine_name": f"Turbine-{turbine_id}",
            "model": f"{turbine_row['Manufacturer']} {turbine_row['Model']}",
            "manufacturer": str(turbine_row["Manufacturer"]),
            "capacity_kw": int(turbine_row["Rated_power"]),
            "hub_height_m": float(turbine_row["Hub_height_m"]),
            "rotor_diameter_m": float(turbine_row["Rotor_diameter_m"]),
            "location": {
                "latitude": float(turbine_row["Latitude"]),
                "longitude": float(turbine_row["Longitude"]),
                "elevation_m": float(turbine_row["elevation_m"])
            },
            "current_status": current_status,
            "cut_in_speed_ms": 3.0,
            "cut_out_speed_ms": 25.0,
            "rated_speed_ms": 12.5
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching turbine details: {str(e)}")


@router.get("/{turbine_id}/telemetry")
async def get_turbine_telemetry(
    turbine_id: str,
    hours: int = Query(24, ge=1, le=168, description="Hours of historical data")
):
    """Get real telemetry data from SCADA for a turbine"""
    from pathlib import Path
    import pandas as pd
    from datetime import datetime, timedelta
    
    try:
        scada_file = Path("data/uploads/la-haute-borne-data-2014-2015.csv")
        if not scada_file.exists():
            raise HTTPException(status_code=404, detail="SCADA data not found")
        
        # Load SCADA data
        df = pd.read_csv(scada_file)
        df["Date_time"] = pd.to_datetime(df["Date_time"], utc=True)
        
        # Filter by turbine
        turbine_data = df[df["Wind_turbine_name"] == turbine_id].copy()
        
        if turbine_data.empty:
            raise HTTPException(status_code=404, detail=f"No SCADA data for turbine {turbine_id}")
        
        # Get last N hours of data (or last N records if hours not available)
        # Since data might not have exactly the requested hours, take last N points
        points_per_hour = 1  # Assuming hourly data
        num_points = min(hours * points_per_hour, len(turbine_data))
        turbine_data = turbine_data.tail(num_points)
        
        # Format for chart display
        telemetry = []
        for _, row in turbine_data.iterrows():
            # Extract hour from timestamp for x-axis
            time_str = pd.to_datetime(row["Date_time"]).strftime("%H:%M")
            telemetry.append({
                "time": time_str,
                "power": float(round(row["P_avg"], 1)),  # kW
                "windSpeed": float(round(row["Ws_avg"], 1)),  # m/s
                "temperature": float(round(row["Ot_avg"], 1)),  # °C
                "windDirection": float(round(row["Va_avg"], 1))  # degrees
            })
        
        return {
            "turbine_id": turbine_id,
            "data_points": len(telemetry),
            "telemetry": telemetry
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching telemetry: {str(e)}")


@router.get("/{turbine_id}/alarms")
async def get_turbine_alarms(turbine_id: str, limit: int = Query(10, ge=1, le=50)):
    """Get recent alarms and events for a turbine based on SCADA anomalies"""
    from pathlib import Path
    import pandas as pd
    from datetime import datetime
    
    try:
        scada_file = Path("data/uploads/la-haute-borne-data-2014-2015.csv")
        if not scada_file.exists():
            return {"turbine_id": turbine_id, "alarms": []}
        
        df = pd.read_csv(scada_file)
        df["Date_time"] = pd.to_datetime(df["Date_time"])
        turbine_data = df[df["Wind_turbine_name"] == turbine_id].copy()
        
        if turbine_data.empty:
            return {"turbine_id": turbine_id, "alarms": []}
        
        alarms = []
        
        # Analyze recent data for anomalies
        recent_data = turbine_data.tail(100)  # Last 100 records
        
        # Check for power anomalies
        avg_power = recent_data["P_avg"].mean()
        for _, row in recent_data.tail(20).iterrows():
            # High temperature warning
            if row["Ot_avg"] > 15:
                alarms.append({
                    "severity": "warning",
                    "message": f"Elevated temperature: {row['Ot_avg']:.1f}°C",
                    "timestamp": row["Date_time"].isoformat(),
                    "type": "temperature"
                })
            
            # Low power warning (when wind is adequate)
            if row["Ws_avg"] > 5 and row["P_avg"] < avg_power * 0.3:
                alarms.append({
                    "severity": "warning",
                    "message": f"Low power output: {row['P_avg']:.0f} kW at {row['Ws_avg']:.1f} m/s wind",
                    "timestamp": row["Date_time"].isoformat(),
                    "type": "power"
                })
            
            # High wind speed info
            if row["Ws_avg"] > 20:
                alarms.append({
                    "severity": "info",
                    "message": f"High wind speed: {row['Ws_avg']:.1f} m/s",
                    "timestamp": row["Date_time"].isoformat(),
                    "type": "wind"
                })
        
        # Add info about general status
        if avg_power > 500:
            alarms.append({
                "severity": "info",
                "message": f"Average power output: {avg_power:.0f} kW (Good performance)",
                "timestamp": recent_data.iloc[-1]["Date_time"].isoformat(),
                "type": "status"
            })
        
        # Sort by timestamp (most recent first) and limit
        alarms = sorted(alarms, key=lambda x: x["timestamp"], reverse=True)[:limit]
        
        # Add relative time
        for alarm in alarms:
            alarm_time = pd.to_datetime(alarm["timestamp"])
            alarm["time_ago"] = "Historical data"
        
        return {
            "turbine_id": turbine_id,
            "count": len(alarms),
            "alarms": alarms
        }
    except Exception as e:
        print(f"Error getting alarms: {e}")
        return {"turbine_id": turbine_id, "alarms": []}


@router.get("/status/live")
async def get_live_turbine_status():
    """Get real-time status of all turbines"""
    return {
        "timestamp": AvailabilityCalc.get_live_asset_status()[0]["last_updated"],
        "turbines": AvailabilityCalc.get_live_asset_status()
    }


@router.post("/{turbine_id}/service")
async def schedule_turbine_service(turbine_id: str, service_type: str, date: str):
    """Schedule a service for a turbine"""
    return {
        "message": f"Service scheduled for {turbine_id}",
        "turbine_id": turbine_id,
        "service_type": service_type,
        "scheduled_date": date,
        "status": "confirmed"
    }
