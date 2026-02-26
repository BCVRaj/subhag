/**
 * Sidebar Component
 */
import { NavLink } from 'react-router-dom'

const navigation = [
  { name: 'Prospecting', href: '/prospecting', icon: 'map' },
  { name: 'Data Intake', href: '/data-intake', icon: 'database' },
  { name: 'Ops Health', href: '/ops-health', icon: 'monitor_heart' },
  { name: 'Financial', href: '/financial', icon: 'payments' },
  { name: 'Maintenance', href: '/maintenance', icon: 'build' },
]

export default function Sidebar() {
  return (
    <aside className="w-[260px] flex-shrink-0 bg-background-dark border-r border-gray-800 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-gray-800">
        <div className="flex items-center justify-center size-8 rounded bg-primary/20 text-primary">
          <span className="material-symbols-outlined text-[20px]">wind_power</span>
        </div>
        <div className="flex flex-col">
          <h1 className="text-white text-base font-bold leading-tight tracking-tight">
            WindOps Pro
          </h1>
          <p className="text-xs text-gray-500 font-mono">v2.4.0</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `group flex items-center gap-3 px-3 py-3 rounded-lg transition-all border-l-[3px] ${
                isActive
                  ? 'bg-primary/10 border-primary text-white sidebar-glow'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-surface-dark'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`material-symbols-outlined transition-transform ${
                    isActive
                      ? 'text-primary scale-110 active-fill'
                      : 'text-gray-400 group-hover:text-gray-200'
                  }`}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-surface-dark cursor-pointer transition-colors">
          <div className="size-9 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
            <span className="material-symbols-outlined text-primary text-xl">person</span>
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium text-white truncate">Operator User</p>
            <p className="text-xs text-gray-500 truncate">ops@windops.pro</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
