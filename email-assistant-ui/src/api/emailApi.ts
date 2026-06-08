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
    actionItems?: string
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

export interface Page<T> {
    content: T[]
    totalElements: number
    totalPages: number
    size: number
    number: number
}

export const getEmails       = (category?: string, page = 0, size = 50) => api.get<Page<Email>>(category ? `/emails?category=${category}&page=${page}&size=${size}` : `/emails?page=${page}&size=${size}`)
export const getSentEmails   = (page = 0, size = 50) => api.get<Page<Email>>(`/emails/sent?page=${page}&size=${size}`)
export const getDraftEmails  = (page = 0, size = 50) => api.get<Page<Email>>(`/emails/drafts?page=${page}&size=${size}`)
export const getEmailStats   = () => api.get<{ total: number, unread: number, important: number, spam: number }>('/emails/stats')
export const getEmail        = (id: number | string) => api.get<Email>(`/emails/${id}`)
export const receiveEmail    = (data: EmailData) => api.post<Email>('/emails/receive', data)
export const analyzeEmail    = (id: number | string) => api.post<Email>(`/emails/${id}/analyze`)
export const getNylasStatus  = () => api.get<{ connected: boolean }>('/emails/nylas/status')
export const syncEmails      = () => api.post<{ status: string, message: string }>('/emails/sync')
export const getThreadEmails = (threadId: string) => api.get<Email[]>(`/emails/thread/${threadId}`)
export const updateReadStatus = (id: number | string, isRead: boolean) => api.patch<Email>(`/emails/${id}/read?isRead=${isRead}`)
export const bulkUpdateEmails = (data: { emailIds: (number | string)[], label?: string, category?: string, isRead?: boolean }) => api.patch<void>('/emails/bulk', data)

export type SendEmailPayload = {
    to: string
    subject: string
    body: string
    replyToMessageId?: string
}

export const sendEmail       = (data: SendEmailPayload) => api.post<Email>('/emails/send', data)

export type Task = {
    id: number | string
    userId: number | string
    title: string
    description?: string
    status: 'TODO' | 'IN_PROGRESS' | 'DONE'
    priority: 'HIGH' | 'MEDIUM' | 'LOW'
    category?: string
    dueDate?: string
    emailId?: number | string
    createdAt?: string
    updatedAt?: string
}

export const getTasks = () => api.get<Task[]>('/tasks')
export const createTask = (data: Partial<Task>) => api.post<Task>('/tasks', data)
export const updateTaskStatus = (id: number | string, status: 'TODO' | 'IN_PROGRESS' | 'DONE') => api.put<Task>(`/tasks/${id}/status?status=${status}`)
export const deleteTask = (id: number | string) => api.delete<void>(`/tasks/${id}`)