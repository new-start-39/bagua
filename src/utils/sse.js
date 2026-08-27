/**
 * Creates a stateful parser for standard SSE frames.
 * @param {(payload: {event: string, data: unknown}) => void} onEvent Event receiver.
 * @returns {{push: (chunk: string) => void, finish: () => void}}
 */
export const createSseParser = (onEvent) => {
  let buffer = ''
  const dispatch = (frame) => {
    let event = 'message'
    const data = []
    for (const line of frame.split(/\r?\n/)) {
      if (line.startsWith('event:')) event = line.slice(6).trim()
      if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
    }
    if (!data.length) return
    const raw = data.join('\n')
    let parsed = raw
    try { parsed = JSON.parse(raw) } catch { /* Plain string data is valid SSE. */ }
    onEvent({ event, data: parsed })
  }
  return {
    push: (chunk) => {
      const frames = `${buffer}${chunk.replace(/^\uFEFF/, '')}`.split(/\r?\n\r?\n/)
      buffer = frames.pop()
      for (const frame of frames) if (frame.trim()) dispatch(frame)
    },
    finish: () => { if (buffer.trim()) dispatch(buffer); buffer = '' },
  }
}

/**
 * Parses one AI conversation stream and records whether it reached a protocol
 * terminal event. A clean HTTP EOF is not a successful generation by itself.
 * @param {(payload: {event: string, data: unknown}) => void} onEvent Event receiver.
 * @returns {{push: (chunk: string) => void, finish: () => string|null}}
 */
export const createConversationSseParser = (onEvent) => {
  let terminalEvent = null
  const parser = createSseParser((payload) => {
    if (payload.event === 'message.done' || payload.event === 'error') terminalEvent = payload.event
    onEvent(payload)
  })
  return {
    push: parser.push,
    finish: () => {
      parser.finish()
      return terminalEvent
    },
  }
}
