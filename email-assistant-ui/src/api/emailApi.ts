import api from './axios'

export type Attachment = {
    id?: number
    filename: string
    contentType: string
    size: number
    r2Url: string
}

export type Email = {
    id: number | string
    fromAddress: string
    fromName?: string
    subject: string
    body: string
    label: string
    summary?: string
    suggestedReplies?: string
    userId: number | string
    receivedAt: string
    updatedAt?: string
    category?: string
    hasAttachments?: boolean
    threadId?: string
    isRead?: boolean
    status?: string
    attachments?: Attachment[]
    threadCount?: number
    isUnread?: boolean
}

export type EmailData = Email

export const getEmails       = () => api.get<Email[]>('/emails')
export const getEmail        = (id: number | string) => api.get<Email>(`/emails/${id}`)
export const receiveEmail    = (data: EmailData) => api.post<Email>('/emails/receive', data)
export const analyzeEmail    = (id: number | string) => api.post<Email>(`/emails/${id}/analyze`)
export const getNylasStatus  = () => api.get<{ connected: boolean }>('/emails/nylas/status')
export const syncEmails      = () => api.post<{ status: string, message: string }>('/emails/sync')
export const getThreadEmails = (threadId: string) => api.get<Email[]>(`/emails/thread/${threadId}`)