import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { register } from '../api/authApi'
import { useAuth } from '../store/authStore'
import { Mail, Lock, User, ArrowRight } from 'lucide-react'

export default function RegisterPage() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { saveAuth } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (form.password.length < 8) {
      setError('Mật khẩu phải chứa ít nhất 8 ký tự')
      setLoading(false)
      return
    }

    try {
      // Gọi API đăng ký
      const { data } = await register({
        email: form.email,
        password: form.password,
        fullName: form.fullName,
      })
      
      saveAuth(data)
      navigate('/inbox')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Đăng ký tài khoản thất bại. Vui lòng thử lại.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{
        background: "linear-gradient(135deg, #0F0F23 0%, #1A1A2E 40%, #16213E 100%)",
      }}
    >
      {/* Subtle grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative w-full max-w-md mx-4 z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1
            className="text-3xl font-bold text-white tracking-tight"
            style={{ margin: 0 }}
          >
            dappr
          </h1>
          <p className="text-sm mt-2" style={{ color: "rgba(255,255,255,0.5)" }}>
            Email Assistant powered by AI
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl"
          style={{
            background: "rgba(255, 255, 255, 0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            padding: "36px 32px",
            boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          }}
        >
          <h2
            className="text-xl font-bold text-white text-center mb-6"
            style={{ margin: "0 0 24px 0" }}
          >
            Đăng ký tài khoản
          </h2>

          {error && (
            <div
              className="text-sm rounded-xl mb-4 flex items-center gap-2"
              style={{
                padding: "12px 16px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.2)",
                color: "#FCA5A5",
              }}
            >
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Full Name Field */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Họ và tên
              </label>
              <div className="relative">
                <User
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={e => setForm({ ...form, fullName: e.target.value })}
                  placeholder="Nguyễn Văn A"
                  className="w-full outline-none text-sm text-white transition-all duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: "12px 16px 12px 40px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Email
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  className="w-full outline-none text-sm text-white transition-all duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: "12px 16px 12px 40px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold mb-2" style={{ color: "rgba(255,255,255,0.6)" }}>
                Mật khẩu (tối thiểu 8 ký tự)
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: "rgba(255,255,255,0.3)" }}
                />
                <input
                  type="password"
                  required
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full outline-none text-sm text-white transition-all duration-200"
                  style={{
                    background: "rgba(255, 255, 255, 0.06)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: 12,
                    padding: "12px 16px 12px 40px",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)"
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"
                    e.currentTarget.style.boxShadow = "none"
                  }}
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-50 hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #3B82F6, #2563EB)",
                padding: "13px 24px",
                borderRadius: 12,
                border: "none",
                marginTop: 4,
                boxShadow: "0 4px 15px rgba(59, 130, 246, 0.3)",
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? (
                <>
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
                  />
                  Đang đăng ký...
                </>
              ) : (
                <>
                  Đăng ký
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-sm mt-5" style={{ color: "rgba(255,255,255,0.4)" }}>
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="font-semibold transition-colors hover:text-white no-underline"
              style={{ color: "#60A5FA" }}
            >
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Footer */}
        <p
          className="text-center text-[11px] mt-6"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          © 2026 dappr. All rights reserved.
        </p>
      </div>
    </div>
  )
}
