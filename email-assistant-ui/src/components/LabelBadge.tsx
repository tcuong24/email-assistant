const config = {
  IMPORTANT: { text: 'Quan trọng', cls: 'bg-green-100 text-green-700' },
  SPAM:      { text: 'Spam',       cls: 'bg-red-100 text-red-600' },
  NORMAL:    { text: 'Bình thường',cls: 'bg-gray-100 text-gray-600' },
  PENDING:   { text: 'Đang xử lý',cls: 'bg-yellow-100 text-yellow-700' },
}

export default function LabelBadge({ label }) {
  const { text, cls } = config[label] || config.PENDING
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {text}
    </span>
  )
}