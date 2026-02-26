"""
Background job runner
"""
import asyncio
from typing import Callable, Dict, Any
from datetime import datetime
from app.models.job import Job, JobStatus
from app.utils.file_manager import FileManager


class JobRunner:
    """Manages background job execution"""
    
    @staticmethod
    async def run_job(
        job_id: str,
        session_id: str,
        analysis_type: str,
        task_func: Callable,
        **kwargs
    ) -> Dict[str, Any]:
        """
        Run a background job
        
        Args:
            job_id: Unique job identifier
            session_id: Session identifier
            analysis_type: Type of analysis
            task_func: Async function to execute
            **kwargs: Arguments for task_func
        
        Returns:
            Job results
        """
        # Create initial job status
        job = Job(
            job_id=job_id,
            session_id=session_id,
            analysis_type=analysis_type,
            status=JobStatus.PENDING,
            progress=0,
            message="Job created"
        )
        
        FileManager.save_job_status(job_id, job.dict())
        
        try:
            # Update to running
            job.status = JobStatus.RUNNING
            job.started_at = datetime.utcnow()
            job.message = "Analysis in progress"
            job.progress = 10
            FileManager.save_job_status(job_id, job.dict())
            
            # Execute the task
            results = await task_func(job_id=job_id, **kwargs)
            
            # Update to completed
            job.status = JobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.progress = 100
            job.message = "Analysis completed successfully"
            job.result_path = str(FileManager.get_job_dir(job_id) / "results.json")
            FileManager.save_job_status(job_id, job.dict())
            
            # Save results
            FileManager.save_results(job_id, results)
            
            return results
            
        except Exception as e:
            # Update to failed
            job.status = JobStatus.FAILED
            job.completed_at = datetime.utcnow()
            job.error = str(e)
            job.message = f"Analysis failed: {str(e)}"
            FileManager.save_job_status(job_id, job.dict())
            
            raise
    
    @staticmethod
    def update_progress(job_id: str, progress: int, message: str = "") -> None:
        """Update job progress"""
        job_data = FileManager.load_job_status(job_id)
        if job_data:
            job_data['progress'] = progress
            if message:
                job_data['message'] = message
            FileManager.save_job_status(job_id, job_data)
    
    @staticmethod
    def get_job_status(job_id: str) -> Dict[str, Any]:
        """Get current job status"""
        job_data = FileManager.load_job_status(job_id)
        if not job_data:
            return {
                "job_id": job_id,
                "status": "not_found",
                "error": "Job not found"
            }
        return job_data
