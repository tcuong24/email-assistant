import { useState } from "react"
import { X, Send, Minimize2, Maximize2, Paperclip, Clock, Trash2 } from "lucide-react"
import { sendEmail } from "../api/emailApi"
import { toast } from "sonner"

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

  const [attachments, setAttachments] = useState<Array<{ content: string, contentType: string, filename: string, size: number }>>([])
  const [isScheduling, setIsScheduling] = useState(false)
  const [scheduledTime, setScheduledTime] = useState("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return
    const filesArray = Array.from(e.target.files)
    
    filesArray.forEach(file => {
      const reader = new FileReader()
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultStr = event.target.result as string
          const base64Data = resultStr.split(",")[1]
          setAttachments(prev => [...prev, {
            content: base64Data,
            contentType: file.type,
            filename: file.name,
            size: file.size
          }])
        }
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ""
  }

  const handleRemoveAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  if (!isOpen) return null

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!to.trim()) {
      setError("Vui lòng điền người nhận.")
      return
    }

    let sendAtTimestamp: number | undefined = undefined
    if (isScheduling && scheduledTime) {
      const selectedDate = new Date(scheduledTime)
      const now = new Date()
      if (selectedDate.getTime() <= now.getTime() + 60000) {
        setError("Thời gian hẹn gửi phải muộn hơn hiện tại ít nhất 1 phút.")
        return
      }
      sendAtTimestamp = Math.floor(selectedDate.getTime() / 1000)
    }

    setIsSending(true)
    setError(null)

    try {
      await sendEmail({
        to,
        subject: subject.trim() || "(Không có tiêu đề)",
        body,
        replyToMessageId,
        attachments: attachments.map(att => ({
          content: att.content,
          contentType: att.contentType,
          filename: att.filename
        })),
        sendAt: sendAtTimestamp
      })
      setIsSending(false)
      if (isScheduling) {
        toast.success("Đã hẹn giờ gửi email thành công!")
      } else {
        toast.success("Đã gửi email thành công!")
      }
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
      className="fixed bottom-0 right-12 w-[520px] h-[520px] rounded-t-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in"
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

        {/* Render Attachments List */}
        {attachments.length > 0 && (
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 max-h-24 overflow-y-auto flex flex-wrap gap-2">
            {attachments.map((att, idx) => (
              <div 
                key={idx} 
                className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs text-gray-700 shadow-xs max-w-xs"
              >
                <Paperclip className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="truncate flex-1 max-w-[120px] font-medium">{att.filename}</span>
                <span className="text-[10px] text-gray-400">({(att.size / 1024).toFixed(1)} KB)</span>
                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(idx)}
                  className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Render Scheduling Panel */}
        {isScheduling && (
          <div className="px-4 py-2 bg-indigo-50/50 border-t border-indigo-100 flex items-center justify-between gap-3 text-xs text-indigo-700">
            <div className="flex items-center gap-1.5 font-semibold">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Hẹn giờ gửi:</span>
            </div>
            <input
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="px-2 py-1 bg-white border border-indigo-200 rounded-lg outline-none text-gray-800 text-xs font-semibold focus:ring-1 focus:ring-indigo-500"
              required={isScheduling}
            />
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="px-4 py-2 text-xs bg-red-50 text-red-600 border-t border-red-100">
            {error}
          </div>
        )}

        {/* Footer actions */}
        <div className="border-t border-gray-100 flex items-center justify-between" style={{ padding: "12px 16px", background: "#FAFBFC" }}>
          <div className="flex items-center gap-2">
            {/* Attachment Button */}
            <label className="p-2 border border-gray-200 hover:border-gray-300 rounded-xl bg-white hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer flex items-center justify-center" title="Đính kèm tệp">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              <Paperclip className="w-4 h-4" />
            </label>

            {/* Schedule Send Button */}
            <button
              type="button"
              onClick={() => {
                setIsScheduling(!isScheduling);
                if (!isScheduling) {
                  const tenMinutesLater = new Date(Date.now() + 10 * 60000);
                  const tzoffset = tenMinutesLater.getTimezoneOffset() * 60000;
                  const localISOTime = (new Date(tenMinutesLater.getTime() - tzoffset)).toISOString().slice(0, 16);
                  setScheduledTime(localISOTime);
                }
              }}
              className={`p-2 border rounded-xl transition-all cursor-pointer flex items-center justify-center ${
                isScheduling
                  ? "bg-indigo-50 border-indigo-200 text-indigo-600 hover:bg-indigo-100/70"
                  : "bg-white border-gray-200 hover:border-gray-300 text-gray-500 hover:text-gray-700"
              }`}
              title="Hẹn giờ gửi"
            >
              <Clock className="w-4 h-4" />
            </button>
          </div>

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
            {isScheduling ? <Clock className="w-4 h-4" /> : <Send className="w-4 h-4" />}
            <span>
              {isSending 
                ? "Đang xử lý..." 
                : isScheduling 
                  ? "Hẹn giờ gửi" 
                  : "Gửi"
              }
            </span>
          </button>
        </div>
      </form>
    </div>
  )
}
