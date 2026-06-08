import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './store/authStore'
import ProtectedRoute from './components/ProtectedRoute'
import { Toaster } from 'sonner'

import InboxPage from './pages/InboxPage'
import EmailDetailPage from './pages/EmailDetailPage'
import DashboardPage from './pages/DashboardPage'
import TasksPage from './pages/TasksPage'
import LoginPage from './pages/LoginForm'
import RegisterPage from './pages/RegisterForm'
import OAuthCallback from './components/OAuthNylas'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/oauth/callback" element={<OAuthCallback />} />
            <Route path="/inbox" element={
              <ProtectedRoute><InboxPage /></ProtectedRoute>
            }/>
            <Route path="/emails/:id" element={
              <ProtectedRoute><EmailDetailPage /></ProtectedRoute>
            }/>
            <Route path="/dashboard" element={
              <ProtectedRoute><DashboardPage /></ProtectedRoute>
            }/>
            <Route path="/tasks" element={
              <ProtectedRoute><TasksPage /></ProtectedRoute>
            }/>
            <Route path="*" element={<Navigate to="/inbox" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}