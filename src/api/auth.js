import { request } from './http.js'
import { mockGetSession, mockLogin, mockLogout, mockRegister, mockSendVerificationCode } from './mock.js'
import { useMockApi } from './runtime.js'
import { sealPassword } from '../security/password-envelope.js'

const SESSION_TIMEOUT = 45_000
const AUTH_WRITE_TIMEOUT = 60_000
let passwordEncryption = null

export const getSession = async () => {
  const result = useMockApi
    ? await mockGetSession()
    : await request('/api/auth/session', {
      timeout: SESSION_TIMEOUT,
      timeoutMessage: '连接账户服务超时，请重试。',
    })
  passwordEncryption = result.passwordEncryption ?? null
  return result
}
export const sendVerificationCode = (email) => useMockApi
  ? mockSendVerificationCode({ email, scene: 'register' })
  : request('/api/auth/verification-codes', {
      method: 'POST',
      body: { email, scene: 'register' },
      timeout: AUTH_WRITE_TIMEOUT,
      timeoutMessage: '邮件发送确认超时，结果可能已经生效，请先检查邮箱再重试。',
    })
export const login = (credentials) => useMockApi
  ? mockLogin(credentials)
  : request('/api/auth/login', {
      method: 'POST',
      body: {
        email: credentials.email,
        passwordEnvelope: sealPassword(credentials.password, passwordEncryption, {
          email: credentials.email.trim().toLowerCase(), purpose: 'login',
        }),
      },
      timeout: AUTH_WRITE_TIMEOUT,
      timeoutMessage: '登录确认超时，请重新连接后再试。',
    })
export const register = (registration) => useMockApi
  ? mockRegister(registration)
  : request('/api/auth/register', {
      method: 'POST',
      body: {
        email: registration.email,
        code: registration.code,
        passwordEnvelope: sealPassword(registration.password, passwordEncryption, {
          email: registration.email.trim().toLowerCase(), purpose: 'register',
        }),
      },
      timeout: AUTH_WRITE_TIMEOUT,
      timeoutMessage: '注册确认超时，结果可能已经生效，请尝试登录确认。',
    })
export const logout = async () => {
  const result = useMockApi
    ? await mockLogout()
    : await request('/api/auth/logout', {
      method: 'POST',
      timeout: AUTH_WRITE_TIMEOUT,
      timeoutMessage: '退出确认超时，请刷新页面确认账户状态。',
    })
  passwordEncryption = result.passwordEncryption ?? passwordEncryption
  return result
}
