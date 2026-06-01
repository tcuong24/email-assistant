import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmail } from '../api/emailApi'
import Sidebar from '../components/Sidebar'
import LabelBadge from '../components/LabelBadge'
import {
  Reply,
  Trash2,
  Star,
  CornerUpRight,
  ArrowLeft,
} from 'lucide-react'

export default function EmailDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: email, isLoading } = useQuery({
    queryKey: ['email', id],
    queryFn: () => getEmail(Number(id)).then(r => r.data),
  })

  const getAvatarInitials = (address: string) => {
    if (!address) return "?"
    return address.split("@")[0].slice(0, 2).toUpperCase()
  }

  const getAvatarColor = (address: string) => {
    const colors = [
      "linear-gradient(135deg, #3B82F6, #2563EB)",
      "linear-gradient(135deg, #8B5CF6, #7C3AED)",
      "linear-gradient(135deg, #10B981, #059669)",
      "linear-gradient(135deg, #F59E0B, #D97706)",
      "linear-gradient(135deg, #EF4444, #DC2626)",
      "linear-gradient(135deg, #EC4899, #DB2777)",
    ]
    let hash = 0
    for (let i = 0; i < (address || "").length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

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

  const replies = email?.suggestedReplies
    ? email.suggestedReplies.split('||')
    : []

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg-main)" }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Detail Content — Full Width */}
      <div className="flex-1 flex flex-col overflow-hidden" style={{ background: "var(--bg-panel)" }}>
        {/* Toolbar */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{
            padding: "10px 24px",
            borderBottom: "1px solid var(--border-color)",
            background: "#FAFBFC",
          }}
        >
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1.5 p-2 rounded-lg transition-colors hover:bg-gray-100 mr-2"
              style={{ color: "var(--text-secondary)" }}
              title="Quay lại"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="text-xs font-semibold">Quay lại</span>
            </button>

            {[
              { icon: Reply, label: "Reply" },
              { icon: Reply, label: "Reply all", rotate: true },
              { icon: CornerUpRight, label: "Forward" },
            ].map((action, i) => (
              <button
                key={i}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-100"
                style={{ color: "var(--text-secondary)" }}
              >
                <action.icon className={`w-3.5 h-3.5 ${action.rotate ? "scale-x-[-1]" : ""}`} />
                <span>{action.label}</span>
              </button>
            ))}

            <div className="mx-1" style={{ width: 1, height: 16, background: "var(--border-color)" }} />

            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50 hover:text-red-600"
              style={{ color: "var(--text-secondary)" }}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-50 hover:text-amber-600"
              style={{ color: "var(--text-secondary)" }}
            >
              <Star className="w-3.5 h-3.5" />
              <span>Important</span>
            </button>
          </div>
        </div>

        {/* Email Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "var(--space-xl) var(--space-xl)" }}>
          <div className="max-w-3xl mx-auto">
            {/* Sender Header */}
            <div className="flex items-start gap-4 mb-6">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                style={{
                  background: getAvatarColor(email?.fromAddress || ""),
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              >
                {getAvatarInitials(email?.fromAddress || "")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-4">
                  <h1
                    className="text-lg font-bold truncate"
                    style={{ color: "var(--text-primary)", margin: 0 }}
                  >
                    {email?.fromAddress}
                  </h1>
                  <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                    {email?.receivedAt && new Date(email.receivedAt).toLocaleDateString('vi-VN', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <h2
                  className="text-base font-semibold mt-1.5"
                  style={{ color: "var(--text-primary)", margin: 0 }}
                >
                  {email?.subject}
                </h2>
                <p className="text-[11px] mt-1.5 flex items-center gap-2" style={{ color: "var(--text-secondary)" }}>
                  <span>To: me</span>
                  {email?.label && (
                    <>
                      <span>•</span>
                      <LabelBadge label={email.label} />
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* AI Summary */}
            {email?.summary && (
              <div
                className="rounded-xl mb-5"
                style={{
                  padding: "16px 20px",
                  background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)",
                  border: "1px solid #E0E7FF",
                }}
              >
                <p className="text-xs font-semibold mb-1.5" style={{ color: "#6366F1" }}>
                  ✨ AI tóm tắt
                </p>
                <p className="text-sm leading-relaxed" style={{ color: "#3730A3" }}>
                  {email.summary}
                </p>
              </div>
            )}

            <hr style={{ border: "none", borderTop: "1px solid #F3F4F6", margin: "24px 0" }} />

            {/* Body */}
            <div
              className="text-sm whitespace-pre-wrap"
              style={{
                color: "#374151",
                lineHeight: 1.7,
                padding: "var(--space-lg)",
                background: "#FAFBFC",
                borderRadius: 12,
                border: "1px solid #F3F4F6",
              }}
            >
              {email?.body}
            </div>

            {/* Suggested Replies */}
            {replies.length > 0 && (
              <div className="mt-8">
                <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>
                  💬 Gợi ý trả lời
                </p>
                <div className="flex flex-col gap-2">
                  {replies.map((reply, i) => (
                    <div
                      key={i}
                      className="text-sm cursor-pointer transition-all duration-200 hover:shadow-sm"
                      style={{
                        padding: "12px 16px",
                        border: "1px solid var(--border-color)",
                        borderRadius: 10,
                        color: "var(--text-primary)",
                        background: "var(--bg-panel)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-primary)"
                        ;(e.currentTarget as HTMLDivElement).style.background = "#F8FAFF"
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-color)"
                        ;(e.currentTarget as HTMLDivElement).style.background = "var(--bg-panel)"
                      }}
                    >
                      {reply.trim()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}