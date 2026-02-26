"""
File management utilities
"""
import json
import shutil
from pathlib import Path
from typing import Dict, Any, Optional
from datetime import datetime
import uuid

from app.config import settings


class FileManager:
    """Handles file storage operations"""
    
    @staticmethod
    def create_session() -> str:
        """Create a new session ID"""
        return str(uuid.uuid4())
    
    @staticmethod
    def create_job_id() -> str:
        """Create a new job ID"""
        return f"job_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}"
    
    @staticmethod
    def get_session_dir(session_id: str) -> Path:
        """Get session upload directory"""
        session_dir = settings.UPLOADS_DIR / session_id
        session_dir.mkdir(parents=True, exist_ok=True)
        return session_dir
    
    @staticmethod
    def get_job_dir(job_id: str) -> Path:
        """Get job results directory"""
        job_dir = settings.RESULTS_DIR / job_id
        job_dir.mkdir(parents=True, exist_ok=True)
        return job_dir
    
    @staticmethod
    def save_uploaded_file(session_id: str, filename: str, content: bytes) -> Path:
        """Save uploaded file"""
        session_dir = FileManager.get_session_dir(session_id)
        file_path = session_dir / filename
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        return file_path
    
    @staticmethod
    def save_job_status(job_id: str, status_data: Dict[str, Any]) -> None:
        """Save job status to JSON file"""
        job_file = settings.JOBS_DIR / f"{job_id}.json"
        
        with open(job_file, 'w') as f:
            json.dump(status_data, f, indent=2, default=str)
    
    @staticmethod
    def load_job_status(job_id: str) -> Optional[Dict[str, Any]]:
        """Load job status from JSON file"""
        job_file = settings.JOBS_DIR / f"{job_id}.json"
        
        if not job_file.exists():
            return None
        
        with open(job_file, 'r') as f:
            return json.load(f)
    
    @staticmethod
    def save_results(job_id: str, results: Dict[str, Any]) -> Path:
        """Save analysis results"""
        results_dir = FileManager.get_job_dir(job_id)
        results_file = results_dir / "results.json"
        
        with open(results_file, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        
        return results_file
    
    @staticmethod
    def load_results(job_id: str) -> Optional[Dict[str, Any]]:
        """Load analysis results"""
        results_file = settings.RESULTS_DIR / job_id / "results.json"
        
        if not results_file.exists():
            return None
        
        with open(results_file, 'r') as f:
            return json.load(f)
    
    @staticmethod
    def cleanup_session(session_id: str) -> None:
        """Clean up session files"""
        session_dir = settings.UPLOADS_DIR / session_id
        if session_dir.exists():
            shutil.rmtree(session_dir)
    
    @staticmethod
    def get_file_info(file_path: Path) -> Dict[str, Any]:
        """Get file information"""
        if not file_path.exists():
            return {}
        
        stat = file_path.stat()
        return {
            "filename": file_path.name,
            "size_bytes": stat.st_size,
            "size_mb": round(stat.st_size / (1024 * 1024), 2),
            "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            "path": str(file_path)
        }
