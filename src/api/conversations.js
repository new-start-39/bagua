import { ApiError, request, requestEventStream } from './http.js'
import { mockCancelMessage, mockCreateConversation, mockGetConversation, mockStreamMessage } from './mock.js'
import { useMockApi } from './runtime.js'
import { createConversationSseParser } from '../utils/sse.js'

export const createConversation = (payload) => useMockApi
  ? mockCreateConversation(payload)
  : request('/api/ai/conversations', { method: 'POST', body: payload })

export const getConversation = (conversationId) => useMockApi
  ? mockGetConversation(conversationId)
  : request(`/api/ai/conversations/${encodeURIComponent(conversationId)}`)

export const streamConversationMessage = async ({ conversationId, content, clientMessageId, signal, onEvent }) => {
  if (useMockApi) return mockStreamMessage({ conversationId, content, clientMessageId, signal, onEvent })
  const response = await requestEventStream(
    `/api/ai/conversations/${encodeURIComponent(conversationId)}/messages`,
    { clientMessageId, content },
    signal,
  )
  const parser = createConversationSseParser(onEvent)
  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    parser.push(decoder.decode(value, { stream: true }))
  }
  parser.push(decoder.decode())
  const terminalEvent = parser.finish()
  if (!terminalEvent) {
    throw new ApiError('连接提前中断，本轮解读未完整结束。', { code: 'AI_STREAM_INTERRUPTED' })
  }
}

export const cancelConversationMessage = (conversationId, clientMessageId) => useMockApi
  ? mockCancelMessage({ conversationId, clientMessageId })
  : request(
      `/api/ai/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(clientMessageId)}/cancel`,
      { method: 'POST', body: {} },
    )
