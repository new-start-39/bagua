import { ApiError } from './http.js'
import { isValidEmail } from '../utils/validation.js'
import { readHistory, removeHistoryRecords, writeHistory } from '../utils/history.js'

const SESSION_KEY = 'cyber-yigua-mock-session-v1'
const CONVERSATION_KEY = 'cyber-yigua-mock-conversations-v1'
const wait = (duration = 180) => new Promise((resolve) => setTimeout(resolve, duration))

const readJson = (key, fallback) => {
  try {
    return JSON.parse(globalThis.localStorage?.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

const writeJson = (key, value) => globalThis.localStorage?.setItem(key, JSON.stringify(value))

export const mockGetSession = async () => {
  await wait()
  return { user: readJson(SESSION_KEY, null) }
}

export const mockLogin = async ({ email, password }) => {
  await wait(260)
  if (!isValidEmail(email)) throw new ApiError('请输入有效的邮箱地址。', { code: 'VALIDATION_FAILED', status: 400, fieldErrors: { email: '邮箱格式不正确' } })
  if (!password) throw new ApiError('请输入密码。', { code: 'VALIDATION_FAILED', status: 400 })
  const user = { id: `mock-${email.toLowerCase()}`, email: email.toLowerCase() }
  writeJson(SESSION_KEY, user)
  return { user }
}

export const mockRegister = async ({ email, code, password }) => {
  await wait(300)
  if (!isValidEmail(email)) throw new ApiError('请输入有效的邮箱地址。', { code: 'VALIDATION_FAILED', status: 400, fieldErrors: { email: '邮箱格式不正确' } })
  if (!code || !password) throw new ApiError('请填写完整的注册信息。', { code: 'VALIDATION_FAILED', status: 400 })
  return { registered: true }
}

export const mockSendVerificationCode = async ({ email }) => {
  await wait(240)
  if (!isValidEmail(email)) throw new ApiError('请输入有效的邮箱地址。', { code: 'VALIDATION_FAILED', status: 400, fieldErrors: { email: '邮箱格式不正确' } })
  return { expiresIn: 600, resendAfter: 60 }
}

export const mockLogout = async () => {
  await wait(120)
  globalThis.localStorage?.removeItem(SESSION_KEY)
  return { user: null }
}

export const mockCreateConversation = async ({ clientDivinationId, divination }) => {
  await wait(360)
  const user = readJson(SESSION_KEY, null)
  if (!user) throw new ApiError('登录状态已失效', { code: 'AUTH_REQUIRED', status: 401 })
  const conversations = readJson(CONVERSATION_KEY, [])
  const existing = conversations.find((item) => item.clientDivinationId === clientDivinationId && item.userId === user.id)
  if (existing) return existing
  const conversationId = globalThis.crypto?.randomUUID?.() ?? `conv-${Date.now()}`
  const conversation = {
    conversationId,
    divinationId: `mock-div-${clientDivinationId}`,
    clientDivinationId,
    userId: user.id,
    openingMessage: { id: `opening-${conversationId}`, role: 'assistant', content: '所问何事？' },
    oracleContext: {
      original: { ...divination.original },
      transformed: divination.transformed ? { ...divination.transformed } : null,
    },
    messages: [{ id: `opening-${conversationId}`, role: 'assistant', content: '所问何事？' }],
  }
  writeJson(CONVERSATION_KEY, [conversation, ...conversations])
  return conversation
}

export const mockGetConversation = async (conversationId) => {
  await wait(220)
  const user = readJson(SESSION_KEY, null)
  if (!user) throw new ApiError('登录状态已失效', { code: 'AUTH_REQUIRED', status: 401 })
  const conversation = readJson(CONVERSATION_KEY, []).find((item) => item.conversationId === conversationId && item.userId === user.id)
  if (!conversation) throw new ApiError('该对话已不存在。', { code: 'CONVERSATION_NOT_FOUND', status: 404 })
  return conversation
}

export const mockStreamMessage = async ({ conversationId, content, clientMessageId, signal, onEvent }) => {
  const conversations = readJson(CONVERSATION_KEY, [])
  const user = readJson(SESSION_KEY, null)
  if (!user) throw new ApiError('登录状态已失效', { code: 'AUTH_REQUIRED', status: 401 })
  const conversation = conversations.find((item) => item.conversationId === conversationId && item.userId === user.id)
  if (!conversation) throw new ApiError('该对话已不存在。', { code: 'CONVERSATION_NOT_FOUND', status: 404 })
  if ([...content.trim()].length > 800) throw new ApiError('问题不能超过 800 个字符。', { code: 'AI_INPUT_TOO_LONG', status: 400 })
  const messageId = `mock-msg-${clientMessageId}`
  onEvent({ event: 'message.start', data: { messageId } })
  const reply = `从「${conversation.oracleContext.original.name}」来看，此刻更适合先辨清变化的方向，再决定行动节奏。你问的是“${content.trim()}”，可以把它拆成眼下可验证的一步与暂缓的一步；卦象提供的是观察角度，不是确定预测。`
  let generated = ''
  for (const fragment of reply.match(/.{1,8}/gu) ?? []) {
    if (signal.aborted) throw signal.reason ?? new DOMException('Aborted', 'AbortError')
    await wait(55)
    generated += fragment
    onEvent({ event: 'message.delta', data: { content: fragment } })
  }
  conversation.messages.push(
    { id: clientMessageId, role: 'user', content },
    { id: messageId, role: 'assistant', content: generated },
  )
  writeJson(CONVERSATION_KEY, conversations)
  onEvent({ event: 'message.done', data: { messageId } })
}

export const mockCancelMessage = async () => ({ cancelled: true })

export const mockDeleteDivination = async (identifier) => {
  await wait(180)
  const history = readHistory()
  const record = history.find((item) => item.clientId === identifier)
  const clientId = record?.clientId ?? identifier
  writeHistory(removeHistoryRecords(history, [clientId]))
  const conversations = readJson(CONVERSATION_KEY, [])
  writeJson(CONVERSATION_KEY, conversations.filter((item) => (
    item.clientDivinationId !== clientId && item.divinationId !== identifier
  )))
  return {}
}
