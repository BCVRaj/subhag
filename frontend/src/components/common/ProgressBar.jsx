/**
 * Progress Bar Component
 */
export default function ProgressBar({ progress, status, message }) {
  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-300">{message || 'Processing...'}</span>
        <span className="text-sm font-bold text-primary">{progress}%</span>
      </div>

      <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-primary to-primary-dark h-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        >
          {progress > 0 && progress < 100 && (
            <div className="w-full h-full bg-white/20 animate-pulse"></div>
          )}
        </div>
      </div>

      {status && (
        <div className="mt-2 text-xs text-gray-500">
          Status: <span className="text-gray-400">{status}</span>
        </div>
      )}
    </div>
  )
}
