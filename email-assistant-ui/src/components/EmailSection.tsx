import * as React from "react"
import { Star } from "lucide-react"
import LabelBadge from "./LabelBadge"

interface Email {
    id: string | number
    fromAddress: string
    subject: string
    summary?: string
    body?: string
    label: string
    status: string
    receivedAt: string
}

interface EmailSectionProps {
    email: Email
    isSelected: boolean
    layoutMode: "horizontal" | "compact"
    onClick: () => void
}

const EmailSection = ({ email, isSelected, layoutMode, onClick }: EmailSectionProps) => {
    const isUnread = email.status !== "READ"

    if (layoutMode === "horizontal") {
        return (
            <div 
                onClick={onClick}
                className="flex items-center gap-4 px-6 py-3 border-b border-gray-100 hover:bg-gray-50/60 cursor-pointer select-none bg-white transition-colors text-sm"
            >
                {/* Left indicators (Unread Dot & Star) */}
                <div className="flex items-center gap-2.5 shrink-0">
                    {/* Unread Dot */}
                    <div className={`w-2 h-2 rounded-full transition-all shrink-0 ${
                        isUnread ? "bg-emerald-500 scale-100" : "bg-transparent scale-0"
                    }`} />
                    {/* Star Icon */}
                    <button 
                        onClick={(e) => {
                            e.stopPropagation()
                        }}
                        className="text-gray-300 hover:text-amber-400 transition-colors shrink-0"
                    >
                        <Star className={`w-4 h-4 ${email.label === 'IMPORTANT' ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </button>
                </div>

                {/* Sender (Username part of email) */}
                <div className={`w-44 shrink-0 truncate text-[14px] ${
                    isUnread ? "font-bold text-gray-900" : "text-gray-600 font-medium"
                }`}>
                    {email.fromAddress.split("@")[0]}
                </div>

                {/* Subject & Summary inline */}
                <div className="flex-1 min-w-0 flex items-baseline gap-2 truncate text-sm">
                    <span className={`shrink-0 ${
                        isUnread ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                    }`}>
                        {email.subject}
                    </span>
                    <span className="text-gray-300 font-normal shrink-0">-</span>
                    <span className="text-gray-400 font-normal truncate">
                        {email.summary || email.body || "Thư không có nội dung."}
                    </span>
                </div>

                {/* Badge */}
                <div className="shrink-0 scale-90">
                    <LabelBadge label={email.label} />
                </div>

                {/* Date */}
                <div className="w-20 text-right text-xs text-gray-400 font-medium shrink-0">
                    {new Date(email.receivedAt).toLocaleDateString('vi-VN', {
                        day: 'numeric',
                        month: 'short'
                    })}
                </div>
            </div>
        )
    }

    // Compact layout (when split screen is active)
    return (
        <div 
            onClick={onClick}
            className={`flex items-start gap-3 p-4 border-b border-gray-100/80 cursor-pointer transition-all duration-200 select-none relative ${
                isSelected 
                    ? "bg-purple-50/50 border-l-4 border-[#5b52c0]" 
                    : "bg-white hover:bg-gray-50/80 border-l-4 border-transparent"
            }`}
        >
            {/* Left indicators (Unread Dot & Star) */}
            <div className="flex flex-col items-center gap-2 pt-1.5 shrink-0">
                {/* Unread Dot */}
                <div className={`w-2.5 h-2.5 rounded-full transition-all ${
                    isUnread ? "bg-emerald-500 scale-100" : "bg-transparent scale-0"
                }`} />
                {/* Star Icon */}
                <button 
                    onClick={(e) => {
                        e.stopPropagation()
                    }}
                    className="text-gray-300 hover:text-amber-400 transition-colors shrink-0"
                >
                    <Star className={`w-4 h-4 ${email.label === 'IMPORTANT' ? 'fill-amber-400 text-amber-400' : ''}`} />
                </button>
            </div>

            {/* Email info */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-baseline mb-1">
                    <h4 className={`text-sm truncate transition-colors ${
                        isUnread ? "font-bold text-gray-900" : "font-semibold text-gray-700"
                    }`}>
                        {email.fromAddress}
                    </h4>
                    <span className="text-[11px] font-medium text-gray-400 shrink-0 ml-2">
                        {new Date(email.receivedAt).toLocaleTimeString('vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                        })}
                    </span>
                </div>
                
                <p className={`text-sm truncate mb-0.5 ${
                    isUnread ? "font-semibold text-gray-900" : "font-medium text-gray-600"
                }`}>
                    {email.subject}
                </p>
                
                {email.summary && (
                    <p className="text-xs text-gray-400 truncate line-clamp-1 leading-relaxed">
                        {email.summary}
                    </p>
                )}
            </div>

            {/* Label badge on card */}
            <div className="absolute bottom-4 right-4 shrink-0 scale-90 origin-bottom-right">
                <LabelBadge label={email.label} />
            </div>
        </div>
    )
}

export default EmailSection