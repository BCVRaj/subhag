"""
Initialize WindOps Pro - Create necessary directories and files
"""
import os
from pathlib import Path

def create_directories():
    """Create all necessary data directories"""
    base_dir = Path(__file__).parent / "backend" / "app" / "data"
    
    directories = [
        base_dir,
        base_dir / "uploads",
        base_dir / "jobs",
        base_dir / "results",
    ]
    
    for directory in directories:
        directory.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created: {directory}")
    
    # Create .gitkeep files to preserve directory structure
    for directory in directories[1:]:  # Skip base data dir
        gitkeep = directory / ".gitkeep"
        gitkeep.touch(exist_ok=True)

def main():
    print("🌬️  Initializing WindOps Pro...\n")
    
    print("📁 Creating data directories...")
    create_directories()
    
    print("\n✅ Initialization complete!")
    print("\nNext steps:")
    print("1. Install backend dependencies:")
    print("   cd backend")
    print("   python -m venv venv")
    print("   .\\venv\\Scripts\\Activate.ps1")
    print("   pip install -r requirements.txt")
    print("\n2. Install frontend dependencies:")
    print("   cd frontend")
    print("   npm install")
    print("\n3. Start the application:")
    print("   Run: .\\start.ps1")
    print("\n   Or manually:")
    print("   Backend: cd backend/app && uvicorn main:app --reload")
    print("   Frontend: cd frontend && npm run dev")

if __name__ == "__main__":
    main()
