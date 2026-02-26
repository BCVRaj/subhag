/**
 * Turbine Status Badge Component
 */
export default function TurbineStatus({ status, size = 'md' }) {
  const statusConfig = {
    operational: {
      color: 'text-primary bg-primary/10',
      icon: 'check_circle',
      label: 'Operational',
    },
    warning: {
      color: 'text-yellow-400 bg-yellow-500/10',
      icon: 'warning',
      label: 'Warning',
    },
    alarm: {
      color: 'text-red-400 bg-red-500/10',
      icon: 'error',
      label: 'Alarm',
    },
    offline: {
      color: 'text-gray-400 bg-gray-500/10',
      icon: 'power_off',
      label: 'Offline',
    },
  }
  
  const config = statusConfig[status] || statusConfig.offline
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2',
  }
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${config.color} ${sizeClasses[size]}`}
    >
      <span className="material-symbols-outlined text-inherit" style={{ fontSize: 'inherit' }}>
        {config.icon}
      </span>
      <span>{config.label}</span>
    </span>
  )
}
