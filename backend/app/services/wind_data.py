"""
Wind Data Service - Real wind resource data from NREL and other APIs
"""
import requests
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import logging

logger = logging.getLogger(__name__)

# NREL API Configuration
NREL_API_KEY = "Ww7jhk6MoKhxy5pRNEdYbwhTGrIcRmElRzTAwYv4"
NREL_BASE_URL = "https://developer.nrel.gov/api/wind-toolkit/v2"

# NASA POWER API (free, worldwide coverage)
NASA_POWER_URL = "https://power.larc.nasa.gov/api/temporal/hourly/point"


def get_nasa_wind_data(lat: float, lon: float) -> Dict:
    """
    Fetch wind data from NASA POWER API (free, worldwide coverage)
    
    Args:
        lat: Latitude
        lon: Longitude
    
    Returns:
        Dictionary with wind speed and direction data
    """
    try:
        params = {
            'parameters': 'WS10M,WD10M',  # Wind speed & direction at 10m
            'community': 'RE',
            'longitude': lon,
            'latitude': lat,
            'start': '20210101',
            'end': '20211231',
            'format': 'JSON'
        }
        
        logger.info(f"Fetching NASA POWER wind data for ({lat}, {lon})")
        response = requests.get(NASA_POWER_URL, params=params, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            
            if 'properties' in data and 'parameter' in data['properties']:
                ws_data = data['properties']['parameter'].get('WS10M', {})
                wd_data = data['properties']['parameter'].get('WD10M', {})
                
                # Extract hourly data
                wind_speeds = []
                wind_directions = []
                
                for date_key in sorted(ws_data.keys()):
                    if date_key in wd_data:
                        # Scale 10m wind to 80m height (power law with exponent 0.2)
                        ws_10m = ws_data[date_key]
                        if ws_10m > 0:
                            ws_80m = ws_10m * (80 / 10) ** 0.2
                            wind_speeds.append(ws_80m)
                            wind_directions.append(wd_data[date_key])
                
                if wind_speeds:
                    logger.info(f"✅ Successfully fetched {len(wind_speeds)} hours of NASA POWER data")
                    return {
                        'wind_speeds': wind_speeds,
                        'wind_directions': wind_directions,
                        'source': 'NASA POWER (scaled to 80m)',
                        'year': 2021,
                        'location': {'lat': lat, 'lon': lon}
                    }
        
        logger.warning(f"NASA POWER API returned {response.status_code}")
        return None
        
    except Exception as e:
        logger.error(f"NASA POWER API error: {str(e)}")
        return None


def get_nrel_wind_data(lat: float, lon: float, year: int = 2021) -> Dict:
    """
    Fetch wind data from NREL Wind Toolkit API with fallback to NASA POWER
    
    Args:
        lat: Latitude
        lon: Longitude  
        year: Year of data (2007-2021 available)
    
    Returns:
        Dictionary with wind speed and direction data
    """
    # Try NREL API first (best quality, US only)
    try:
        # NREL Wind Toolkit point data endpoint
        url = f"{NREL_BASE_URL}/wind/wtk-download.csv"
        
        params = {
            'api_key': NREL_API_KEY,
            'wkt': f'POINT({lon} {lat})',
            'attributes': 'windspeed_80m,winddirection_80m',
            'names': year,
            'utc': 'true',
            'leap_day': 'false',
            'interval': '60',  # hourly data
            'email': 'windops@example.com'
        }
        
        logger.info(f"🌐 Fetching NREL wind data for ({lat}, {lon}), year {year}")
        response = requests.get(url, params=params, timeout=30)
        
        if response.status_code == 200:
            # Parse CSV response
            lines = response.text.strip().split('\n')
            
            # Skip header rows
            data_start = 0
            for i, line in enumerate(lines):
                if line.startswith('Year,'):
                    data_start = i + 1
                    break
            
            wind_speeds = []
            wind_directions = []
            
            for line in lines[data_start:]:
                try:
                    parts = line.split(',')
                    if len(parts) >= 4:
                        speed = float(parts[2])  # windspeed_80m
                        direction = float(parts[3])  # winddirection_80m
                        wind_speeds.append(speed)
                        wind_directions.append(direction)
                except (ValueError, IndexError):
                    continue
            
            if wind_speeds and len(wind_speeds) > 1000:  # At least some data
                logger.info(f"✅ Successfully fetched {len(wind_speeds)} hours of NREL wind data")
                return {
                    'wind_speeds': wind_speeds,
                    'wind_directions': wind_directions,
                    'source': 'NREL Wind Toolkit',
                    'year': year,
                    'location': {'lat': lat, 'lon': lon}
                }
        
        logger.info(f"NREL API unavailable (status {response.status_code}), trying NASA POWER...")
            
    except Exception as e:
        logger.info(f"NREL API error: {str(e)}, trying NASA POWER...")
    
    # Try NASA POWER as backup (worldwide coverage)
    nasa_data = get_nasa_wind_data(lat, lon)
    if nasa_data:
        return nasa_data
    
    # Final fallback to synthetic data
    logger.info(f"Using synthetic wind data for ({lat}, {lon})")
    return get_fallback_wind_data(lat, lon)


def get_fallback_wind_data(lat: float, lon: float) -> Dict:
    """
    Generate synthetic wind data based on location when API fails
    """
    logger.info(f"Using fallback synthetic wind data for ({lat}, {lon})")
    
    # Generate synthetic but realistic wind data
    np.random.seed(int((lat + lon) * 1000) % 10000)
    
    # Base wind speed varies by latitude (higher at mid-latitudes)
    base_speed = 5 + abs(lat - 40) * 0.1
    
    # Generate 8760 hours (1 year)
    hours = 8760
    wind_speeds = np.random.weibull(2.0, hours) * base_speed
    
    # Prevailing wind direction varies by location
    prevailing = (lon + 180) % 360
    wind_directions = np.random.normal(prevailing, 45, hours) % 360
    
    return {
        'wind_speeds': wind_speeds.tolist(),
        'wind_directions': wind_directions.tolist(),
        'source': 'Synthetic',
        'year': 2021,
        'location': {'lat': lat, 'lon': lon}
    }


def calculate_wind_rose_data(wind_speeds: List[float], wind_directions: List[float]) -> Dict:
    """
    Calculate wind rose statistics from wind speed and direction data
    
    Returns directional frequency and average speed for 8 compass directions
    """
    # Define 8 directional bins (N, NE, E, SE, S, SW, W, NW)
    directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
    bin_edges = [0, 45, 90, 135, 180, 225, 270, 315, 360]
    
    rose_data = {}
    
    for i, direction in enumerate(directions):
        # Get data in this directional bin
        if i == 0:  # North needs special handling (315-360 and 0-45)
            mask = np.logical_or(
                np.array(wind_directions) >= 315,
                np.array(wind_directions) < 45
            )
        else:
            start_angle = bin_edges[i]
            end_angle = bin_edges[i + 1]
            mask = np.logical_and(
                np.array(wind_directions) >= start_angle,
                np.array(wind_directions) < end_angle
            )
        
        speeds_in_bin = np.array(wind_speeds)[mask]
        frequency = (len(speeds_in_bin) / len(wind_speeds)) * 100
        avg_speed = float(np.mean(speeds_in_bin)) if len(speeds_in_bin) > 0 else 0
        
        rose_data[direction] = {
            'frequency': round(frequency, 1),
            'avg_speed': round(avg_speed, 1)
        }
    
    return rose_data


def fit_weibull_parameters(wind_speeds: List[float]) -> Tuple[float, float]:
    """
    Fit Weibull distribution parameters to wind speed data
    
    Returns:
        (k, a) where k is shape parameter, a is scale parameter
    """
    speeds = np.array(wind_speeds)
    speeds = speeds[speeds > 0]  # Remove zeros
    
    if len(speeds) == 0:
        return 2.0, 6.0  # Default values
    
    # Method of moments estimation
    mean_speed = np.mean(speeds)
    std_speed = np.std(speeds)
    
    # Estimate k (shape)
    k = (std_speed / mean_speed) ** -1.086
    k = np.clip(k, 1.5, 3.0)  # Typical range for wind
    
    # Estimate a (scale)
    from scipy.special import gamma
    a = mean_speed / gamma(1 + 1/k)
    
    return round(float(k), 2), round(float(a), 2)


def calculate_aep(wind_speeds: List[float], turbine_capacity_mw: float = 2.5) -> Dict:
    """
    Calculate Annual Energy Production from wind speed data
    
    Simplified calculation using generic turbine power curve
    """
    speeds = np.array(wind_speeds)
    
    # Generic 2.5 MW turbine power curve (simplified)
    def power_curve(v):
        if v < 3:  # Cut-in speed
            return 0
        elif v < 12:  # Ramp up
            return turbine_capacity_mw * ((v - 3) / 9) ** 3
        elif v < 25:  # Rated power
            return turbine_capacity_mw
        else:  # Cut-out
            return 0
    
    # Calculate power for each hour
    powers = np.array([power_curve(v) for v in speeds])
    
    # Annual energy in MWh
    annual_energy_mwh = np.sum(powers)
    annual_energy_gwh = annual_energy_mwh / 1000
    
    # Capacity factor
    max_possible = turbine_capacity_mw * len(speeds)
    capacity_factor = (annual_energy_mwh / max_possible) * 100
    
    # Average wind speed
    avg_wind_speed = float(np.mean(speeds))
    
    return {
        'aep_gwh': round(float(annual_energy_gwh), 2),
        'capacity_factor': round(float(capacity_factor), 1),
        'avg_wind_speed': round(avg_wind_speed, 2),
        'turbine_capacity_mw': turbine_capacity_mw
    }


def assess_viability(capacity_factor: float, avg_wind_speed: float) -> Dict:
    """
    Assess site viability based on wind resource quality
    """
    if capacity_factor >= 40 or avg_wind_speed >= 8.0:
        return {
            'viability': 'HIGH VIABILITY',
            'color': 'bg-primary/20 text-primary',
            'recommendation': 'Excellent site - Proceed to detailed feasibility'
        }
    elif capacity_factor >= 32 or avg_wind_speed >= 6.5:
        return {
            'viability': 'GOOD VIABILITY',
            'color': 'bg-blue-500/20 text-blue-400',
            'recommendation': 'Good site - Consider detailed wind measurement campaign'
        }
    elif capacity_factor >= 25 or avg_wind_speed >= 5.5:
        return {
            'viability': 'MODERATE VIABILITY',
            'color': 'bg-yellow-500/20 text-yellow-400',
            'recommendation': 'Marginal site - Requires 12-month met mast data'
        }
    else:
        return {
            'viability': 'LOW VIABILITY',
            'color': 'bg-red-500/20 text-red-400',
            'recommendation': 'Poor wind resource - Not recommended'
        }
