"""
File Service - Handles file operations
"""
import pandas as pd
from pathlib import Path
from typing import Dict, Any, Optional, List
from fastapi import UploadFile, HTTPException

from app.config import settings
from app.utils.file_manager import FileManager
from app.openoa_wrapper.data_builder import DataBuilder


class FileService:
    """Handles file upload, validation, and storage"""
    
    @staticmethod
    async def upload_file(
        file: UploadFile,
        session_id: str,
        file_type: str  # 'scada', 'meter', or 'tower'
    ) -> Dict[str, Any]:
        """
        Upload and save a file
        
        Args:
            file: Uploaded file
            session_id: Session identifier
            file_type: Type of file (scada, meter, tower)
        
        Returns:
            File information dict
        """
        # Validate file extension
        file_extension = Path(file.filename).suffix.lower()
        if file_extension not in settings.ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file extension. Allowed: {settings.ALLOWED_EXTENSIONS}"
            )
        
        # Read file content
        content = await file.read()
        
        # Check file size
        if len(content) > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {settings.MAX_UPLOAD_SIZE / (1024*1024)} MB"
            )
        
        # Save file
        filename = f"{file_type}_{file.filename}"
        file_path = FileManager.save_uploaded_file(session_id, filename, content)
        
        return {
            "session_id": session_id,
            "filename": filename,
            "original_filename": file.filename,
            "file_type": file_type,
            "size_bytes": len(content),
            "path": str(file_path),
            "status": "uploaded"
        }
    
    @staticmethod
    def validate_data(
        session_id: str,
        scada_file: Optional[str] = None,
        meter_file: Optional[str] = None,
        tower_file: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Validate uploaded data files
        
        Returns:
            Validation results
        """
        session_dir = FileManager.get_session_dir(session_id)
        validation_results = {
            "is_valid": True,
            "errors": [],
            "warnings": [],
            "files": {}
        }
        
        # Auto-detect SCADA file if not specified
        if not scada_file:
            csv_files = list(session_dir.glob("*.csv"))
            if csv_files:
                scada_file = csv_files[0].name
                validation_results["warnings"].append(f"Auto-detected SCADA file: {scada_file}")
        
        # Validate SCADA file (required)
        if scada_file:
            scada_path = session_dir / scada_file
            if not scada_path.exists():
                validation_results["errors"].append(f"SCADA file not found: {scada_file}")
                validation_results["is_valid"] = False
            else:
                try:
                    df = DataBuilder.load_csv_file(scada_path)
                    scada_validation = DataBuilder.validate_scada_data(df)
                    
                    validation_results["files"]["scada"] = scada_validation
                    
                    if scada_validation["errors"]:
                        validation_results["errors"].extend(scada_validation["errors"])
                        validation_results["is_valid"] = False
                    
                    if scada_validation["warnings"]:
                        validation_results["warnings"].extend(scada_validation["warnings"])
                    
                except Exception as e:
                    validation_results["errors"].append(f"SCADA file error: {str(e)}")
                    validation_results["is_valid"] = False
        else:
            validation_results["errors"].append("SCADA file is required")
            validation_results["is_valid"] = False
        
        # Validate meter file (optional)
        if meter_file:
            meter_path = session_dir / meter_file
            if meter_path.exists():
                try:
                    df = DataBuilder.load_csv_file(meter_path)
                    validation_results["files"]["meter"] = {
                        "row_count": len(df),
                        "columns": list(df.columns)
                    }
                except Exception as e:
                    validation_results["warnings"].append(f"Meter file warning: {str(e)}")
        
        # Validate tower file (optional)
        if tower_file:
            tower_path = session_dir / tower_file
            if tower_path.exists():
                try:
                    df = DataBuilder.load_csv_file(tower_path)
                    validation_results["files"]["tower"] = {
                        "row_count": len(df),
                        "columns": list(df.columns)
                    }
                except Exception as e:
                    validation_results["warnings"].append(f"Tower file warning: {str(e)}")
        
        return validation_results
    
    @staticmethod
    def list_session_files(session_id: str) -> List[Dict[str, Any]]:
        """List all files in a session"""
        session_dir = FileManager.get_session_dir(session_id)
        
        if not session_dir.exists():
            return []
        
        files = []
        for file_path in session_dir.glob("*"):
            if file_path.is_file():
                files.append(FileManager.get_file_info(file_path))
        
        return files
