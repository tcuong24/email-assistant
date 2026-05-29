import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getEmails } from '../api/emailApi'
import Navbar from '../components/Navbar'
import LabelBadge from '../components/LabelBadge'
import Sidebar from '../components/Sidebar'
import EmailSection from '../components/EmailSection'
import { Search, Plus, Reply, Trash2, Star, CornerUpRight, RefreshCw, MailOpen } from 'lucide-react'

export default function InboxPage() {
  const [activeCategory, setActiveCategory] = useState("inbox")
  const [searchQuery, setSearchQuery] = useState("")
  const [filterTab, setFilterTab] = useState("all")
  const [selectedEmailId, setSelectedEmailId] = useState<string | number | null>(null)

  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['emails'],
    queryFn: () => getEmails().then(r => r.data),
    refetchInterval: 10000, // tự refetch mỗi 10s
  })

  // Filter logic
  const filteredData = data?.filter(email => {
    // 1. Sidebar Category filter
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
      matchesCategory = labelUpper === "NORMAL" // mock classification for custom folder
    } else {
      matchesCategory = true
    }
    
    if (!matchesCategory) return false

    // 2. Search Query filter
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch = 
      email.fromAddress?.toLowerCase().includes(searchLower) ||
      email.subject?.toLowerCase().includes(searchLower) ||
      email.summary?.toLowerCase().includes(searchLower) ||
      email.body?.toLowerCase().includes(searchLower)
      
    if (!matchesSearch) return false

    // 3. Read/Unread Tab filter
    const isUnread = email.status !== "READ"
    if (filterTab === "read") return !isUnread
    if (filterTab === "unread") return isUnread

    return true
  }) || []

  // Reset selected email to null when navigation or filter search changes
  useEffect(() => {
    setSelectedEmailId(null)
  }, [activeCategory, filterTab, searchQuery])

  // Count inbox emails (excluding SPAM for standard inbox)
  const inboxCount = data?.filter(email => email.label?.toUpperCase() !== "SPAM").length || 0

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'inbox': return 'Hộp thư'
      case 'important': return 'Quan trọng'
      case 'sent': return 'Sent'
      case 'drafts': return 'Drafts'
      case 'deleted': return 'Deleted'
      case 'client': return 'Client'
      default: return 'Email'
    }
  }

  const selectedEmail = data?.find(e => e.id === selectedEmailId)

  // Generate avatar text
  const getAvatarInitials = (address: string) => {
    if (!address) return "?"
    const cleanName = address.split("@")[0]
    return cleanName.slice(0, 2).toUpperCase()
  }

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-[#5b52c0] border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-medium">Đang tải hộp thư...</span>
        </div>
      </div>
    </div>
  )

  return (
    <div className="h-screen bg-gray-50 flex flex-col font-sans overflow-hidden">
      {/* Top Navbar */}
      <Navbar />

      {/* Main Split Container */}
      <div className="flex flex-1 w-full bg-white overflow-hidden">
        {/* 1. Left Sidebar */}
        <Sidebar 
          activeItem={activeCategory} 
          inboxCount={inboxCount}
          onSelectItem={setActiveCategory} 
        />

        {/* 2. Middle Email List Pane */}
        <div className={`flex flex-col bg-white transition-all duration-300 ${
          selectedEmailId 
            ? "w-[380px] md:w-[410px] border-r border-gray-100 flex-shrink-0" 
            : "flex-1 overflow-hidden"
        }`}>
          {/* Header & Compose */}
          <div className="flex justify-between items-center px-5 pt-5 pb-3">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => refetch()} 
                className={`p-1.5 rounded-lg text-gray-400 hover:text-[#5b52c0] hover:bg-gray-100 transition-colors ${
                  isFetching ? "animate-spin text-[#5b52c0]" : ""
                }`}
                title="Tải lại hộp thư"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            {/* Compose Button */}
            <button 
              className="w-8 h-8 rounded-full bg-black text-white hover:bg-neutral-800 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 active:scale-95 shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
              title="Soạn thư mới"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          {/* Search bar */}
          <div className="px-5 py-1">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search" 
                className="w-full bg-[#f2f0fc]/50 border border-transparent outline-none pl-9 pr-4 py-2 rounded-xl text-sm text-gray-700 placeholder-gray-400 focus:bg-white focus:border-purple-200/80 transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex gap-1.5 px-5 py-3 border-b border-gray-50 flex-shrink-0">
            {['all', 'read', 'unread'].map(f => (
              <button
                key={f}
                onClick={() => setFilterTab(f)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all duration-200 ${
                  filterTab === f 
                    ? "bg-neutral-900 text-white shadow-sm" 
                    : "bg-transparent text-gray-500 hover:bg-gray-100/80 hover:text-gray-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Scrollable Email List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin divide-y divide-gray-50/50">
            {error && (
              <div className="m-4 bg-red-50 border border-red-100 text-red-600 text-xs p-3.5 rounded-xl">
                Không thể tải danh sách email. Vui lòng thử lại.
              </div>
            )}

            {filteredData.map(email => (
              <EmailSection 
                key={email.id} 
                email={email} 
                isSelected={email.id === selectedEmailId}
                layoutMode={selectedEmailId ? "compact" : "horizontal"}
                onClick={() => setSelectedEmailId(email.id)}
              />
            ))}

            {filteredData.length === 0 && !isLoading && (
              <div className="text-center py-16 px-4">
                <div className="w-12 h-12 bg-purple-50 text-purple-400 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MailOpen className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-gray-700 mb-0.5">
                  Thư mục trống
                </h3>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  Không tìm thấy email nào phù hợp với bộ lọc.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Right Email Detail Pane */}
        {selectedEmailId && selectedEmail && (
          <div className="flex-1 flex flex-col bg-white overflow-hidden border-l border-gray-100 animate-fade-in transition-all duration-300">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Header Action toolbar */}
              <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100/80 bg-gray-50/30 flex-shrink-0">
                <div className="flex items-center gap-1 md:gap-2">
                  {/* Close Preview (Back to full list) */}
                  <button 
                    onClick={() => setSelectedEmailId(null)}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors mr-2 flex items-center justify-center"
                    title="Đóng bản xem trước"
                  >
                    <span className="text-sm font-extrabold">←</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                    <Reply className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                    <Reply className="w-3.5 h-3.5 rotate-180" />
                    <span>Reply all</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors">
                    <CornerUpRight className="w-3.5 h-3.5" />
                    <span>Forward</span>
                  </button>
                  <div className="w-px h-4 bg-gray-200 mx-1" />
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                  <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-500 hover:bg-amber-50 hover:text-amber-600 transition-colors">
                    <Star className="w-3.5 h-3.5" />
                    <span>Important</span>
                  </button>
                </div>

                {/* VIEW FULL DETAILS LINK */}
                <Link 
                  to={`/emails/${selectedEmail.id}`}
                  className="text-xs font-bold text-[#5b52c0] bg-[#f2f0fc] hover:bg-[#eae6fa] px-3.5 py-2 rounded-xl border border-purple-100 transition-all flex items-center gap-1 shadow-sm active:scale-95"
                >
                  Xem chi tiết →
                </Link>
              </div>

              {/* Email Content Area */}
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <div className="max-w-3xl mx-auto">
                  {/* Sender Info & Date */}
                  <div className="flex items-start gap-4 mb-6">
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#5b52c0] to-[#8c7ff2] text-white flex items-center justify-center font-bold text-sm shadow-md shadow-[#5b52c0]/10 flex-shrink-0">
                      {getAvatarInitials(selectedEmail.fromAddress)}
                    </div>
                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-4">
                        <h2 className="text-base font-bold text-gray-900 truncate">
                          {selectedEmail.fromAddress}
                        </h2>
                        <span className="text-xs font-semibold text-gray-400 shrink-0">
                          {new Date(selectedEmail.receivedAt).toLocaleDateString('vi-VN', {
                            day: 'numeric',
                            month: 'long',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      
                      {/* Subject */}
                      <h3 className="text-sm font-semibold text-gray-600 mt-1">
                        {selectedEmail.subject}
                      </h3>
                      
                      {/* Recipients info */}
                      <p className="text-[11px] text-gray-400 mt-1 flex gap-2">
                        <span>To: me</span>
                        {selectedEmail.label && (
                          <>
                            <span>•</span>
                            <span className="font-semibold text-purple-600">Label: {selectedEmail.label}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <hr className="border-gray-100 my-5" />

                  {/* Body Content */}
                  <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-line font-sans bg-gray-50/20 rounded-2xl p-6 border border-gray-50/50">
                    {selectedEmail.body || selectedEmail.summary || "Thư không có nội dung."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}