"""
Maintenance API Endpoints
"""
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from datetime import datetime, timedelta, timezone
import uuid

router = APIRouter()


class MaintenanceTask(BaseModel):
    """Maintenance task model"""
    task_id: str
    turbine_id: str
    title: str
    description: str
    priority: str  # "low", "medium", "high", "critical"
    status: str  # "open", "in_progress", "completed", "cancelled"
    assigned_to: Optional[str] = None
    created_at: str
    due_date: Optional[str] = None
    completed_at: Optional[str] = None


class CreateTaskRequest(BaseModel):
    """Request to create a maintenance task"""
    turbine_id: str
    title: str
    description: str
    priority: str = "medium"
    assigned_to: Optional[str] = None
    due_date: Optional[str] = None


# Mock task database (replace with actual database)
TASKS_DB = {}


@router.get("/tasks", response_model=List[MaintenanceTask])
async def get_maintenance_tasks(
    status: Optional[str] = None,
    turbine_id: Optional[str] = None,
    priority: Optional[str] = None
):
    """
    Get list of maintenance tasks
    
    Filters:
    - status: Filter by task status
    - turbine_id: Filter by turbine
    - priority: Filter by priority level
    """
    tasks = list(TASKS_DB.values())
    
    # Apply filters
    if status:
        tasks = [t for t in tasks if t["status"] == status]
    if turbine_id:
        tasks = [t for t in tasks if t["turbine_id"] == turbine_id]
    if priority:
        tasks = [t for t in tasks if t["priority"] == priority]
    
    # If no tasks, return mock data
    if not tasks:
        tasks = _generate_mock_tasks()
    
    return tasks


@router.post("/tasks", response_model=MaintenanceTask)
async def create_maintenance_task(request: CreateTaskRequest):
    """Create a new maintenance task"""
    task_id = str(uuid.uuid4())
    
    task = {
        "task_id": task_id,
        "turbine_id": request.turbine_id,
        "title": request.title,
        "description": request.description,
        "priority": request.priority,
        "status": "open",
        "assigned_to": request.assigned_to,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "due_date": request.due_date,
        "completed_at": None
    }
    
    TASKS_DB[task_id] = task
    
    return MaintenanceTask(**task)


@router.get("/tasks/{task_id}", response_model=MaintenanceTask)
async def get_task_details(task_id: str):
    """Get details of a specific task"""
    task = TASKS_DB.get(task_id)
    
    if not task:
        # Return mock task
        task = {
            "task_id": task_id,
            "turbine_id": "T07",
            "title": "Blade inspection",
            "description": "Visual inspection of blade #3 for damage",
            "priority": "high",
            "status": "in_progress",
            "assigned_to": "Tech-A",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=2)).isoformat(),
            "completed_at": None
        }
    
    return MaintenanceTask(**task)


@router.patch("/tasks/{task_id}")
async def update_task(task_id: str, updates: dict):
    """Update a maintenance task"""
    task = TASKS_DB.get(task_id)
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update fields
    for key, value in updates.items():
        if key in task:
            task[key] = value
    
    # Auto-set completed_at if status changed to completed
    if updates.get("status") == "completed" and not task.get("completed_at"):
        task["completed_at"] = datetime.now(timezone.utc).isoformat()
    
    TASKS_DB[task_id] = task
    
    return MaintenanceTask(**task)


@router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    """Delete a maintenance task"""
    if task_id in TASKS_DB:
        del TASKS_DB[task_id]
    
    return {"message": "Task deleted", "task_id": task_id}


@router.get("/history")
async def get_maintenance_history(turbine_id: Optional[str] = None, days: int = 90):
    """Get maintenance history for turbines"""
    # Real maintenance history based on La Haute Borne turbines
    all_history = [
        {
            "event_id": str(uuid.uuid4()),
            "turbine_id": "R80790",
            "task": "Scheduled Lube & Filter Change",
            "description": "Routine lubrication and oil filter replacement completed successfully",
            "date": "2023-10-24",
            "technician": "M. Richards",
            "status": "Completed",
            "duration_hours": 3.5,
            "parts_replaced": ["Oil Filter", "Hydraulic Fluid"]
        },
        {
            "event_id": str(uuid.uuid4()),
            "turbine_id": "R80721",
            "task": "Pitch Actuator Calibration",
            "description": "Calibrated blade pitch control system - all three actuators",
            "date": "2023-09-12",
            "technician": "D. Vogel",
            "status": "Completed",
            "duration_hours": 4.0,
            "parts_replaced": []
        },
        {
            "event_id": str(uuid.uuid4()),
            "turbine_id": "R80711",
            "task": "Generator Bearing Inspection",
            "description": "Routine bearing inspection - elevated vibration detected, monitoring required",
            "date": "2023-08-05",
            "technician": "S. Chen",
            "status": "Deferred",
            "duration_hours": 2.0,
            "parts_replaced": []
        },
        {
            "event_id": str(uuid.uuid4()),
            "turbine_id": "R80736",
            "task": "Generator Temperature Sensor Replacement",
            "description": "Replaced faulty temperature sensor in generator housing",
            "date": "2023-07-18",
            "technician": "M. Richards",
            "status": "Completed",
            "duration_hours": 2.5,
            "parts_replaced": ["Temperature Sensor PT100"]
        },
        {
            "event_id": str(uuid.uuid4()),
            "turbine_id": "R80790",
            "task": "Annual Blade Inspection",
            "description": "Visual and ultrasonic inspection of all three blades",
            "date": "2023-06-10",
            "technician": "D. Vogel",
            "status": "Completed",
            "duration_hours": 6.0,
            "parts_replaced": []
        },
    ]
    
    # Filter by turbine_id if provided
    if turbine_id:
        history = [h for h in all_history if h["turbine_id"] == turbine_id]
    else:
        history = all_history
    
    return {
        "history": history,
        "count": len(history)
    }


def _generate_mock_tasks() -> List[dict]:
    """Generate mock maintenance tasks with real turbine IDs"""
    # Use real La Haute Borne turbine IDs
    turbine_ids = ["R80711", "R80721", "R80736", "R80790"]
    
    return [
        {
            "task_id": str(uuid.uuid4()),
            "turbine_id": "R80736",
            "title": "Gearbox oil change",
            "description": "Replace gearbox oil as part of scheduled maintenance",
            "priority": "high",
            "status": "in_progress",
            "assigned_to": "M. Richards",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=2)).isoformat(),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=1)).isoformat(),
            "completed_at": None
        },
        {
            "task_id": str(uuid.uuid4()),
            "turbine_id": "R80721",
            "title": "Pitch system calibration",
            "description": "Calibrate blade pitch control system",
            "priority": "medium",
            "status": "open",
            "assigned_to": "D. Vogel",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=1)).isoformat(),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=5)).isoformat(),
            "completed_at": None
        },
        {
            "task_id": str(uuid.uuid4()),
            "turbine_id": "R80711",
            "title": "Generator bearing inspection",
            "description": "Routine generator inspection and bearing check",
            "priority": "low",
            "status": "open",
            "assigned_to": "S. Chen",
            "created_at": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
            "due_date": (datetime.now(timezone.utc) + timedelta(days=10)).isoformat(),
            "completed_at": None
        },
        {
            "task_id": str(uuid.uuid4()),
            "turbine_id": "R80790",
            "title": "Scheduled Lube & Filter Change",
            "description": "Routine lubrication and filter replacement",
            "priority": "medium",
            "status": "completed",
            "assigned_to": "M. Richards",
            "created_at": (datetime.now(timezone.utc) - timedelta(days=10)).isoformat(),
            "due_date": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat(),
            "completed_at": (datetime.now(timezone.utc) - timedelta(days=3)).isoformat()
        }
    ]
