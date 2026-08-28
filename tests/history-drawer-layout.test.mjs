import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const app = readFileSync(resolve(root, 'src/App.vue'), 'utf8')

const getRule = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return app.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? ''
}

test('history drawer uses one bounded content scroller instead of competing list scrollers', () => {
  const drawer = getRule('.history-drawer')
  const content = getRule('.history-content')
  const list = getRule('.history-list')
  const localList = getRule('.history-list-local')
  const note = getRule('.history-note')

  assert.match(drawer, /height:\s*100dvh/)
  assert.match(content, /min-height:\s*0/)
  assert.match(content, /flex:\s*1/)
  assert.match(content, /overflow-y:\s*auto/)
  assert.doesNotMatch(list, /overflow-y|flex-shrink/)
  assert.doesNotMatch(localList, /max-height|flex-shrink|overflow-y/)
  assert.match(note, /flex:\s*0 0 auto/)
})

test('history drawer locks and restores background scrolling', () => {
  assert.match(app, /watch\(historyOpen,[\s\S]*body\.classList\.toggle\('history-open', isOpen\)/)
  assert.match(app, /onBeforeUnmount\([\s\S]*body\.classList\.remove\('history-open'\)/)
  assert.match(app, /:global\(body\.history-open\)\s*\{[^}]*overflow:\s*hidden/)
})
