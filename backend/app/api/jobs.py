"""
Job Management API Endpoints
"""
from fastapi import APIRouter, HTTPException
from app.services.job_service import JobService
from app.schemas.analysis import JobStatusResponse

router = APIRouter()


@router.get("/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """
    Get status of an analysis job
    
    Poll this endpoint to check job progress
    """
    try:
        status = JobService.get_job_status(job_id)
        
        if status.get("status") == "not_found":
            raise HTTPException(status_code=404, detail="Job not found")
        
        return JobStatusResponse(**status)
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{job_id}/results")
async def get_job_results(job_id: str):
    """
    Get results of a completed job
    
    Returns analysis results if job is completed
    """
    try:
        # Check status first
        status = JobService.get_job_status(job_id)
        
        if status.get("status") == "not_found":
            raise HTTPException(status_code=404, detail="Job not found")
        
        if status.get("status") != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Job not completed. Current status: {status.get('status')}"
            )
        
        # Get results
        results = JobService.get_job_results(job_id)
        
        if not results or "error" in results:
            raise HTTPException(status_code=404, detail="Results not found")
        
        return {
            "job_id": job_id,
            "status": "completed",
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{job_id}")
async def cancel_job(job_id: str):
    """Cancel a running job"""
    # Note: Actual cancellation logic would need implementation
    return {
        "job_id": job_id,
        "message": "Job cancellation requested",
        "note": "Cancellation may take a few moments to complete"
    }
