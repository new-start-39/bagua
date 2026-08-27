export const sanitizeRedirect = (value, fallback = '/') => {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')) return fallback
  try {
    const url = new URL(value, 'https://local.invalid')
    return url.origin === 'https://local.invalid' ? `${url.pathname}${url.search}${url.hash}` : fallback
  } catch {
    return fallback
  }
}

const readRouteString = (value) => typeof value === 'string' && value.trim() ? value : null

/**
 * Returns the page that should be shown after the current account logs out.
 * AI routes retain their originating divination so logout can return to it.
 *
 * @param {{ name?: unknown, params?: Record<string, unknown>, query?: Record<string, unknown> }} route
 * @param {unknown} previousPath Previous browser route, used by conversations opened before castId was retained.
 * @returns {string | { name: string, params?: { castId: string } }}
 */
export const getPostLogoutLocation = (route, previousPath) => {
  const castId = route?.name === 'ai-init'
    ? readRouteString(route.params?.castId)
    : route?.name === 'ai-conversation'
      ? readRouteString(route.query?.castId)
      : null

  if (castId) return { name: 'result', params: { castId } }

  const previousResult = sanitizeRedirect(previousPath, '')
  if (/^\/result\/[^/?#]+(?:[?#].*)?$/.test(previousResult)) return previousResult

  return { name: 'divination' }
}
