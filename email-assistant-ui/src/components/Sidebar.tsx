import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../store/authStore"
import { logout } from "../api/authApi"
import {
  Inbox,
  Star,
  Send,
  FileText,
  Trash2,
  Settings,
  FolderPlus,
  Folder,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Link as LinkIcon,
  User,
} from "lucide-react"

interface SidebarProps {
  activeItem?: string
  inboxCount?: number
  onSelectItem?: (item: string) => void
}

export default function Sidebar({
  activeItem = "inbox",
  inboxCount = 0,
  onSelectItem,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()

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
      `&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly`
    window.location.href = authUrl
  }

  const menuItems = [
    { id: "inbox", label: "Inbox", icon: Inbox, badge: inboxCount },
    { id: "important", label: "Important", icon: Star },
    { id: "sent", label: "Sent", icon: Send },
    { id: "drafts", label: "Drafts", icon: FileText },
    { id: "deleted", label: "Deleted", icon: Trash2 },
  ]

  const folders = [
    { id: "add-folder", label: "Add Folder", icon: FolderPlus },
    { id: "client", label: "Client", icon: Folder },
  ]

  const getInitials = (email?: string) => {
    if (!email) return "?"
    return email.slice(0, 2).toUpperCase()
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
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400 hover:text-white"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Primary Navigation */}
        <nav className="flex flex-col gap-0.5" style={{ padding: "0 var(--space-sm)" }}>
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem?.(item.id)}
                className="flex items-center justify-between rounded-lg transition-all duration-200 group"
                style={{
                  padding: collapsed ? "10px" : "10px 12px",
                  justifyContent: collapsed ? "center" : "space-between",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "#FFFFFF" : "var(--text-sidebar)",
                  borderRadius: 8,
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
          })}
        </nav>

        {/* Divider */}
        <div
          className="mx-auto"
          style={{
            width: collapsed ? "60%" : "calc(100% - 24px)",
            height: 1,
            background: "rgba(255,255,255,0.08)",
          }}
        />

        {/* Folders */}
        <div className="flex flex-col gap-1" style={{ padding: "0 var(--space-sm)" }}>
          {!collapsed && (
            <span
              className="text-[11px] font-semibold uppercase tracking-widest px-3 mb-1"
              style={{ color: "rgba(255,255,255,0.3)" }}
            >
              Folders
            </span>
          )}
          {folders.map((folder) => {
            const Icon = folder.icon
            const isActive = activeItem === folder.id
            return (
              <button
                key={folder.id}
                onClick={() => onSelectItem?.(folder.id)}
                className="flex items-center gap-3 rounded-lg transition-all duration-200"
                style={{
                  padding: collapsed ? "10px" : "10px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  background: isActive ? "rgba(255,255,255,0.1)" : "transparent",
                  color: isActive ? "#FFFFFF" : "var(--text-sidebar)",
                  borderRadius: 8,
                }}
                title={collapsed ? folder.label : undefined}
              >
                <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && (
                  <span className="text-sm" style={{ fontWeight: isActive ? 600 : 500 }}>
                    {folder.label}
                  </span>
                )}
              </button>
            )
          })}
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

        {/* Connect Email */}
        <button
          onClick={handleConnectEmail}
          className="flex items-center gap-2.5 rounded-lg transition-all duration-200 hover:bg-white/10"
          style={{
            padding: collapsed ? "10px" : "8px 12px",
            justifyContent: collapsed ? "center" : "flex-start",
          }}
          title="Kết nối Email"
        >
          <LinkIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
          {!collapsed && (
            <span className="text-xs font-medium text-blue-400">Kết nối Email</span>
          )}
        </button>

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
                  {user.firstName} {user.lastName}
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
