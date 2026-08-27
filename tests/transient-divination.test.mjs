import assert from 'node:assert/strict'
import test from 'node:test'
import {
  clearTransientDivination, findTransientDivination, rememberTransientDivination,
} from '../src/utils/transient-divination.js'

test('current cloud result survives logout only in transient memory', () => {
  clearTransientDivination()
  const record = { id: 'div_1', clientId: 'cast-1', original: { number: 1, name: '乾' } }
  rememberTransientDivination(record)
  assert.deepEqual(findTransientDivination('cast-1'), record)
  assert.equal(findTransientDivination('cast-2'), null)
  clearTransientDivination()
  assert.equal(findTransientDivination('div_1'), null)
})
