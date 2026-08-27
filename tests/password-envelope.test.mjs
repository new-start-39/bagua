import assert from 'node:assert/strict'
import test from 'node:test'

import nacl from 'tweetnacl'

import { PASSWORD_ENVELOPE_ALGORITHM, sealPassword } from '../src/security/password-envelope.js'

const encodeBase64Url = (value) => Buffer.from(value).toString('base64url')

test('browser password envelope contains ciphertext instead of the submitted password', () => {
  const server = nacl.box.keyPair()
  const descriptor = {
    algorithm: PASSWORD_ENVELOPE_ALGORITHM,
    publicKey: encodeBase64Url(server.publicKey),
  }
  const envelope = sealPassword('visible only before sealing', descriptor, {
    email: 'reader@example.com', purpose: 'login',
  })
  assert.equal(JSON.stringify(envelope).includes('visible only before sealing'), false)
  assert.equal(envelope.algorithm, PASSWORD_ENVELOPE_ALGORITHM)
  assert.ok(envelope.ciphertext.length > 20)
})
