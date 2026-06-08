import { Paperclip, Star, Image, FileText, File, FileCode, Video, Music } from "lucide-react"
import LabelBadge from "./LabelBadge"
import type { Attachment } from "../api/emailApi"

export interface Email {
  id: string | number
  fromAddress: string
  subject: string
  body: string
  label: string
  summary?: string
  receivedAt?: string
  isUnread?: boolean
  snippet?: string
  hasAttachments?: boolean
  fromName?: string;
  threadId?: string;
  isRead?: boolean;
  threadCount?: number; 
  status?: string;
  category?: string;
  attachments?: Attachment[];
}

interface EmailSectionProps {
  email: Email
  isSelected: boolean
  layoutMode: "horizontal" | "compact"
  onClick: () => void
  isChecked?: boolean
  onCheckToggle?: (id: string | number, e: React.MouseEvent) => void
  onStarToggle?: (id: string | number, e: React.MouseEvent) => void
}

// Generate a consistent color from the email address
const getAvatarColor = (address: string) => {
  const colors = [
    "linear-gradient(135deg, #3B82F6, #2563EB)",
    "linear-gradient(135deg, #8B5CF6, #7C3AED)",
    "linear-gradient(135deg, #10B981, #059669)",
    "linear-gradient(135deg, #F59E0B, #D97706)",
    "linear-gradient(135deg, #EF4444, #DC2626)",
    "linear-gradient(135deg, #EC4899, #DB2777)",
    "linear-gradient(135deg, #06B6D4, #0891B2)",
    "linear-gradient(135deg, #6366F1, #4F46E5)",
  ]
  let hash = 0
  for (let i = 0; i < address.length; i++) {
    hash = address.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getInitials = (address: string) => {
  if (!address) return "?"
  const name = address.split("@")[0]
  return name.slice(0, 2).toUpperCase()
}

const formatTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()

  if (isToday) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) {
    return "Hôm qua"
  }

  return date.toLocaleDateString("vi-VN", {
    day: "numeric",
    month: "short",
  })
}

const getAttachmentIcon = (contentType: string) => {
  const ct = (contentType || "").toLowerCase()
  if (ct.startsWith("image/")) {
    return <Image className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
  }
  if (ct.startsWith("video/")) {
    return <Video className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
  }
  if (ct.startsWith("audio/")) {
    return <Music className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />
  }
  if (ct.includes("pdf")) {
    return <FileText className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
  }
  if (ct.includes("json") || ct.includes("javascript") || ct.includes("html") || ct.includes("xml")) {
    return <FileCode className="w-3.5 h-3.5 text-yellow-600 flex-shrink-0" />
  }
  if (ct.includes("word") || ct.includes("officedocument.wordprocessingml")) {
    return <FileText className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
  }
  return <File className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
}

const EmailSection = ({ 
  email, 
  isSelected, 
  layoutMode, 
  onClick,
  isChecked = false,
  onCheckToggle,
  onStarToggle
}: EmailSectionProps) => {
  const isUnread = email.isRead !== true ? true : false;

  // ─── Horizontal Layout (Full-width Gmail style) ───
  if (layoutMode === "horizontal") {
    return (
      <div
        onClick={onClick}
        className="flex items-center cursor-pointer select-none transition-colors duration-100 group"
        style={{
          padding: "8px 16px 8px 8px",
          background: isSelected ? "#C2DBFF" : isChecked ? "#E0F2FE" : isUnread ? "var(--bg-panel)" : "var(--bg-main)",
          borderBottom: "1px solid #F0F0F0",
          minHeight: 44,
        }}
        onMouseEnter={(e) => {
          if (!isSelected && !isChecked)
            (e.currentTarget as HTMLDivElement).style.background = "#F5F5F5"
        }}
        onMouseLeave={(e) => {
          if (!isSelected && !isChecked)
            (e.currentTarget as HTMLDivElement).style.background = isUnread ? "var(--bg-panel)" : "var(--bg-main)"
        }}
      >
        {/* Checkbox area */}
        <div className="flex items-center gap-1 flex-shrink-0" style={{ width: 56 }}>
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => {
              e.stopPropagation();
              if (onCheckToggle) {
                onCheckToggle(email.id, e as any);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="w-[18px] h-[18px] rounded cursor-pointer accent-[var(--accent-primary)]"
            style={{ margin: "0 4px" }}
          />
          {/* Star */}
          <button
            onClick={(e) => { 
              e.stopPropagation();
              if (onStarToggle) {
                onStarToggle(email.id, e);
              }
            }}
            className="p-0.5 transition-colors flex-shrink-0"
            style={{ color: email.label === 'IMPORTANT' ? '#F59E0B' : '#D1D5DB' }}
          >
            <Star
              className="w-[18px] h-[18px]"
              style={{
                fill: email.label === 'IMPORTANT' ? '#F59E0B' : 'none',
              }}
            />
          </button>
        </div>

        {/* Sender */}
        <div
          className="truncate flex-shrink-0 flex items-center gap-1.5"
          style={{
            width: 180,
            fontSize: 14,
            color: "var(--text-primary)",
            fontWeight: isUnread ? 700 : 400,
            paddingRight: 12,
          }}
        >
          <span className="truncate">{email.fromName || email.fromAddress.split("@")[0]}</span>
          {email.threadCount !== undefined && email.threadCount > 1 && (
            <span className="text-[12px] font-semibold text-gray-500 flex-shrink-0">
              {email.threadCount}
            </span>
          )}
        </div>

        {/* Subject + Preview & Attachments */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-1" style={{ paddingRight: 12 }}>
          <div className="flex items-baseline gap-1 truncate" style={{ fontSize: 14 }}>
            <span
              className="truncate flex-shrink-0"
              style={{
                color: "var(--text-primary)",
                fontWeight: isUnread ? 700 : 400,
                maxWidth: "40%",
              }}
            >
              {email.subject}
            </span>
            <span style={{ color: "var(--text-secondary)", fontWeight: 400, flexShrink: 0 }}> - </span>
            <span
              className="truncate"
              style={{
                color: "var(--text-secondary)",
                fontWeight: 400,
              }}
            >
              {email.summary || email.snippet || "Thư không có nội dung."}
            </span>
          </div>

          {email.attachments && email.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1" onClick={(e) => e.stopPropagation()}>
              {email.attachments.map((att, idx) => (
                <a
                  key={idx}
                  href={att.r2Url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-700 font-medium no-underline decoration-transparent"
                  style={{ maxWidth: 220 }}
                >
                  {getAttachmentIcon(att.contentType)}
                  <span className="truncate">{att.filename}</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Label */}
        <div className="flex-shrink-0 mx-3">
          <LabelBadge label={email.label} />
        </div>

        {/* Date */}
        <div
          className="flex-shrink-0 text-right"
          style={{
            width: 70,
            fontSize: 12,
            color: isUnread ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: isUnread ? 600 : 400,
          }}
        >
          {formatTime(email.receivedAt)}
        </div>
      </div>
    )
  }

  // ─── Compact Layout (Split-pane card style) ───
  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 cursor-pointer transition-all duration-150 select-none relative group"
      style={{
        padding: "14px 16px",
        background: isSelected ? "#F3F4F6" : "var(--bg-panel)",
        borderLeft: isSelected
          ? "3px solid var(--accent-primary)"
          : "3px solid transparent",
        borderBottom: "1px solid #F3F4F6",
      }}
      onMouseEnter={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = "#FAFBFC"
      }}
      onMouseLeave={(e) => {
        if (!isSelected)
          (e.currentTarget as HTMLDivElement).style.background = "var(--bg-panel)"
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: getAvatarColor(email.fromAddress) }}
        >
          {getInitials(email.fromAddress)}
        </div>
        {/* Unread dot */}
        {isUnread && (
          <div
            className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
            style={{
              background: "var(--unread-dot)",
              borderColor: isSelected ? "#F3F4F6" : "var(--bg-panel)",
            }}
          />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Row 1: Sender + Time */}
        <div className="flex items-baseline justify-between gap-2 mb-0.5">
          <span
            className="text-sm truncate flex items-center gap-1.5"
            style={{
              color: "var(--text-primary)",
              fontWeight: isUnread ? 700 : 500,
            }}
          >
            <span className="truncate">{email.fromName || email.fromAddress.split("@")[0]}</span>
            {email.threadCount !== undefined && email.threadCount > 1 && (
              <span className="text-[11px] font-semibold text-gray-500">
                ({email.threadCount})
              </span>
            )}
          </span>
          <span
            className="text-[12px] flex-shrink-0"
            style={{
              color: "var(--text-secondary)",
              fontWeight: 400,
            }}
          >
            {formatTime(email.receivedAt)}
          </span>
          {email.hasAttachments && (
            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
          )}
        </div>

        {/* Row 2: Subject */}
        <p
          className="text-sm truncate mb-0.5"
          style={{
            color: isUnread ? "var(--text-primary)" : "var(--text-secondary)",
            fontWeight: isUnread ? 600 : 500,
          }}
        >
          {email.subject}
        </p>

        {/* Row 3: Preview + Badge */}
        <div className="flex items-center justify-between gap-2">
          <p
            className="text-[13px] truncate"
            style={{
              color: "var(--text-secondary)",
              fontWeight: 400,
              lineHeight: "1.4",
            }}
          >
            {email.summary || email.snippet || "Thư không có nội dung."}
          </p>
          <div className="flex-shrink-0">
            <LabelBadge label={email.label} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailSection