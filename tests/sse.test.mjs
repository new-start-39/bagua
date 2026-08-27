import test from 'node:test'
import assert from 'node:assert/strict'
import { createConversationSseParser, createSseParser } from '../src/utils/sse.js'

test('SSE parser handles frames split across arbitrary chunks', () => {
  const events = []
  const parser = createSseParser((event) => events.push(event))
  parser.push('event: message.start\ndata: {"message')
  parser.push('Id":"msg_1"}\n\nevent: message.delta\ndata: {"content":"此卦"}\n\n')
  parser.push('event: message.done\ndata: {"messageId":"msg_1"}')
  parser.finish()
  assert.deepEqual(events, [
    { event: 'message.start', data: { messageId: 'msg_1' } },
    { event: 'message.delta', data: { content: '此卦' } },
    { event: 'message.done', data: { messageId: 'msg_1' } },
  ])
})

test('SSE parser joins repeated data lines and preserves plain data', () => {
  const events = []
  const parser = createSseParser((event) => events.push(event))
  parser.push('event: error\ndata: first\ndata: second\n\n')
  assert.deepEqual(events, [{ event: 'error', data: 'first\nsecond' }])
})

test('conversation SSE parser requires an explicit terminal event', () => {
  const completed = createConversationSseParser(() => {})
  completed.push('event: message.done\ndata: {"messageId":"msg_1"}\n\n')
  assert.equal(completed.finish(), 'message.done')

  const interrupted = createConversationSseParser(() => {})
  interrupted.push('event: message.delta\ndata: {"content":"未完成"}\n\n')
  assert.equal(interrupted.finish(), null)
})
