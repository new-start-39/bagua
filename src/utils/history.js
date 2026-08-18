export const HISTORY_STORAGE_KEY = 'cyber-yigua-history-v1'
export const HISTORY_LIMIT = 10

const isValidRecord = (record) => (
  record
  && typeof record.id === 'string'
  && Number.isFinite(record.createdAt)
  && Array.isArray(record.lines)
  && record.lines.length === 6
  && record.lines.every((value) => [6, 7, 8, 9].includes(value))
)

export const normalizeHistory = (value) => (
  Array.isArray(value)
    ? value.filter(isValidRecord).slice(0, HISTORY_LIMIT)
    : []
)

export const readHistory = (storage = globalThis.localStorage) => {
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY)
    return normalizeHistory(raw ? JSON.parse(raw) : [])
  } catch {
    return []
  }
}

export const writeHistory = (history, storage = globalThis.localStorage) => {
  const normalized = normalizeHistory(history)
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(normalized))
  } catch {
    // localStorage may be unavailable or full; the current session can continue.
  }
  return normalized
}

export const appendHistory = (history, record) => (
  normalizeHistory([record, ...history])
)
