/**
 * Alert Component - Display notifications and messages
 */
export default function Alert({ type = 'info', title, message, onClose }) {
  const styles = {
    success: 'bg-primary/10 border-primary/30 text-primary',
    error: 'bg-red-500/10 border-red-500/30 text-red-400',
    warning: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }
  
  const icons = {
    success: 'check_circle',
    error: 'error',
    warning: 'warning',
    info: 'info',
  }
  
  return (
    <div className={`glass-panel rounded-xl p-4 border ${styles[type]}`}>
      <div className="flex items-start gap-3">
        <span className={`material-symbols-outlined mt-0.5 ${styles[type]}`}>
          {icons[type]}
        </span>
        <div className="flex-1">
          {title && <h3 className="font-bold text-white mb-1">{title}</h3>}
          <p className="text-sm text-gray-400">{message}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        )}
      </div>
    </div>
  )
}
