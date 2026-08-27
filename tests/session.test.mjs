import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionController } from '../src/composables/useSession.js'

test('auth mutations wait for anonymous Session bootstrap', async () => {
  const events = []
  const session = createSessionController({
    async getSession() { events.push('session'); return { user: null } },
    async login() { events.push('login'); return { user: { id: 'usr-1', email: 'reader@example.com' } } },
  })

  await session.login({ email: 'reader@example.com', password: 'password' })

  assert.deepEqual(events, ['session', 'login'])
  assert.equal(session.state.value, 'authenticated')
})

test('failed bootstrap stays unknown and a later attempt can retry', async () => {
  let attempts = 0
  const session = createSessionController({
    async getSession() {
      attempts += 1
      if (attempts === 1) throw new Error('database unavailable')
      return { user: null }
    },
  })

  await assert.rejects(session.ensureSession(), /database unavailable/)
  assert.equal(session.state.value, 'unknown')
  await session.ensureSession()

  assert.equal(attempts, 2)
  assert.equal(session.state.value, 'anonymous')
})

test('uncertain auth failure forces the next write to bootstrap a fresh Session', async () => {
  let sessionAttempts = 0
  let loginAttempts = 0
  const session = createSessionController({
    async getSession() { sessionAttempts += 1; return { user: null } },
    async login() {
      loginAttempts += 1
      if (loginAttempts === 1) throw Object.assign(new Error('timeout'), { code: 'REQUEST_TIMEOUT' })
      return { user: { id: 'usr-1', email: 'reader@example.com' } }
    },
  })

  await assert.rejects(session.login({}), (error) => error.code === 'REQUEST_TIMEOUT')
  assert.equal(session.state.value, 'unknown')
  await session.login({})

  assert.equal(sessionAttempts, 2)
  assert.equal(session.state.value, 'authenticated')
})

test('registration keeps the browser anonymous until a separate login succeeds', async () => {
  const session = createSessionController({
    async getSession() { return { user: null } },
    async register() { return { registered: true } },
  })
  const result = await session.register({})
  assert.deepEqual(result, { registered: true })
  assert.equal(session.state.value, 'anonymous')
  assert.equal(session.user.value, null)
})

test('logout applies the fresh anonymous Session returned by the server', async () => {
  let bootstraps = 0
  const session = createSessionController({
    async getSession() {
      bootstraps += 1
      return { user: { id: 'usr-1', email: 'reader@example.com' } }
    },
    async logout() { return { user: null } },
  })
  await session.ensureSession()
  await session.logout()
  assert.equal(session.state.value, 'anonymous')
  assert.equal(session.user.value, null)
  assert.equal(bootstraps, 1)
})
