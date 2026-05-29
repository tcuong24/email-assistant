import { useQuery } from '@tanstack/react-query'
import { useParams, useNavigate } from 'react-router-dom'
import { getEmail } from '../api/emailApi'
import Navbar from '../components/Navbar'
import LabelBadge from '../components/LabelBadge'


export default function EmailDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: email, isLoading } = useQuery({
    queryKey: ['email', id],
    queryFn: () => getEmail(Number(id)).then(r => r.data),
    enabled: !!id,
  })

  if (isLoading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex justify-center pt-20 text-gray-400">Đang tải...</div>
    </div>
  )

  const replies = email?.suggestedReplies
    ? email.suggestedReplies.split('||')
    : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-gray-500 hover:text-gray-700 mb-4 flex items-center gap-1">
          ← Quay lại
        </button>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          {/* Header */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-lg font-semibold text-gray-800">
                {email?.subject}
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Từ: {email?.fromAddress}
              </p>
            </div>
            <LabelBadge label={email?.label} />
          </div>

          {/* Tóm tắt AI */}
          {email?.summary && (
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-xs font-medium text-blue-600 mb-1">
                ✨ AI tóm tắt
              </p>
              <p className="text-sm text-blue-800">{email.summary}</p>
            </div>
          )}

          {/* Nội dung gốc */}
          <div>
            <p className="text-xs text-gray-400 mb-2">Nội dung gốc</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
              {email?.body}
            </p>
          </div>

          {/* Gợi ý reply */}
          {replies.length > 0 && (
            <div>
              <p className="text-xs text-gray-400 mb-2">
                💬 Gợi ý trả lời
              </p>
              <div className="space-y-2">
                {replies.map((reply, i) => (
                  <div key={i}
                    className="border border-gray-200 rounded-lg px-4 py-2
                               text-sm text-gray-700 hover:bg-gray-50
                               cursor-pointer transition-colors">
                    {reply}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}