import { useState } from "react"
import { X, Send, Minimize2, Maximize2 } from "lucide-react"
import { sendEmail } from "../api/emailApi"

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
  initialTo?: string
  initialSubject?: string
  initialBody?: string
  replyToMessageId?: string
}

export default function ComposeModal({
  isOpen,
  onClose,
  onSuccess,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  replyToMessageId,
}: ComposeModalProps) {
  const [to, setTo] = useState(initialTo)
  const [subject, setSubject] = useState(initialSubject)
  const [body, setBody] = useState(initialBody)
  const [isSending, setIsSending] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to.trim()) {
      setError("Vui lòng điền người nhận.")
      return
    }

    setIsSending(true)
    setError(null)

    try {
      await sendEmail({
        to,
        subject: subject.trim() || "(Không có tiêu đề)",
        body,
        replyToMessageId,
      })
      setIsSending(false)
      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error("Lỗi gửi email:", err)
      setError("Gửi thư thất bại. Vui lòng thử lại.")
      setIsSending(false)
    }
  }

  if (isMinimized) {
    return (
      <div
        className="fixed bottom-0 right-12 w-[320px] rounded-t-xl shadow-2xl border border-gray-200 z-50 flex items-center justify-between"
        style={{
          background: "var(--btn-dark)",
          color: "white",
          padding: "10px 16px",
        }}
      >
        <span className="text-sm font-semibold truncate flex-1 cursor-pointer" onClick={() => setIsMinimized(false)}>
          {subject.trim() || "Thư mới"}
        </span>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={() => setIsMinimized(false)}
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed bottom-0 right-12 w-[520px] h-[450px] rounded-t-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in"
      style={{
        background: "#FFFFFF",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between select-none"
        style={{
          background: "var(--btn-dark)",
          color: "white",
          padding: "12px 16px",
        }}
      >
        <span className="text-sm font-bold">
          {replyToMessageId ? "Trả lời thư" : "Thư mới"}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Thu nhỏ"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-gray-300 hover:text-white transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSend} className="flex-1 flex flex-col min-h-0">
        {/* Recipients input */}
        <div className="border-b border-gray-100 flex items-center" style={{ padding: "8px 16px" }}>
          <span className="text-xs font-semibold text-gray-400 w-12 flex-shrink-0">Tới</span>
          <input
            type="email"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="example@gmail.com"
            required
            className="flex-1 outline-none text-sm border-none bg-transparent"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* Subject input */}
        <div className="border-b border-gray-100 flex items-center" style={{ padding: "8px 16px" }}>
          <span className="text-xs font-semibold text-gray-400 w-12 flex-shrink-0">Tiêu đề</span>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Nhập tiêu đề thư"
            className="flex-1 outline-none text-sm border-none bg-transparent"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* Body input */}
        <div className="flex-1 p-4 min-h-0 overflow-y-auto">
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Nội dung thư..."
            className="w-full h-full resize-none outline-none border-none text-sm leading-relaxed bg-transparent"
            style={{ color: "var(--text-primary)" }}
          />
        </div>

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 text-xs bg-red-50 text-red-600 border-t border-red-100">
            {error}
          </div>
        )}

        {/* Footer actions */}
        <div className="border-t border-gray-100 flex items-center justify-between" style={{ padding: "12px 16px", background: "#FAFBFC" }}>
          <button
            type="submit"
            disabled={isSending}
            className="flex items-center gap-2 text-white font-bold rounded-lg transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
            style={{
              padding: "8px 20px",
              background: "var(--accent-primary)",
              fontSize: 13,
            }}
          >
            <Send className="w-4 h-4" />
            <span>{isSending ? "Đang gửi..." : "Gửi"}</span>
          </button>
        </div>
      </form>
    </div>
  )
}
