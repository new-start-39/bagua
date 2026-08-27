import test from 'node:test'
import assert from 'node:assert/strict'
import { getPostLogoutLocation, sanitizeRedirect } from '../src/utils/navigation.js'

test('redirect sanitizer preserves internal cast routes', () => {
  assert.equal(sanitizeRedirect('/ai/cast-123?from=result'), '/ai/cast-123?from=result')
})

test('redirect sanitizer rejects external and protocol-relative targets', () => {
  assert.equal(sanitizeRedirect('https://example.com/steal'), '/')
  assert.equal(sanitizeRedirect('//example.com/steal'), '/')
  assert.equal(sanitizeRedirect('javascript:alert(1)'), '/')
})

test('logout from AI initialization returns to the originating divination result', () => {
  assert.deepEqual(getPostLogoutLocation({
    name: 'ai-init',
    params: { castId: 'cast-123' },
    query: {},
  }), { name: 'result', params: { castId: 'cast-123' } })
})

test('logout from an AI conversation returns to its retained divination result', () => {
  assert.deepEqual(getPostLogoutLocation({
    name: 'ai-conversation',
    params: { conversationId: 'conversation-123' },
    query: { castId: 'cast-456' },
  }), { name: 'result', params: { castId: 'cast-456' } })
})

test('logout without divination context returns to the casting page', () => {
  assert.deepEqual(getPostLogoutLocation({
    name: 'ai-conversation',
    params: { conversationId: 'conversation-123' },
    query: {},
  }), { name: 'divination' })
})

test('legacy AI conversation can return through its previous result route', () => {
  assert.equal(getPostLogoutLocation({
    name: 'ai-conversation',
    params: { conversationId: 'conversation-123' },
    query: {},
  }, '/result/cast-from-history'), '/result/cast-from-history')
})

test('legacy AI conversation rejects non-result browser history', () => {
  assert.deepEqual(getPostLogoutLocation({
    name: 'ai-conversation',
    params: { conversationId: 'conversation-123' },
    query: {},
  }, '//example.com/steal'), { name: 'divination' })
})
