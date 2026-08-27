import nacl from 'tweetnacl'

const PASSWORD_ENVELOPE_ALGORITHM = 'x25519-xsalsa20-poly1305-v1'

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
}

const encodeBase64Url = (value) => btoa(String.fromCharCode(...value))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '')

/**
 * Encrypt a password before it enters the HTTP request payload.
 * @param {string} password
 * @param {{algorithm: string, publicKey: string}} descriptor
 * @param {{email: string, purpose: 'login'|'register'}} binding
 * @returns {{algorithm: string, ephemeralPublicKey: string, nonce: string, ciphertext: string}}
 */
export const sealPassword = (password, descriptor, binding) => {
  if (descriptor?.algorithm !== PASSWORD_ENVELOPE_ALGORITHM) throw new TypeError('账户服务未提供可用的密码加密公钥')
  const serverPublicKey = decodeBase64Url(descriptor.publicKey)
  if (serverPublicKey.length !== nacl.box.publicKeyLength) throw new TypeError('账户服务密码公钥无效')
  const ephemeral = nacl.box.keyPair()
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const plaintext = new TextEncoder().encode(JSON.stringify({
    email: binding.email,
    purpose: binding.purpose,
    password,
  }))
  const ciphertext = nacl.box(plaintext, nonce, serverPublicKey, ephemeral.secretKey)
  return {
    algorithm: PASSWORD_ENVELOPE_ALGORITHM,
    ephemeralPublicKey: encodeBase64Url(ephemeral.publicKey),
    nonce: encodeBase64Url(nonce),
    ciphertext: encodeBase64Url(ciphertext),
  }
}

export { PASSWORD_ENVELOPE_ALGORITHM }
