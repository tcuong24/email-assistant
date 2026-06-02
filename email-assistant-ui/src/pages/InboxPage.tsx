import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getEmails } from '../api/emailApi'
import LabelBadge from '../components/LabelBadge'
import Sidebar from '../components/Sidebar'
import EmailSection from '../components/EmailSection'
import type { Email } from '../components/EmailSection'
import EmailBodyRenderer from '../components/EmailBodyRenderer'
import {
  Search,
  Plus,
  Reply,
  Trash2,
  Star,
  CornerUpRight,
  RefreshCw,
  MailOpen,
  X,
} from 'lucide-react'

export default function InboxPage() {
  const [activeCategory, setActiveCategory] = useState("inbox")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState("all")
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['emails'],
    queryFn: () => getEmails().then(r => r.data),
    refetchInterval: 10000,
  })

  const getThreadedEmails = (rawEmails: Email[]) => {
    if (!rawEmails) return [];

    const threads: { [key: string]: Email[] } = {};

    // Gom nhóm email theo threadId
    rawEmails.forEach(email => {
      const tId = email.threadId || `no-thread-${email.id}`;
      if (!threads[tId]) {
        threads[tId] = [];
      }
      threads[tId].push(email);
    });
    // Lọc lấy thư mới nhất trong mỗi nhóm và đính kèm số lượng thư trong luồng
    return Object.values(threads).map(threadEmails => {
      // Sắp xếp thư trong luồng theo thời gian giảm dần
      const sorted = [...threadEmails].sort((a, b) =>
        new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime()
      );

      const latestEmail = sorted[0]; // Email mới nhất đại diện cho Thread
      latestEmail.threadCount = threadEmails.length; // Số lượng email trong Thread này

      // Nếu có ít nhất 1 thư trong Thread chưa đọc, thì coi như cả Thread là CHƯA ĐỌC
      latestEmail.isUnread = threadEmails.some(e => !e.isRead);

      return latestEmail;
    }).sort((a, b) =>
      new Date(b.receivedAt || 0).getTime() - new Date(a.receivedAt || 0).getTime()
    );
  };
  const filteredData = data?.filter(email => {
    let matchesCategory = false
    const labelUpper = email.label?.toUpperCase()

    if (activeCategory === "inbox") {
      matchesCategory = labelUpper !== "SPAM" && labelUpper !== "DELETED"
    } else if (activeCategory === "important") {
      matchesCategory = labelUpper === "IMPORTANT"
    } else if (activeCategory === "sent") {
      matchesCategory = labelUpper === "SENT"
    } else if (activeCategory === "drafts") {
      matchesCategory = labelUpper === "DRAFTS"
    } else if (activeCategory === "deleted") {
      matchesCategory = labelUpper === "DELETED"
    } else if (activeCategory === "client") {
      matchesCategory = labelUpper === "NORMAL"
    } else {
      matchesCategory = true
    }
    if (!matchesCategory) return false

    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      email.fromAddress?.toLowerCase().includes(searchLower) ||
      email.subject?.toLowerCase().includes(searchLower) ||
      email.summary?.toLowerCase().includes(searchLower) ||
      email.body?.toLowerCase().includes(searchLower)
    if (!matchesSearch) return false

    const isUnread = email.status !== "READ"
    if (filterTab === "read") return !isUnread
    if (filterTab === "unread") return isUnread

    return true
  }) || []

  // Sử dụng dữ liệu đã gộp luồng
  const threadedEmails = getThreadedEmails(filteredData || []);

  useEffect(() => {
    setSelectedEmailId(null)
  }, [activeCategory, filterTab, searchQuery])

  const inboxCount = data?.filter(email => email.label?.toUpperCase() !== "SPAM").length || 0

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'inbox': return 'Inbox'
      case 'important': return 'Important'
      case 'sent': return 'Sent'
      case 'drafts': return 'Drafts'
      case 'deleted': return 'Deleted'
      case 'client': return 'Client'
      default: return 'Email'
    }
  }

  const selectedEmail = data?.find(e => e.id === selectedEmailId)
  const hasSplit = selectedEmailId !== null && selectedEmail !== undefined

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
    for (let i = 0; i < address.length; i++) {
      hash = address.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }

  // Loading state
  if (isLoading) return (
    <div className="h-screen flex" style={{ background: "var(--bg-main)" }}>
      <Sidebar activeItem={activeCategory} inboxCount={0} onSelectItem={setActiveCategory} />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-4 border-t-transparent animate-spin"
            style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }}
          />
          <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
            Đang tải hộp thư...
          </span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--bg-main)" }}>
      {/* ── Column 1: Sidebar ── */}
      <Sidebar
        activeItem={activeCategory}
        inboxCount={inboxCount}
        onSelectItem={setActiveCategory}
      />

      {/* ── Column 2: Email List Panel ── */}
      <div
        className="flex flex-col overflow-hidden transition-all duration-300"
        style={{
          width: hasSplit ? 380 : undefined,
          minWidth: hasSplit ? 380 : undefined,
          flex: hasSplit ? "0 0 380px" : "1 1 0%",
          background: "var(--bg-panel)",
          borderRight: hasSplit ? "1px solid var(--border-color)" : "none",
        }}
      >
        {/* Header: Search bar (full-width) or Category Title + Compose (split) */}
        {hasSplit ? (
          /* ── Split Mode Header ── */
          <>
            <div
              className="flex justify-between items-center flex-shrink-0"
              style={{ padding: "20px 20px 12px" }}
            >
              <div className="flex items-center gap-3">
                <h1
                  className="font-bold"
                  style={{
                    fontSize: 20,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {getCategoryTitle(activeCategory)}
                </h1>
                <button
                  onClick={() => refetch()}
                  className={`p-1.5 rounded-lg transition-all duration-200 hover:bg-gray-100 ${isFetching ? "animate-spin" : ""}`}
                  style={{ color: isFetching ? "var(--accent-primary)" : "var(--text-secondary)" }}
                  title="Tải lại"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "var(--btn-dark)", boxShadow: "var(--shadow-compose)" }}
                title="Soạn thư mới"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Search in split mode */}
            <div style={{ padding: "0 20px 8px" }}>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Search"
                  className="w-full outline-none text-sm transition-all duration-200"
                  style={{ background: "#F3F4F6", border: "1px solid transparent", borderRadius: 999, padding: "9px 16px 9px 38px", color: "var(--text-primary)", fontSize: 13 }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.background = "#FFF"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)" }}
                  onBlur={(e) => { e.currentTarget.style.background = "#F3F4F6"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "none" }}
                />
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 flex-shrink-0" style={{ padding: "8px 20px 12px", borderBottom: "1px solid #F3F4F6" }}>
              {['all', 'read', 'unread'].map(f => (
                <button
                  key={f}
                  onClick={() => setFilterTab(f)}
                  className="transition-all duration-200"
                  style={{
                    padding: "5px 14px", borderRadius: 999, fontSize: 12, fontWeight: 600, textTransform: "capitalize",
                    background: filterTab === f ? "#111827" : "transparent",
                    color: filterTab === f ? "#FFFFFF" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => { if (filterTab !== f) (e.currentTarget as HTMLButtonElement).style.background = "#F3F4F6" }}
                  onMouseLeave={(e) => { if (filterTab !== f) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                >
                  {f}
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ── Full-Width Mode Header (Gmail-style) ── */
          <>
            {/* Top bar: Search + Actions */}
            <div
              className="flex items-center gap-3 flex-shrink-0"
              style={{ padding: "12px 16px", borderBottom: "1px solid var(--border-color)" }}
            >
              {/* Search */}
              <div className="relative flex-1" style={{ maxWidth: 720 }}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--text-secondary)" }} />
                <input
                  type="text"
                  placeholder="Tìm kiếm trong thư"
                  className="w-full outline-none text-sm transition-all duration-200"
                  style={{
                    background: "#EEF1F5",
                    border: "1px solid transparent",
                    borderRadius: 8,
                    padding: "10px 16px 10px 42px",
                    color: "var(--text-primary)",
                    fontSize: 14,
                  }}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={(e) => { e.currentTarget.style.background = "#FFF"; e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)" }}
                  onBlur={(e) => { e.currentTarget.style.background = "#EEF1F5"; e.currentTarget.style.borderColor = "transparent"; e.currentTarget.style.boxShadow = "none" }}
                />
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Actions */}
              <button
                onClick={() => refetch()}
                className={`p-2 rounded-full transition-all duration-200 hover:bg-gray-100 ${isFetching ? "animate-spin" : ""}`}
                style={{ color: isFetching ? "var(--accent-primary)" : "var(--text-secondary)" }}
                title="Tải lại"
              >
                <RefreshCw className="w-[18px] h-[18px]" />
              </button>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center text-white transition-all duration-200 hover:scale-105 active:scale-95"
                style={{ background: "var(--btn-dark)", boxShadow: "var(--shadow-compose)" }}
                title="Soạn thư mới"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
              </button>
            </div>

            {/* Toolbar: Checkbox + Filter Tabs + Pagination info */}
            <div
              className="flex items-center justify-between flex-shrink-0"
              style={{ padding: "4px 8px 4px 8px", borderBottom: "1px solid var(--border-color)" }}
            >
              <div className="flex items-center gap-1">
                {/* Bulk checkbox */}
                <div className="flex items-center" style={{ padding: "6px 8px" }}>
                  <input type="checkbox" className="w-[18px] h-[18px] rounded cursor-pointer accent-[var(--accent-primary)]" onClick={(e) => e.stopPropagation()} />
                </div>

                {/* Refresh */}
                <button
                  onClick={() => refetch()}
                  className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  style={{ color: "var(--text-secondary)" }}
                  title="Tải lại"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                {/* Divider */}
                <div style={{ width: 1, height: 20, background: "var(--border-color)", margin: "0 4px" }} />

                {/* Filter tabs */}
                <div className="flex">
                  {['all', 'read', 'unread'].map(f => (
                    <button
                      key={f}
                      onClick={() => setFilterTab(f)}
                      className="transition-all duration-150"
                      style={{
                        padding: "6px 16px",
                        fontSize: 13,
                        fontWeight: filterTab === f ? 600 : 400,
                        color: filterTab === f ? "var(--accent-primary)" : "var(--text-secondary)",
                        borderBottom: filterTab === f ? "2px solid var(--accent-primary)" : "2px solid transparent",
                        textTransform: "capitalize",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => { if (filterTab !== f) (e.currentTarget as HTMLButtonElement).style.background = "#F5F5F5" }}
                      onMouseLeave={(e) => { if (filterTab !== f) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                    >
                      {f === 'all' ? 'Tất cả' : f === 'read' ? 'Đã đọc' : 'Chưa đọc'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pagination info */}
              <div className="flex items-center gap-2" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                <span>1–{threadedEmails.length} trong số {data?.length || 0}</span>
              </div>
            </div>
          </>
        )}

        {/* ── Email List — Scrollable ── */}
        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {error && (
            <div
              className="text-xs rounded-xl"
              style={{ margin: 16, padding: 14, background: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}
            >
              Không thể tải danh sách email. Vui lòng thử lại.
            </div>
          )}

          {threadedEmails.map(email => (
            <EmailSection
              key={email.id}
              email={email}
              isSelected={email.id === selectedEmailId}
              layoutMode={hasSplit ? "compact" : "horizontal"}
              onClick={() => setSelectedEmailId(email.id)}
            />
          ))}

          {threadedEmails.length === 0 && !isLoading && (
            <div className="text-center" style={{ padding: "64px 24px" }}>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ background: "#EEF2FF" }}
              >
                <MailOpen className="w-6 h-6" style={{ color: "#6366F1" }} />
              </div>
              <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                Thư mục trống
              </h3>
              <p className="text-xs max-w-[200px] mx-auto" style={{ color: "var(--text-secondary)" }}>
                Không tìm thấy email nào phù hợp với bộ lọc.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Column 3: Email Detail / Reading Pane (only when selected) ── */}
      {hasSplit && (
        <div
          className="flex-1 flex flex-col overflow-hidden animate-fade-in"
          style={{ background: "var(--bg-panel)" }}
        >
          {/* Toolbar */}
          <div
            className="flex items-center justify-between flex-shrink-0"
            style={{ padding: "10px 24px", borderBottom: "1px solid var(--border-color)", background: "#FAFBFC" }}
          >
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSelectedEmailId(null)}
                className="p-2 rounded-lg transition-colors hover:bg-gray-100 mr-1"
                style={{ color: "var(--text-secondary)" }}
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
              {[
                { icon: Reply, label: "Reply", rotate: false },
                { icon: Reply, label: "Reply all", rotate: true },
                { icon: CornerUpRight, label: "Forward", rotate: false },
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
            <Link
              to={`/emails/${selectedEmail!.id}`}
              className="text-xs font-bold px-3.5 py-2 rounded-xl transition-all hover:opacity-80 flex items-center gap-1 no-underline"
              style={{ background: "#EEF2FF", color: "#4F46E5", border: "1px solid #C7D2FE" }}
            >
              Xem chi tiết →
            </Link>
          </div>

          {/* Email Content */}
          <div className="flex-1 overflow-y-auto scrollbar-thin" style={{ padding: "var(--space-lg) var(--space-xl)" }}>
            <div className="max-w-3xl mx-auto">
              {/* Sender Header */}
              <div className="flex items-start gap-4 mb-6">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                  style={{ background: getAvatarColor(selectedEmail!.fromAddress), boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
                >
                  {getAvatarInitials(selectedEmail!.fromAddress)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="text-base font-bold truncate" style={{ color: "var(--text-primary)", margin: 0 }}>
                      {selectedEmail!.fromAddress}
                    </h2>
                    <span className="text-xs font-medium flex-shrink-0" style={{ color: "var(--text-secondary)" }}>
                      {new Date(selectedEmail!.receivedAt).toLocaleDateString('vi-VN', {
                        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold mt-1" style={{ color: "var(--text-secondary)" }}>
                    {selectedEmail!.subject}
                  </h3>
                  <p className="text-[11px] mt-1 flex gap-2" style={{ color: "var(--text-secondary)" }}>
                    <span>To: me</span>
                    {selectedEmail!.label && (
                      <>
                        <span>•</span>
                        <LabelBadge label={selectedEmail!.label} />
                      </>
                    )}
                  </p>
                </div>
              </div>

              {/* AI Summary */}
              {selectedEmail!.summary && (
                <div
                  className="rounded-xl mb-5"
                  style={{ padding: "16px 20px", background: "linear-gradient(135deg, #EEF2FF, #F5F3FF)", border: "1px solid #E0E7FF" }}
                >
                  <p className="text-xs font-semibold mb-1.5" style={{ color: "#6366F1" }}>✨ AI tóm tắt</p>
                  <p className="text-sm leading-relaxed" style={{ color: "#3730A3" }}>{selectedEmail!.summary}</p>
                </div>
              )}

              <hr style={{ border: "none", borderTop: "1px solid #F3F4F6", margin: "20px 0" }} />

              {/* Body */}
              <div
                className="text-sm"
                style={{ padding: "var(--space-lg)", background: "#FAFBFC", borderRadius: 12, border: "1px solid #F3F4F6" }}
              >
                <EmailBodyRenderer body={selectedEmail!.body} />
              </div>

              {/* Suggested Replies */}
              {selectedEmail!.suggestedReplies && (
                <div className="mt-6">
                  <p className="text-xs font-semibold mb-3" style={{ color: "var(--text-secondary)" }}>💬 Gợi ý trả lời</p>
                  <div className="flex flex-col gap-2">
                    {selectedEmail!.suggestedReplies.split("||").map((reply: string, i: number) => (
                      <div
                        key={i}
                        className="text-sm cursor-pointer transition-all duration-200 hover:shadow-sm"
                        style={{ padding: "10px 16px", border: "1px solid var(--border-color)", borderRadius: 10, color: "var(--text-primary)", background: "var(--bg-panel)" }}
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
          </div>
        </div>
      )}
    </div>
  )
}