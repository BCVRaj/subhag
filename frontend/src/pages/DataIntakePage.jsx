/**
 * Data Intake Page - Upload SCADA data with Schema Mapping
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { uploadAPI, analysisAPI } from '../services/api'
import { useAnalysisJob } from '../hooks/useAnalysisJob'

export default function DataIntakePage() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1) // 1: Upload, 2: Mapping, 3: Validation
  const [sessionId, setSessionId] = useState(null)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  
  // Column mapping state
  const [columnMappings, setColumnMappings] = useState({
    timestamp: 'Timestamp',
    wind_speed: 'wind_spd',
    power: 'power_kw',
    yaw: 'nacelle_pos',
  })
  
  const [validationStatus, setValidationStatus] = useState(null)
  const [validating, setValidating] = useState(false)
  
  const { startPolling, progress, jobId, results, error: jobError } = useAnalysisJob()
  
  const handleCreateSession = async () => {
    try {
      const data = await uploadAPI.createSession()
      setSessionId(data.session_id)
    } catch (error) {
      console.error('Failed to create session:', error)
    }
  }
  
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    setUploading(true)
    try {
      // Create session if it doesn't exist
      let currentSessionId = sessionId
      if (!currentSessionId) {
        const response = await uploadAPI.createSession()
        currentSessionId = response.data.session_id
        setSessionId(currentSessionId)
      }
      
      // Upload file
      const formData = new FormData()
      formData.append('file', file)
      formData.append('session_id', currentSessionId)
      formData.append('file_type', 'scada')
      
      const response = await uploadAPI.uploadFile(currentSessionId, formData)
      setUploadedFile({
        name: file.name,
        size: (file.size / (1024 * 1024)).toFixed(2),
        ...response.data
      })
      setCurrentStep(2) // Move to mapping step
    } catch (error) {
      console.error('Upload failed:', error)
    } finally {
      setUploading(false)
    }
  }
  
  const handleConfirmMapping = () => {
    setCurrentStep(3)
    handleValidate()
  }
  
  const handleValidate = async () => {
    if (!sessionId) return
    
    setValidating(true)
    try {
      const response = await uploadAPI.validateData(sessionId, uploadedFile?.filename)
      setValidationStatus(response.data)
    } catch (error) {
      console.error('Validation failed:', error)
      setValidationStatus({ is_valid: false, errors: ['Validation failed'], warnings: [] })
    } finally {
      setValidating(false)
    }
  }
  
  const handleRunAnalysis = async () => {
    if (!sessionId) return
    
    try {
      const response = await analysisAPI.runFullAnalysis(sessionId)
      if (response.data.job_id) {
        startPolling(response.data.job_id)
      }
    } catch (error) {
      console.error('Failed to start analysis:', error)
    }
  }
  
  const handleViewResults = () => {
    if (jobId) {
      navigate(`/ops-health?job=${jobId}`)
    }
  }
  
  const openoaSchema = [
    { key: 'time_utc', label: 'time_utc', type: 'ISO 8601 Datetime', icon: 'calendar_today' },
    { key: 'wspd_ms', label: 'wspd_ms', type: 'Float (m/s)', icon: 'air' },
    { key: 'pwr_watt', label: 'pwr_watt', type: 'Float (Watts)', icon: 'bolt' },
    { key: 'yaw_deg', label: 'yaw_deg', type: 'Float (Degrees)', icon: 'rotate_right' },
  ]
  
  const sourceColumns = [
    { key: 'timestamp', label: 'Timestamp', icon: 'calendar_today' },
    { key: 'wind_speed', label: 'wind_spd', icon: 'air' },
    { key: 'power', label: 'power_kw', icon: 'bolt' },
    { key: 'yaw', label: 'nacelle_pos', icon: 'rotate_right' },
  ]
  
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <main className="flex-1 flex flex-col h-screen bg-background-dark relative overflow-hidden">
        {/* Dot grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'radial-gradient(#1F2937 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
        </div>
        
        {/* Header with Steps */}
        <header className="h-20 px-8 flex items-center justify-between border-b border-gray-800 bg-background-dark z-10 relative">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-white tracking-tight">Data Workbench</h2>
            <div className="h-6 w-px bg-gray-700"></div>
            
            {/* Step Indicators */}
            <div className="flex items-center gap-3">
              {/* Step 1 */}
              <div className="flex items-center gap-2">
                <div className={`size-6 rounded-full flex items-center justify-center border text-xs font-bold ${
                  currentStep === 1 ? 'bg-primary text-background-dark border-primary' :
                  currentStep > 1 ? 'bg-primary/20 text-primary border-primary' :
                  'bg-gray-800 text-gray-500 border-gray-700'
                }`}>
                  1
                </div>
                <span className={`text-xs font-medium ${
                  currentStep === 1 ? 'text-white font-bold' : currentStep > 1 ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Upload
                </span>
              </div>
              
              <div className={`w-8 h-px ${currentStep > 1 ? 'bg-primary/30' : 'bg-gray-700'}`}></div>
              
              {/* Step 2 */}
              <div className="flex items-center gap-2">
                <div className={`size-6 rounded-full flex items-center justify-center border text-xs font-bold ${
                  currentStep === 2 ? 'bg-primary text-background-dark border-primary' :
                  currentStep > 2 ? 'bg-primary/20 text-primary border-primary' :
                  'bg-gray-800 text-gray-500 border-gray-700'
                }`}>
                  2
                </div>
                <span className={`text-xs font-medium ${
                  currentStep === 2 ? 'text-white font-bold' : currentStep > 2 ? 'text-gray-400' : 'text-gray-500'
                }`}>
                  Mapping Columns
                </span>
              </div>
              
              <div className={`w-8 h-px ${currentStep > 2 ? 'bg-primary/30' : 'bg-gray-700'}`}></div>
              
              {/* Step 3 */}
              <div className="flex items-center gap-2">
                <div className={`size-6 rounded-full flex items-center justify-center border text-xs font-bold ${
                  currentStep === 3 ? 'bg-primary text-background-dark border-primary' :
                  'bg-gray-800 text-gray-500 border-gray-700'
                }`}>
                  3
                </div>
                <span className={`text-xs font-medium ${
                  currentStep === 3 ? 'text-white font-bold' : 'text-gray-500'
                }`}>
                  Validation
                </span>
              </div>
            </div>
          </div>
          
          <button className="flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-white transition-colors">
            <span className="material-symbols-outlined text-[16px]">help</span>
            Documentation
          </button>
        </header>
        
        <div className="flex-1 flex flex-col p-8 gap-8 overflow-y-auto z-10 relative">
          {/* Step 1: File Upload */}
          {currentStep === 1 && (
            <>
              {!uploadedFile ? (
                <label className="w-full bg-panel-dark rounded-xl border-2 border-dashed border-primary/40 flex flex-col items-center justify-center p-16 relative group hover:bg-surface-dark hover:border-primary/60 transition-all cursor-pointer">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <div className="size-16 rounded bg-gradient-to-br from-green-500/20 to-blue-500/10 flex items-center justify-center mb-4 border border-white/5">
                    <span className="material-symbols-outlined text-primary text-[32px]">upload_file</span>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">
                    {uploading ? 'Uploading...' : 'Click to Upload SCADA Data'}
                  </h3>
                  <p className="text-sm text-gray-400 mb-4">CSV format, up to 100MB</p>
                  {uploading && <LoadingSpinner />}
                </label>
              ) : (
                <div className="w-full bg-panel-dark rounded-xl border border-dashed border-primary/40 flex flex-col items-center justify-center p-10 relative group hover:bg-surface-dark transition-colors">
                  <div className="absolute top-4 right-4 flex gap-2">
                    <span className="px-2 py-1 bg-primary/10 text-primary text-[10px] font-mono rounded border border-primary/20">CSV</span>
                    <span className="px-2 py-1 bg-gray-800 text-gray-400 text-[10px] font-mono rounded border border-gray-700">
                      {uploadedFile.size}MB
                    </span>
                  </div>
                  <div className="size-16 rounded bg-gradient-to-br from-green-500/20 to-blue-500/10 flex items-center justify-center mb-4 border border-white/5">
                    <span className="material-symbols-outlined text-primary text-[32px]">description</span>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-1">{uploadedFile.name}</h3>
                  <p className="text-sm text-gray-400 mb-4">Uploaded successfully. Ready for mapping.</p>
                  <label className="text-xs text-primary hover:text-primary-dark font-medium underline underline-offset-4 decoration-primary/50 hover:decoration-primary transition-all cursor-pointer">
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    Replace File
                  </label>
                </div>
              )}
            </>
          )}
          
          {/* Step 2: Schema Mapping */}
          {currentStep === 2 && (
            <div className="flex-1 flex flex-col min-h-0 bg-panel-dark rounded-xl border border-gray-800 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-800 flex justify-between items-center bg-surface-dark">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[18px]">schema</span>
                  Schema Mapper
                </h3>
                <span className="px-2 py-1 bg-green-500/10 text-green-400 text-xs rounded border border-green-500/20">
                  {sourceColumns.length} Fields Auto-Mapped
                </span>
              </div>
              
              <div className="flex-1 flex relative">
                {/* Source Columns (Left) */}
                <div className="flex-1 border-r border-gray-800 flex flex-col">
                  <div className="px-6 py-3 bg-background-dark border-b border-gray-800 text-xs font-mono text-gray-400 uppercase tracking-wider">
                    Your File Columns (Source)
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    {sourceColumns.map((col) => (
                      <div key={col.key} className="flex items-center justify-between p-3 rounded bg-gray-800 border border-gray-700 hover:border-primary/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="material-symbols-outlined text-gray-500 text-[18px]">{col.icon}</span>
                          <span className="text-sm font-mono text-white">{col.label}</span>
                        </div>
                        <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,183,127,0.8)]"></div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Connection Lines */}
                <div className="absolute inset-0 pointer-events-none">
                  <svg className="w-full h-full">
                    {sourceColumns.map((_, index) => {
                      const y = 106 + index * 72
                      return (
                        <line
                          key={index}
                          x1="49.5%"
                          y1={y}
                          x2="50.5%"
                          y2={y}
                          stroke="#10b77f"
                          strokeWidth="2"
                          opacity="0.6"
                        />
                      )
                    })}
                  </svg>
                </div>
                
                {/* Target Columns (Right) */}
                <div className="flex-1 flex flex-col bg-panel-dark">
                  <div className="px-6 py-3 bg-background-dark border-b border-gray-800 text-xs font-mono text-primary uppercase tracking-wider flex justify-between">
                    <span>OpenOA Standard (Target)</span>
                    <span className="text-[10px] bg-primary/10 px-1 rounded text-primary border border-primary/20">
                      IEC 61400-12
                    </span>
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    {openoaSchema.map((col) => (
                      <div key={col.key} className="flex items-center gap-3 p-3 rounded bg-surface-dark border border-primary/30 shadow-[0_0_10px_rgba(16,183,127,0.05)]">
                        <div className="size-2 rounded-full bg-primary shadow-[0_0_8px_rgba(16,183,127,0.8)]"></div>
                        <div className="flex flex-col flex-1">
                          <span className="text-sm font-mono text-white font-bold">{col.label}</span>
                          <span className="text-[10px] text-gray-500">{col.type}</span>
                        </div>
                        <span className="material-symbols-outlined text-green-500 text-[18px]">check_circle</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Step 3: Validation */}
          {currentStep === 3 && (
            <div className="space-y-4">
              {validating && (
                <div className="glass-panel rounded-xl p-6 text-center">
                  <LoadingSpinner />
                  <p className="text-white mt-4">Validating data...</p>
                </div>
              )}
              
              {validationStatus && !validating && (
                <div className={`glass-panel rounded-xl p-6 border ${
                  validationStatus.is_valid
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-red-500/30 bg-red-500/5'
                }`}>
                  <div className="flex items-start gap-4 mb-6">
                    <span className={`material-symbols-outlined text-3xl ${
                      validationStatus.is_valid ? 'text-primary' : 'text-red-400'
                    }`}>
                      {validationStatus.is_valid ? 'check_circle' : 'error'}
                    </span>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">
                        {validationStatus.is_valid ? 'Data Validated Successfully!' : 'Validation Failed'}
                      </h3>
                      {validationStatus.errors && validationStatus.errors.length > 0 && (
                        <div className="mb-3">
                          <p className="text-sm font-semibold text-red-400 mb-1">Errors:</p>
                          <ul className="text-sm text-gray-400 space-y-1">
                            {validationStatus.errors.map((error, idx) => (
                              <li key={idx} className="text-red-300">• {error}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {validationStatus.warnings && validationStatus.warnings.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-yellow-400 mb-1">Warnings:</p>
                          <ul className="text-sm text-gray-400 space-y-1">
                            {validationStatus.warnings.map((warning, idx) => (
                              <li key={idx} className="text-yellow-300">• {warning}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {validationStatus.is_valid && !jobId && (
                    <button
                      onClick={handleRunAnalysis}
                      className="px-6 py-3 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors flex items-center gap-2"
                    >
                      <span className="material-symbols-outlined">play_arrow</span>
                      Run OpenOA Analysis
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Analysis Progress & Results */}
          {jobId && progress !== null && progress < 100 && (
            <div className="glass-panel rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <LoadingSpinner />
                <h2 className="text-xl font-bold text-white">Running OpenOA Analysis...</h2>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary h-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-400 mt-2">{progress}% complete</p>
            </div>
          )}
          
          {results && (
            <div className="glass-panel rounded-xl p-6 border border-primary/30 bg-primary/5">
              <div className="flex items-start gap-4">
                <div className="size-12 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <span className="material-symbols-outlined text-background-dark text-2xl">check</span>
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-bold text-white mb-2">Analysis Complete!</h2>
                  <p className="text-gray-400 mb-4">
                    Your wind farm analysis is ready. View the results in the Operations Health dashboard.
                  </p>
                  <button
                    onClick={handleViewResults}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors"
                  >
                    View Results
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Footer Actions */}
        <div className="h-20 bg-background-dark border-t border-gray-800 px-8 flex items-center justify-end gap-4 z-20 relative">
          {currentStep > 1 && currentStep < 3 && (
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 font-medium text-sm hover:border-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          )}
          
          {currentStep === 2 && uploadedFile && (
            <button
              onClick={handleConfirmMapping}
              className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary-dark text-white font-bold text-sm shadow-primary-glow-lg transition-all flex items-center gap-2"
            >
              <span>Confirm Mapping</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
