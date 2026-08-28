import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')

test('desktop AI conversations keep the page fixed while the message list scrolls', () => {
  const app = readFileSync(resolve(root, 'src/App.vue'), 'utf8')
  const conversation = readFileSync(resolve(root, 'src/pages/AiConversationPage.vue'), 'utf8')

  assert.match(app, /'chat-shell': isAiConversationPage/)
  assert.match(app, /\.app-shell\.chat-shell[^}]*height:\s*100dvh/)
  assert.match(app, /\.app-shell\.chat-shell[^}]*grid-template-rows:\s*auto minmax\(0,1fr\)/)
  assert.match(app, /\.app-shell\.chat-shell[^}]*overflow:\s*clip/)
  assert.match(app, /\.topbar[^}]*width:\s*100%/)
  assert.match(conversation, /\.chat-page[^}]*height:\s*100%[^}]*overflow:\s*hidden/)
  assert.match(conversation, /\.conversation-panel[^}]*grid-template-rows:\s*auto minmax\(0,1fr\) auto/)
  assert.match(conversation, /\.message-list[^}]*overflow-y:\s*auto/)
  assert.doesNotMatch(conversation, /min-height:\s*calc\(100vh\s*-\s*100px\)/)
  assert.doesNotMatch(conversation, /\.conversation-panel\s*\{[^}]*min-height:\s*68vh/)
})

test('mobile AI conversations let the page scroll without exposing decorative overflow', () => {
  const app = readFileSync(resolve(root, 'src/App.vue'), 'utf8')
  const conversation = readFileSync(resolve(root, 'src/pages/AiConversationPage.vue'), 'utf8')
  const mobileApp = app.slice(app.lastIndexOf('@media (max-width: 760px)'))
  const mobileConversation = conversation.slice(conversation.lastIndexOf('@media (max-width: 760px)'))

  assert.match(mobileApp, /\.app-shell\.chat-shell\s*\{[^}]*height:\s*auto[^}]*overflow:\s*clip/)
  assert.match(mobileConversation, /\.chat-page\s*\{[^}]*height:\s*auto[^}]*overflow:\s*visible/)
  assert.match(mobileConversation, /\.conversation-panel\s*\{\s*height:\s*clamp\(640px,calc\(100dvh - 110px\),760px\)/)
  assert.match(mobileConversation, /\.keyboard-hint\s*\{\s*display:\s*none/)
})

test('mobile conversation quota state uses a centered, tiered recovery layout', () => {
  const conversation = readFileSync(resolve(root, 'src/pages/AiConversationPage.vue'), 'utf8')
  const mobileConversation = conversation.slice(conversation.lastIndexOf('@media (max-width: 760px)'))

  assert.match(conversation, /isConversationQuotaExceeded[^\n]*AI_DAILY_QUOTA_EXCEEDED/)
  assert.match(conversation, /class="mobile-error-title">\{\{ isConversationQuotaExceeded \? '新对话额度已用完' : '无法开始解读' \}\}/)
  assert.match(conversation, /class="retry-time retry-time-mobile"><small>可再次创建<\/small><strong>\{\{ loadRetryAt \}\}<\/strong><em>按你的本地时间<\/em>/)
  assert.match(mobileConversation, /\.center-state\.error\s*\{[^}]*min-height:\s*calc\(100dvh - 92px\)[^}]*justify-items:\s*center[^}]*text-align:\s*center/)
  assert.match(mobileConversation, /\.error-detail\s*\{[^}]*max-width:\s*19em[^}]*line-height:\s*1\.75/)
  assert.match(mobileConversation, /\.retry-time-mobile\s*\{[^}]*display:\s*grid[^}]*justify-items:\s*center/)
})

test('user question marker stays on the right without changing the question alignment', () => {
  const conversation = readFileSync(resolve(root, 'src/pages/AiConversationPage.vue'), 'utf8')

  assert.match(conversation, /&\.user\s*\{[^}]*position:\s*relative[^}]*display:\s*block[^}]*justify-self:\s*end[^}]*text-align:\s*right/)
  assert.match(conversation, /> span\s*\{[^}]*position:\s*absolute[^}]*right:\s*0/)
  assert.match(conversation, /> div\s*\{[^}]*display:\s*grid[^}]*justify-items:\s*end/)
  assert.match(conversation, /small\s*\{[^}]*min-height:\s*32px[^}]*margin-right:\s*44px/)
})

test('mobile motion control keeps the neighboring control height when its label is hidden', () => {
  const app = readFileSync(resolve(root, 'src/App.vue'), 'utf8')
  const mobileApp = app.slice(app.lastIndexOf('@media (max-width: 760px)'))

  assert.match(mobileApp, /\.motion-toggle span[^}]*display:\s*none/)
  assert.match(mobileApp, /\.history-button, \.account-link, \.motion-toggle\s*\{[^}]*height:\s*27px/)
  assert.match(mobileApp, /\.motion-toggle\s*\{[^}]*width:\s*40px[^}]*justify-content:\s*center[^}]*padding-inline:\s*0/)
})

test('mobile oracle context centers the transition above two matching name columns', () => {
  const conversation = readFileSync(resolve(root, 'src/pages/AiConversationPage.vue'), 'utf8')
  const mobileConversation = conversation.slice(conversation.lastIndexOf('@media (max-width: 760px)'))

  assert.match(conversation, /class="oracle-rail" :class="\{ 'has-transformed': conversation\.oracleContext\.transformed \}"/)
  assert.match(mobileConversation, /\.oracle-rail\s*\{[^}]*display:\s*grid[^}]*grid-template-columns:\s*repeat\(2,minmax\(0,1fr\)\)/)
  assert.match(mobileConversation, /\.oracle-glyph\s*\{[^}]*grid-column:\s*1\/-1[^}]*justify-content:\s*center/)
  assert.match(mobileConversation, /\.oracle-name\s*\{[^}]*justify-items:\s*center/)
  assert.match(mobileConversation, /\.boundary\s*\{[^}]*grid-column:\s*1\/-1[^}]*border-top:/)
})
