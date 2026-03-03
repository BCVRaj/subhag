"""
FastAPI Main Application - WindOps Pro
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.middleware.base import BaseHTTPMiddleware
from app.config import settings
from app.api import auth, upload, analysis, jobs, results, turbines, maintenance, prospecting

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Wind Farm Operations Analysis Platform with OpenOA Integration",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# Custom middleware to add COOP header for Google OAuth popup support
class COOPMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Cross-Origin-Opener-Policy"] = "same-origin-allow-popups"
        return response

# Add COOP middleware first
app.add_middleware(COOPMiddleware)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Health check endpoint
@app.get("/")
async def root():
    """Root endpoint - health check"""
    return {
        "status": "online",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "message": "WindOps Pro API is running"
    }


@app.get("/api/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "openoa": "available",
        "storage": "file-based",
        "directories": {
            "uploads": str(settings.UPLOADS_DIR.exists()),
            "jobs": str(settings.JOBS_DIR.exists()),
            "results": str(settings.RESULTS_DIR.exists())
        }
    }


# Include API routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(upload.router, prefix="/api/upload", tags=["File Upload"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["Job Management"])
app.include_router(results.router, prefix="/api/results", tags=["Results"])
app.include_router(turbines.router, prefix="/api/turbines", tags=["Turbines"])
app.include_router(maintenance.router, prefix="/api/maintenance", tags=["Maintenance"])
app.include_router(prospecting.router, prefix="/api/prospecting", tags=["Prospecting"])


# Validation error handler
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors with detailed logging"""
    print(f"❌ Validation Error on {request.method} {request.url}")
    print(f"   Error details: {exc.errors()}")
    print(f"   Body: {exc.body}")
    return JSONResponse(
        status_code=422,
        content={
            "error": "Validation Error",
            "detail": exc.errors(),
            "body": exc.body
        }
    )


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Handle uncaught exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": str(exc) if settings.DEBUG else "An error occurred"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
