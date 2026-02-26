/**
 * Maintenance & Task Management Page
 */
import { useState, useEffect } from 'react'
import Sidebar from '../components/common/Sidebar'
import LoadingSpinner from '../components/common/LoadingSpinner'
import { maintenanceAPI } from '../services/api'

export default function MaintenancePage() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterTurbine, setFilterTurbine] = useState('all')
  const [editingTask, setEditingTask] = useState(null)
  const [activeTab, setActiveTab] = useState('tasks') // 'tasks' or 'history'
  const [history, setHistory] = useState([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [newTask, setNewTask] = useState({
    title: '',
    turbine_id: '',
    priority: 'medium',
    due_date: '',
    description: '',
  })
  
  useEffect(() => {
    fetchTasks()
  }, [])
  
  const fetchTasks = async () => {
    setLoading(true)
    try {
      const response = await maintenanceAPI.getTasks()
      const data = response.data || []
      // Normalize task_id to id and status values for frontend consistency
      const normalizedTasks = data.map(task => ({
        ...task,
        id: task.task_id || task.id,
        status: task.status === 'open' ? 'pending' : task.status
      }))
      setTasks(normalizedTasks.length > 0 ? normalizedTasks : mockTasks)
    } catch (error) {
      console.error('Failed to fetch tasks:', error)
      setTasks(mockTasks)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCreateTask = async (e) => {
    e.preventDefault()
    try {
      const response = await maintenanceAPI.createTask(newTask)
      const created = response.data
      // Normalize task_id to id and status for frontend consistency
      const normalizedTask = {
        ...created,
        id: created.task_id || created.id,
        status: created.status === 'open' ? 'pending' : created.status
      }
      setTasks([...tasks, normalizedTask])
      setShowNewTaskForm(false)
      setNewTask({
        title: '',
        turbine_id: '',
        priority: 'medium',
        due_date: '',
        description: '',
      })
    } catch (error) {
      console.error('Failed to create task:', error)
    }
  }
  
  const handleToggleComplete = async (taskId) => {
    const task = tasks.find((t) => t.id === taskId)
    if (!task) return
    
    const newStatus = task.status === 'completed' ? 'pending' : 'completed'
    // Backend uses 'open' instead of 'pending'
    const backendStatus = newStatus === 'pending' ? 'open' : newStatus
    
    try {
      await maintenanceAPI.updateTask(taskId, { status: backendStatus })
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)))
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setNewTask({
      title: task.title,
      turbine_id: task.turbine_id,
      priority: task.priority,
      due_date: task.due_date,
      description: task.description,
      status: task.status
    })
    setShowNewTaskForm(true)
  }

  const handleUpdateTask = async (e) => {
    e.preventDefault()
    try {
      // Map status back to backend format
      const updateData = {
        ...newTask,
        status: newTask.status === 'pending' ? 'open' : newTask.status
      }
      await maintenanceAPI.updateTask(editingTask.id, updateData)
      setTasks(tasks.map((t) => (t.id === editingTask.id ? { ...t, ...newTask } : t)))
      setShowNewTaskForm(false)
      setEditingTask(null)
      setNewTask({
        title: '',
        turbine_id: '',
        priority: 'medium',
        due_date: '',
        description: '',
      })
    } catch (error) {
      console.error('Failed to update task:', error)
    }
  }

  const handleDeleteTask = async (taskId) => {
    if (!confirm('Are you sure you want to delete this task?')) return
    
    try {
      await maintenanceAPI.deleteTask(taskId)
      setTasks(tasks.filter((t) => t.id !== taskId))
    } catch (error) {
      console.error('Failed to delete task:', error)
    }
  }

  const fetchHistory = async (turbineId = null) => {
    setLoadingHistory(true)
    try {
      const response = await maintenanceAPI.getHistory(turbineId, 90)
      setHistory(response.data.history || [])
    } catch (error) {
      console.error('Failed to fetch history:', error)
      setHistory([])
    } finally {
      setLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory()
    }
  }, [activeTab])
  
  const mockTasks = [
    {
      id: 1,
      title: 'Gearbox oil change',
      turbine_id: 'R80736',
      priority: 'high',
      status: 'in_progress',
      due_date: '2024-02-15',
      description: 'Replace gearbox oil as part of scheduled maintenance',
    },
    {
      id: 2,
      title: 'Pitch system calibration',
      turbine_id: 'R80721',
      priority: 'medium',
      status: 'open',
      due_date: '2024-02-20',
      description: 'Calibrate blade pitch control system',
    },
    {
      id: 3,
      title: 'Generator bearing inspection',
      turbine_id: 'R80711',
      priority: 'high',
      status: 'open',
      due_date: '2024-02-18',
      description: 'Routine generator inspection and bearing check',
    },
    {
      id: 4,
      title: 'Scheduled Lube & Filter Change',
      turbine_id: 'R80790',
      priority: 'low',
      status: 'completed',
      due_date: '2024-01-30',
      description: 'Routine lubrication and filter replacement',
    },
  ]
  
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-400 bg-red-500/10 border-red-500/30'
      case 'medium':
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 'low':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30'
      default:
        return 'text-gray-400 bg-gray-500/10 border-gray-500/30'
    }
  }
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-primary bg-primary/10'
      case 'in_progress':
        return 'text-yellow-400 bg-yellow-500/10'
      case 'pending':
        return 'text-gray-400 bg-gray-500/10'
      default:
        return 'text-gray-400 bg-gray-500/10'
    }
  }
  
  const filteredTasks = tasks.filter((task) => {
    const statusMatch = filterStatus === 'all' ? true : task.status === filterStatus
    const turbineMatch = filterTurbine === 'all' ? true : task.turbine_id === filterTurbine
    return statusMatch && turbineMatch
  })

  const uniqueTurbines = [...new Set(tasks.map(t => t.turbine_id))].sort()
  
  const stats = {
    total: tasks.length,
    pending: tasks.filter((t) => t.status === 'pending').length,
    in_progress: tasks.filter((t) => t.status === 'in_progress').length,
    completed: tasks.filter((t) => t.status === 'completed').length,
  }
  
  return (
    <div className="flex min-h-screen bg-background-dark">
      <Sidebar />
      
      <div className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">build</span>
              </div>
              <div>
                <h1 className="text-3xl font-black text-white">Maintenance Tasks</h1>
                <p className="text-sm text-gray-400">Track and manage turbine maintenance</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 glass-panel px-4 py-2 rounded-lg">
                <button
                  onClick={() => setActiveTab('tasks')}
                  className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                    activeTab === 'tasks' ? 'bg-primary text-background-dark' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Tasks
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-3 py-1 rounded font-medium text-sm transition-colors ${
                    activeTab === 'history' ? 'bg-primary text-background-dark' : 'text-gray-400 hover:text-white'
                  }`}
                >
                  History
                </button>
              </div>
              
              {activeTab === 'tasks' && (
                <button
                  onClick={() => {
                    setEditingTask(null)
                    setNewTask({
                      title: '',
                      turbine_id: '',
                      priority: 'medium',
                      due_date: '',
                      description: '',
                    })
                    setShowNewTaskForm(true)
                  }}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors flex items-center gap-2"
                >
                  <span className="material-symbols-outlined">add</span>
                  New Task
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-black text-white mb-1">{stats.total}</div>
            <div className="text-xs text-gray-400">Total Tasks</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-black text-yellow-400 mb-1">{stats.pending}</div>
            <div className="text-xs text-gray-400">Pending</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-black text-blue-400 mb-1">{stats.in_progress}</div>
            <div className="text-xs text-gray-400">In Progress</div>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <div className="text-2xl font-black text-primary mb-1">{stats.completed}</div>
            <div className="text-xs text-gray-400">Completed</div>
          </div>
        </div>
        
        {/* Filters */}
        {activeTab === 'tasks' && (
          <div className="glass-panel rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-medium">Status:</span>
                {['all', 'pending', 'in_progress', 'completed'].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                      filterStatus === status
                        ? 'bg-primary text-background-dark'
                        : 'bg-white/5 text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    {status.replace('_', ' ')}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400 font-medium">Turbine:</span>
                <select
                  value={filterTurbine}
                  onChange={(e) => setFilterTurbine(e.target.value)}
                  className="px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="all">All Turbines</option>
                  {uniqueTurbines.map((turbine) => (
                    <option key={turbine} value={turbine}>{turbine}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
        
        {/* New/Edit Task Form */}
        {showNewTaskForm && (
          <div className="glass-panel rounded-xl p-6 mb-6 border border-primary/30">
            <h2 className="text-lg font-bold text-white mb-4">{editingTask ? 'Edit Task' : 'Create New Task'}</h2>
            <form onSubmit={editingTask ? handleUpdateTask : handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Task Title</label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="e.g., Replace gearbox oil filter"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Turbine ID</label>
                  <input
                    type="text"
                    value={newTask.turbine_id}
                    onChange={(e) => setNewTask({ ...newTask, turbine_id: e.target.value })}
                    className="w-full px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., T001"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newTask.due_date}
                    onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                    className="w-full px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-4 py-2 bg-input-bg border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Additional details..."
                  rows={3}
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  type="submit"
                  className="px-6 py-2 bg-primary hover:bg-primary-dark text-background-dark font-bold rounded-lg transition-colors"
                >
                  {editingTask ? 'Update Task' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTaskForm(false)
                    setEditingTask(null)
                    setNewTask({
                      title: '',
                      turbine_id: '',
                      priority: 'medium',
                      due_date: '',
                      description: '',
                    })
                  }}
                  className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        {/* Task List or History */}
        {activeTab === 'tasks' ? (
          loading ? (
            <div className="flex justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <div key={task.id} className="glass-panel rounded-xl p-4 hover:bg-white/10 transition-colors">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => handleToggleComplete(task.id)}
                    className={`flex-shrink-0 size-6 rounded border-2 flex items-center justify-center transition-colors ${
                      task.status === 'completed'
                        ? 'bg-primary border-primary'
                        : 'border-gray-600 hover:border-primary'
                    }`}
                  >
                    {task.status === 'completed' && (
                      <span className="material-symbols-outlined text-background-dark text-sm">check</span>
                    )}
                  </button>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3
                          className={`text-white font-medium ${
                            task.status === 'completed' ? 'line-through opacity-60' : ''
                          }`}
                        >
                          {task.title}
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditTask(task)}
                          className="text-blue-400 hover:text-blue-300 transition-colors p-1"
                          title="Edit task"
                        >
                          <span className="material-symbols-outlined text-lg">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="text-red-400 hover:text-red-300 transition-colors p-1"
                          title="Delete task"
                        >
                          <span className="material-symbols-outlined text-lg">delete</span>
                        </button>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium uppercase ${getPriorityColor(
                            task.priority
                          )}`}
                        >
                          {task.priority}
                        </span>
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium capitalize ${getStatusColor(
                            task.status
                          )}`}
                        >
                          {task.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">wind_power</span>
                        <span>{task.turbine_id}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                        <span>Due: {task.due_date}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
            
            {filteredTasks.length === 0 && (
              <div className="glass-panel rounded-xl p-12 text-center">
                <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">task_alt</span>
                <p className="text-gray-400">No tasks found</p>
              </div>
            )}
          </div>
          )
        ) : (
          <div>
            {loadingHistory ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div className="space-y-3">
                {history.length > 0 ? (
                  history.map((item, idx) => (
                    <div key={idx} className="glass-panel rounded-xl p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="text-white font-medium mb-2">{item.task_title || item.title}</h3>
                          <p className="text-sm text-gray-400 mb-3">{item.description}</p>
                          <div className="flex items-center gap-4 text-xs text-gray-400">
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">wind_power</span>
                              <span>{item.turbine_id}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-sm">calendar_today</span>
                              <span>{item.completed_date || item.due_date}</span>
                            </div>
                            {item.assigned_to && (
                              <div className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-sm">person</span>
                                <span>{item.assigned_to}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 rounded font-medium uppercase bg-primary/10 text-primary">
                          Completed
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="glass-panel rounded-xl p-12 text-center">
                    <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">history</span>
                    <p className="text-gray-400">No maintenance history found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
