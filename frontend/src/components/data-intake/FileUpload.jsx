/**
 * File Upload Component
 */
import { useState } from 'react'
import { formatFileSize } from '../../utils/formatters'
import { isValidFileType, isValidFileSize } from '../../utils/validators'

export default function FileUpload({
  onFileSelect,
  accept = '.csv',
  maxSizeMB = 100,
  label = 'Choose File',
}) {
  const [dragActive, setDragActive] = useState(false)
  const [error, setError] = useState('')
  
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }
  
  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }
  
  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }
  
  const handleFile = (file) => {
    setError('')
    
    // Validate file type
    if (!isValidFileType(file.name, accept.split(','))) {
      setError(`Invalid file type. Accepted: ${accept}`)
      return
    }
    
    // Validate file size
    if (!isValidFileSize(file.size, maxSizeMB)) {
      setError(`File too large. Max size: ${maxSizeMB}MB`)
      return
    }
    
    onFileSelect(file)
  }
  
  return (
    <div>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-gray-700 hover:border-gray-600'
        }`}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleChange}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">
            upload_file
          </span>
          <p className="text-white font-medium mb-1">{label}</p>
          <p className="text-sm text-gray-400">
            Drag & drop or click to browse
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Max size: {maxSizeMB}MB | Accepted: {accept}
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}
