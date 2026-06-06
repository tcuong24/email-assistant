import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { getEmails, getEmailStats } from '../api/emailApi'
import Sidebar from '../components/Sidebar'
import {
  Mail,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react'

export default function DashboardPage() {
  const navigate = useNavigate()

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['emailStats'],
    queryFn: () => getEmailStats().then(r => r.data),
  })

  const stats = {
    total: statsData?.total || 0,
    unread: statsData?.unread || 0,
    important: statsData?.important || 0,
    spam: statsData?.spam || 0,
  }

  const statCards = [
    {
      label: 'Tổng email',
      value: stats.total,
      icon: Mail,
      color: '#3B82F6',
      bg: '#EFF6FF',
    },
    {
      label: 'Chưa đọc',
      value: stats.unread,
      icon: Clock,
      color: '#F59E0B',
      bg: '#FFFBEB',
    },
    {
      label: 'Quan trọng',
      value: stats.important,
      icon: CheckCircle,
      color: '#10B981',
      bg: '#ECFDF5',
    },
    {
      label: 'Spam',
      value: stats.spam,
      icon: AlertTriangle,
      color: '#EF4444',
      bg: '#FEF2F2',
    },
  ]

  if (isLoading) return (
    <div className="h-screen flex" style={{ background: "var(--bg-main)" }}>
      <Sidebar />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
          />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Đang tải...
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg-main)" }}>
      <Sidebar />

      <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "var(--space-xl)" }}>
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-1">
              <BarChart3 className="w-6 h-6" style={{ color: "var(--accent-primary)" }} />
              <h1
                className="text-2xl font-bold"
                style={{ color: "var(--text-primary)", margin: 0, letterSpacing: "-0.02em" }}
              >
                Dashboard
              </h1>
            </div>
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Tổng quan về hộp thư của bạn
            </p>
          </div>

          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => {
              const Icon = stat.icon
              return (
                <div
                  key={stat.label}
                  className="rounded-xl transition-all duration-200 hover:shadow-md"
                  style={{
                    padding: "20px",
                    background: "var(--bg-panel)",
                    border: "1px solid var(--border-color)",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: stat.bg }}
                    >
                      <Icon className="w-5 h-5" style={{ color: stat.color }} />
                    </div>
                  </div>
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "var(--text-primary)", margin: 0 }}
                  >
                    {stat.value}
                  </p>
                  <p className="text-xs font-medium mt-1" style={{ color: "var(--text-secondary)" }}>
                    {stat.label}
                  </p>
                </div>
              )
            })}
          </div>

          {/* Quick Actions */}
          <div
            className="rounded-xl"
            style={{
              padding: "24px",
              background: "var(--bg-panel)",
              border: "1px solid var(--border-color)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h3
              className="text-sm font-bold mb-4"
              style={{ color: "var(--text-primary)", margin: "0 0 16px 0" }}
            >
              Hành động nhanh
            </h3>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => navigate('/inbox')}
                className="flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl transition-all duration-200 hover:shadow-sm"
                style={{
                  background: "#EFF6FF",
                  color: "#2563EB",
                  border: "1px solid #BFDBFE",
                }}
              >
                <Mail className="w-4 h-4" />
                Đi tới Inbox
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}