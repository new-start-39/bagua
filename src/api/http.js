const DEFAULT_TIMEOUT = 20_000

export class ApiError extends Error {
  constructor(message, options = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = options.code ?? 'REQUEST_FAILED'
    this.status = options.status ?? 0
    this.fieldErrors = options.fieldErrors ?? {}
    this.retryAfter = options.retryAfter ?? null
    this.requestId = options.requestId ?? null
  }
}

const readCookie = (name) => {
  if (typeof document === 'undefined') return null
  const prefix = `${encodeURIComponent(name)}=`
  return document.cookie.split('; ').find((item) => item.startsWith(prefix))?.slice(prefix.length) ?? null
}

const getCsrfToken = () => {
  const encoded = readCookie('csrf-token') ?? readCookie('bagua-csrf')
  if (!encoded) return null
  try { return decodeURIComponent(encoded) } catch { return null }
}

const parseError = async (response) => {
  let payload = {}
  try {
    payload = await response.json()
  } catch {
    // The stable fallback below also covers empty and non-JSON error bodies.
  }
  const detail = payload.error ?? {}
  const error = new ApiError(detail.message ?? '请求未能完成，请稍后重试。', {
    code: detail.code,
    fieldErrors: detail.fieldErrors,
    retryAfter: detail.retryAfter,
    requestId: payload.requestId,
    status: response.status,
  })
  if (response.status === 401 && typeof globalThis.dispatchEvent === 'function') {
    globalThis.dispatchEvent(new CustomEvent('bagua:auth-required'))
  }
  throw error
}

/**
 * Sends a JSON request through the stable same-origin API boundary.
 * @param {string} path API path beginning with /api.
 * @param {{method?: string, body?: unknown, signal?: AbortSignal, timeout?: number, timeoutMessage?: string}} [options] Request options.
 * @returns {Promise<unknown>} Response data payload.
 */
export const request = async (path, options = {}) => {
  const controller = new AbortController()
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort(new DOMException('Request timed out', 'TimeoutError'))
  }, options.timeout ?? DEFAULT_TIMEOUT)
  const onAbort = () => controller.abort(options.signal.reason)
  options.signal?.addEventListener('abort', onAbort, { once: true })
  const csrfToken = getCsrfToken()

  try {
    const response = await fetch(path, {
      method: options.method ?? 'GET',
      credentials: 'include',
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        ...(options.body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (!response.ok) return await parseError(response)
    const payload = await response.json()
    return payload.data
  } catch (error) {
    if (timedOut) {
      throw new ApiError(options.timeoutMessage ?? '请求超时，请稍后重试。', {
        code: 'REQUEST_TIMEOUT',
      })
    }
    throw error
  } finally {
    clearTimeout(timeoutId)
    options.signal?.removeEventListener('abort', onAbort)
  }
}

/**
 * Opens the POST SSE response used by AI messages.
 * @param {string} path API path.
 * @param {unknown} body JSON request body.
 * @param {AbortSignal} signal Cancellation signal.
 * @returns {Promise<Response>} Streaming response.
 */
export const requestEventStream = async (path, body, signal) => {
  const csrfToken = getCsrfToken()
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: {
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) return await parseError(response)
  if (!response.body || !response.headers.get('content-type')?.includes('text/event-stream')) {
    throw new ApiError('服务端未返回可读取的流。', { code: 'INVALID_EVENT_STREAM' })
  }
  return response
}
