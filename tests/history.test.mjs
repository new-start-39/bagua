import test from 'node:test'
import assert from 'node:assert/strict'
import { HISTORY_LIMIT, appendHistory, createHistoryRecord, findHistoryRecord, normalizeHistory, readHistory, removeHistoryRecords, toApiDivination, writeHistory } from '../src/utils/history.js'

const lines = [6, 7, 8, 9, 7, 8]
const clientIdFor = (value) => `123e4567-e89b-42d3-a456-${String(value).padStart(12, '0')}`
const makeRecord = (value) => createHistoryRecord(lines, {
  clientId: clientIdFor(value), createdAt: Number.isFinite(Number(value)) ? Number(value) : 1,
})

test('history keeps newest records first and caps at ten items', () => {
  const history = Array.from({ length: HISTORY_LIMIT }, (_, index) => makeRecord(String(index)))
  const next = appendHistory(history, makeRecord(99))
  assert.equal(next.length, HISTORY_LIMIT)
  assert.equal(next[0].clientId, clientIdFor(99))
  assert.equal(next.at(-1).clientId, clientIdFor('8'))
})

test('history ignores malformed records', () => {
  const history = normalizeHistory([makeRecord(98), null, { clientId: 'bad', lines: [7] }, { clientId: 'bad-date', createdAt: 'now', lines }])
  assert.deepEqual(history.map(({ clientId }) => clientId), [clientIdFor(98)])
})

test('history migrates legacy id records and saves deterministic summaries', () => {
  const migrated = normalizeHistory([{ id: 'legacy', createdAt: 1, lines }])[0]
  assert.match(migrated.clientId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.equal(migrated.clientId, normalizeHistory([{ id: 'legacy', createdAt: 1, lines }])[0].clientId)
  assert.equal(migrated.schemaVersion, 1)
  assert.deepEqual(migrated.original, { number: 47, name: '困' })
  assert.deepEqual(migrated.transformed, { number: 60, name: '节' })
  assert.equal('id' in migrated, false)
})

test('history safely reads, writes, and locates one explicit cast', () => {
  const values = new Map()
  const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }
  const history = [makeRecord('1'), makeRecord('2')]
  const written = writeHistory(history, storage)
  assert.deepEqual(readHistory(storage), written)
  assert.equal(findHistoryRecord(clientIdFor('2'), storage).clientId, clientIdFor('2'))
  assert.equal(findHistoryRecord('missing', storage), null)
  assert.deepEqual(readHistory({ getItem: () => '{broken' }), [])
})

test('history converts records for the backend and removes only confirmed merges', () => {
  const history = [makeRecord('1'), makeRecord('2')]
  const payload = toApiDivination(history[0])
  assert.equal('lines' in payload, false)
  assert.equal(payload.createdAt, new Date(history[0].createdAt).toISOString())
  assert.deepEqual(removeHistoryRecords(history, [history[0].clientId]).map(({ clientId }) => clientId), [history[1].clientId])
})
