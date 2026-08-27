import test from 'node:test'
import assert from 'node:assert/strict'
import { clearAccountHistory, findAccountHistoryRecord, readAccountHistory, removeAccountHistoryRecords, writeAccountHistory } from '../src/utils/account-history.js'

const record = {
  id: 'div_1', clientId: 'cast-1', createdAt: '2026-08-26T00:00:00.000Z',
  original: { number: 1, name: '乾' }, transformed: null, schemaVersion: 1,
}

test('account history cache is isolated by user and can resolve both identifiers', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  }
  writeAccountHistory('user-a', [record], storage)
  assert.equal(readAccountHistory('user-b', storage).length, 0)
  assert.equal(findAccountHistoryRecord('user-a', 'div_1', storage).clientId, 'cast-1')
  assert.equal(findAccountHistoryRecord('user-a', 'cast-1', storage).id, 'div_1')
  clearAccountHistory('user-a', storage)
  assert.equal(readAccountHistory('user-a', storage).length, 0)
})

test('account history rejects tampered hexagram pairs and schema versions', () => {
  const storage = { getItem: () => JSON.stringify([
    { ...record, original: { number: 1, name: '坤' } },
    { ...record, id: 'div_2', schemaVersion: 2 },
  ]) }
  assert.deepEqual(readAccountHistory('user-a', storage), [])
})

test('account history removes cached records by either server or client identifier', () => {
  const values = new Map()
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  }
  const second = { ...record, id: 'div_2', clientId: 'cast-2' }
  writeAccountHistory('user-a', [record, second], storage)
  assert.deepEqual(removeAccountHistoryRecords('user-a', ['cast-1'], storage), [second])
  assert.deepEqual(removeAccountHistoryRecords('user-a', ['div_2'], storage), [])
})
