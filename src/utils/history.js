import { getHexagramFromLines } from './hexagram.js'

export const HISTORY_STORAGE_KEY = 'cyber-yigua-history-v1'
export const HISTORY_LIMIT = 10
export const HISTORY_SCHEMA_VERSION = 1

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const isLineSequence = (lines) => (
  Array.isArray(lines)
  && lines.length === 6
  && lines.every((value) => [6, 7, 8, 9].includes(value))
)

const createClientId = () => (
  globalThis.crypto?.randomUUID?.()
  ?? 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16)
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16)
  })
)

const hashLegacyIdentity = (identity, seed) => {
  let hash = seed
  for (const character of identity) {
    hash ^= character.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** Maps a pre-contract local identifier to a stable UUID without uploading the old value. */
const migrateClientId = (record, clientId) => {
  if (UUID_PATTERN.test(clientId)) return clientId
  const identity = JSON.stringify([clientId, record.createdAt, record.lines])
  const words = [
    hashLegacyIdentity(identity, 2166136261),
    hashLegacyIdentity(identity, 2246822507),
    hashLegacyIdentity(identity, 3266489909),
    hashLegacyIdentity(identity, 668265263),
  ]
  const bytes = words.flatMap((word) => [word >>> 24, word >>> 16, word >>> 8, word].map((value) => value & 0xff))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map((value) => value.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}

/**
 * Creates the versioned local record sent to the backend contract.
 * @param {number[]} lines Six line values ordered from bottom to top.
 * @param {{clientId?: string, createdAt?: number}} [options] Stable identity options.
 * @returns {{clientId: string, createdAt: number, lines: number[], original: {number: number, name: string}, transformed: {number: number, name: string}|null, schemaVersion: number}}
 */
export const createHistoryRecord = (lines, options = {}) => {
  if (!isLineSequence(lines)) throw new TypeError('A history record requires six valid line values.')
  const result = getHexagramFromLines(lines)
  return {
    clientId: options.clientId ?? createClientId(),
    createdAt: options.createdAt ?? Date.now(),
    lines: [...lines],
    original: { number: result.original.number, name: result.original.name },
    transformed: result.changingLines.length
      ? { number: result.transformed.number, name: result.transformed.name }
      : null,
    schemaVersion: HISTORY_SCHEMA_VERSION,
  }
}

const normalizeRecord = (record) => {
  if (!record || !Number.isFinite(record.createdAt) || !isLineSequence(record.lines)) return null
  const legacyClientId = typeof record.clientId === 'string'
    ? record.clientId
    : typeof record.id === 'string' ? record.id : null
  if (!legacyClientId) return null

  const clientId = migrateClientId(record, legacyClientId)
  const canonical = createHistoryRecord(record.lines, { clientId, createdAt: record.createdAt })
  return canonical
}

export const normalizeHistory = (value) => (
  Array.isArray(value)
    ? value.map(normalizeRecord).filter(Boolean).slice(0, HISTORY_LIMIT)
    : []
)

export const readHistory = (storage = globalThis.localStorage) => {
  try {
    const raw = storage.getItem(HISTORY_STORAGE_KEY)
    const parsed = normalizeHistory(raw ? JSON.parse(raw) : [])
    if (raw && JSON.stringify(parsed) !== raw) storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(parsed))
    return parsed
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

export const appendHistory = (history, record) => normalizeHistory([record, ...history])

/** Converts a local record to the payload accepted by divination APIs. */
export const toApiDivination = (record) => ({
  clientId: record.clientId,
  createdAt: new Date(record.createdAt).toISOString(),
  original: record.original,
  transformed: record.transformed,
  schemaVersion: record.schemaVersion,
})

/** Removes local anonymous records confirmed by the server. */
export const removeHistoryRecords = (history, clientIds) => {
  const removed = new Set(clientIds)
  return normalizeHistory(history.filter((record) => !removed.has(record.clientId)))
}

export const findHistoryRecord = (clientId, storage = globalThis.localStorage) => (
  readHistory(storage).find((record) => record.clientId === clientId) ?? null
)
