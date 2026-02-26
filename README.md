# WindOps Pro - Wind Farm Operations Platform

A comprehensive wind farm operations platform powered by OpenOA analysis, providing real-time monitoring, performance analysis, and financial forecasting for wind energy assets.

## 🌟 Features

### Core Modules
- **Site Prospecting** - Wind resource assessment and site evaluation
- **Data Intake** - Upload and validate SCADA data and turbine metadata
- **Operations Health** - Real-time monitoring dashboard with KPIs
- **Power Curve Analysis** - Compare observed vs warranted performance
- **Turbine Deep-Dive** - Individual turbine telemetry and diagnostics
- **Financial Analysis** - Revenue forecasting and uncertainty modeling
- **Maintenance Management** - Task tracking and scheduling

### Technical Capabilities
- **OpenOA Integration** - Industry-standard wind analysis toolkit
  - Monte Carlo AEP calculations
  - Wake loss analysis
  - Electrical loss assessment
  - Power curve validation
  - Turbine Ideal Energy (TIE)
  - Gap analysis
- **Real-time Monitoring** - Live SCADA data with 30-second refresh
- **Background Jobs** - Long-running analyses with progress tracking
- **User Authentication** - JWT-based secure access
- **File-based Storage** - No database required for quick setup

## 🏗️ Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **OpenOA** - Open-source wind energy analysis
- **Pydantic** - Data validation
- **Python-Jose** - JWT authentication
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI library
- **Vite** - Build tool
- **Tailwind CSS** - Utility-first CSS
- **Recharts** - Data visualization
- **Zustand** - State management
- **Axios** - HTTP client
- **React Router** - Navigation

## 📦 Installation

### Prerequisites
- Python 3.9+
- Node.js 16+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```powershell
   cd backend
   ```

2. **Create virtual environment**
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

3. **Install dependencies**
   ```powershell
   pip install -r requirements.txt
   ```

4. **Configure environment**
   - Copy `.env` file and update `SECRET_KEY` for production
   - The `.env` file is already configured for development

5. **Start backend server**
   ```powershell
   cd app
   uvicorn main:app --reload --host 0.0.0.0 --port 8000
   ```

   Backend will be available at: http://localhost:8000
   API docs at: http://localhost:8000/docs

### Frontend Setup

1. **Navigate to frontend directory**
   ```powershell
   cd frontend
   ```

2. **Install dependencies**
   ```powershell
   npm install
   ```

3. **Configure Google OAuth** (Required for sign-in)
   - See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for detailed instructions
   - Edit `frontend/.env` and set your `VITE_GOOGLE_CLIENT_ID`
   - Edit `backend/.env` and set your `GOOGLE_CLIENT_ID`

4. **Start development server**
   ```powershell
   npm run dev
   ```

   Frontend will be available at: http://localhost:5173

## 🔐 Authentication

WindOps Pro uses **Google OAuth 2.0** for authentication. Demo credentials have been removed for security.

### Setup Google Sign-In

1. Follow the step-by-step guide in [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md)
2. Obtain a Google OAuth Client ID
3. Configure both frontend and backend `.env` files
4. Restart both servers

**Time required:** ~10 minutes  
**No credit card needed** - Google Cloud's free tier is sufficient

## 📂 Project Structure

```
WindOps/
├── backend/
│   ├── app/
│   │   ├── api/              # REST API endpoints
│   │   │   ├── auth.py       # Authentication
│   │   │   ├── upload.py     # File uploads
│   │   │   ├── analysis.py   # Run analyses
│   │   │   ├── jobs.py       # Job status polling
│   │   │   ├── results.py    # Analysis results
│   │   │   ├── turbines.py   # Turbine data
│   │   │   └── maintenance.py # Task management
│   │   ├── models/           # Data models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   │   ├── auth_service.py
│   │   │   ├── file_service.py
│   │   │   ├── job_service.py
│   │   │   └── availability_calc.py
│   │   ├── openoa_wrapper/   # OpenOA integrations
│   │   │   ├── data_builder.py
│   │   │   ├── aep_analyzer.py
│   │   │   ├── wake_analyzer.py
│   │   │   ├── elec_loss_analyzer.py
│   │   │   ├── power_curve_analyzer.py
│   │   │   ├── tie_analyzer.py
│   │   │   ├── gap_analyzer.py
│   │   │   └── result_formatter.py
│   │   ├── utils/            # Utilities
│   │   │   ├── file_manager.py
│   │   │   └── job_runner.py
│   │   ├── config.py         # Configuration
│   │   └── main.py           # FastAPI app
│   ├── .env                  # Environment variables
│   └── requirements.txt      # Python dependencies
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   └── common/       # Reusable components
    │   │       ├── Sidebar.jsx
    │   │       ├── LoadingSpinner.jsx
    │   │       └── ProgressBar.jsx
    │   ├── hooks/            # Custom React hooks
    │   │   ├── useAuth.js    # Authentication state
    │   │   ├── useAnalysisJob.js # Job polling
    │   │   └── useSCADAData.js   # Live data
    │   ├── pages/            # Application pages
    │   │   ├── LoginPage.jsx
    │   │   ├── WorkspacePage.jsx
    │   │   ├── ProspectingPage.jsx
    │   │   ├── DataIntakePage.jsx
    │   │   ├── OpsHealthPage.jsx
    │   │   ├── PowerCurvePage.jsx
    │   │   ├── TurbineDetailPage.jsx
    │   │   ├── FinancialPage.jsx
    │   │   └── MaintenancePage.jsx
    │   ├── services/
    │   │   └── api.js        # API client
    │   ├── App.jsx           # Router & protected routes
    │   └── main.jsx          # React entry point
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## 🚀 Usage Guide

### 1. Login
- Navigate to http://localhost:5173
- Click **"Sign in with Google"** button
- Authenticate with your Google account
- You'll be automatically signed in and redirected to the workspace

### 2. Select Workspace
- Choose your role (Operator, Developer, or Investor)
- Dashboard will be configured for your role

### 3. Upload Data
- Go to **Data Intake** page
- Create a new upload session
- Upload required files:
  - **SCADA Data** (CSV) - Timestamp, turbine ID, power, wind speed
  - **Turbine Metadata** (CSV) - Turbine specs and locations
  - **Reanalysis Data** (Optional) - Weather model data

### 4. Run Analysis
- Validate uploaded data
- Click "Run Analysis"
- Monitor progress with real-time updates
- View results when complete

### 5. Monitor Operations
- **Ops Health** - Overall farm performance and KPIs
- **Power Curve** - Turbine performance analysis
- **Turbine Detail** - Deep dive into individual turbines
- **Financial** - Revenue forecasts and uncertainty
- **Maintenance** - Track and manage tasks

## 🔧 Configuration

### Backend Configuration (.env)
```env
SECRET_KEY=your-secret-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Required for Google Sign-In
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### Frontend Configuration (.env)
```env
# Required for Google Sign-In
VITE_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
VITE_API_URL=http://localhost:8000/api
```

See [GOOGLE_OAUTH_SETUP.md](GOOGLE_OAUTH_SETUP.md) for instructions on obtaining your Google Client ID.
}
```

## 📊 API Documentation

Once the backend is running, interactive API documentation is available at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http:google` - Google OAuth authentication
- `GET /api/auth/me` - Get current user

### Key Endpoints
- `POST /api/auth/login` - User authentication
- `POST /api/upload/create-session` - Create upload session
- `POST /api/upload/file` - Upload data files
- `POST /api/analysis/full` - Run full analysis
- `GET /api/jobs/{job_id}/status` - Check job progress
- `GET /api/results/{job_id}/energy-yield` - Get AEP results
- `GET /api/turbines/list` - List all turbines
- `GET /api/maintenance/tasks` - Get maintenance tasks

## 🧪 Testing

### Backend Tests
```powershell
cd backend
pytest
```

### Frontend Tests
```powershell
cd frontend
npm test
```

## 🔮 Future Enhancements

- [ ] Real OpenOA integration (currently using mock data)
- [ ] PostgreSQL/MongoDB for production storage
- [ ] WebSocket support for real-time updates
- [ ] Advanced alerting and notifications
- [ ] Custom report generation (PDF/Excel)
- [ ] Mobile-responsive improvements
- [ ] Multi-farm support
- [ ] Role-based access control (RBAC)
- [ ] Integration with SCADA systems
- [ ] Machine learning for predictive maintenance

## 📝 Development Notes

### Mock Data vs Real OpenOA
The OpenOA wrapper modules (`backend/app/openoa_wrapper/`) currently use mock data generators. To enable real OpenOA analysis:

1. Install OpenOA: `pip install openoa`
2. Replace mock implementations in analyzer modules
3. Set `OPENOA_ENABLE_REAL_ANALYSIS=True` in `.env`

### Adding New Analysis Types
1. Create analyzer in `backend/app/openoa_wrapper/`
2. Add endpoint in `backend/app/api/analysis.py`
3. Update job service to orchestrate
4. Create frontend component for visualization

## 🤝 Contributing

Contributions welcome! Please follow these guidelines:
1. Fork the repository
2. Create a feature branch
3. Write tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 👥 Support

For issues, questions, or contributions:
- Create an issue on GitHub
- Email: support@windopspro.com

## 🙏 Acknowledgments

- **OpenOA** - National Renewable Energy Laboratory (NREL)
- **FastAPI** - Sebastián Ramírez
- **React** - Meta Open Source
- Wind energy community for valuable feedback

---

**Built with ❤️ for the wind energy industry**
