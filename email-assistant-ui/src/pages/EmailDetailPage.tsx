import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmail, analyzeEmail, getThreadEmails, sendEmail, createTask, bulkUpdateEmails, bulkDeleteEmails } from '../api/emailApi'
import type { Email } from '../api/emailApi'
import Sidebar from '../components/Sidebar'
import LabelBadge from '../components/LabelBadge'
import ComposeModal from '../components/ComposeModal'
import {
  Reply,
  Trash2,
  Star,
  CornerUpRight,
  ArrowLeft,
  Paperclip,
  Send,
  Plus,
  Check,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { stripHtml } from '@/lib/utils'
import EmailBodyRenderer from '../components/EmailBodyRenderer'

export default function EmailDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: email, isLoading } = useQuery({
    queryKey: ['email', id],
    queryFn: () => getEmail(Number(id)).then(r => r.data),
  })

  // Gọi API phân tích AI nếu email ở trạng thái PENDING khi xem chi tiết
  useEffect(() => {
    if (email && email.label === 'PENDING') {
      analyzeEmail(Number(id)).catch(err => {
        console.error("Failed to trigger AI analysis:", err)
      })
    }
  }, [email, id])

  const [expandedEmailIds, setExpandedEmailIds] = useState<{ [key: string]: boolean }>({})
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

  const [createdTaskKeys, setCreatedTaskKeys] = useState<string[]>([])

  const parseActionItem = (rawItem: string) => {
    let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
    let dueDate = 'Không rõ'
    let title = rawItem

    try {
      if (rawItem.startsWith("[")) {
        const firstClose = rawItem.indexOf("]")
        if (firstClose > 0) {
          const priorityStr = rawItem.substring(1, firstClose).trim().toUpperCase()
          if (priorityStr === 'HIGH' || priorityStr === 'MEDIUM' || priorityStr === 'LOW') {
            priority = priorityStr
          }
          const rest = rawItem.substring(firstClose + 1).trim()
          if (rest.startsWith("[Hạn:")) {
            const secondClose = rest.indexOf("]")
            if (secondClose > 0) {
              dueDate = rest.substring(5, secondClose).trim()
              title = rest.substring(secondClose + 1).trim()
            }
          } else {
            title = rest
          }
        }
      }
    } catch (e) {
      console.warn("Failed to parse action item", e)
    }

    return { priority, dueDate, title }
  }

  const handleCreateTaskFromAi = (rawItem: string, emailItem: Email, itemKey: string) => {
    const parsed = parseActionItem(rawItem)
    const promise = createTask({
      title: parsed.title,
      priority: parsed.priority,
      dueDate: parsed.dueDate,
      category: emailItem.category || 'PRIMARY',
      emailId: emailItem.id,
      status: 'TODO'
    })

    toast.promise(promise, {
      loading: 'Đang tạo công việc...',
      success: () => {
        setCreatedTaskKeys(prev => [...prev, itemKey])
        return 'Đã thêm công việc vào Kanban board!'
      },
      error: 'Không thể tạo công việc.'
    })
  }

  // Lấy tất cả email trong cùng luồng
  const { data: threadEmails, isLoading: isThreadLoading, refetch: refetchThread } = useQuery({
    queryKey: ['threadEmails', email?.threadId],
    queryFn: () => {
      if (email?.threadId) {
        return getThreadEmails(email.threadId).then(r => r.data)
      }
      return Promise.resolve([])
    },
    enabled: !!email?.threadId,
  })

  const displayEmails = threadEmails && threadEmails.length > 0 ? threadEmails : (email ? [email] : [])

  useEffect(() => {
    if (displayEmails.length > 0) {
      const initialExpanded: { [key: string]: boolean } = {}
      displayEmails.forEach((emailItem, index) => {
        if (index === displayEmails.length - 1) {
          initialExpanded[emailItem.id] = true
        } else {
          initialExpanded[emailItem.id] = false
        }
      })
      setExpandedEmailIds(initialExpanded)
    }
  }, [threadEmails, email])

  const toggleEmailExpand = (emailId: string | number) => {
    setExpandedEmailIds(prev => ({
      ...prev,
      [emailId]: !prev[emailId]
    }))
  }

  const handleSingleAction = async (action: 'spam' | 'important' | 'delete' | 'archive' | 'read' | 'unread' | 'restore' | 'permanent_delete') => {
    if (!email) return
    const emailIds = [email.id]
    const promise = (async () => {
      if (action === 'spam') {
        await bulkUpdateEmails({ emailIds, label: 'SPAM', category: 'SPAM' })
      } else if (action === 'important') {
        await bulkUpdateEmails({ emailIds, label: 'IMPORTANT' })
      } else if (action === 'delete') {
        await bulkUpdateEmails({ emailIds, category: 'DELETED' })
      } else if (action === 'archive') {
        await bulkUpdateEmails({ emailIds, label: 'NORMAL' })
      } else if (action === 'restore') {
        await bulkUpdateEmails({ emailIds, category: 'PRIMARY', label: 'NORMAL' })
      } else if (action === 'permanent_delete') {
        await bulkDeleteEmails(emailIds)
      }
      navigate(-1)
    })()

    toast.promise(promise, {
      loading: action === 'permanent_delete' ? 'Đang xóa vĩnh viễn...' : 'Đang cập nhật...',
      success: action === 'permanent_delete' ? 'Đã xóa vĩnh viễn thành công!' : 'Đã cập nhật thành công!',
      error: 'Thực hiện thất bại.'
    })
  }

  const handleApplySuggestion = (suggestion: string) => {
    setReplyBody(suggestion.trim())
    const replyInput = document.getElementById("reply-textarea-detail")
    if (replyInput) {
      replyInput.focus()
    }
  }

  const handleSendReply = async () => {
    if (!replyBody.trim() || !email) return
    setIsSendingReply(true)
    try {
      await sendEmail({
        to: email.fromAddress,
        subject: email.subject.startsWith("Re:") ? email.subject : `Re: ${email.subject}`,
        body: replyBody,
        replyToMessageId: email.messageId || email.id.toString(),
      })
      setReplyBody("")
      refetchThread()
    } catch (err) {
      console.error("Gửi phản hồi thất bại:", err)
    } finally {
      setIsSendingReply(false)
    }
  }

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
      <Sidebar onComposeClick={() => setIsComposeOpen(true)} />

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
                onClick={() => {
                  const replyInput = document.getElementById("reply-textarea-detail")
                  if (replyInput) {
                    replyInput.scrollIntoView({ behavior: 'smooth' })
                    replyInput.focus()
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-gray-100"
                style={{ color: "var(--text-secondary)" }}
              >
                <action.icon className={`w-3.5 h-3.5 ${action.rotate ? "scale-x-[-1]" : ""}`} />
                <span>{action.label}</span>
              </button>
            ))}

            <div className="mx-1" style={{ width: 1, height: 16, background: "var(--border-color)" }} />

            {email?.category === "DELETED" ? (
              <>
                <button
                  onClick={() => handleSingleAction('restore')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Khôi phục</span>
                </button>
                <button
                  onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn xóa vĩnh viễn thư này? Hành động này không thể hoàn tác.")) {
                      handleSingleAction('permanent_delete')
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  <span>Xóa vĩnh viễn</span>
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleSingleAction('delete')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-red-50 hover:text-red-600 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
                <button
                  onClick={() => handleSingleAction('important')}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors hover:bg-amber-50 hover:text-amber-600 cursor-pointer"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <Star className="w-3.5 h-3.5" />
                  <span>Important</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Email Body & Thread Stack */}
        <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "var(--space-xl) var(--space-xl)" }}>
          {isThreadLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                <span className="text-xs text-gray-500">Đang tải cuộc trò chuyện...</span>
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto flex flex-col gap-4">
              {displayEmails.map((emailItem, index) => {
                const isExpanded = expandedEmailIds[emailItem.id]
                const isLatest = index === displayEmails.length - 1
                const replies = emailItem.suggestedReplies ? emailItem.suggestedReplies.split('||') : []

                return (
                  <div
                    key={emailItem.id}
                    className="border rounded-xl overflow-hidden transition-all duration-200"
                    style={{
                      borderColor: "var(--border-color)",
                      boxShadow: isExpanded ? "0 4px 12px rgba(0,0,0,0.05)" : "none",
                    }}
                  >
                    {/* Collapsed Header Bar */}
                    {!isExpanded ? (
                      <div
                        onClick={() => toggleEmailExpand(emailItem.id)}
                        className="flex items-center justify-between cursor-pointer select-none transition-colors"
                        style={{
                          padding: "12px 16px",
                          background: "#F3F4F6", // light gray background for read/older collapsed emails
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#EBF0F6"
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "#F3F4F6"
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: getAvatarColor(emailItem.fromAddress) }}
                          >
                            {getAvatarInitials(emailItem.fromAddress)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold text-gray-700 truncate" style={{ maxWidth: 120 }}>
                                {emailItem.fromName || emailItem.fromAddress.split("@")[0]}
                              </span>
                              <span className="text-xs text-gray-500 truncate">
                                {emailItem.snippet || (emailItem.body ? emailItem.body.replace(/<[^>]*>/g, '').slice(0, 80) : "(Không có nội dung)")}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {emailItem.hasAttachments && (
                            <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                          )}
                          <span className="text-[11px] text-gray-500">
                            {new Date(emailItem.receivedAt).toLocaleDateString('vi-VN', {
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    ) : (
                      /* Expanded View */
                      <div style={{ background: "#FFFFFF", padding: "16px 20px" }}>
                        {/* Header */}
                        <div
                          className="flex items-start gap-4 mb-4 cursor-pointer"
                          onClick={() => toggleEmailExpand(emailItem.id)}
                        >
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                            style={{ background: getAvatarColor(emailItem.fromAddress) }}
                          >
                            {getAvatarInitials(emailItem.fromAddress)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-4">
                              <h2 className="text-sm font-bold truncate text-gray-800 m-0">
                                {emailItem.fromName ? `${emailItem.fromName} <${emailItem.fromAddress}>` : emailItem.fromAddress}
                              </h2>
                              <span className="text-[11px] text-gray-500 flex-shrink-0">
                                {new Date(emailItem.receivedAt).toLocaleString('vi-VN', {
                                  day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1 mb-0 flex gap-2">
                              <span>To: me</span>
                              {emailItem.label && (
                                <>
                                  <span>•</span>
                                  <LabelBadge label={emailItem.label} />
                                </>
                              )}
                            </p>
                          </div>
                        </div>

                        {/* Subject */}
                        <h3 className="text-sm font-bold text-gray-800 mb-3 border-b border-gray-100 pb-2">
                          {emailItem.subject}
                        </h3>

                        {/* AI Summary */}
                        {emailItem.summary && (
                          <div
                            className="rounded-xl mb-4"
                            style={{ padding: "12px 16px", background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1px solid #E0E7FF" }}
                          >
                            <p className="text-[11px] font-semibold mb-1" style={{ color: "#6366F1" }}>✨ AI tóm tắt</p>
                            <p className="text-xs leading-relaxed m-0" style={{ color: "#3730A3" }}>{emailItem.summary}</p>
                          </div>
                        )}

                        {/* AI Action Items */}
                        {emailItem.actionItems && emailItem.actionItems.trim().length > 0 && (
                          <div
                            className="rounded-xl mb-4"
                            style={{ padding: "12px 16px", background: "linear-gradient(135deg, #ECFDF5, #F0FDF4)", border: "1px solid #A7F3D0" }}
                          >
                            <p className="text-[11px] font-semibold mb-2" style={{ color: "#059669" }}>✅ Việc cần làm (AI gợi ý tạo Task)</p>
                            <ul className="text-xs leading-relaxed m-0 list-none pl-0 flex flex-col gap-2" style={{ color: "#065F46" }}>
                              {emailItem.actionItems.split("||").map((item, idx) => {
                                const itemKey = `${emailItem.id}-${idx}`;
                                const isAdded = createdTaskKeys.includes(itemKey);
                                return (
                                  <li key={idx} className="flex items-center justify-between gap-3 py-1.5 border-b border-emerald-100/50 last:border-none">
                                    <span style={{ color: "#065F46" }}>{item.trim()}</span>
                                    {isAdded ? (
                                      <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-0.5 bg-emerald-100/50 px-2 py-0.5 rounded-full flex-shrink-0">
                                        <Check className="w-3 h-3 stroke-[3]" /> Đã thêm
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => handleCreateTaskFromAi(item, emailItem, itemKey)}
                                        className="text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-all px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer flex-shrink-0"
                                      >
                                        <Plus className="w-3 h-3 stroke-[3]" /> Tạo Task
                                      </button>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                          </div>
                        )}

                        {/* Body */}
                        <div className="text-sm text-gray-800 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
                          <EmailBodyRenderer body={emailItem.body} />
                        </div>

                        {/* Attachments */}
                        {emailItem.attachments && emailItem.attachments.length > 0 && (
                          <div className="mt-4 border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold mb-2 text-gray-500">
                              📎 Đính kèm ({emailItem.attachments.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {emailItem.attachments.map((att, idx) => (
                                <a
                                  key={idx}
                                  href={att.r2Url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-colors no-underline text-gray-700"
                                >
                                  <Paperclip className="w-3.5 h-3.5 text-gray-400" />
                                  <div className="text-left">
                                    <p className="font-semibold truncate max-w-[150px] m-0">{att.filename}</p>
                                    <p className="text-[10px] text-gray-400 m-0">{(att.size / 1024).toFixed(1)} KB</p>
                                  </div>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Suggested Replies */}
                        {isLatest && replies.length > 0 && (
                          <div className="mt-4 border-t border-gray-100 pt-3">
                            <p className="text-xs font-semibold mb-2 text-gray-500">💬 Gợi ý trả lời</p>
                            <div className="flex flex-col gap-2">
                              {replies.map((reply, i) => (
                                <div
                                  key={i}
                                  onClick={() => handleApplySuggestion(reply)}
                                  className="text-xs cursor-pointer transition-all duration-200 hover:shadow-sm"
                                  style={{ padding: "8px 12px", border: "1px solid var(--border-color)", borderRadius: 8, color: "var(--text-primary)", background: "var(--bg-panel)" }}
                                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--accent-primary)"; (e.currentTarget as HTMLDivElement).style.background = "#F8FAFF" }}
                                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border-color)"; (e.currentTarget as HTMLDivElement).style.background = "var(--bg-panel)" }}
                                >
                                  {reply.trim()}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Reply Box */}
              {email && (
                <div className="border rounded-xl p-4 bg-white shadow-sm mt-2 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-indigo-600">
                      Me
                    </div>
                    <span className="text-xs font-semibold text-gray-700">Trả lời cho: {email.fromAddress}</span>
                  </div>
                  <textarea
                    id="reply-textarea-detail"
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder="Viết câu trả lời của bạn ở đây..."
                    className="w-full min-h-[100px] outline-none text-sm border border-gray-200 rounded-lg p-3 bg-gray-50/20 focus:bg-white focus:border-indigo-300 transition-all resize-y"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleSendReply}
                      disabled={isSendingReply || !replyBody.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
                      style={{ background: "var(--accent-primary)", border: "none" }}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSendingReply ? "Đang gửi..." : "Gửi phản hồi"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => navigate(-1)}
      />
    </div>
  )
}