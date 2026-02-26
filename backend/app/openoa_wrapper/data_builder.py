"""
OpenOA Data Builder - Converts uploaded CSV to PlantData objects
"""
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

# OpenOA imports - now enabled for real analysis
try:
    from openoa.plant import PlantData
    OPENOA_AVAILABLE = True
except ImportError:
    OPENOA_AVAILABLE = False
    print("Warning: OpenOA not available, using mock data")


class DataBuilder:
    """Builds OpenOA PlantData from uploaded CSV files"""
    
    @staticmethod
    def validate_columns(df: pd.DataFrame, required_columns: List[str]) -> tuple[bool, List[str]]:
        """
        Validate required columns exist in dataframe
        
        Returns:
            (is_valid, missing_columns)
        """
        missing = [col for col in required_columns if col not in df.columns]
        return len(missing) == 0, missing
    
    @staticmethod
    def load_csv_file(file_path: Path) -> pd.DataFrame:
        """Load CSV file into pandas DataFrame"""
        return pd.read_csv(file_path, parse_dates=True)
    
    @staticmethod
    def validate_scada_data(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Validate SCADA data format
        
        Expected columns:
        - timestamp or time
        - turbine_id or asset_id
        - wind_speed or WMET_HorWdSpd
        - power or WTUR_W
        - nacelle_direction (optional)
        - air_temperature (optional)
        """
        validation = {
            "is_valid": False,
            "errors": [],
            "warnings": [],
            "info": {}
        }
        
        print(f"\n=== SCADA VALIDATION START ===")
        print(f"DataFrame shape: {df.shape}")
        print(f"Columns: {list(df.columns)}")
        
        # Check for timestamp column
        time_cols = ['timestamp', 'time', 'datetime', 'date', 'Date_time', 'date_time']
        time_col = next((col for col in time_cols if col in df.columns), None)
        
        if not time_col:
            validation["errors"].append(f"Missing timestamp column. Expected one of: {time_cols}")
        else:
            validation["info"]["timestamp_column"] = time_col
        
        # Check for turbine ID (optional for plant-level analysis)
        turbine_cols = ['turbine_id', 'asset_id', 'turbine', 'id', 'Wind_turbine_name', 'wind_turbine_name']
        turbine_col = next((col for col in turbine_cols if col in df.columns), None)
        
        if not turbine_col:
            validation["warnings"].append(f"Missing turbine ID column. Expected one of: {turbine_cols}. Plant-level analysis will be performed.")
        else:
            validation["info"]["turbine_column"] = turbine_col
            validation["info"]["num_turbines"] = df[turbine_col].nunique()
        
        # Check for wind speed
        wind_cols = ['wind_speed', 'WMET_HorWdSpd', 'ws', 'windspeed', 'ws_100m', 'ws_80m', 'ws_hub', 'Ws_avg', 'ws_avg']
        wind_col = next((col for col in wind_cols if col in df.columns), None)
        
        if not wind_col:
            validation["warnings"].append(f"Missing wind speed column. Expected one of: {wind_cols}")
        else:
            validation["info"]["wind_speed_column"] = wind_col
        
        # Check for power (CRITICAL for SCADA data)
        power_cols = ['power', 'WTUR_W', 'active_power', 'power_output', 'P_avg', 'p_avg', 'P']
        power_col = next((col for col in power_cols if col in df.columns), None)
        
        print(f"Power column search: {power_col}")
        print(f"Searched in: {power_cols}")
        
        if not power_col:
            error_msg = f"Missing power column. Expected one of: {power_cols}. This appears to be weather/reanalysis data, not turbine SCADA data. Please upload a CSV with turbine power measurements."
            validation["errors"].append(error_msg)
            validation["is_valid"] = False
            print(f"ERROR: {error_msg}")
        else:
            validation["info"]["power_column"] = power_col
            print(f"Found power column: {power_col}")
        
        # Data quality checks
        validation["info"]["row_count"] = len(df)
        validation["info"]["columns"] = list(df.columns)
        
        if time_col and time_col in df.columns:
            try:
                df[time_col] = pd.to_datetime(df[time_col])
                validation["info"]["time_range"] = {
                    "start": str(df[time_col].min()),
                    "end": str(df[time_col].max())
                }
            except:
                validation["errors"].append(f"Could not parse {time_col} as datetime")
        
        validation["is_valid"] = len(validation["errors"]) == 0
        
        print(f"Final validation state:")
        print(f"  is_valid: {validation['is_valid']}")
        print(f"  errors: {len(validation['errors'])} - {validation['errors']}")
        print(f"  warnings: {len(validation['warnings'])} - {validation['warnings']}")
        print(f"=== SCADA VALIDATION END ===\n")
        
        return validation
    
    @staticmethod
    def build_plant_data(
        scada_path: Optional[Path] = None,
        meter_path: Optional[Path] = None,
        tower_path: Optional[Path] = None,
        reanalysis_path: Optional[Path] = None,
        asset_path: Optional[Path] = None,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """
        Build OpenOA PlantData object from uploaded files
        
        Args:
            scada_path: Path to SCADA CSV file
            meter_path: Path to meter CSV file (optional)
            tower_path: Path to met tower CSV file (optional)
            reanalysis_path: Path to reanalysis data (ERA5/MERRA2) CSV file (optional)
            asset_path: Path to asset/turbine metadata CSV file (optional)
            metadata: Plant metadata (lat, lon, capacity, etc.)
        
        Returns:
            OpenOA PlantData object or dict with file info
        """
        if not OPENOA_AVAILABLE:
            # Fallback: return file paths and metadata
            return {
                "scada_file": str(scada_path) if scada_path else None,
                "meter_file": str(meter_path) if meter_path else None,
                "tower_file": str(tower_path) if tower_path else None,
                "reanalysis_file": str(reanalysis_path) if reanalysis_path else None,
                "asset_file": str(asset_path) if asset_path else None,
                "metadata": metadata or {}
            }
        
        # Load SCADA data
        scada_df = None
        if scada_path and scada_path.exists():
            scada_df = DataBuilder.load_csv_file(scada_path)
            print(f"Original CSV columns: {list(scada_df.columns)}")
            scada_df = DataBuilder.standardize_column_names(scada_df)
            
            # Rename timestamp column to 'time' (OpenOA expects this column name)
            if 'timestamp' in scada_df.columns:
                scada_df['timestamp'] = pd.to_datetime(scada_df['timestamp'], utc=True)
                scada_df = scada_df.rename(columns={'timestamp': 'time'})
                print(f"Renamed 'timestamp' column to 'time' (kept as regular column)")
            elif 'time' in scada_df.columns:
                scada_df['time'] = pd.to_datetime(scada_df['time'], utc=True)
                print(f"Found 'time' column, converted to datetime")
            else:
                print(f"WARNING: No timestamp/time column found in columns: {list(scada_df.columns)}")
            
            # Rename turbine_id to asset_id (OpenOA requirement)
            if 'turbine_id' in scada_df.columns:
                scada_df = scada_df.rename(columns={'turbine_id': 'asset_id'})
                print(f"Renamed 'turbine_id' to 'asset_id' (OpenOA requirement)")
            
            # Rename to OpenOA default column names
            openoa_renames = {}
            if 'power' in scada_df.columns:
                openoa_renames['power'] = 'WTUR_W'
            if 'wind_speed' in scada_df.columns:
                openoa_renames['wind_speed'] = 'WMET_HorWdSpd'
            if 'wind_direction' in scada_df.columns:
                openoa_renames['wind_direction'] = 'WMET_HorWdDir'
            if 'air_temperature' in scada_df.columns:
                openoa_renames['air_temperature'] = 'WMET_EnvTmp'
            if 'barometric_pressure' in scada_df.columns:
                openoa_renames['barometric_pressure'] = 'WMET_BarPress'
            
            if openoa_renames:
                scada_df = scada_df.rename(columns=openoa_renames)
                print(f"Renamed to OpenOA defaults: {openoa_renames}")
            
            print(f"Final columns for PlantData: {list(scada_df.columns)}")
        
        # Load meter data (optional)
        meter_df = None
        if meter_path and meter_path.exists():
            meter_df = DataBuilder.load_csv_file(meter_path)
            print(f"Loaded meter data: {meter_df.shape}")
        
        # Load tower data (optional)
        tower_df = None
        if tower_path and tower_path.exists():
            tower_df = DataBuilder.load_csv_file(tower_path)
            tower_df = DataBuilder.standardize_column_names(tower_df)
            print(f"Loaded tower data: {tower_df.shape}")
        
        # Load reanalysis data (ERA5/MERRA2) - OpenOA handles this separately from tower
        # Reanalysis is plant-level data (no asset_id), Tower is turbine-specific (needs asset_id)
        reanalysis_df = None
        if reanalysis_path and reanalysis_path.exists():
            reanalysis_df = DataBuilder.load_csv_file(reanalysis_path)
            print(f"Original reanalysis columns: {list(reanalysis_df.columns)}")
            reanalysis_df = DataBuilder.standardize_column_names(reanalysis_df)
            
            # Rename datetime column to time for consistency
            if 'datetime' in reanalysis_df.columns:
                reanalysis_df['datetime'] = pd.to_datetime(reanalysis_df['datetime'], utc=True)
                reanalysis_df = reanalysis_df.rename(columns={'datetime': 'time'})
                print(f"Renamed 'datetime' to 'time' in reanalysis data")
            elif 'timestamp' in reanalysis_df.columns:
                reanalysis_df['timestamp'] = pd.to_datetime(reanalysis_df['timestamp'], utc=True)
                reanalysis_df = reanalysis_df.rename(columns={'timestamp': 'time'})
                print(f"Renamed 'timestamp' to 'time' in reanalysis data")
            
            print(f"Loaded reanalysis data (plant-level, no asset_id): {reanalysis_df.shape}")
            print(f"Final reanalysis columns: {list(reanalysis_df.columns)}")
            # Note: We don't pass reanalysis as tower - they're different data types in OpenOA
        
        # Load asset table and merge with metadata
        if asset_path and asset_path.exists():
            asset_df = DataBuilder.load_csv_file(asset_path)
            print(f"Loaded asset table: {asset_df.shape}")
            print(f"Asset columns: {list(asset_df.columns)}")
            
            # Extract metadata from asset table
            if metadata is None:
                metadata = {}
            
            # Add plant-level metadata from first turbine (all should be same location)
            if 'Latitude' in asset_df.columns and len(asset_df) > 0:
                metadata['latitude'] = float(asset_df['Latitude'].iloc[0])
            if 'Longitude' in asset_df.columns and len(asset_df) > 0:
                metadata['longitude'] = float(asset_df['Longitude'].iloc[0])
            if 'elevation_m' in asset_df.columns and len(asset_df) > 0:
                metadata['elevation'] = float(asset_df['elevation_m'].iloc[0])
            
            # Add turbine-level metadata
            if 'Rated_power' in asset_df.columns:
                metadata['capacity_mw'] = asset_df['Rated_power'].sum() / 1000  # Convert kW to MW
                metadata['turbine_capacity_kw'] = int(asset_df['Rated_power'].iloc[0])
            if 'Hub_height_m' in asset_df.columns and len(asset_df) > 0:
                metadata['hub_height_m'] = float(asset_df['Hub_height_m'].iloc[0])
            if 'Rotor_diameter_m' in asset_df.columns and len(asset_df) > 0:
                metadata['rotor_diameter_m'] = float(asset_df['Rotor_diameter_m'].iloc[0])
            
            metadata['num_turbines'] = len(asset_df)
            print(f"Populated metadata from asset table: {metadata}")
        
        # Build PlantData object with OpenOA
        try:
            # Add warning if no power column exists
            if scada_df is not None and 'WTUR_W' not in scada_df.columns:
                print(f"WARNING: No WTUR_W power column found in SCADA data. Available columns: {list(scada_df.columns)}")
                print(f"This may be reanalysis/weather data instead of turbine SCADA data.")
            
            # PlantData expects tower to have asset_id (turbine-specific met tower)
            # Reanalysis is plant-level (no asset_id) so we don't pass it as tower
            plant_data = PlantData(
                analysis_type=None,  # No validation at this stage
                metadata=metadata or {},
                scada=scada_df,
                meter=meter_df,
                tower=tower_df  # Only turbine-specific tower data, not reanalysis
            )
            print(f"PlantData created successfully")
            return plant_data
        except Exception as e:
            print(f"Error building PlantData: {e}")
            import traceback
            traceback.print_exc()
            # Return DataFrames for manual processing
            return {
                "scada": scada_df,
                "meter": meter_df,
                "tower": tower_df,
                "reanalysis": reanalysis_df,  # Store for future use
                "metadata": metadata or {},
                "error": str(e)
            }
    
    @staticmethod
    def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
        """
        Standardize column names to OpenOA expected format
        """
        column_mapping = {
            # Time columns
            'time': 'timestamp',
            'datetime': 'timestamp',
            'date': 'timestamp',
            'Time': 'timestamp',
            'DateTime': 'timestamp',
            'Timestamp': 'timestamp',
            'TIME': 'timestamp',
            'DATETIME': 'timestamp',
            'Date_time': 'timestamp',  # La Haute Borne format
            'date_time': 'timestamp',
            
            # Turbine ID
            'asset_id': 'turbine_id',
            'turbine': 'turbine_id',
            'id': 'turbine_id',
            'AssetId': 'turbine_id',
            'TurbineId': 'turbine_id',
            'TURBINE_ID': 'turbine_id',
            'ASSET_ID': 'turbine_id',
            'Wind_turbine_name': 'turbine_id',  # La Haute Borne format
            'wind_turbine_name': 'turbine_id',
            
            # Wind speed (add more variations)
            'WMET_HorWdSpd': 'wind_speed',
            'ws': 'wind_speed',
            'windspeed': 'wind_speed',
            'WindSpeed': 'wind_speed',
            'Windspeed': 'wind_speed',
            'WINDSPEED': 'wind_speed',
            'WS': 'wind_speed',
            'wind speed': 'wind_speed',
            'Wind Speed': 'wind_speed',
            'ws_100m': 'wind_speed',  # Reanalysis wind speed at 100m
            'ws_80m': 'wind_speed',   # Reanalysis wind speed at 80m
            'ws_hub': 'wind_speed',   # Hub height wind speed
            'Ws_avg': 'wind_speed',   # La Haute Borne format
            'ws_avg': 'wind_speed',
            
            # Power (add more variations)
            'WTUR_W': 'power',
            'active_power': 'power',
            'power_output': 'power',
            'ActivePower': 'power',
            'Power': 'power',
            'POWER': 'power',
            'PowerOutput': 'power',
            'power output': 'power',
            'Power Output': 'power',
            'P_avg': 'power',  # La Haute Borne format (in kW)
            'p_avg': 'power',
            'P': 'power',
            
            # Wind direction
            'WMET_HorWdDir': 'wind_direction',
            'wind_direction': 'wind_direction',
            'WindDirection': 'wind_direction',
            'WIND_DIRECTION': 'wind_direction',
            'wd': 'wind_direction',
            'WD': 'wind_direction',
            'Va_avg': 'wind_direction',  # La Haute Borne format (wind vane angle)
            'va_avg': 'wind_direction',
            
            # Temperature
            'WMET_EnvTmp': 'air_temperature',
            'air_temperature': 'air_temperature',
            'temperature': 'air_temperature',
            'temp': 'air_temperature',
            'AirTemperature': 'air_temperature',
            'AIR_TEMPERATURE': 'air_temperature',
            'Ot_avg': 'air_temperature',  # La Haute Borne format (outdoor temperature)
            'ot_avg': 'air_temperature',
            't_2m': 'air_temperature',  # ERA5 format
            'temp_2m': 'air_temperature',  # MERRA2 format
            
            # Barometric pressure
            'WMET_BarPress': 'barometric_pressure',
            'barometric_pressure': 'barometric_pressure',
            'pressure': 'barometric_pressure',
            'BarometricPressure': 'barometric_pressure',
            'BAROMETRIC_PRESSURE': 'barometric_pressure',
            'Ba_avg': 'barometric_pressure',  # La Haute Borne format
            'ba_avg': 'barometric_pressure',
            'surf_pres': 'barometric_pressure',  # ERA5 format
            'surface_pressure': 'barometric_pressure',  # MERRA2 format
        }
        
        # Rename columns if they exist (case-insensitive matching)
        rename_dict = {}
        for old_name, new_name in column_mapping.items():
            if old_name in df.columns:
                rename_dict[old_name] = new_name
        
        if rename_dict:
            df = df.rename(columns=rename_dict)
            print(f"Standardized column names: {rename_dict}")
        
        # Print final column names for debugging
        print(f"Final DataFrame columns: {list(df.columns)}")
        
        return df
