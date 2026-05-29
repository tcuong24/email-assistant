import { createContext, useContext, useState, type ReactNode,  } from 'react'

export type User = {
  id: number
  email: string
  firstName: string
  lastName: string
}

type AuthContextType = {
  user: User | null
  saveAuth: (data: { accessToken: string; refreshToken: string; user: User }) => void
  clearAuth: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })

  const saveAuth = (data: { accessToken: string; refreshToken: string; user: User }) => {
    localStorage.setItem('accessToken', data.accessToken)
    localStorage.setItem('refreshToken', data.refreshToken)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
  }

  const clearAuth = () => {
    localStorage.clear()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, saveAuth, clearAuth }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
