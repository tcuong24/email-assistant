import BorderBeam from "./BorderBeam";

const config = {
  IMPORTANT: { text: 'Quan trọng', cls: 'bg-green-100 text-green-700' },
  SPAM:      { text: 'Spam',       cls: 'bg-red-100 text-red-600' },
  NORMAL:    { text: 'Bình thường',cls: 'bg-gray-100 text-gray-600' },
  PENDING:   { text: 'Đang xử lý', cls: 'bg-yellow-50 text-yellow-700 border border-yellow-100/50' },
}

interface LabelBadgeProps {
  label: string;
}

export default function LabelBadge({ label }: LabelBadgeProps) {
  const { text, cls } = (config as any)[label] || config.NORMAL

  if (label === 'PENDING') {
    return null;
  }

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cls}`}>
      {text}
    </span>
  )
}
