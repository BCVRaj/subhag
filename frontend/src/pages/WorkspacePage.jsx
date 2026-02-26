/**
 * Workspace Selection Page
 */
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../hooks/useAuth'

export default function WorkspacePage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  
  const workspaces = [
    {
      id: 'developer',
      title: 'Developer',
      description: 'Access raw data, API keys, and sandbox simulations.',
      icon: 'code',
      route: '/data-intake',
    },
    {
      id: 'operator',
      title: 'Operator',
      description: 'Real-time monitoring, performance dashboards, and alerts.',
      icon: 'monitoring',
      route: '/ops-health',
      selected: user?.role === 'operator',
    },
    {
      id: 'investor',
      title: 'Investor',
      description: 'Financial metrics, revenue tracking, and risk analysis.',
      icon: 'account_balance',
      route: '/financial',
    },
  ]
  
  return (
    <div className="min-h-screen bg-background-dark flex items-center justify-center p-6 relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="ambient-glow"></div>
      
      <div className="w-full max-w-4xl relative z-10">
        <div className="glass-morphism rounded-xl shadow-2xl p-8 md:p-12">
          <div className="text-center mb-10">
            <div className="flex justify-center mb-6">
              <div className="p-3 rounded-full bg-primary/10 border border-primary/20">
                <span className="material-symbols-outlined text-primary text-3xl">grid_view</span>
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">
              Select Your Workspace
            </h1>
            <p className="text-gray-400 text-lg">Choose your role to configure the dashboard.</p>
          </div>
          
          <div className="space-y-4 mb-10">
            {workspaces.map((workspace) => (
              <div
                key={workspace.id}
                onClick={() => navigate(workspace.route)}
                className={`group relative flex items-center gap-6 p-6 rounded-lg border transition-all cursor-pointer ${
                  workspace.selected
                    ? 'border-primary bg-primary/5 shadow-[0_0_20px_rgba(16,183,127,0.15)]'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                {workspace.selected && (
                  <div className="absolute -top-3 -right-3 bg-primary text-background-dark size-7 rounded-full flex items-center justify-center shadow-lg">
                    <span className="material-symbols-outlined text-sm font-bold">check</span>
                  </div>
                )}
                
                <div
                  className={`flex-shrink-0 size-14 flex items-center justify-center rounded-lg transition-colors ${
                    workspace.selected
                      ? 'bg-primary text-background-dark'
                      : 'bg-white/5 text-white/80 group-hover:text-primary'
                  }`}
                >
                  <span
                    className="material-symbols-outlined text-3xl"
                    style={workspace.selected ? { fontVariationSettings: "'FILL' 1" } : {}}
                  >
                    {workspace.icon}
                  </span>
                </div>
                
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-white text-xl font-bold">{workspace.title}</h3>
                    {workspace.selected && (
                      <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                        Selected
                      </span>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm leading-relaxed">{workspace.description}</p>
                </div>
                
                <div
                  className={`flex-shrink-0 transition-opacity ${
                    workspace.selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-white/40">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={() => navigate('/ops-health')}
              className="px-6 py-3 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
