import { HEXAGRAM_BY_NUMBER } from '../data/hexagrams.js'

const MESSAGE_STATUS_LABELS = Object.freeze({
  failed: '生成失败',
  interrupted: '已停止',
  timed_out: '生成超时',
})

const NON_RETRYABLE_ERROR_CODES = new Set([
  'AI_INPUT_TOO_LONG',
  'AI_SCOPE_AMBIGUOUS',
  'AI_SCOPE_REJECTED',
  'AUTH_REQUIRED',
  'VALIDATION_FAILED',
])

const latestAssistant = (messages) => [...messages].reverse().find((message) => message.role === 'assistant')

/** @param {Array<object>} messages */
export const normalizeConversationMessages = (messages = []) => messages.map((message) => ({
  ...message,
  status: message.status ?? 'completed',
  streaming: message.status === 'streaming',
}))

/** @param {{status?: string}} message */
export const getMessageStatusLabel = (message) => MESSAGE_STATUS_LABELS[message.status] ?? ''

/** @param {number|string} number */
export const getHexagramSymbol = (number) => HEXAGRAM_BY_NUMBER[Number(number)]?.symbol ?? '易'

/**
 * Finds the question that led to the latest persisted failed terminal message.
 * @param {Array<object>} messages
 * @returns {{content: string, message: string}|null}
 */
export const getConversationRecovery = (messages) => {
  const assistantIndex = messages.length - 1
  const assistant = messages[assistantIndex]
  if (assistant?.role !== 'assistant' || !MESSAGE_STATUS_LABELS[assistant.status]) return null
  const user = [...messages.slice(0, assistantIndex)].reverse().find((message) => message.role === 'user')
  if (!user?.content) return null
  return {
    content: user.content,
    message: `上一次${MESSAGE_STATUS_LABELS[assistant.status]}，你可以重新发送这次问题。`,
  }
}

/**
 * Applies one protocol event to the reactive message collection.
 * @param {Array<object>} messages
 * @param {{event: string, data: any}} payload
 * @returns {{errorMessage: string, terminal: boolean}}
 */
export const applyConversationStreamEvent = (messages, { event, data }) => {
  if (event === 'message.start') {
    const pendingUser = [...messages].reverse().find((message) => message.role === 'user' && message.status === 'pending')
    if (pendingUser) pendingUser.status = 'completed'
    const optimisticAssistant = [...messages].reverse().find(
      (message) => message.role === 'assistant' && message.streaming && message.optimistic,
    )
    if (optimisticAssistant) {
      optimisticAssistant.id = data.messageId
      delete optimisticAssistant.optimistic
    } else {
      messages.push({ id: data.messageId, role: 'assistant', content: '', status: 'streaming', streaming: true })
    }
  }
  if (event === 'message.delta') {
    const target = latestAssistant(messages)
    if (target) target.content += data.content ?? ''
  }
  if (event === 'message.done') {
    const target = latestAssistant(messages)
    if (target) Object.assign(target, { status: 'completed', streaming: false, failureCode: null })
    return { errorMessage: '', terminal: true }
  }
  if (event === 'error') {
    const target = latestAssistant(messages)
    const code = typeof data === 'object' && data ? data.code : 'AI_PROVIDER_FAILED'
    if (target?.streaming) {
      Object.assign(target, {
        status: code === 'AI_GENERATION_TIMEOUT' ? 'timed_out' : 'failed',
        streaming: false,
        failureCode: code,
      })
    }
    return {
      errorMessage: (typeof data === 'object' && data?.message) || '生成未能完成。',
      terminal: true,
    }
  }
  return { errorMessage: '', terminal: false }
}

/** Adds the local loading message shown while the server performs pre-stream checks. */
export const appendOptimisticAssistant = (messages, clientMessageId) => {
  messages.push({
    id: `optimistic-assistant-${clientMessageId}`,
    role: 'assistant',
    content: '',
    status: 'streaming',
    streaming: true,
    optimistic: true,
  })
}

/** Removes a loading message when the request fails before message.start. */
export const removeOptimisticAssistant = (messages, clientMessageId) => {
  const id = `optimistic-assistant-${clientMessageId}`
  const index = messages.findIndex((message) => message.id === id && message.optimistic)
  if (index === -1) return false
  messages.splice(index, 1)
  return true
}

/** Marks an optimistic user message after a pre-stream request failure. */
export const failOptimisticUserMessage = (messages, messageId, failureCode) => {
  const target = messages.find((message) => message.id === messageId && message.role === 'user')
  if (target?.status === 'pending') Object.assign(target, { status: 'failed', failureCode })
}

/** Removes one user message that has not become part of a persisted conversation turn. */
export const removeOptimisticUserMessage = (messages, messageId) => {
  const index = messages.findIndex((message) => (
    message.id === messageId
    && message.role === 'user'
    && ['pending', 'failed'].includes(message.status)
  ))
  if (index !== -1) messages.splice(index, 1)
}

/** @param {Array<object>} messages @param {'failed'|'interrupted'|'timed_out'} status @param {string} failureCode */
export const terminateLatestAssistant = (messages, status, failureCode) => {
  const target = latestAssistant(messages)
  if (target?.streaming) Object.assign(target, { status, streaming: false, failureCode })
}

/** @param {{code?: string}|null|undefined} error */
export const isRetryableConversationError = (error) => !NON_RETRYABLE_ERROR_CODES.has(error?.code)
