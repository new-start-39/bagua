import { readonly, ref } from 'vue'
import * as authApi from '../api/auth.js'

const RECOVERABLE_SESSION_ERROR_CODES = new Set([
  'AUTH_REQUIRED',
  'CSRF_TOKEN_INVALID',
  'REQUEST_TIMEOUT',
])

export const isRecoverableSessionError = (error) => RECOVERABLE_SESSION_ERROR_CODES.has(error?.code)

/**
 * Create one shared Session state controller.
 * @param {typeof authApi} api Authentication API implementation.
 */
export const createSessionController = (api = authApi) => {
  const state = ref('unknown')
  const user = ref(null)
  const bootstrapError = ref(null)
  let sessionRequest = null

  const applyUser = (nextUser) => {
    user.value = nextUser ?? null
    state.value = nextUser ? 'authenticated' : 'anonymous'
    bootstrapError.value = null
  }

  const resetBootstrap = () => {
    user.value = null
    state.value = 'unknown'
    bootstrapError.value = null
  }

  const ensureSession = async () => {
    if (state.value !== 'unknown') return state.value
    sessionRequest ??= (async () => {
      try {
        const { user: nextUser } = await api.getSession()
        applyUser(nextUser)
      } catch (error) {
        bootstrapError.value = error
        state.value = 'unknown'
        throw error
      }
    })()
    const currentRequest = sessionRequest
    try {
      await currentRequest
    } finally {
      if (sessionRequest === currentRequest) sessionRequest = null
    }
    return state.value
  }

  const authenticate = async (operation) => {
    await ensureSession()
    try {
      const result = await operation()
      applyUser(result.user)
      return result.user
    } catch (error) {
      if (isRecoverableSessionError(error)) resetBootstrap()
      throw error
    }
  }

  const login = (credentials) => authenticate(() => api.login(credentials))
  const register = async (registration) => {
    await ensureSession()
    try {
      return await api.register(registration)
    } catch (error) {
      if (isRecoverableSessionError(error)) resetBootstrap()
      throw error
    }
  }
  const logout = async () => {
    await ensureSession()
    try {
      const result = await api.logout()
      applyUser(result?.user ?? null)
    } catch (error) {
      if (isRecoverableSessionError(error)) resetBootstrap()
      throw error
    }
  }
  const invalidate = () => applyUser(null)

  return {
    state: readonly(state),
    user: readonly(user),
    bootstrapError: readonly(bootstrapError),
    ensureSession,
    login,
    register,
    logout,
    invalidate,
    resetBootstrap,
  }
}

const sharedSession = createSessionController()

export const useSession = () => sharedSession
