import test from 'node:test'
import assert from 'node:assert/strict'
import {
  appendOptimisticAssistant,
  applyConversationStreamEvent,
  failOptimisticUserMessage,
  getConversationRecovery,
  getHexagramSymbol,
  getMessageStatusLabel,
  isRetryableConversationError,
  normalizeConversationMessages,
  removeOptimisticAssistant,
  removeOptimisticUserMessage,
  terminateLatestAssistant,
} from '../src/utils/conversation-state.js'

test('optimistic AI loading appears before message.start and is adopted without duplication', () => {
  const messages = [{ id: 'question', role: 'user', content: '问题', status: 'pending' }]
  appendOptimisticAssistant(messages, 'question')
  assert.equal(messages.length, 2)
  assert.equal(messages[1].streaming, true)
  assert.equal(messages[1].optimistic, true)

  applyConversationStreamEvent(messages, { event: 'message.start', data: { messageId: 'reply' } })
  assert.equal(messages.length, 2)
  assert.deepEqual(messages[1], {
    id: 'reply', role: 'assistant', content: '', status: 'streaming', streaming: true,
  })
})

test('optimistic AI loading is removed after a pre-stream failure', () => {
  const messages = [{ id: 'question', role: 'user', content: '问题', status: 'pending' }]
  appendOptimisticAssistant(messages, 'question')
  assert.equal(removeOptimisticAssistant(messages, 'question'), true)
  removeOptimisticUserMessage(messages, 'question')
  assert.deepEqual(messages, [])
})

test('conversation messages restore persisted terminal and streaming states', () => {
  const messages = normalizeConversationMessages([
    { id: 'done', role: 'assistant', content: '完成', status: 'completed' },
    { id: 'failed', role: 'assistant', content: '部分', status: 'failed' },
    { id: 'active', role: 'assistant', content: '', status: 'streaming' },
  ])
  assert.equal(messages[0].streaming, false)
  assert.equal(messages[1].streaming, false)
  assert.equal(messages[2].streaming, true)
  assert.equal(getMessageStatusLabel(messages[1]), '生成失败')
})

test('stream error closes the current assistant message and preserves partial content', () => {
  const messages = []
  applyConversationStreamEvent(messages, { event: 'message.start', data: { messageId: 'reply' } })
  applyConversationStreamEvent(messages, { event: 'message.delta', data: { content: '已有内容' } })
  const result = applyConversationStreamEvent(messages, {
    event: 'error',
    data: { code: 'AI_GENERATION_TIMEOUT', message: '生成超时' },
  })
  assert.deepEqual(messages[0], {
    id: 'reply', role: 'assistant', content: '已有内容', status: 'timed_out', streaming: false,
    failureCode: 'AI_GENERATION_TIMEOUT',
  })
  assert.deepEqual(result, { errorMessage: '生成超时', terminal: true })
})

test('pre-stream failures replace one optimistic question instead of accumulating retries', () => {
  const messages = [{ id: 'client-one', role: 'user', content: '问题', status: 'pending' }]
  failOptimisticUserMessage(messages, 'client-one', 'AI_RATE_LIMITED')
  assert.equal(messages[0].status, 'failed')
  removeOptimisticUserMessage(messages, 'client-one')
  assert.deepEqual(messages, [])
})

test('local interruption closes only an active assistant message', () => {
  const messages = [{ id: 'reply', role: 'assistant', content: '部分', status: 'streaming', streaming: true }]
  terminateLatestAssistant(messages, 'interrupted', 'CLIENT_ABORTED')
  assert.equal(messages[0].status, 'interrupted')
  assert.equal(messages[0].streaming, false)
})

test('persisted failed reply restores its preceding question for retry', () => {
  const recovery = getConversationRecovery([
    { id: 'question', role: 'user', content: '是否适合换工作？', status: 'completed' },
    { id: 'reply', role: 'assistant', content: '部分内容', status: 'timed_out' },
  ])
  assert.deepEqual(recovery, {
    content: '是否适合换工作？',
    message: '上一次生成超时，你可以重新发送这次问题。',
  })
  assert.equal(getConversationRecovery([{ role: 'assistant', content: '完成', status: 'completed' }]), null)
})

test('hexagram symbols follow the actual King Wen number', () => {
  assert.equal(getHexagramSymbol(1), '䷀')
  assert.equal(getHexagramSymbol(2), '䷁')
  assert.notEqual(getHexagramSymbol(38), getHexagramSymbol(1))
})

test('scope and validation errors require editing instead of blind retry', () => {
  assert.equal(isRetryableConversationError({ code: 'AI_SCOPE_REJECTED' }), false)
  assert.equal(isRetryableConversationError({ code: 'AI_PROVIDER_FAILED' }), true)
})
