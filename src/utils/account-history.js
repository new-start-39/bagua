import { HEXAGRAM_BY_NUMBER } from '../data/hexagrams.js'

const ACCOUNT_HISTORY_PREFIX = 'cyber-yigua-account-history-v1:'

const storageKey = (userId) => `${ACCOUNT_HISTORY_PREFIX}${encodeURIComponent(userId)}`

const normalizeRecord = (record) => {
  if (!record || typeof record.id !== 'string' || typeof record.clientId !== 'string') return null
  const createdAt = new Date(record.createdAt)
  if (Number.isNaN(createdAt.getTime())) return null
  const validHexagram = (value) => value && Number.isInteger(value.number) &&
    HEXAGRAM_BY_NUMBER[value.number]?.name === value.name
  if (!validHexagram(record.original) || (record.transformed && !validHexagram(record.transformed))) return null
  if (record.schemaVersion !== 1) return null
  return {
    id: record.id,
    clientId: record.clientId,
    createdAt: createdAt.toISOString(),
    original: { number: record.original.number, name: record.original.name },
    transformed: record.transformed
      ? { number: record.transformed.number, name: record.transformed.name }
      : null,
    schemaVersion: record.schemaVersion,
  }
}

/** Reads the signed-in user's non-sensitive divination summary cache. */
export const readAccountHistory = (userId, storage = globalThis.localStorage) => {
  if (!userId) return []
  try {
    const value = JSON.parse(storage.getItem(storageKey(userId)) ?? '[]')
    return Array.isArray(value) ? value.map(normalizeRecord).filter(Boolean) : []
  } catch {
    return []
  }
}

/** Replaces the signed-in user's local cache with server-owned records. */
export const writeAccountHistory = (userId, records, storage = globalThis.localStorage) => {
  const normalized = Array.isArray(records) ? records.map(normalizeRecord).filter(Boolean) : []
  try { storage.setItem(storageKey(userId), JSON.stringify(normalized)) } catch {
    // The server remains the source of truth if local storage is unavailable.
  }
  return normalized
}

/** Removes the account-specific cache during logout. */
export const clearAccountHistory = (userId, storage = globalThis.localStorage) => {
  if (!userId) return
  try { storage.removeItem(storageKey(userId)) } catch {
    // Logout continues even when local storage is unavailable.
  }
}

/** Removes cached server records matching either a server ID or client ID. */
export const removeAccountHistoryRecords = (userId, identifiers, storage = globalThis.localStorage) => {
  const removed = new Set(identifiers)
  return writeAccountHistory(userId, readAccountHistory(userId, storage).filter((record) => (
    !removed.has(record.id) && !removed.has(record.clientId)
  )), storage)
}

/** Finds a cached server record by either its server ID or stable client ID. */
export const findAccountHistoryRecord = (userId, identifier, storage = globalThis.localStorage) => (
  readAccountHistory(userId, storage).find((record) => (
    record.id === identifier || record.clientId === identifier
  )) ?? null
)
