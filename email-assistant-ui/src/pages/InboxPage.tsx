import { useState, useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getEmails, getSentEmails, getDraftEmails, getEmailStats, analyzeEmail, getThreadEmails, sendEmail, getNylasStatus, syncEmails } from '../api/emailApi'
import LabelBadge from '../components/LabelBadge'
import Sidebar from '../components/Sidebar'
import ComposeModal from '../components/ComposeModal'
import EmailSection from '../components/EmailSection'
import type { Email } from '../components/EmailSection'
import EmailBodyRenderer from '../components/EmailBodyRenderer'
import { useAuth } from '../store/authStore'
import { useWebSocket } from '../hooks/useWebSocket'
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
  Inbox,
  Tag,
  Users,
  Bell,
  MessageSquare,
  Paperclip,
  Send,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

const CATEGORY_TABS = [
  { key: 'PRIMARY', label: 'Chính', icon: Inbox },
  { key: 'PROMOTIONS', label: 'Quảng cáo', icon: Tag },
  { key: 'SOCIAL', label: 'Mạng xã hội', icon: Users },
  { key: 'UPDATES', label: 'Cập nhật', icon: Bell },
  { key: 'FORUMS', label: 'Diễn đàn', icon: MessageSquare },
]

export default function InboxPage() {
  const [activeCategory, setActiveCategory] = useState("inbox")
  const [searchQuery, setSearchQuery] = useState("")
  const autoSyncTriggered = useRef(false)
  const [filterTab, setFilterTab] = useState("all")
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null)
  const [activeTab, setActiveTab] = useState("PRIMARY")

  // Quản lý trạng thái trang riêng biệt cho từng danh mục
  const [pages, setPages] = useState<{ [key: string]: number }>({})

  const { user } = useAuth()
  useWebSocket(user?.id)

  const currentKey = activeCategory === "inbox" ? activeTab : activeCategory
  const currentPage = pages[currentKey] || 0

  const setPageForCurrentKey = (newPage: number) => {
    setPages(prev => ({
      ...prev,
      [currentKey]: newPage
    }))
  }

  // Lấy trạng thái kết nối Nylas
  const { data: nylasStatus } = useQuery({
    queryKey: ['nylasStatus'],
    queryFn: () => getNylasStatus().then(r => r.data),
  })

  // Query phụ để lấy thống kê số lượng (inboxCount)
  const { data: statsData } = useQuery({
    queryKey: ['emailStats'],
    queryFn: () => getEmailStats().then(r => r.data),
    refetchInterval: 300000,
  })

  // Query chính động theo category
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['emails', activeCategory, activeTab, currentPage],
    queryFn: () => {
      if (activeCategory === "sent") {
        return getSentEmails(currentPage, 50).then(r => r.data)
      }
      if (activeCategory === "drafts") {
        return getDraftEmails(currentPage, 50).then(r => r.data)
      }
      if (activeCategory === "inbox") {
        return getEmails(activeTab, currentPage, 50).then(r => r.data)
      }
      return getEmails(undefined, currentPage, 50).then(r => r.data)
    },
    refetchInterval: 300000,
  })

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState("")

  // Tự động kích hoạt đồng bộ (đồng bộ hiển thị nếu chưa có thư, đồng bộ ngầm nếu đã có thư)
  useEffect(() => {
    if (!nylasStatus?.connected || !data || autoSyncTriggered.current) return

    autoSyncTriggered.current = true

    if (
      data.totalElements === 0 &&
      currentPage === 0 &&
      (activeCategory === "inbox" || activeCategory === "all")
    ) {
      // Nếu chưa có thư nào, hiển thị vòng xoay trạng thái cho người dùng thấy
      setIsSyncing(true)
      setSyncMessage("Đang đồng bộ thư từ Gmail của bạn...")
      syncEmails()
        .then(() => {
          setTimeout(() => {
            setIsSyncing(false)
            setSyncMessage("")
          }, 15000)
        })
        .catch((err) => {
          console.error("Auto sync failed:", err)
          setIsSyncing(false)
          setSyncMessage("")
          autoSyncTriggered.current = false
        })
    } else {
      // Nếu đã có thư trong DB, thực hiện đồng bộ ngầm (background sync) để không cản trở người dùng
      syncEmails().catch((err) => {
        console.error("Background auto sync failed:", err)
        autoSyncTriggered.current = false
      })
    }
  }, [nylasStatus, data, currentPage, activeCategory])

  // Gọi API phân tích AI khi chọn một email đang ở trạng thái PENDING
  useEffect(() => {
    if (selectedEmailId) {
      const email = data?.content?.find(e => e.id === selectedEmailId);
      if (email && email.label === 'PENDING') {
        analyzeEmail(selectedEmailId).catch(err => {
          console.error("Failed to trigger AI analysis:", err);
        });
      }
    }
  }, [selectedEmailId, data]);

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
  const filteredData = data?.content?.filter(email => {
    let matchesCategory = false
    const labelUpper = email.label?.toUpperCase()

    if (activeCategory === "inbox") {
      const emailCategory = (email.category || "PRIMARY").toUpperCase()
      matchesCategory = labelUpper !== "SPAM" && labelUpper !== "DELETED" && emailCategory === activeTab
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

  const inboxCount = (statsData?.total || 0) - (statsData?.spam || 0)

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

  const selectedEmail = data?.content?.find(e => e.id === selectedEmailId)
  const hasSplit = selectedEmailId !== null && selectedEmail !== undefined

  const [expandedEmailIds, setExpandedEmailIds] = useState<{ [key: string]: boolean }>({})
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [replyBody, setReplyBody] = useState("")
  const [isSendingReply, setIsSendingReply] = useState(false)

  // Lấy tất cả email trong cùng luồng khi có 1 thư được chọn
  const { data: threadEmails, isLoading: isThreadLoading, refetch: refetchThread } = useQuery({
    queryKey: ['threadEmails', selectedEmail?.threadId],
    queryFn: () => {
      if (selectedEmail?.threadId) {
        return getThreadEmails(selectedEmail.threadId).then(r => r.data)
      }
      return Promise.resolve([])
    },
    enabled: !!selectedEmail?.threadId,
  })

  const displayEmails = threadEmails && threadEmails.length > 0 ? threadEmails : (selectedEmail ? [selectedEmail] : [])

  useEffect(() => {
    if (displayEmails.length > 0) {
      const initialExpanded: { [key: string]: boolean } = {}
      displayEmails.forEach((emailItem, index) => {
        // Mặc định mở thư mới nhất (thư ở cuối mảng)
        if (index === displayEmails.length - 1) {
          initialExpanded[emailItem.id] = true
        } else {
          initialExpanded[emailItem.id] = false
        }
      })
      setExpandedEmailIds(initialExpanded)
    }
  }, [threadEmails, selectedEmailId])

  const toggleEmailExpand = (emailId: string | number) => {
    setExpandedEmailIds(prev => ({
      ...prev,
      [emailId]: !prev[emailId]
    }))
  }

  const handleApplySuggestion = (suggestion: string) => {
    setReplyBody(suggestion.trim())
    const replyInput = document.getElementById("reply-textarea")
    if (replyInput) {
      replyInput.focus()
    }
  }

  const handleSendReply = async () => {
    if (!replyBody.trim() || !selectedEmail) return
    setIsSendingReply(true)
    try {
      await sendEmail({
        to: selectedEmail.fromAddress,
        subject: selectedEmail.subject.startsWith("Re:") ? selectedEmail.subject : `Re: ${selectedEmail.subject}`,
        body: replyBody,
        replyToMessageId: selectedEmail.id.toString(),
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
        onComposeClick={() => setIsComposeOpen(true)}
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
                onClick={() => setIsComposeOpen(true)}
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
                className="p-2 rounded-full transition-all duration-200 hover:bg-gray-100"
                style={{ color: "var(--text-secondary)" }}
                title="Tải lại"
              >
                <RefreshCw className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setIsComposeOpen(true)}
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
              <div className="flex items-center gap-4" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                <span>
                  {data?.totalElements && data.totalElements > 0 ? (
                    `${currentPage * 50 + 1}–${currentPage * 50 + (data?.content?.length || 0)} trong số ${data.totalElements}`
                  ) : (
                    '0–0 trong số 0'
                  )}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPageForCurrentKey(currentPage - 1)}
                    disabled={currentPage === 0 || isLoading}
                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPageForCurrentKey(currentPage + 1)}
                    disabled={!data || currentPage >= (data.totalPages - 1) || isLoading}
                    className="p-1 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                    title="Trang sau"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Category Tabs (Gmail-style) ── */}
        {activeCategory === "inbox" && (
          <div 
            className="flex items-center gap-1 overflow-x-auto scrollbar-none flex-shrink-0" 
            style={{ 
              padding: "8px 16px", 
              borderBottom: "1px solid var(--border)",
              background: "var(--bg-panel)" 
            }}
          >
            {CATEGORY_TABS.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 whitespace-nowrap cursor-pointer"
                  style={{
                    background: isActive ? "var(--btn-dark)" : "transparent",
                    color: isActive ? "#FFFFFF" : "var(--text-secondary)",
                  }}
                  onMouseEnter={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "#F3F4F6" }}
                  onMouseLeave={(e) => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = "transparent" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: isActive ? "#FFFFFF" : "var(--text-secondary)" }} />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </div>
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
              {isSyncing || syncMessage ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-4 border-t-transparent animate-spin" style={{ borderColor: "var(--accent-primary)", borderTopColor: "transparent" }} />
                  <h3 className="text-sm font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                    {syncMessage || "Đang đồng bộ..."}
                  </h3>
                  <p className="text-xs max-w-[250px] mx-auto" style={{ color: "var(--text-secondary)" }}>
                    Thư sẽ xuất hiện tự động sau vài giây nhờ kết nối thời gian thực.
                  </p>
                </div>
              ) : (
                <>
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
                </>
              )}
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
                              <p className="text-[11px] font-semibold mb-1" style={{ color: "#059669" }}>✅ Việc cần làm (AI trích xuất)</p>
                              <ul className="text-xs leading-relaxed m-0 list-disc pl-4" style={{ color: "#065F46" }}>
                                {emailItem.actionItems.split("||").map((item, idx) => (
                                  <li key={idx} style={{ color: "#065F46" }}>{item.trim()}</li>
                                ))}
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

                {/* Reply Box at the bottom of the thread stack */}
                <div className="border rounded-xl p-4 bg-white shadow-sm mt-2 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold bg-indigo-600">
                      Me
                    </div>
                    <span className="text-xs font-semibold text-gray-700">Trả lời cho: {selectedEmail.fromAddress}</span>
                  </div>
                  <textarea
                    id="reply-textarea"
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  )
}