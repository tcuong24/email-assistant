import api from './axios'

export type UserData = {
    email: string
    password: string
    firstName: string
    lastName: string
}

export type AuthResponse = {
    accessToken: string
    refreshToken: string
    user: {
        id: number
        email: string
        firstName: string
        lastName: string
    }
}

export type LoginData = Pick<UserData, 'email' | 'password'>

export const register = (data: UserData) => api.post('/auth/register', data)
export const login    = (data: LoginData) => api.post('/auth/login', data)
export const logout   = ()     => api.post('/auth/logout')
export const getMe    = ()     => api.get('/auth/me')