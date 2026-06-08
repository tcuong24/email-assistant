import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { getTasks, createTask, updateTaskStatus, deleteTask, Task } from '../api/emailApi'
import Sidebar from '../components/Sidebar'
import {
  Calendar,
  CheckSquare,
  Plus,
  Filter,
  Mail,
  AlertCircle,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  Play,
  Check,
  RotateCcw
} from 'lucide-react'

export default function TasksPage() {
  const [searchParams] = useSearchParams()
  const view = searchParams.get('view') || 'kanban'
  const activeItem = view === 'kanban' ? 'kanban' : (view === 'list' ? 'all-tasks' : 'today-tasks')
  
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDesc, setNewTaskDesc] = useState('')
  const [newTaskPriority, setNewTaskPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('LOW')
  const [newTaskDueDate, setNewTaskDueDate] = useState('Hôm nay')
  const [newTaskCategory, setNewTaskCategory] = useState('Dev')

  // 1. Fetch danh sách task từ backend
  const { data: tasks = [], isLoading, refetch } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => getTasks().then(r => r.data),
    refetchInterval: 10000, // Tự động làm mới sau mỗi 10 giây
  })

  // 2. Định nghĩa các mutation thay đổi dữ liệu
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number, status: 'TODO' | 'IN_PROGRESS' | 'DONE' }) =>
      updateTaskStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  const createTaskMutation = useMutation({
    mutationFn: (data: Partial<Task>) => createTask(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      setIsCreateOpen(false)
      // Reset form
      setNewTaskTitle('')
      setNewTaskDesc('')
      setNewTaskPriority('LOW')
      setNewTaskDueDate('Hôm nay')
      setNewTaskCategory('Dev')
    }
  })

  const deleteTaskMutation = useMutation({
    mutationFn: (id: string | number) => deleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    }
  })

  // 3. Xử lý tính toán thống kê (Summary Stats)
  const totalTasks = tasks.length
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length
  const completedCount = tasks.filter(t => t.status === 'DONE').length
  
  // Tính toán task quá hạn: Hạn chót chứa "Hôm qua" hoặc ngày cũ hơn ngày hiện tại
  const overdueCount = tasks.filter(t => {
    if (t.status === 'DONE') return false
    const due = t.dueDate?.toLowerCase() || ''
    if (due.includes('hôm qua')) return true
    
    // Parse định dạng DD/MM/YYYY nếu có
    const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/
    const match = due.match(datePattern)
    if (match) {
      const day = parseInt(match[1])
      const month = parseInt(match[2]) - 1
      const year = parseInt(match[3])
      const dueDateObj = new Date(year, month, day)
      const today = new Date()
      today.setHours(0,0,0,0)
      return dueDateObj < today
    }
    return false
  }).length

  // 4. Kéo thả HTML5
  const handleDragStart = (e: React.DragEvent, id: string | number) => {
    e.dataTransfer.setData('text/plain', id.toString())
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent, targetStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    e.preventDefault()
    const id = e.dataTransfer.getData('text/plain')
    if (id) {
      updateStatusMutation.mutate({ id, status: targetStatus })
    }
  }

  // 5. Submit Tạo Task mới thủ công
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTaskTitle.trim()) return
    createTaskMutation.mutate({
      title: newTaskTitle,
      description: newTaskDesc,
      priority: newTaskPriority,
      dueDate: newTaskDueDate,
      category: newTaskCategory,
      status: 'TODO'
    })
  }

  // Lọc danh sách theo view hiện tại
  const filteredTasks = tasks.filter(t => {
    if (view === 'today') {
      const due = t.dueDate?.toLowerCase() || ''
      return due.includes('hôm nay')
    }
    return true
  })

  // Định nghĩa màu sắc cho thẻ Category
  const getCategoryColor = (cat: string) => {
    const lower = cat.toLowerCase()
    if (lower.includes('bug') || lower.includes('sự cố')) return { bg: '#FEF2F2', text: '#EF4444' }
    if (lower.includes('dev') || lower.includes('code')) return { bg: '#EFF6FF', text: '#3B82F6' }
    if (lower.includes('design') || lower.includes('ux')) return { bg: '#FAF5FF', text: '#A855F7' }
    if (lower.includes('sales') || lower.includes('kinh doanh')) return { bg: '#FFF7ED', text: '#F97316' }
    if (lower.includes('hr') || lower.includes('tuyển')) return { bg: '#ECFDF5', text: '#10B981' }
    return { bg: '#F3F4F6', text: '#4B5563' }
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg-main)" }}>
      {/* ── Sidebar Cột trái ── */}
      <Sidebar activeItem={activeItem} />

      {/* ── Khu vực nội dung chính ── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        {/* Header Panel */}
        <div 
          className="flex items-center justify-between flex-shrink-0"
          style={{ padding: "20px 32px 12px", borderBottom: "1px solid var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <h1
              className="text-2xl font-bold tracking-tight"
              style={{ color: "var(--text-primary)", margin: 0 }}
            >
              {view === 'kanban' ? 'Kanban — Công việc' : view === 'list' ? 'Tất cả Task' : 'Đến hạn hôm nay'}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              className="flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-semibold bg-white hover:bg-gray-50 transition-colors"
              style={{ borderColor: "var(--border)" }}
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Lọc</span>
            </button>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all cursor-pointer hover:scale-105 active:scale-95"
              style={{ background: "var(--btn-dark)", boxShadow: "var(--shadow-compose)" }}
            >
              <Plus className="w-4 h-4" />
              <span>Tạo task</span>
            </button>
          </div>
        </div>

        {/* Khu vực scroll chính */}
        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "24px 32px" }}>
          <div className="max-w-7xl mx-auto flex flex-col gap-6 h-full">
            
            {/* Summary cards row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 flex-shrink-0">
              {/* Card 1: Tổng task */}
              <div className="bg-white rounded-2xl border p-5 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng task</span>
                  <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalTasks}</div>
                <span className="text-[11px] text-gray-400 mt-2 font-medium">+3 tuần này</span>
              </div>

              {/* Card 2: Đang làm */}
              <div className="bg-white rounded-2xl border p-5 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Đang làm</span>
                  <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-amber-500">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{inProgressCount}</div>
                <span className="text-[11px] text-gray-400 mt-2 font-medium">2 sắp đến hạn</span>
              </div>

              {/* Card 3: Hoàn thành */}
              <div className="bg-white rounded-2xl border p-5 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Hoàn thành</span>
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{completedCount}</div>
                <span className="text-[11px] text-gray-400 mt-2 font-medium">8 tuần này</span>
              </div>

              {/* Card 4: Quá hạn */}
              <div className="bg-white rounded-2xl border p-5 flex flex-col justify-between hover:shadow-md transition-shadow" style={{ borderColor: "var(--border)" }}>
                <div className="flex justify-between items-center mb-3">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Quá hạn</span>
                  <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-red-500">
                    <AlertCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="text-3xl font-bold text-red-600">{overdueCount}</div>
                <span className="text-[11px] text-red-400 mt-2 font-medium">cần xử lý ngay</span>
              </div>
            </div>

            {isLoading ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-t-transparent border-blue-500 animate-spin" />
                  <span className="text-xs text-gray-500">Đang tải danh sách công việc...</span>
                </div>
              </div>
            ) : view === 'kanban' ? (
              
              /* ── Kanban Board View ── */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Cột 1: Cần làm (TODO) */}
                <div 
                  className="bg-[#F3F4F6]/60 rounded-2xl border p-4 flex flex-col h-[calc(100vh-280px)]"
                  style={{ borderColor: "var(--border)" }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'TODO')}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                      <h3 className="font-bold text-sm text-gray-700">Cần làm</h3>
                      <span className="text-xs bg-gray-200 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.status === 'TODO').length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
                    <AnimatePresence>
                      {filteredTasks
                        .filter(t => t.status === 'TODO')
                        .map(task => renderTaskCard(task))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Cột 2: Đang làm (IN_PROGRESS) */}
                <div 
                  className="bg-[#F3F4F6]/60 rounded-2xl border p-4 flex flex-col h-[calc(100vh-280px)]"
                  style={{ borderColor: "var(--border)" }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'IN_PROGRESS')}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                      <h3 className="font-bold text-sm text-gray-700">Đang làm</h3>
                      <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-2 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.status === 'IN_PROGRESS').length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
                    <AnimatePresence>
                      {filteredTasks
                        .filter(t => t.status === 'IN_PROGRESS')
                        .map(task => renderTaskCard(task))}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Cột 3: Hoàn thành (DONE) */}
                <div 
                  className="bg-[#F3F4F6]/60 rounded-2xl border p-4 flex flex-col h-[calc(100vh-280px)]"
                  style={{ borderColor: "var(--border)" }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'DONE')}
                >
                  <div className="flex items-center justify-between mb-4 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h3 className="font-bold text-sm text-gray-700">Hoàn thành</h3>
                      <span className="text-xs bg-emerald-50 text-emerald-600 font-semibold px-2 py-0.5 rounded-full">
                        {filteredTasks.filter(t => t.status === 'DONE').length}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto flex flex-col gap-3 scrollbar-thin">
                    <AnimatePresence>
                      {filteredTasks
                        .filter(t => t.status === 'DONE')
                        .map(task => renderTaskCard(task))}
                    </AnimatePresence>
                  </div>
                </div>

              </div>
            ) : (
              
              /* ── List / Today View ── */
              <div className="bg-white rounded-2xl border p-6 flex flex-col flex-1 overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1 overflow-y-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b text-xs text-gray-400 font-semibold uppercase tracking-wider">
                        <th className="py-3 px-4 w-12"></th>
                        <th className="py-3 px-4">Tên công việc</th>
                        <th className="py-3 px-4">Danh mục</th>
                        <th className="py-3 px-4">Độ ưu tiên</th>
                        <th className="py-3 px-4">Hạn chót</th>
                        <th className="py-3 px-4 w-24 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTasks.map(task => {
                        const colors = getCategoryColor(task.category || 'Dev')
                        const isDone = task.status === 'DONE'
                        
                        return (
                          <motion.tr 
                            key={task.id}
                            layout
                            className="border-b hover:bg-gray-50/50 transition-colors"
                          >
                            <td className="py-4 px-4">
                              <button
                                onClick={() => {
                                  const nextStatus = task.status === 'DONE' ? 'TODO' : 'DONE'
                                  updateStatusMutation.mutate({ id: task.id, status: nextStatus })
                                }}
                                className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
                                  isDone ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 hover:border-blue-500'
                                }`}
                              >
                                {isDone && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </button>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex flex-col gap-1">
                                <span className={`text-sm font-semibold text-gray-800 ${isDone ? 'line-through text-gray-400' : ''}`}>
                                  {task.title}
                                </span>
                                {task.emailId && (
                                  <div className="flex items-center gap-1.5 text-[10px] text-indigo-500 font-medium">
                                    <Mail className="w-3 h-3" />
                                    <span>Tự động trích xuất từ email</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span 
                                className="text-[10px] font-bold px-2 py-0.5 rounded"
                                style={{ background: colors.bg, color: colors.text }}
                              >
                                {task.category || 'Dev'}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              {renderPriorityBadge(task.priority)}
                            </td>
                            <td className="py-4 px-4 text-xs font-semibold text-gray-600">
                              {task.dueDate || 'Không rõ'}
                            </td>
                            <td className="py-4 px-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {task.status !== 'DONE' && (
                                  <button
                                    onClick={() => updateStatusMutation.mutate({ id: task.id, status: 'IN_PROGRESS' })}
                                    className="p-1.5 hover:bg-indigo-50 text-indigo-500 rounded-lg transition-colors cursor-pointer"
                                    title="Bắt đầu làm"
                                  >
                                    <Play className="w-4 h-4" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteTaskMutation.mutate(task.id)}
                                  className="p-1.5 hover:bg-red-50 text-red-500 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa công việc"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        )
                      })}
                      {filteredTasks.length === 0 && (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-sm text-gray-400 font-medium">
                            Không có công việc nào trong danh mục này.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* ── Modal Tạo Task Thủ Công ── */}
      {isCreateOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h2 className="text-base font-bold text-gray-800">Tạo công việc mới</h2>
              <button 
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="p-6 flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Tên công việc</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Fix bug login trên mobile"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Mô tả chi tiết (Tùy chọn)</label>
                <textarea 
                  placeholder="Mô tả công việc cần làm..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  style={{ borderColor: "var(--border)" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Hạn chót</label>
                  <input 
                    type="text" 
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{ borderColor: "var(--border)" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Danh mục</label>
                  <select
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value)}
                    className="w-full px-4 py-2 border rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <option value="Dev">Dev / Kỹ thuật</option>
                    <option value="Design">Design / Thiết kế</option>
                    <option value="Bug">Bug / Sửa lỗi</option>
                    <option value="Sales">Sales / Hợp đồng</option>
                    <option value="HR">HR / Tuyển dụng</option>
                    <option value="Hỗ trợ">Hỗ trợ khách hàng</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Độ ưu tiên</label>
                <div className="flex gap-2">
                  {['LOW', 'MEDIUM', 'HIGH'].map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewTaskPriority(p as any)}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        newTaskPriority === p
                          ? p === 'HIGH' ? 'bg-red-50 border-red-500 text-red-600' : p === 'MEDIUM' ? 'bg-amber-50 border-amber-500 text-amber-600' : 'bg-green-50 border-green-500 text-green-600'
                          : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {p === 'HIGH' ? 'Khẩn' : p === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end mt-4 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 border rounded-xl text-sm font-semibold hover:bg-gray-50 cursor-pointer"
                  style={{ borderColor: "var(--border)" }}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
                >
                  {createTaskMutation.isPending ? 'Đang tạo...' : 'Tạo task'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

    </div>
  )

  // Hàm render thẻ công việc dạng Card trong Kanban
  function renderTaskCard(task: Task) {
    const isDone = task.status === 'DONE'
    const catColors = getCategoryColor(task.category || 'Dev')
    const overdue = !isDone && (task.dueDate?.toLowerCase().includes('hôm qua') || task.dueDate?.toLowerCase().includes('trễ'))

    return (
      <motion.div
        key={task.id}
        layout
        draggable
        onDragStart={(e) => handleDragStart(e, task.id)}
        className="bg-white rounded-2xl border p-4 shadow-sm hover:shadow-md transition-shadow select-none cursor-grab active:cursor-grabbing flex flex-col justify-between"
        style={{ borderColor: "var(--border)" }}
      >
        <div className="flex flex-col gap-2.5">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`text-sm font-bold text-gray-800 leading-snug break-words ${isDone ? 'line-through text-gray-400' : ''}`}>
              {task.title}
            </h4>
            
            {/* Delete button */}
            <button 
              onClick={() => deleteTaskMutation.mutate(task.id)}
              className="opacity-0 group-hover:opacity-100 hover:bg-red-50 p-1 rounded-lg text-red-500 transition-all cursor-pointer"
              style={{ padding: 4 }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Badges line: Priority & Category */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {renderPriorityBadge(task.priority)}
            
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: catColors.bg, color: catColors.text }}
            >
              {task.category || 'Dev'}
            </span>
          </div>
        </div>

        {/* Card Footer: DueDate, Source, Assignee */}
        <div className="flex items-center justify-between border-t mt-3 pt-3" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            {/* Avatar assignee */}
            <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-[10px] font-bold">
              NA
            </div>
            
            {/* Calendar & Due Date */}
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-[10px] font-semibold ${overdue ? 'text-red-500' : 'text-gray-400'}`}>
                <Calendar className="w-3 h-3" />
                <span>{task.dueDate}</span>
              </div>
            )}
          </div>

          {/* Source badge: "từ email" if emailId present */}
          {task.emailId && (
            <div 
              onClick={() => navigate(`/emails/${task.emailId}`)}
              className="flex items-center gap-1 text-[10px] text-indigo-500 hover:text-indigo-700 font-semibold cursor-pointer select-none"
              title="Xem email gốc"
            >
              <Mail className="w-3 h-3" />
              <span>từ email</span>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  // Hàm render badge Độ ưu tiên
  function renderPriorityBadge(priority: 'HIGH' | 'MEDIUM' | 'LOW') {
    if (priority === 'HIGH') {
      return (
        <span className="flex items-center gap-1 bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-100">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Khẩn
        </span>
      )
    }
    if (priority === 'MEDIUM') {
      return (
        <span className="flex items-center gap-1 bg-amber-50 text-amber-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-100">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          Trung bình
        </span>
      )
    }
    return (
      <span className="flex items-center gap-1 bg-green-50 text-green-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-green-100">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
        Thấp
      </span>
    )
  }
}
