import * as React from "react"
import { 
  Inbox, 
  Star, 
  Send, 
  FileText, 
  Trash2, 
  Settings, 
  FolderPlus, 
  Folder 
} from "lucide-react"

interface SidebarProps {
  activeItem?: string
  inboxCount?: number
  onSelectItem?: (item: string) => void
}

export default function Sidebar({ 
  activeItem = "inbox", 
  inboxCount = 4,
  onSelectItem 
}: SidebarProps) {
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

  return (
    <aside className="w-64 min-h-[calc(100vh-60px)]  border-r border-gray-100/60 p-5 flex flex-col justify-between select-none">
      <div className="space-y-6">
        {/* Header */}
        <div className="px-3">
          <h2 className="text-xl font-bold text-gray-800 tracking-tight font-sans">
            Email
          </h2>
        </div>

        {/* Primary Menu */}
        <nav className="space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = activeItem === item.id
            return (
              <button
                key={item.id}
                onClick={() => onSelectItem?.(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative ${
                  isActive
                    ? "bg-white text-[#2a2656] shadow-[0_4px_12px_rgba(0,0,0,0.03)] border border-gray-100/50"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${
                    isActive ? "text-[#5b52c0]" : "text-gray-400 group-hover:text-gray-600"
                  }`} />
                  <span className={isActive ? "font-semibold text-gray-800" : ""}>
                    {item.label}
                  </span>
                </div>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md min-w-[20px] text-center ${
                    isActive 
                      ? "bg-blue-600 text-white shadow-sm" 
                      : "bg-gray-100 text-gray-500"
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* Folders Section */}
        <div className="space-y-2 pt-2">
          <div className="flex items-center justify-between px-3.5 text-xs font-semibold text-gray-400 tracking-wider uppercase">
            <span>Folders</span>
            <button className="text-gray-400 hover:text-gray-600 transition-colors">
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            {folders.map((folder) => {
              const Icon = folder.icon
              const isActive = activeItem === folder.id
              return (
                <button
                  key={folder.id}
                  onClick={() => onSelectItem?.(folder.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white text-[#2a2656] shadow-sm border border-gray-100/50"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-100/40"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${
                    isActive ? "text-[#5b52c0]" : "text-gray-400"
                  }`} />
                  <span>{folder.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}
