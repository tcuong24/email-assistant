import { useEffect } from 'react'
import { useNavigate, Link, Navigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import { motion } from 'framer-motion'
import { 
  Mail, 
  Sparkles, 
  Brain, 
  LayoutDashboard, 
  CheckSquare, 
  Zap, 
  ArrowRight, 
  MessageSquare, 
  Clock, 
  TrendingUp, 
  Shield 
} from 'lucide-react'

const Github = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
)

export default function HomePage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Tự động chuyển hướng vào inbox nếu đã đăng nhập
  if (user) {
    return <Navigate to="/inbox" replace />
  }

  // Đánh thức Render services chạy ngầm
  useEffect(() => {
    const warmUp = () => {
      const paths = [
        '/ai/health',
        '/auth/refresh',
        '/emails/nylas-webhook'
      ]
      paths.forEach(path => {
        fetch(`/api/v1${path}`, { method: 'GET', mode: 'no-cors' }).catch(() => {})
      })
    }
    warmUp()
  }, [])

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15
      }
    }
  }

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
    }
  }

  return (
    <div 
      className="min-h-screen text-slate-100 overflow-y-auto scrollbar-thin select-none relative"
      style={{
        background: "linear-gradient(135deg, #070715 0%, #0F0F23 40%, #161632 100%)",
        fontFamily: "var(--sans)"
      }}
    >
      {/* Background radial highlight */}
      <div 
        className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none opacity-20"
        style={{ background: "radial-gradient(circle, #3B82F6 0%, transparent 80%)" }}
      />
      <div 
        className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] rounded-full blur-[140px] pointer-events-none opacity-10"
        style={{ background: "radial-gradient(circle, #10B981 0%, transparent 80%)" }}
      />
      
      {/* Background grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      {/* HEADER / NAVIGATION */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            EmailFlow <span className="text-xs bg-blue-500/25 text-blue-300 font-semibold px-2 py-0.5 rounded-full border border-blue-500/20">AI</span>
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link 
            to="/login" 
            className="text-sm font-medium text-slate-300 hover:text-white px-4 py-2 transition-colors"
          >
            Đăng nhập
          </Link>
          <Link 
            to="/register" 
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-600/10 hover:shadow-blue-600/25"
            style={{
              background: "linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)",
            }}
          >
            Bắt đầu miễn phí
          </Link>
        </div>
      </header>

      {/* HERO SECTION */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-24 grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
        {/* Left column: Text Content */}
        <motion.div 
          className="lg:col-span-7 flex flex-col items-start text-left"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-blue-400 font-medium mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Đồng hành cùng Trí tuệ Nhân tạo & Kafka Event-Driven</span>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white leading-[1.1] mb-6"
          >
            Quản lý Email thông minh & Tự động hóa bằng <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400">Gemini AI</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg text-slate-300 leading-relaxed mb-8 max-w-2xl"
          >
            Đồng bộ hộp thư của bạn nhanh chóng, tự động phân loại danh mục, phân tích cảm xúc, trích xuất hành động công việc và đề xuất phản hồi thông minh ngay lập tức.
          </motion.p>
          
          <motion.div 
            variants={itemVariants}
            className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <button
              onClick={() => navigate('/register')}
              className="group flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-blue-500/25 cursor-pointer border-none"
              style={{
                background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
                padding: "14px 28px",
                borderRadius: 12,
              }}
            >
              Trải nghiệm ngay
              <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
            </button>
            
            <a
              href="https://github.com/tcuong24/email-assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 text-sm font-semibold text-slate-200 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white transition-all duration-200 rounded-xl"
              style={{
                padding: "14px 28px",
              }}
            >
              <Github className="w-5 h-5" />
              Xem trên GitHub
            </a>
          </motion.div>
        </motion.div>

        {/* Right column: Interactive UI Mockup */}
        <motion.div 
          className="lg:col-span-5 relative w-full flex justify-center"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Glassmorphic Mockup Container */}
          <div 
            className="w-full max-w-[420px] rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden"
            style={{
              background: "rgba(20, 20, 45, 0.45)",
              backdropFilter: "blur(20px)",
              boxShadow: "0 30px 60px -15px rgba(0, 0, 0, 0.8)",
            }}
          >
            {/* Mockup Header */}
            <div className="px-5 py-3.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
              </div>
              <span className="text-[11px] font-medium text-slate-400 tracking-wider">HỘP THƯ AI</span>
              <div className="w-4" />
            </div>

            {/* Mockup Body Content */}
            <div className="p-5 flex flex-col gap-4">
              {/* Card 1: Email Item with classification */}
              <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 relative">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-200">Reid Smith</span>
                  <span className="text-[10px] text-slate-400">12:34</span>
                </div>
                <h4 className="text-xs font-bold text-white mb-1.5 truncate">Đề xuất nâng cấp kiến trúc hệ thống</h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2.5">
                  Chào James, tôi thấy chúng ta nên cân nhắc triển khai Apache Kafka làm message broker cho dự án...
                </p>
                <div className="flex gap-2">
                  <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded border border-blue-500/20 font-medium">Work</span>
                  <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded border border-green-500/20 font-medium">🟢 Tích cực</span>
                </div>
              </div>

              {/* Card 2: Extracted Actions */}
              <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-300 mb-2">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Đầu việc AI trích xuất</span>
                </div>
                <ul className="flex flex-col gap-2">
                  <li className="flex items-start gap-2 text-[11px] text-slate-300 leading-tight">
                    <span className="text-indigo-400 mt-0.5">✦</span>
                    Lên lịch họp kiến trúc vào thứ 6 tuần này.
                  </li>
                  <li className="flex items-start gap-2 text-[11px] text-slate-300 leading-tight">
                    <span className="text-indigo-400 mt-0.5">✦</span>
                    Chuẩn bị tài liệu so sánh Kafka và RabbitMQ.
                  </li>
                </ul>
              </div>

              {/* Card 3: Smart Reply */}
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-1.5">
                  <Brain className="w-3.5 h-3.5" />
                  <span>AI đề xuất phản hồi</span>
                </div>
                <p className="text-[11px] text-slate-300 italic mb-2 leading-relaxed">
                  "Chào Reid, ý kiến tuyệt vời! Tôi sẽ setup cuộc họp để cả team thảo luận cụ thể..."
                </p>
                <button 
                  className="w-full text-center text-[10px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors py-1.5 rounded-md border-none"
                >
                  Sử dụng bản nháp này
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* FEATURES SECTION */}
      <section className="relative z-10 bg-slate-950/40 border-t border-white/5 py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl mb-4">
              Giải Pháp Trải Nghiệm Toàn Diện
            </h2>
            <p className="text-lg text-slate-400">
              Công nghệ hiện đại giải phóng bạn khỏi sự bận rộn quá tải của email mỗi ngày.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div 
              className="p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20 text-blue-400 mb-5">
                <Zap className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Đồng bộ hóa Real-time</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tích hợp Nylas API v3 và Webhook giúp đồng bộ tức thời các nhà cung cấp Gmail, Outlook một cách nhanh chóng, mượt mà.
              </p>
            </div>

            {/* Feature 2 */}
            <div 
              className="p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center border border-purple-500/20 text-purple-400 mb-5">
                <Brain className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Trí Tuệ Nhân Tạo</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Google Gemini tự động phân loại thư, phát hiện cảm xúc, tóm tắt và sinh thư nháp phản hồi nhanh chóng theo ngữ cảnh.
              </p>
            </div>

            {/* Feature 3 */}
            <div 
              className="p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 text-emerald-400 mb-5">
                <CheckSquare className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Tự Động Hóa Đầu Việc</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Tự động lọc các yêu cầu quan trọng và tạo các thẻ Kanban board giúp bạn theo sát tiến độ công việc được yêu cầu.
              </p>
            </div>

            {/* Feature 4 */}
            <div 
              className="p-6 rounded-2xl border border-white/5 hover:border-white/10 transition-all duration-200"
              style={{ background: "rgba(255, 255, 255, 0.02)" }}
            >
              <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 text-orange-400 mb-5">
                <LayoutDashboard className="w-5.5 h-5.5" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Microservices & Kafka</h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                Kiến trúc hướng sự kiện (Event-Driven) vững chắc đảm bảo hệ thống phản hồi cực nhanh và cập nhật realtime qua WebSockets.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TECH STACK & SYSTEM SPECS */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-2xl font-bold text-white mb-4">Kiến trúc Hệ thống Mạnh mẽ</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-6">
            Dự án được phân rã thành các dịch vụ độc lập, giúp cô lập dữ liệu, mở rộng băng thông xử lý tác vụ nặng liên quan đến AI và hòm thư một cách ổn định nhất.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">Spring Cloud Gateway</span>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">Spring Boot</span>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">FastAPI</span>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">Apache Kafka</span>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">React 19 & Vite</span>
            <span className="text-xs bg-white/5 border border-white/10 text-slate-300 px-3 py-1 rounded-full font-medium">PostgreSQL</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-6 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
          <div className="flex gap-4 items-start">
            <TrendingUp className="w-5.5 h-5.5 text-blue-400 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Hiệu năng tối ưu</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Xử lý bất đồng bộ các luồng tác vụ nặng qua broker.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <Clock className="w-5.5 h-5.5 text-indigo-400 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Realtime 100%</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Đẩy thông báo tức thời ngay khi Gemini xử lý xong.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <Shield className="w-5.5 h-5.5 text-emerald-400 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Bảo mật JWT</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Bộ lọc an toàn với mã hóa token không trạng thái.</p>
            </div>
          </div>
          
          <div className="flex gap-4 items-start">
            <MessageSquare className="w-5.5 h-5.5 text-orange-400 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-white mb-1">Nylas Integration</h4>
              <p className="text-xs text-slate-400 leading-relaxed">Kết nối hộp thư thông qua OAuth bảo mật và chuẩn xác.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-xs text-slate-500">© 2026 EmailFlow. Bản quyền thuộc về tác giả.</span>
        <div className="flex gap-6">
          <a 
            href="https://github.com/tcuong24/email-assistant" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Github className="w-4 h-4" />
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  )
}
