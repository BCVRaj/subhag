"""
File Upload API Endpoints
"""
from typing import List
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse

from app.services.file_service import FileService
from app.utils.file_manager import FileManager
from app.schemas.upload import FileUploadResponse, DataValidationRequest, ValidationResult

router = APIRouter()


@router.post("/create-session")
async def create_upload_session():
    """Create a new upload session"""
    session_id = FileManager.create_session()
    return {
        "session_id": session_id,
        "message": "Upload session created",
        "upload_endpoint": f"/api/upload/file"
    }


@router.post("/file", response_model=FileUploadResponse)
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    file_type: str = Form(...)  # 'scada', 'meter', or 'tower'
):
    """
    Upload a data file
    
    - **file**: CSV or Parquet file
    - **session_id**: Upload session ID
    - **file_type**: Type of file (scada/meter/tower)
    """
    try:
        print(f"📤 Upload request received: file={file.filename}, session={session_id}, type={file_type}")
        result = await FileService.upload_file(file, session_id, file_type)
        print(f"✅ Upload successful: {result.get('filename')}")
        return FileUploadResponse(**result)
    except HTTPException as he:
        print(f"❌ HTTPException during upload: {he.status_code} - {he.detail}")
        raise
    except Exception as e:
        print(f"❌ Unexpected error during upload: {type(e).__name__} - {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/validate", response_model=ValidationResult)
async def validate_data(request: DataValidationRequest):
    """
    Validate uploaded data files
    
    Checks column names, data types, time ranges, etc.
    """
    try:
        validation = FileService.validate_data(
            session_id=request.session_id,
            scada_file=request.scada_file,
            meter_file=request.meter_file,
            tower_file=request.tower_file
        )
        return ValidationResult(**validation)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/session/{session_id}/files")
async def list_session_files(session_id: str):
    """List all files in a session"""
    try:
        files = FileService.list_session_files(session_id)
        return {
            "session_id": session_id,
            "files": files,
            "count": len(files)
        }
    except Exception as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.delete("/session/{session_id}")
async def delete_session(session_id: str):
    """Delete a session and all its files"""
    try:
        FileManager.cleanup_session(session_id)
        return {"message": f"Session {session_id} deleted"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
