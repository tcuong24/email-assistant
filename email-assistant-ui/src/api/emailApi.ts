import api from './axios'
export type Email = {
    id: number
    to: string
    cc: string
    bcc: string
    subject: string
    body: string
    status: string
    createdAt: string
    updatedAt: string
}
export type EmailData = {
    id: string
    fromtAddress: string
    subject: string
    body: string
    label:string;
    summary:string
    status: string
    suggestedReplies:string
    userId:string;
    receivedAt: string
    updatedAt: string
    category?: string
}
export const getEmails    = ()     => api.get('/emails')
export const getEmail     = (id:number)   => api.get(`/emails/${id}`)
export const receiveEmail = (data:EmailData) => api.post('/emails/receive', data)
export const analyzeEmail = (id: number | string) => api.post(`/emails/${id}/analyze`)