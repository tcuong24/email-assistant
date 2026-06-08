import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../store/authStore"
import { logout } from "../api/authApi"
import { getNylasStatus, syncEmails } from "../api/emailApi"
import {
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  Settings,
  FolderPlus,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LogOut,
  Link as LinkIcon,
  User,
  RefreshCw,
  Plus,
  Columns,
  CheckSquare,
  Calendar,
  BarChart3,
} from "lucide-react"

interface SidebarProps {
  activeItem?: string
  inboxCount?: number
  onSelectItem?: (item: string) => void
  onComposeClick?: () => void
}

export default function Sidebar({
  activeItem = "inbox",
  inboxCount = 0,
  onSelectItem,
  onComposeClick,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [isConnected, setIsConnected] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [showMoreEmail, setShowMoreEmail] = useState(false)
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) {
      getNylasStatus()
        .then(response => {
          setIsConnected(response.data.connected)
        })
        .catch(err => {
          console.error("Lỗi kiểm tra trạng thái Nylas:", err)
        })
    }
  }, [user])

  const handleSyncEmails = async () => {
    if (isSyncing) return
    setIsSyncing(true)
    try {
      await syncEmails()
      // Giả lập 2s xoay icon để hiển thị tiến trình, vì đồng bộ ở backend chạy bất đồng bộ
      setTimeout(() => {
        setIsSyncing(false)
        // Refresh trang để lấy dữ liệu mới
        window.location.reload()
      }, 2000)
    } catch (err) {
      console.error("Lỗi đồng bộ email:", err)
      setIsSyncing(false)
    }
  }

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate("/login")
  }

  const handleConnectEmail = () => {
    const clientId = import.meta.env.VITE_NYLAS_CLIENT_ID || "YOUR_NYLAS_CLIENT_ID"
    const redirectUri = window.location.origin + "/oauth/callback"
    const nylasApiUrl = import.meta.env.VITE_NYLAS_API_URL || "https://api.us.nylas.com"
    const authUrl =
      `${nylasApiUrl}/v3/connect/auth?` +
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&provider=google` +
      `&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send`
    window.location.href = authUrl
  }

  const handleItemClick = (id: string) => {
    if (id === "dashboard") {
      navigate("/dashboard")
    } else if (id === "kanban") {
      navigate("/tasks?view=kanban")
    } else if (id === "all-tasks") {
      navigate("/tasks?view=list")
    } else if (id === "today-tasks") {
      navigate("/tasks?view=today")
    } else {
      // PRIMARY, important, sent, drafts, deleted, client
      const targetId = id === "PRIMARY" ? "inbox" : id
      if (window.location.pathname === "/inbox" && onSelectItem) {
        onSelectItem(targetId)
      } else {
        navigate(`/inbox?category=${id}`)
      }
    }
  }

  const emailItems = [
    { id: "PRIMARY", label: "Hộp thư", icon: Inbox, badge: inboxCount },
    { id: "important", label: "Quan trọng", icon: Star },
  ]

  const moreEmailItems = [
    { id: "sent", label: "Đã gửi", icon: Send },
    { id: "drafts", label: "Thư nháp", icon: FileText },
    { id: "spam", label: "Thư rác", icon: AlertCircle },
    { id: "deleted", label: "Đã xóa", icon: Trash2 },
  ]

  const taskItems = [
    { id: "kanban", label: "Kanban", icon: Columns },
    { id: "all-tasks", label: "Tất cả task", icon: CheckSquare },
    { id: "today-tasks", label: "Đến hạn hôm nay", icon: Calendar },
  ]

  const analyticsItems = [
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  ]

  const getInitials = (email?: string) => {
    if (!email) return "?"
    return email.slice(0, 2).toUpperCase()
  }

  const renderNavButton = (item: { id: string, label: string, icon: any, badge?: number }) => {
    const Icon = item.icon
    // Chuẩn hóa active check
    const normalizedActiveItem = activeItem === "inbox" ? "PRIMARY" : activeItem
    const isActive = normalizedActiveItem === item.id

    return (
      <button
        key={item.id}
        onClick={() => handleItemClick(item.id)}
        className="flex items-center justify-between rounded-lg transition-all duration-200 group w-full"
        style={{
          padding: collapsed ? "10px" : "10px 12px",
          justifyContent: collapsed ? "center" : "space-between",
          background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
          color: isActive ? "#FFFFFF" : "var(--text-sidebar)",
          borderRadius: 8,
          cursor: "pointer",
        }}
        title={collapsed ? item.label : undefined}
      >
        <div className="flex items-center gap-3">
          <Icon
            className="w-[18px] h-[18px] flex-shrink-0"
            style={{
              color: isActive ? "#FFFFFF" : "var(--text-sidebar)",
            }}
          />
          {!collapsed && (
            <span
              className="text-sm transition-colors"
              style={{ fontWeight: isActive ? 600 : 500 }}
            >
              {item.label}
            </span>
          )}
        </div>
        {!collapsed && item.badge !== undefined && item.badge > 0 && (
          <span
            className="text-white text-[11px] font-bold rounded-full"
            style={{
              background: "var(--accent-primary)",
              padding: "2px 7px",
              minWidth: 20,
              textAlign: "center",
            }}
          >
            {item.badge}
          </span>
        )}
      </button>
    )
  }

  return (
    <aside
      className="flex flex-col justify-between select-none flex-shrink-0 overflow-hidden"
      style={{
        width: collapsed ? 60 : 220,
        minWidth: collapsed ? 60 : 220,
        background: "var(--bg-sidebar)",
        color: "var(--text-sidebar)",
        transition: "width 0.25s cubic-bezier(0.4,0,0.2,1), min-width 0.25s cubic-bezier(0.4,0,0.2,1)",
        padding: "var(--space-md) 0",
      }}
    >
      {/* Top Section */}
      <div className="flex flex-col gap-5">
        {/* Logo + Collapse */}
        <div
          className="flex items-center justify-between"
          style={{ padding: "0 var(--space-md)" }}
        >
          {!collapsed && (
            <span
              className="text-white font-bold tracking-tight"
              style={{ fontSize: 20 }}
            >
              dappr
            </span>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white cursor-pointer"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Compose Button */}
        <div style={{ padding: "0 var(--space-sm)" }}>
          <button
            onClick={onComposeClick}
            className="flex items-center gap-3 rounded-2xl shadow-md transition-all duration-200 hover:shadow-lg active:scale-95 cursor-pointer"
            style={{
              width: collapsed ? "40px" : "100%",
              height: "40px",
              padding: collapsed ? "0" : "0 16px",
              justifyContent: "center",
              background: "#FFFFFF",
              color: "#1F2937",
              border: "1px solid #E5E7EB",
              margin: "8px 0",
            }}
            title="Soạn thư"
          >
            <Plus className="w-5 h-5 text-indigo-600 flex-shrink-0" />
            {!collapsed && (
              <span className="text-sm font-semibold text-gray-700">Soạn thư</span>
            )}
          </button>
        </div>

        {/* EMAIL GROUP */}
        <div className="flex flex-col gap-0.5" style={{ padding: "0 var(--space-sm)" }}>
          {!collapsed && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1 block"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Email
            </span>
          )}
          {emailItems.map(renderNavButton)}
          
          {showMoreEmail && moreEmailItems.map(renderNavButton)}
          
          <button
            onClick={() => setShowMoreEmail(!showMoreEmail)}
            className="flex items-center gap-3 rounded-lg transition-all duration-200 w-full text-left"
            style={{
              padding: collapsed ? "10px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              color: "rgba(255,255,255,0.4)",
              background: "transparent",
              borderRadius: 8,
              cursor: "pointer",
              border: "none",
              marginTop: 2,
            }}
            title={collapsed ? (showMoreEmail ? "Thu gọn" : "Xem thêm") : undefined}
            onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
            onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
          >
            {showMoreEmail ? (
              <>
                <ChevronUp className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-semibold">Thu gọn</span>}
              </>
            ) : (
              <>
                <ChevronDown className="w-[18px] h-[18px] text-gray-400 flex-shrink-0" />
                {!collapsed && <span className="text-xs font-semibold">Xem thêm</span>}
              </>
            )}
          </button>
        </div>

        {/* CÔNG VIỆC GROUP */}
        <div className="flex flex-col gap-0.5" style={{ padding: "0 var(--space-sm)" }}>
          {!collapsed && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1 block"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Công việc
            </span>
          )}
          {taskItems.map(renderNavButton)}
        </div>

        {/* PHÂN TÍCH GROUP */}
        <div className="flex flex-col gap-0.5" style={{ padding: "0 var(--space-sm)" }}>
          {!collapsed && (
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-3 mb-1 block"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Phân tích
            </span>
          )}
          {analyticsItems.map(renderNavButton)}
        </div>
      </div>

      {/* Bottom Section — User Info & Actions */}
      <div
        className="flex flex-col gap-2"
        style={{ padding: "0 var(--space-sm)" }}
      >
        {/* Divider */}
        <div
          className="mx-auto mb-1"
          style={{
            width: collapsed ? "60%" : "calc(100% - 8px)",
            height: 1,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        {/* Connect or Sync Email */}
        {isConnected ? (
          <button
            onClick={handleSyncEmails}
            disabled={isSyncing}
            className={`flex items-center gap-2.5 rounded-lg transition-all duration-200 hover:bg-white/10 ${isSyncing ? "opacity-70 cursor-not-allowed" : ""}`}
            style={{
              padding: collapsed ? "10px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: isSyncing ? "not-allowed" : "pointer",
            }}
            title="Cập nhật Email"
          >
            <RefreshCw className={`w-4 h-4 text-emerald-400 flex-shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
            {!collapsed && (
              <span className="text-xs font-medium text-emerald-400">
                {isSyncing ? "Đang đồng bộ..." : "Cập nhật Email"}
              </span>
            )}
          </button>
        ) : (
          <button
            onClick={handleConnectEmail}
            className="flex items-center gap-2.5 rounded-lg transition-all duration-200 hover:bg-white/10"
            style={{
              padding: collapsed ? "10px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              width: "100%",
              border: "none",
              background: "transparent",
              cursor: "pointer",
            }}
            title="Kết nối Email"
          >
            <LinkIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
            {!collapsed && (
              <span className="text-xs font-medium text-blue-400">Kết nối Email</span>
            )}
          </button>
        )}

        {/* User Info */}
        {user && (
          <div
            className="flex items-center gap-2.5 rounded-lg"
            style={{
              padding: collapsed ? "8px" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
            }}
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #8B5CF6)",
              }}
            >
              {getInitials(user.email)}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-white truncate leading-tight">
                  {user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User'}
                </p>
                <p className="text-[11px] text-gray-400 truncate leading-tight">
                  {user.email}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logout & Settings */}
        <div className={`flex ${collapsed ? "flex-col items-center" : "items-center justify-between"} gap-1`}>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-lg transition-all duration-200 hover:bg-red-500/15"
            style={{
              padding: collapsed ? "10px" : "8px 12px",
            }}
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4 text-red-400 flex-shrink-0" />
            {!collapsed && (
              <span className="text-xs font-medium text-red-400">Đăng xuất</span>
            )}
          </button>
          <button
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="Settings"
          >
            <Settings className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </aside>
  )
}
