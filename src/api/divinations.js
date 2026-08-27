import { request } from './http.js'
import { useMockApi } from './runtime.js'
import { mockDeleteDivination } from './mock.js'
import { findHistoryRecord, readHistory } from '../utils/history.js'

export const getDivination = async (id) => useMockApi
  ? findHistoryRecord(id)
  : request(`/api/divinations/${encodeURIComponent(id)}`)

export const listDivinations = async ({ cursor, limit = 20 } = {}) => {
  if (useMockApi) return { items: readHistory(), nextCursor: null }
  const query = new URLSearchParams({ limit: String(limit), ...(cursor ? { cursor } : {}) })
  return request(`/api/divinations?${query}`)
}

export const saveDivination = (record) => useMockApi
  ? Promise.resolve(record)
  : request('/api/divinations', { method: 'POST', body: record })

export const mergeDivinations = (records) => useMockApi
  ? Promise.resolve({ items: records.map((record) => ({ clientId: record.clientId, status: 'duplicate' })) })
  : request('/api/divinations/batch-upsert', { method: 'POST', body: { items: records } })

/** Permanently deletes one owned server divination and its dependent AI conversation. */
export const deleteDivination = (id) => useMockApi
  ? mockDeleteDivination(id)
  : request(`/api/divinations/${encodeURIComponent(id)}`, { method: 'DELETE' })
