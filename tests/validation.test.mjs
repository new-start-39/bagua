import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidEmail } from '../src/utils/validation.js'

test('email validation accepts ordinary addresses and surrounding whitespace', () => {
  assert.equal(isValidEmail('user@example.com'), true)
  assert.equal(isValidEmail(' user+tag@example.com.cn '), true)
})

test('email validation rejects incomplete and malformed addresses', () => {
  for (const value of ['', '44', 'user@', '@example.com', 'user@example', 'user name@example.com']) {
    assert.equal(isValidEmail(value), false, value)
  }
})
