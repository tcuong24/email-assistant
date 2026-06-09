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
  Bookmark,
  Archive,
  X,
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
  const [showConnectModal, setShowConnectModal] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
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
    try { await logout() } catch { }
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
    { id: "starred", label: "Đã gắn dấu sao", icon: Star },
    { id: "important", label: "Quan trọng", icon: Bookmark },
  ]

  const moreEmailItems = [
    { id: "sent", label: "Đã gửi", icon: Send },
    { id: "drafts", label: "Thư nháp", icon: FileText },
    { id: "archived", label: "Lưu trữ", icon: Archive },
    { id: "spam", label: "Thư rác", icon: AlertCircle },
    { id: "deleted", label: "Thùng rác", icon: Trash2 },
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
      className="flex flex-col justify-between select-none flex-shrink-0 overflow-hidden !h-screen"
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
      <div className="flex flex-col gap-5 overflow-y-auto flex-1" style={{
        scrollbarWidth: "none",
        msOverflowStyle: "none",
      }}>
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
              EmailFlow
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
          <div className="relative w-full">
            {/* Custom Tooltip */}
            {showTooltip && (
              <div
                className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-gray-900 text-white text-[11px] rounded-lg shadow-lg whitespace-nowrap z-50 pointer-events-none transition-opacity duration-150"
                style={{ border: "1px solid rgba(255,255,255,0.15)" }}
              >
                Bạn chưa liên kết Gmail. Click để kết nối!
                {/* Arrow */}
                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900" />
              </div>
            )}
            <button
              onClick={() => setShowConnectModal(true)}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              className="flex items-center gap-2.5 rounded-lg transition-all duration-200 hover:bg-white/10 w-full"
              style={{
                padding: collapsed ? "10px" : "8px 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                border: "none",
                background: "transparent",
                cursor: "pointer",
              }}
            >
              <LinkIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              {!collapsed && (
                <span className="text-xs font-medium text-blue-400">Kết nối Email</span>
              )}
            </button>
          </div>
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

      {/* Connection Guide Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          {/* Modal Container */}
          <div
            className="bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl flex flex-col animate-scale-in text-gray-800"
            style={{ border: "1px solid #E5E7EB" }}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <LinkIcon className="w-4.5 h-4.5 text-blue-600" />
                Hướng dẫn kết nối Gmail
              </h3>
              <button
                onClick={() => setShowConnectModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-200 cursor-pointer border-none bg-transparent"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto max-h-[70vh] flex flex-col gap-4">
              <p className="text-xs text-gray-600 leading-relaxed">
                Hệ thống sử dụng cổng <strong>Nylas Sandbox</strong> để đồng bộ hóa Gmail an toàn. Vui lòng hoàn thành 2 bước sau:
              </p>

              {/* Step 1 */}
              <div className="flex gap-3 p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  1
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-xs mb-0.5">Bước 1: Cuộn xuống để tiếp tục</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    Tại màn hình <strong>Nylas Hosted Authentication</strong> (trang có cảnh báo bảo mật sandbox),
                    hãy <strong>cuộn xuống dưới cùng của trang</strong> để tiếp tục xác thực.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-3 p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                  2
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 text-xs mb-0.5">Bước 2: Chọn tất cả quyền</h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed mb-1.5">
                    Tại trang đăng nhập Google, phần <strong>"Chọn những dịch vụ Nylas có thể truy cập"</strong>:
                  </p>
                  <div className="p-2 bg-white rounded-lg border border-blue-100 text-[10px] text-blue-900 leading-normal font-semibold">
                    <span className="inline-block px-1 rounded bg-blue-100 text-blue-700 text-[9px] mr-1.5">QUAN TRỌNG</span>
                    Tích chọn <strong>"Chọn tất cả"</strong> (hoặc chọn toàn bộ các dịch vụ hiển thị) để kích hoạt các tính năng của Gmail.
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex justify-end gap-2.5">
              <button
                onClick={() => setShowConnectModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-200 transition-colors border-none bg-transparent cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => {
                  setShowConnectModal(false);
                  handleConnectEmail();
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm active:scale-95 border-none cursor-pointer"
              >
                Tiếp tục kết nối
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
