import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import test from 'node:test'

const root = resolve(import.meta.dirname, '..')

test('welcome title keeps readable character and line spacing on desktop and mobile', () => {
  const page = readFileSync(resolve(root, 'src/pages/DivinationPage.vue'), 'utf8')
  const mobile = page.slice(page.lastIndexOf('@media (max-width: 760px)'))

  assert.match(page, /h1\s*\{[^}]*letter-spacing:\s*\.06em[^}]*line-height:\s*1\.08/)
  assert.match(mobile, /\.hero-copy h1\s*\{[^}]*letter-spacing:\s*\.05em[^}]*line-height:\s*1\.12/)
})
