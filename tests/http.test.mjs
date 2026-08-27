import assert from 'node:assert/strict'
import test from 'node:test'
import { request } from '../src/api/http.js'

test('JSON request timeouts use a stable application error', async () => {
  const originalFetch = globalThis.fetch
  globalThis.fetch = async (_path, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener('abort', () => reject(options.signal.reason), { once: true })
  })

  try {
    await assert.rejects(
      request('/api/slow', { timeout: 5, timeoutMessage: '自定义超时提示' }),
      (error) => error.code === 'REQUEST_TIMEOUT' && error.message === '自定义超时提示',
    )
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('malformed CSRF cookies do not escape before the request is sent', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  globalThis.document = { cookie: 'bagua-csrf=%E0%A4%A' }
  globalThis.fetch = async (_path, options) => {
    assert.equal(options.headers['X-CSRF-Token'], undefined)
    return new Response(JSON.stringify({ data: { ok: true } }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    })
  }
  try { assert.deepEqual(await request('/api/test'), { ok: true }) } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
  }
})
