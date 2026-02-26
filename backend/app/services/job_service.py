"""
Job Service - Manages analysis jobs
"""
import asyncio
from typing import Dict, Any, Callable
from datetime import datetime
from pathlib import Path

from app.models.job import Job, JobStatus
from app.utils.file_manager import FileManager
from app.utils.job_runner import JobRunner
from app.openoa_wrapper import (
    DataBuilder, AEPAnalyzer, WakeAnalyzer, ElecLossAnalyzer,
    PowerCurveAnalyzer, TIEAnalyzer, GapAnalyzer, ResultFormatter
)


class JobService:
    """Handles background job execution"""
    
    @staticmethod
    async def create_and_run_aep_analysis(session_id: str, parameters: Dict[str, Any]) -> str:
        """Create and run AEP analysis job"""
        job_id = FileManager.create_job_id()
        
        # Add session_id to parameters so analysis function can load files
        parameters["session_id"] = session_id
        
        # Run job in background
        asyncio.create_task(
            JobRunner.run_job(
                job_id=job_id,
                session_id=session_id,
                analysis_type="aep",
                task_func=JobService._run_aep_analysis,
                parameters=parameters
            )
        )
        
        return job_id
    
    @staticmethod
    async def _run_aep_analysis(job_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute AEP analysis"""
        # Update progress
        JobRunner.update_progress(job_id, 20, "Loading data...")
        
        # Load uploaded files
        session_id = parameters.get("session_id")
        if not session_id:
            raise ValueError("session_id is required")
        
        # Build plant data from uploaded files
        session_dir = FileManager.get_session_dir(session_id)
        scada_files = list(session_dir.glob("*.csv"))
        
        if not scada_files:
            raise ValueError("No CSV files found in session")
        
        # Find specific data files
        scada_path = scada_files[0]
        reanalysis_path = None
        asset_path = None
        
        # Look for reanalysis and asset files
        uploads_dir = Path("backend/data/uploads") if Path("backend/data/uploads").exists() else Path("data/uploads")
        if uploads_dir.exists():
            era5_files = list(uploads_dir.glob("*era5*.csv"))
            merra2_files = list(uploads_dir.glob("*merra2*.csv"))
            reanalysis_path = era5_files[0] if era5_files else (merra2_files[0] if merra2_files else None)
            
            asset_files = list(uploads_dir.glob("*asset*.csv"))
            asset_path = asset_files[0] if asset_files else None
        
        JobRunner.update_progress(job_id, 30, "Building plant data...")
        plant_data = DataBuilder.build_plant_data(
            scada_path=scada_path,
            reanalysis_path=reanalysis_path,
            asset_path=asset_path,
            metadata=parameters.get("metadata", {})
        )
        
        JobRunner.update_progress(job_id, 40, "Running Monte Carlo simulation...")
        
        # Run AEP analysis
        analyzer = AEPAnalyzer(
            plant_data,
            num_sim=parameters.get("num_sim", 10000)
        )
        results = await analyzer.run_analysis()
        
        JobRunner.update_progress(job_id, 80, "Formatting results...")
        
        # Format results
        formatted_results = ResultFormatter.format_aep_results(results)
        
        JobRunner.update_progress(job_id, 100, "Completed")
        
        return formatted_results
    
    @staticmethod
    async def create_and_run_full_analysis(session_id: str, parameters: Dict[str, Any]) -> str:
        """Create and run full comprehensive analysis (AEP + Wake + Electrical)"""
        job_id = FileManager.create_job_id()
        
        # Add session_id to parameters so analysis function can load files
        parameters["session_id"] = session_id
        
        asyncio.create_task(
            JobRunner.run_job(
                job_id=job_id,
                session_id=session_id,
                analysis_type="full_analysis",
                task_func=JobService._run_full_analysis,
                parameters=parameters
            )
        )
        
        return job_id
    
    @staticmethod
    async def _run_full_analysis(job_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute full comprehensive analysis"""
        # Load uploaded files
        session_id = parameters.get("session_id")
        if not session_id:
            raise ValueError("session_id is required")
        
        JobRunner.update_progress(job_id, 10, "Loading data...")
        
        # Build plant data from uploaded files
        session_dir = FileManager.get_session_dir(session_id)
        scada_files = list(session_dir.glob("*.csv"))
        
        if not scada_files:
            raise ValueError("No CSV files found in session")
        
        # Find specific data files
        scada_path = scada_files[0]  # Main SCADA file
        reanalysis_path = None
        asset_path = None
        
        # Look for reanalysis files in main uploads directory
        uploads_dir = Path("backend/data/uploads") if Path("backend/data/uploads").exists() else Path("data/uploads")
        if uploads_dir.exists():
            # Try ERA5 first
            era5_files = list(uploads_dir.glob("*era5*.csv"))
            if era5_files:
                reanalysis_path = era5_files[0]
                print(f"Found ERA5 reanalysis file: {reanalysis_path}")
            else:
                # Try MERRA2
                merra2_files = list(uploads_dir.glob("*merra2*.csv"))
                if merra2_files:
                    reanalysis_path = merra2_files[0]
                    print(f"Found MERRA2 reanalysis file: {reanalysis_path}")
            
            # Look for asset table
            asset_files = list(uploads_dir.glob("*asset*.csv"))
            if asset_files:
                asset_path = asset_files[0]
                print(f"Found asset table: {asset_path}")
        
        plant_data = DataBuilder.build_plant_data(
            scada_path=scada_path,
            reanalysis_path=reanalysis_path,
            asset_path=asset_path,
            metadata=parameters.get("metadata", {})
        )
        
        # AEP Analysis
        JobRunner.update_progress(job_id, 15, "Running AEP analysis...")
        aep_analyzer = AEPAnalyzer(plant_data)
        aep_results = await aep_analyzer.run_analysis()
        
        # Wake Loss Analysis
        JobRunner.update_progress(job_id, 35, "Calculating wake losses...")
        wake_analyzer = WakeAnalyzer(plant_data)
        wake_results = await wake_analyzer.run_analysis()
        
        # Electrical Loss Analysis
        JobRunner.update_progress(job_id, 55, "Calculating electrical losses...")
        elec_analyzer = ElecLossAnalyzer(plant_data)
        elec_results = await elec_analyzer.run_analysis()
        
        # Power Curve Analysis
        JobRunner.update_progress(job_id, 70, "Analyzing power curves...")
        pc_analyzer = PowerCurveAnalyzer(plant_data)
        pc_results = await pc_analyzer.run_analysis()
        
        # TIE Analysis
        JobRunner.update_progress(job_id, 85, "Calculating turbine ideal energy...")
        tie_analyzer = TIEAnalyzer(plant_data)
        tie_results = await tie_analyzer.run_analysis()
        
        # Format combined results
        JobRunner.update_progress(job_id, 95, "Formatting results...")
        
        combined_results = {
            "analysis_type": "full_analysis",
            "timestamp": datetime.utcnow().isoformat(),
            "aep": aep_results,
            "wake_losses": wake_results,
            "electrical_losses": elec_results,
            "power_curve": pc_results,
            "turbine_ideal_energy": tie_results,
            "energy_yield": ResultFormatter.format_energy_yield_results(
                aep_results, wake_results, elec_results
            ),
            "financial": ResultFormatter.format_financial_results(
                aep_results,
                electricity_price=parameters.get("electricity_price", 45.0)
            )
        }
        
        return combined_results
    
    @staticmethod
    async def create_and_run_power_curve_analysis(session_id: str, parameters: Dict[str, Any]) -> str:
        """Create and run power curve analysis"""
        job_id = FileManager.create_job_id()
        
        # Add session_id to parameters so analysis function can load files
        parameters["session_id"] = session_id
        
        asyncio.create_task(
            JobRunner.run_job(
                job_id=job_id,
                session_id=session_id,
                analysis_type="power_curve",
                task_func=JobService._run_power_curve_analysis,
                parameters=parameters
            )
        )
        
        return job_id
    
    @staticmethod
    async def _run_power_curve_analysis(job_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Execute power curve analysis"""
        # Load uploaded files
        session_id = parameters.get("session_id")
        if not session_id:
            raise ValueError("session_id is required")
        
        JobRunner.update_progress(job_id, 20, "Loading data...")
        
        # Build plant data from uploaded files
        session_dir = FileManager.get_session_dir(session_id)
        scada_files = list(session_dir.glob("*.csv"))
        
        if not scada_files:
            raise ValueError("No CSV files found in session")
        
        plant_data = DataBuilder.build_plant_data(
            scada_path=scada_files[0],
            metadata=parameters.get("metadata", {})
        )
        
        JobRunner.update_progress(job_id, 30, "Analyzing power curve...")
        
        analyzer = PowerCurveAnalyzer(
            plant_data,
            turbine_id=parameters.get("turbine_id")
        )
        results = await analyzer.run_analysis()
        
        JobRunner.update_progress(job_id, 80, "Formatting results...")
        
        formatted_results = ResultFormatter.format_power_curve_results(results)
        
        return formatted_results
    
    @staticmethod
    def get_job_status(job_id: str) -> Dict[str, Any]:
        """Get status of a job"""
        return JobRunner.get_job_status(job_id)
    
    @staticmethod
    def get_job_results(job_id: str) -> Dict[str, Any]:
        """Get results of a completed job"""
        results = FileManager.load_results(job_id)
        if not results:
            return {"error": "Results not found"}
        return results
