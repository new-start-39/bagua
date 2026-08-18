import test from 'node:test'
import assert from 'node:assert/strict'
import { HISTORY_LIMIT, appendHistory, normalizeHistory, readHistory, writeHistory } from '../src/utils/history.js'

const makeRecord = (id, lines = [6, 7, 8, 9, 7, 8]) => ({ id, createdAt: Number.isFinite(Number(id)) ? Number(id) : 1, lines })

test('history keeps newest records first and caps at ten items', () => {
  const history = Array.from({ length: HISTORY_LIMIT }, (_, index) => makeRecord(String(index)))
  const next = appendHistory(history, makeRecord('new'))

  assert.equal(next.length, HISTORY_LIMIT)
  assert.equal(next[0].id, 'new')
  assert.equal(next.at(-1).id, '8')
})

test('history ignores malformed records', () => {
  const history = normalizeHistory([makeRecord('ok'), null, { id: 'bad', lines: [7] }, { id: 'bad-date', createdAt: 'now', lines: [7, 7, 7, 7, 7, 7] }])

  assert.deepEqual(history.map(({ id }) => id), ['ok'])
})

test('history safely reads and writes local storage', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const history = [makeRecord('1')]

  writeHistory(history, storage)
  assert.deepEqual(readHistory(storage), history)
  assert.deepEqual(readHistory({ getItem: () => '{broken' }), [])
})
