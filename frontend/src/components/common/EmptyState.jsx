/**
 * Empty State Component - Display when no data is available
 */
export default function EmptyState({ icon = 'inbox', title, description, action }) {
  return (
    <div className="glass-panel rounded-xl p-12 text-center">
      <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">
        {icon}
      </span>
      <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
      {description && <p className="text-gray-400 mb-4">{description}</p>}
      {action && action}
    </div>
  )
}
