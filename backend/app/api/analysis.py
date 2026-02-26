"""
Analysis API Endpoints
"""
from fastapi import APIRouter, HTTPException, BackgroundTasks
from typing import Dict, Any

from app.services.job_service import JobService
from app.schemas.analysis import AnalysisRequest, AnalysisResponse

router = APIRouter()


@router.post("/run", response_model=AnalysisResponse)
async def run_analysis(request: AnalysisRequest, background_tasks: BackgroundTasks):
    """
    Start an analysis job
    
    - **analysis_type**: Type of analysis (aep, wake_loss, power_curve, full_analysis)
    - **session_id**: Session with uploaded data
    - **parameters**: Analysis-specific parameters
    """
    try:
        # Route to appropriate analysis
        if request.analysis_type == "aep":
            job_id = await JobService.create_and_run_aep_analysis(
                request.session_id,
                request.parameters
            )
        
        elif request.analysis_type == "full_analysis":
            job_id = await JobService.create_and_run_full_analysis(
                request.session_id,
                request.parameters
            )
        
        elif request.analysis_type == "power_curve":
            job_id = await JobService.create_and_run_power_curve_analysis(
                request.session_id,
                request.parameters
            )
        
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown analysis type: {request.analysis_type}"
            )
        
        return AnalysisResponse(
            job_id=job_id,
            session_id=request.session_id,
            analysis_type=request.analysis_type,
            status="pending",
            message="Analysis job created and queued"
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/aep")
async def run_aep_analysis(session_id: str, parameters: Dict[str, Any] = {}):
    """Shortcut endpoint for AEP analysis"""
    job_id = await JobService.create_and_run_aep_analysis(session_id, parameters)
    return {
        "job_id": job_id,
        "analysis_type": "aep",
        "status": "pending"
    }


@router.post("/full")
async def run_full_analysis(session_id: str, parameters: Dict[str, Any] = {}):
    """Shortcut endpoint for full comprehensive analysis"""
    job_id = await JobService.create_and_run_full_analysis(session_id, parameters)
    return {
        "job_id": job_id,
        "analysis_type": "full_analysis",
        "status": "pending"
    }


@router.post("/power-curve")
async def run_power_curve_analysis(session_id: str, turbine_id: str = None, parameters: Dict[str, Any] = {}):
    """Shortcut endpoint for power curve analysis"""
    if turbine_id:
        parameters["turbine_id"] = turbine_id
    
    job_id = await JobService.create_and_run_power_curve_analysis(session_id, parameters)
    return {
        "job_id": job_id,
        "analysis_type": "power_curve",
        "status": "pending"
    }
