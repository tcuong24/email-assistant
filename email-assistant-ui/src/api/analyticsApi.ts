import api from './axios'

export const getSummary = (from:Date, to:Date) =>
  api.get(`/analytics/summary?from=${from}&to=${to}`)

export const getDailyStats = (from:Date, to:Date) =>
  api.get(`/analytics/daily?from=${from}&to=${to}`)