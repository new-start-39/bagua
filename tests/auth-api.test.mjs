import assert from 'node:assert/strict'
import test from 'node:test'

import nacl from 'tweetnacl'

import { getSession, login, register } from '../src/api/auth.js'
import { PASSWORD_ENVELOPE_ALGORITHM } from '../src/security/password-envelope.js'

const descriptor = () => {
  const server = nacl.box.keyPair()
  return {
    algorithm: PASSWORD_ENVELOPE_ALGORITHM,
    publicKey: Buffer.from(server.publicKey).toString('base64url'),
  }
}

test('real authentication requests never serialize the plaintext password field', async () => {
  const originalFetch = globalThis.fetch
  const originalDocument = globalThis.document
  const bodies = []
  const passwordEncryption = descriptor()
  globalThis.document = { cookie: '' }
  globalThis.fetch = async (path, options) => {
    if (path === '/api/auth/session') {
      return new Response(JSON.stringify({ data: { user: null, passwordEncryption } }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    }
    bodies.push(JSON.parse(options.body))
    return new Response(JSON.stringify({
      data: path.endsWith('/register') ? { registered: true } : { user: { id: 'usr-1', email: 'reader@example.com' } },
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  }
  try {
    await getSession()
    await login({ email: 'reader@example.com', password: 'login plaintext' })
    await register({ email: 'reader@example.com', code: '123456', password: 'register plaintext' })
    assert.equal(JSON.stringify(bodies).includes('login plaintext'), false)
    assert.equal(JSON.stringify(bodies).includes('register plaintext'), false)
    assert.equal(bodies.every((body) => !Object.hasOwn(body, 'password')), true)
    assert.equal(bodies.every((body) => body.passwordEnvelope?.ciphertext), true)
  } finally {
    globalThis.fetch = originalFetch
    globalThis.document = originalDocument
  }
})
