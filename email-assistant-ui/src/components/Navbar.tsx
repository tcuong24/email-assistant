import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../store/authStore'
import { logout } from '../api/authApi'

export default function Navbar() {
  const { user, clearAuth } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  const handleConnectEmail = () => {
    const clientId = import.meta.env.VITE_NYLAS_CLIENT_ID || "YOUR_NYLAS_CLIENT_ID";
    const redirectUri = window.location.origin + "/oauth/callback";
    const nylasApiUrl = import.meta.env.VITE_NYLAS_API_URL || "https://api.us.nylas.com";
    const authUrl = `${nylasApiUrl}/v3/connect/auth?` + 
      `client_id=${clientId}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&provider=google` +
      `&scope=https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/gmail.readonly`;

    window.location.href = authUrl;
  }

  return (
    <nav className="bg-white border-b border-gray-100 px-4 py-3">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        <div className="flex gap-6">
          <Link to="/inbox"
            className="text-sm font-medium text-gray-700 hover:text-blue-600">
            📥 Hộp thư
          </Link>
          <Link to="/dashboard"
            className="text-sm font-medium text-gray-700 hover:text-blue-600">
            📊 Dashboard
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleConnectEmail}
            className="text-xs bg-blue-50 text-blue-600 hover:bg-blue-100 px-2 py-1 rounded transition-colors font-medium">
            🔗 Kết nối Email
          </button>
          <span className="text-xs text-gray-400">{user?.email}</span>
          <button onClick={handleLogout}
            className="text-xs text-gray-500 hover:text-red-500">
            Đăng xuất
          </button>
        </div>
      </div>
    </nav>
  )
}