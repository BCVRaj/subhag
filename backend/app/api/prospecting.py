"""
Prospecting API Endpoints - Site assessment and wind resource analysis

PRODUCTION INTEGRATION GUIDE:
==============================

For real-world wind resource assessment, integrate these external APIs:

1. WIND DATA SOURCES:
   - NREL Wind Toolkit API (https://developer.nrel.gov/docs/wind/)
   - Global Wind Atlas (https://globalwindatlas.info/api)
   - NASA POWER API (weather/wind data)
   - OpenWeatherMap Historical Wind Data
   
2. TERRAIN & ELEVATION:
   - USGS Elevation API
   - OpenTopography API
   - Google Elevation API
   
3. MAP SERVICES:
   - Mapbox GL JS (frontend)
   - Leaflet with OpenStreetMap
   - Google Maps API
   
4. GRID CONNECTION:
   - EIA Transmission Lines API
   - OpenInfra Map API
   
5. RECOMMENDED WORKFLOW:
   a) User drops pin on interactive map
   b) Backend queries lat/long to fetch:
      - 10+ years of wind speed/direction data
      - Elevation and terrain complexity
      - Nearby grid connection points
   c) Calculate Weibull parameters from historical data
   d) Estimate AEP using wind turbine power curves
   e) Assess financial viability (LCOE, IRR, payback)
   
6. PYTHON LIBRARIES FOR PRODUCTION:
   - windpowerlib: Wind turbine calculations
   - pvlib: Solar radiation (for hybrid sites)
   - pyproj: Coordinate projections
   - rasterio: Terrain data processing
   - openoa: Production data analysis
   
CURRENT IMPLEMENTATION:
   - Static demo data for 5 pre-defined sites
   - Simulated wind rose patterns
   - Simplified financial calculations
   - Ready to swap with real API calls
"""
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query, Body
from pydantic import BaseModel
from datetime import datetime
import sys
import os

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.wind_data import (
    get_nrel_wind_data,
    calculate_wind_rose_data,
    calculate_aep,
    assess_viability,
    fit_weibull_parameters
)

router = APIRouter()


# Pydantic Models
class SiteCoordinates(BaseModel):
    lat: float
    long: float


class ProspectingSite(BaseModel):
    id: str
    name: str
    sector: str
    viability: str
    viability_color: str
    coordinates: SiteCoordinates
    aep: int  # GWh
    aep_change: int  # percentage vs regional avg
    capacity_factor: int  # percentage
    avg_wind_speed: float  # m/s


class DroppedPin(BaseModel):
    coordinates: SiteCoordinates
    notes: Optional[str] = None
    timestamp: datetime


class WindDirectionData(BaseModel):
    direction: str  # N, NE, E, SE, S, SW, W, NW
    frequency: float  # percentage
    avg_speed: float  # m/s


class SimulationRequest(BaseModel):
    site_id: str
    turbine_count: int = 10
    turbine_model: str = "Generic 2.5MW"
    parameters: Optional[Dict[str, Any]] = None


# In-memory storage for prospecting data
PROSPECTING_SITES = {
    "A-14": {
        "id": "A-14",
        "name": "Plot A-14",
        "sector": "Desert Ridge Sector",
        "viability": "HIGH VIABILITY",
        "viability_color": "bg-primary/20 text-primary",
        "coordinates": {"lat": 34.05, "long": -118.25},
        "aep": 450,
        "aep_change": 12,
        "capacity_factor": 42,
        "avg_wind_speed": 7.5
    },
    "B-23": {
        "id": "B-23",
        "name": "Plot B-23",
        "sector": "Coastal Ridge",
        "viability": "GOOD VIABILITY",
        "viability_color": "bg-blue-500/20 text-blue-400",
        "coordinates": {"lat": 36.12, "long": -115.17},
        "aep": 380,
        "aep_change": 8,
        "capacity_factor": 38,
        "avg_wind_speed": 6.8
    },
    "C-09": {
        "id": "C-09",
        "name": "Plot C-09",
        "sector": "Western Valley",
        "viability": "MODERATE VIABILITY",
        "viability_color": "bg-yellow-500/20 text-yellow-400",
        "coordinates": {"lat": 40.72, "long": -111.89},
        "aep": 320,
        "aep_change": 5,
        "capacity_factor": 34,
        "avg_wind_speed": 6.2
    },
    "D-15": {
        "id": "D-15",
        "name": "Plot D-15",
        "sector": "Mountain Pass",
        "viability": "HIGH VIABILITY",
        "viability_color": "bg-primary/20 text-primary",
        "coordinates": {"lat": 39.45, "long": -119.78},
        "aep": 520,
        "aep_change": 18,
        "capacity_factor": 45,
        "avg_wind_speed": 8.2
    },
    "E-07": {
        "id": "E-07",
        "name": "Plot E-07",
        "sector": "Prairie Highlands",
        "viability": "GOOD VIABILITY",
        "viability_color": "bg-blue-500/20 text-blue-400",
        "coordinates": {"lat": 41.23, "long": -102.45},
        "aep": 410,
        "aep_change": 10,
        "capacity_factor": 40,
        "avg_wind_speed": 7.1
    }
}

# In-memory storage for dropped pins
DROPPED_PINS = []

# Wind rose data by site
WIND_DATA = {
    "A-14": [
        {"direction": "N", "frequency": 12.5, "avg_speed": 7.8},
        {"direction": "NE", "frequency": 15.2, "avg_speed": 8.1},
        {"direction": "E", "frequency": 10.3, "avg_speed": 6.9},
        {"direction": "SE", "frequency": 8.7, "avg_speed": 6.2},
        {"direction": "S", "frequency": 14.8, "avg_speed": 7.5},
        {"direction": "SW", "frequency": 18.9, "avg_speed": 8.4},
        {"direction": "W", "frequency": 13.4, "avg_speed": 7.2},
        {"direction": "NW", "frequency": 6.2, "avg_speed": 6.5}
    ],
    "B-23": [
        {"direction": "N", "frequency": 10.2, "avg_speed": 6.9},
        {"direction": "NE", "frequency": 13.5, "avg_speed": 7.2},
        {"direction": "E", "frequency": 16.8, "avg_speed": 7.5},
        {"direction": "SE", "frequency": 12.3, "avg_speed": 6.5},
        {"direction": "S", "frequency": 11.7, "avg_speed": 6.8},
        {"direction": "SW", "frequency": 14.2, "avg_speed": 7.1},
        {"direction": "W", "frequency": 15.8, "avg_speed": 7.4},
        {"direction": "NW", "frequency": 5.5, "avg_speed": 6.2}
    ],
    "C-09": [
        {"direction": "N", "frequency": 14.3, "avg_speed": 6.5},
        {"direction": "NE", "frequency": 11.8, "avg_speed": 6.2},
        {"direction": "E", "frequency": 9.2, "avg_speed": 5.8},
        {"direction": "SE", "frequency": 8.5, "avg_speed": 5.5},
        {"direction": "S", "frequency": 12.7, "avg_speed": 6.3},
        {"direction": "SW", "frequency": 16.4, "avg_speed": 6.9},
        {"direction": "W", "frequency": 19.1, "avg_speed": 7.2},
        {"direction": "NW", "frequency": 8.0, "avg_speed": 6.0}
    ]
}


@router.get("/sites")
async def get_all_sites(
    search: Optional[str] = Query(None, description="Search by name, sector, or ID"),
    viability: Optional[str] = Query(None, description="Filter by viability level")
):
    """
    Get all prospecting sites with optional filtering
    """
    sites = list(PROSPECTING_SITES.values())
    
    # Apply search filter
    if search:
        search_lower = search.lower()
        sites = [
            site for site in sites
            if search_lower in site["name"].lower() 
            or search_lower in site["sector"].lower()
            or search_lower in site["id"].lower()
        ]
    
    # Apply viability filter
    if viability:
        viability_upper = viability.upper()
        sites = [
            site for site in sites
            if viability_upper in site["viability"]
        ]
    
    return {
        "sites": sites,
        "count": len(sites),
        "total_available": len(PROSPECTING_SITES)
    }


@router.get("/sites/{site_id}")
async def get_site_details(site_id: str):
    """
    Get detailed information for a specific prospecting site with REAL wind data
    """
    if site_id not in PROSPECTING_SITES:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    
    site = PROSPECTING_SITES[site_id]
    lat = site["coordinates"]["lat"]
    lon = site["coordinates"]["long"]
    
    # Fetch real wind data from NREL
    nrel_data = get_nrel_wind_data(lat, lon)
    
    # Calculate real wind rose
    rose_data = calculate_wind_rose_data(
        nrel_data['wind_speeds'],
        nrel_data['wind_directions']
    )
    
    # Calculate real AEP
    aep_results = calculate_aep(nrel_data['wind_speeds'])
    
    # Update site with real calculated data
    site["aep"] = int(aep_results['aep_gwh'] * 10)  # For 10 turbines
    site["capacity_factor"] = int(aep_results['capacity_factor'])
    site["avg_wind_speed"] = aep_results['avg_wind_speed']
    
    # Convert rose data to list
    wind_data = [
        {"direction": d, "frequency": data["frequency"], "avg_speed": data["avg_speed"]}
        for d, data in rose_data.items()
    ]
    
    return {
        "site": site,
        "wind_data": wind_data,
        "data_source": nrel_data['source'],
        "additional_metrics": {
            "turbulence_intensity": 0.12,
            "air_density": 1.225,
            "terrain_complexity": "moderate",
            "grid_distance_km": 15.3,
            "access_road_needed": True
        }
    }


@router.post("/pins")
async def save_dropped_pin(
    coordinates: SiteCoordinates,
    notes: Optional[str] = Body(None),
    pin_id: Optional[str] = Body(None)
):
    """
    Save a dropped pin location and perform quick wind assessment
    """
    # Use provided pin_id or generate new one
    if not pin_id:
        pin_id = f"PIN-{int(datetime.now().timestamp() * 1000)}"
    
    # Quick assessment of the location
    try:
        nrel_data = get_nrel_wind_data(coordinates.lat, coordinates.long)
        aep_results = calculate_aep(nrel_data['wind_speeds'])
        viability_results = assess_viability(
            aep_results['capacity_factor'],
            aep_results['avg_wind_speed']
        )
        
        # Cache wind rose data for this pin
        rose_data = calculate_wind_rose_data(
            nrel_data['wind_speeds'],
            nrel_data['wind_directions']
        )
        
        assessment = {
            "aep_gwh": aep_results['aep_gwh'],
            "capacity_factor": aep_results['capacity_factor'],
            "avg_wind_speed": aep_results['avg_wind_speed'],
            "viability": viability_results['viability'],
            "data_source": nrel_data['source']
        }
    except Exception as e:
        assessment = {"error": str(e), "status": "assessment_failed"}
        rose_data = None
    
    pin = {
        "id": pin_id,
        "coordinates": coordinates.model_dump(),
        "notes": notes,
        "assessment": assessment,
        "timestamp": datetime.now().isoformat()
    }
    
    DROPPED_PINS.append(pin)
    
    # Cache wind rose data if available
    if rose_data:
        WIND_DATA[pin_id] = [
            {
                "direction": direction,
                "frequency": data["frequency"],
                "avg_speed": data["avg_speed"]
            }
            for direction, data in rose_data.items()
        ]
    
    return {
        "success": True,
        "pin": pin,
        "assessment": assessment,
        "message": "Pin saved and assessed successfully"
    }


@router.get("/pins")
async def get_dropped_pins():
    """
    Get all dropped pins
    """
    return {
        "pins": DROPPED_PINS,
        "count": len(DROPPED_PINS)
    }


@router.delete("/pins/{pin_id}")
async def delete_pin(pin_id: str):
    """
    Delete a specific pin
    """
    global DROPPED_PINS
    
    original_count = len(DROPPED_PINS)
    DROPPED_PINS = [pin for pin in DROPPED_PINS if pin["id"] != pin_id]
    
    if len(DROPPED_PINS) == original_count:
        raise HTTPException(status_code=404, detail=f"Pin {pin_id} not found")
    
    return {
        "success": True,
        "message": f"Pin {pin_id} deleted"
    }


@router.get("/wind-data/{site_id}")
async def get_wind_data(site_id: str):
    """
    Get REAL wind resource data for wind rose visualization from NREL
    """
    # Check if it's a predefined site or a dropped pin
    if site_id in PROSPECTING_SITES:
        site = PROSPECTING_SITES[site_id].copy()
        lat = site["coordinates"]["lat"]
        lon = site["coordinates"]["long"]
    else:
        # Check dropped pins
        pin = next((p for p in DROPPED_PINS if p["id"] == site_id), None)
        if not pin:
            raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
        
        lat = pin["coordinates"]["lat"]
        lon = pin["coordinates"]["long"]
        
        # Create site structure from pin
        site = {
            "id": site_id,
            "name": f"Assessment Pin",
            "sector": f"Custom ({lat:.2f}°, {lon:.2f}°)",
            "coordinates": pin["coordinates"],
            "aep": pin.get("assessment", {}).get("aep_gwh", 0) * 10,  # For 10 turbines
            "capacity_factor": pin.get("assessment", {}).get("capacity_factor", 0),
            "avg_wind_speed": pin.get("assessment", {}).get("avg_wind_speed", 0),
            "viability": pin.get("assessment", {}).get("viability", "Unknown")
        }
        
        # Check if wind data is already cached for this pin
        if site_id in WIND_DATA:
            wind_data = WIND_DATA[site_id]
            dominant = max(wind_data, key=lambda x: x["frequency"])
            
            return {
                "site_id": site_id,
                "site": site,
                "wind_data": wind_data,
                "data_source": pin.get("assessment", {}).get("data_source", "Cached"),
                "data_year": 2021,
                "measurement_height_m": 80,
                "dominant_direction": dominant["direction"],
                "dominant_frequency": dominant["frequency"]
            }
    
    # Fetch real wind data from NREL (for predefined sites or uncached pins)
    nrel_data = get_nrel_wind_data(lat, lon)
    
    # Calculate wind rose statistics
    rose_data = calculate_wind_rose_data(
        nrel_data['wind_speeds'],
        nrel_data['wind_directions']
    )
    
    # Calculate real AEP and update site with calculated values
    aep_results = calculate_aep(nrel_data['wind_speeds'])
    site["aep"] = int(aep_results['aep_gwh'] * 10)  # For 10 turbines
    site["capacity_factor"] = int(aep_results['capacity_factor'])
    site["avg_wind_speed"] = aep_results['avg_wind_speed']
    
    # Convert to list format for frontend
    wind_data = [
        {
            "direction": direction,
            "frequency": data["frequency"],
            "avg_speed": data["avg_speed"]
        }
        for direction, data in rose_data.items()
    ]
    
    # Find dominant direction
    dominant = max(wind_data, key=lambda x: x["frequency"])
    
    return {
        "site_id": site_id,
        "site": site,  # Include updated site data
        "wind_data": wind_data,
        "data_source": nrel_data['source'],
        "data_year": nrel_data['year'],
        "measurement_height_m": 80,
        "dominant_direction": dominant["direction"],
        "dominant_frequency": dominant["frequency"]
    }


@router.post("/simulate")
async def run_site_simulation(request: SimulationRequest):
    """
    Run a simulation for site potential energy production using REAL wind data
    """
    site_id = request.site_id
    turbine_count = request.turbine_count
    
    # Get site coordinates from either predefined sites or dropped pins
    if site_id in PROSPECTING_SITES:
        site = PROSPECTING_SITES[site_id]
        lat = site["coordinates"]["lat"]
        lon = site["coordinates"]["long"]
        site_name = site["name"]
    else:
        # Check dropped pins
        pin = next((p for p in DROPPED_PINS if p["id"] == site_id), None)
        if not pin:
            raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
        
        lat = pin["coordinates"]["lat"]
        lon = pin["coordinates"]["long"]
        site_name = f"Pin {site_id}"
    
    # Fetch REAL wind data from NREL/NASA
    nrel_data = get_nrel_wind_data(lat, lon)
    
    # Calculate AEP for a single turbine
    single_turbine_aep = calculate_aep(nrel_data['wind_speeds'], turbine_capacity_mw=2.5)
    
    total_capacity_mw = turbine_count * 2.5
    
    # Simulate wake losses (10-15% depending on layout)
    wake_loss_factor = 0.12
    
    # Calculate results based on real wind data
    gross_aep = single_turbine_aep['aep_gwh'] * turbine_count
    net_aep = gross_aep * (1 - wake_loss_factor)
    capacity_factor = single_turbine_aep['capacity_factor']
    
    # Calculate LCOE based on capacity factor
    lcoe = 45 + (5 * (1 - capacity_factor / 45))  # $/MWh
    
    return {
        "simulation_id": f"SIM-{site_id}-{datetime.now().strftime('%Y%m%d%H%M%S')}",
        "site_id": site_id,
        "site_name": site_name,
        "data_source": nrel_data['source'],
        "parameters": {
            "turbine_count": turbine_count,
            "turbine_model": request.turbine_model,
            "total_capacity_mw": total_capacity_mw,
            "capacity_factor": round(capacity_factor, 1),
            "avg_wind_speed_ms": single_turbine_aep['avg_wind_speed']
        },
        "results": {
            "gross_aep_gwh": round(gross_aep, 2),
            "net_aep_gwh": round(net_aep, 2),
            "wake_losses_percent": round(wake_loss_factor * 100, 1),
            "lcoe_usd_per_mwh": round(lcoe, 2),
            "annual_revenue_usd": round(net_aep * 1000 * 50, 2),  # Assuming $50/MWh
            "project_capex_usd_million": round(total_capacity_mw * 1.4, 2),  # $1.4M per MW
            "payback_years": round((total_capacity_mw * 1.4 * 1000000) / (net_aep * 1000 * 50), 1)
        },
        "status": "completed",
        "timestamp": datetime.now().isoformat()
    }


@router.post("/assess-location")
async def assess_location(coordinates: SiteCoordinates):
    """
    Assess wind resource at ANY location using REAL NREL wind data
    """
    lat = coordinates.lat
    lon = coordinates.long
    
    # Fetch real wind data from NREL
    nrel_data = get_nrel_wind_data(lat, lon)
    
    # Calculate wind rose statistics
    rose_data = calculate_wind_rose_data(
        nrel_data['wind_speeds'],
        nrel_data['wind_directions']
    )
    
    # Calculate AEP and capacity factor
    aep_results = calculate_aep(nrel_data['wind_speeds'])
    
    # Assess viability
    viability_results = assess_viability(
        aep_results['capacity_factor'],
        aep_results['avg_wind_speed']
    )
    
    # Fit Weibull parameters
    k_param, a_param = fit_weibull_parameters(nrel_data['wind_speeds'])
    
    return {
        "location": {
            "lat": lat,
            "lon": lon
        },
        "wind_resource": {
            "avg_wind_speed_ms": aep_results['avg_wind_speed'],
            "weibull_k": k_param,
            "weibull_a": a_param,
            "data_source": nrel_data['source'],
            "data_year": nrel_data['year']
        },
        "energy_production": {
            "aep_gwh_per_turbine": aep_results['aep_gwh'],
            "capacity_factor_percent": aep_results['capacity_factor'],
            "turbine_capacity_mw": aep_results['turbine_capacity_mw']
        },
        "viability": viability_results,
        "wind_rose": [
            {
                "direction": direction,
                "frequency": data["frequency"],
                "avg_speed": data["avg_speed"]
            }
            for direction, data in rose_data.items()
        ],
        "assessment_timestamp": datetime.now().isoformat()
    }


@router.get("/report/{site_id}")
async def generate_site_report(site_id: str):
    """
    Generate a comprehensive site assessment report
    """
    if site_id not in PROSPECTING_SITES:
        raise HTTPException(status_code=404, detail=f"Site {site_id} not found")
    
    site = PROSPECTING_SITES[site_id]
    wind_data = WIND_DATA.get(site_id, [])
    
    return {
        "report_id": f"RPT-{site_id}-{datetime.now().strftime('%Y%m%d')}",
        "site": site,
        "executive_summary": {
            "recommendation": "Proceed to detailed feasibility study" if site["capacity_factor"] >= 38 else "Conduct additional wind measurements",
            "key_strengths": [
                f"High capacity factor ({site['capacity_factor']}%)",
                f"Strong average wind speed ({site['avg_wind_speed']} m/s)",
                f"AEP {site['aep_change']}% above regional average"
            ],
            "key_risks": [
                "Grid connection distance requires infrastructure investment",
                "Terrain complexity may increase construction costs",
                "Environmental impact assessment required"
            ]
        },
        "wind_resource": {
            "data": wind_data,
            "avg_speed": site["avg_wind_speed"],
            "weibull_k": 2.2,
            "weibull_c": site["avg_wind_speed"] * 1.13
        },
        "economic_indicators": {
            "estimated_capex_per_mw": 1.4,
            "estimated_lcoe": 45.0,
            "irr_target": 8.5,
            "payback_period_years": 12
        },
        "next_steps": [
            "Install meteorological mast for 12-month measurement campaign",
            "Conduct geotechnical survey",
            "Initiate environmental impact assessment",
            "Engage with grid operator for connection feasibility",
            "Develop preliminary layout optimization"
        ],
        "generated_at": datetime.now().isoformat()
    }
