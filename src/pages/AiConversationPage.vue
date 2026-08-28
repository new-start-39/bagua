<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createConversation, getConversation } from '../api/conversations.js'
import { getDivination } from '../api/divinations.js'
import { useChatStream } from '../composables/useChatStream.js'
import { useSession } from '../composables/useSession.js'
import { findAccountHistoryRecord } from '../utils/account-history.js'
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
} from '../utils/conversation-state.js'
import { findHistoryRecord } from '../utils/history.js'
import { getPostLogoutLocation } from '../utils/navigation.js'
import { findTransientDivination, rememberTransientDivination } from '../utils/transient-divination.js'

const route = useRoute()
const router = useRouter()
const chat = useChatStream()
const session = useSession()
const loading = ref(true)
const loadError = ref('')
const loadErrorCode = ref('')
const loadRetryAt = ref('')
const conversation = ref(null)
const messages = ref([])
const input = ref('')
const sendError = ref('')
const retryContent = ref('')
const retryAfter = ref(0)
const messageList = ref(null)
const activeContent = ref('')
const retryMessageId = ref('')
let retryTimer = null
let initializeGeneration = 0
const conversationId = computed(() => conversation.value?.conversationId ?? route.params.conversationId)
const isConversationQuotaExceeded = computed(() => loadErrorCode.value === 'AI_DAILY_QUOTA_EXCEEDED')
const originalSymbol = computed(() => getHexagramSymbol(conversation.value?.oracleContext.original.number))
const transformedSymbol = computed(() => getHexagramSymbol(conversation.value?.oracleContext.transformed?.number))

const formatLocalRetryAt = (seconds) => {
  const retryAfterSeconds = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (!retryAfterSeconds) return ''
  return new Date(Date.now() + retryAfterSeconds * 1_000).toLocaleString('zh-CN', {
    month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

const scrollToEnd = async () => {
  await nextTick()
  messageList.value?.scrollTo({ top: messageList.value.scrollHeight, behavior: 'smooth' })
}

const returnToDivination = () => router.replace(
  getPostLogoutLocation(route, globalThis.history?.state?.back),
)

const clearRetryCountdown = () => {
  if (retryTimer) clearInterval(retryTimer)
  retryTimer = null
  retryAfter.value = 0
}

const startRetryCountdown = (seconds) => {
  clearRetryCountdown()
  retryAfter.value = Math.max(0, Math.ceil(Number(seconds) || 0))
  if (!retryAfter.value) return
  retryTimer = setInterval(() => {
    retryAfter.value = Math.max(0, retryAfter.value - 1)
    if (!retryAfter.value) clearRetryCountdown()
  }, 1_000)
}

const resetSendFeedback = () => {
  clearRetryCountdown()
  sendError.value = ''
  retryContent.value = ''
  retryMessageId.value = ''
}

const restoreSendFeedback = () => {
  const recovery = getConversationRecovery(messages.value)
  if (!recovery) return
  sendError.value = recovery.message
  retryContent.value = recovery.content
}

const retainOracle = (value) => {
  if (!value?.oracleContext || !value.clientDivinationId) return
  rememberTransientDivination({
    id: value.divinationId,
    clientId: value.clientDivinationId,
    createdAt: new Date().toISOString(),
    original: {
      number: value.oracleContext.original.number,
      name: value.oracleContext.original.name,
    },
    transformed: value.oracleContext.transformed ? {
      number: value.oracleContext.transformed.number,
      name: value.oracleContext.transformed.name,
    } : null,
    schemaVersion: 1,
  })
}

const initialize = async () => {
  const generation = ++initializeGeneration
  chat.stop()
  loading.value = true
  loadError.value = ''
  loadErrorCode.value = ''
  loadRetryAt.value = ''
  resetSendFeedback()
  try {
    if (route.name === 'ai-conversation') {
      const loaded = await getConversation(route.params.conversationId)
      if (generation !== initializeGeneration) return
      conversation.value = loaded
      retainOracle(loaded)
      messages.value = normalizeConversationMessages(loaded.messages ?? [loaded.openingMessage])
      restoreSendFeedback()
      if (!route.query.castId && loaded.clientDivinationId) {
        await router.replace({
          name: 'ai-conversation',
          params: { conversationId: route.params.conversationId },
          query: { ...route.query, castId: loaded.clientDivinationId },
        })
      }
      return
    }
    let record = findHistoryRecord(route.params.castId)
      ?? findTransientDivination(route.params.castId)
      ?? findAccountHistoryRecord(session.user.value?.id, route.params.castId)
    if (!record && session.state.value === 'authenticated' && route.params.castId?.startsWith('div_')) {
      record = await getDivination(route.params.castId)
      if (generation !== initializeGeneration) return
      rememberTransientDivination(record)
    }
    if (!record) { loadError.value = '该卦象已不存在，无法建立对话。'; return }
    const created = await createConversation({
      clientDivinationId: record.clientId,
      divination: {
        createdAt: new Date(record.createdAt).toISOString(),
        original: record.original,
        transformed: record.transformed,
        schemaVersion: record.schemaVersion,
      },
    })
    if (generation !== initializeGeneration) return
    conversation.value = created
    retainOracle(created)
    messages.value = normalizeConversationMessages(created.messages ?? [created.openingMessage])
    restoreSendFeedback()
    await router.replace({
      name: 'ai-conversation',
      params: { conversationId: created.conversationId },
      query: { castId: record.clientId },
    })
  } catch (caught) {
    if (generation === initializeGeneration) {
      loadError.value = caught?.message ?? '无法建立 AI 对话，请稍后重试。'
      loadErrorCode.value = caught?.code ?? ''
      if (caught?.code === 'AI_DAILY_QUOTA_EXCEEDED') {
        loadRetryAt.value = formatLocalRetryAt(caught.retryAfter)
      }
    }
  } finally {
    if (generation === initializeGeneration) {
      loading.value = false
      scrollToEnd()
    }
  }
}

watch(() => [route.name, route.params.castId, route.params.conversationId], initialize, { immediate: true })

const handleStreamEvent = ({ event, data }) => {
  const result = applyConversationStreamEvent(messages.value, { event, data })
  if (result.errorMessage) {
    sendError.value = result.errorMessage
    retryContent.value = activeContent.value
    startRetryCountdown(data?.retryAfter)
  }
  scrollToEnd()
}

const submitContent = async (content) => {
  if (!content || chat.isGenerating.value || !conversationId.value || retryAfter.value) return
  activeContent.value = content
  resetSendFeedback()
  const clientMessageId = globalThis.crypto?.randomUUID?.() ?? `client-${Date.now()}`
  messages.value.push({ id: clientMessageId, role: 'user', content, status: 'pending', streaming: false })
  appendOptimisticAssistant(messages.value, clientMessageId)
  input.value = ''
  try {
    const stream = chat.send({
      conversationId: conversationId.value,
      content,
      clientMessageId,
      onEvent: handleStreamEvent,
    })
    void scrollToEnd()
    await stream
  } catch (caught) {
    const failedBeforeStream = removeOptimisticAssistant(messages.value, clientMessageId)
    if (failedBeforeStream) {
      removeOptimisticUserMessage(messages.value, clientMessageId)
      input.value = content
      sendError.value = caught?.name === 'AbortError'
        ? '已停止生成，问题已放回输入框。'
        : caught?.message ?? '生成未能开始，请稍后重试。'
      startRetryCountdown(caught?.retryAfter)
    } else {
      failOptimisticUserMessage(messages.value, clientMessageId, caught?.code ?? 'AI_STREAM_INTERRUPTED')
      retryMessageId.value = clientMessageId
      if (caught?.name === 'AbortError') {
        terminateLatestAssistant(messages.value, 'interrupted', 'CLIENT_ABORTED')
        sendError.value = '已停止生成，你可以重新发送这次问题。'
        retryContent.value = content
      } else {
        terminateLatestAssistant(messages.value, 'failed', caught?.code ?? 'AI_STREAM_INTERRUPTED')
        sendError.value = caught?.message ?? '生成未能完成，请稍后重试。'
        if (isRetryableConversationError(caught)) retryContent.value = content
        else input.value = content
        startRetryCountdown(caught?.retryAfter)
      }
    }
  } finally {
    activeContent.value = ''
  }
}

const submit = () => submitContent(input.value.trim())

const handleComposerKeydown = (event) => {
  if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return
  event.preventDefault()
  submit()
}

const retryLast = () => {
  const content = retryContent.value
  if (content) {
    removeOptimisticUserMessage(messages.value, retryMessageId.value)
    submitContent(content)
  }
}

onBeforeUnmount(() => {
  clearRetryCountdown()
  chat.stop()
})
</script>

<template>
  <section class="chat-page" aria-labelledby="chat-title">
    <div v-if="loading" class="center-state"><span>CONNECTING ORACLE</span><h1 id="chat-title">正在载入卦象…</h1></div>
    <div v-else-if="loadError" class="center-state error" :class="{ 'quota-exceeded': isConversationQuotaExceeded }"><span>CONTEXT UNAVAILABLE</span><h1 id="chat-title"><span class="desktop-error-title">无法开始解读</span><span class="mobile-error-title">{{ isConversationQuotaExceeded ? '新对话额度已用完' : '无法开始解读' }}</span></h1><p class="error-detail">{{ loadError }}</p><p v-if="loadRetryAt" class="retry-time retry-time-desktop">预计可于 {{ loadRetryAt }}（你的本地时间）再次创建新对话。</p><div v-if="loadRetryAt" class="retry-time retry-time-mobile"><small>可再次创建</small><strong>{{ loadRetryAt }}</strong><em>按你的本地时间</em></div><button type="button" @click="returnToDivination">返回卦象</button></div>
    <template v-else>
      <aside class="oracle-rail" :class="{ 'has-transformed': conversation.oracleContext.transformed }">
        <p class="eyebrow"><span>CONTEXT</span> 本次对话依据</p>
        <div class="oracle-glyph" :aria-label="`第 ${conversation.oracleContext.original.number} 卦 ${conversation.oracleContext.original.name}`"><span>{{ originalSymbol }}</span><template v-if="conversation.oracleContext.transformed"><b>→</b><span>{{ transformedSymbol }}</span></template></div>
        <div class="oracle-name"><small>本卦</small><strong>{{ conversation.oracleContext.original.name }}</strong><span>第 {{ conversation.oracleContext.original.number }} 卦</span></div>
        <div v-if="conversation.oracleContext.transformed" class="oracle-name transformed"><small>变卦</small><strong>{{ conversation.oracleContext.transformed.name }}</strong><span>第 {{ conversation.oracleContext.transformed.number }} 卦</span></div>
        <p class="boundary">AI 将结合当前卦象回应。内容仅供传统文化体验，不替代医疗、法律或投资等专业判断。</p>
      </aside>
      <div class="conversation-panel">
        <header><div><p class="eyebrow"><span>AI</span> ORACLE DIALOGUE</p><h1 id="chat-title">问此一卦</h1></div><span class="stream-status"><i></i>{{ chat.isGenerating.value ? '正在生成' : '等待提问' }}</span></header>
        <ol ref="messageList" class="message-list" aria-live="polite">
          <li v-for="message in messages" :key="message.id" :class="[message.role, `status-${message.status}`]"><span>{{ message.role === 'assistant' ? '象' : '问' }}</span><div><small>{{ message.role === 'assistant' ? 'AI 解读' : '你的问题' }}<em v-if="getMessageStatusLabel(message)">{{ getMessageStatusLabel(message) }}</em></small><p>{{ message.content || (getMessageStatusLabel(message) ? '本轮没有生成完整内容。' : '') }}<i v-if="message.streaming" class="cursor"></i></p></div></li>
        </ol>
        <form class="composer" @submit.prevent="submit"><label for="oracle-question">围绕当前卦象提问</label><textarea id="oracle-question" v-model="input" rows="2" maxlength="800" :disabled="chat.isGenerating.value" placeholder="例如：我该如何看待眼前的工作变化？" @keydown="handleComposerKeydown"></textarea><div class="composer-meta"><span>{{ [...input].length }}/800<span v-if="retryAfter"> · {{ retryAfter }} 秒后可重试</span><span v-else class="keyboard-hint"> · Enter 发送 · Shift + Enter 换行</span></span><button v-if="chat.isGenerating.value" class="stop-button" type="button" @click="chat.stop">停止生成</button><button v-else class="send-button" type="submit" :disabled="!input.trim() || retryAfter > 0">发送问题 ↗</button></div><div v-if="sendError" class="send-error" role="alert"><p>{{ sendError }}</p><button v-if="retryContent" type="button" :disabled="retryAfter > 0" @click="retryLast">{{ retryAfter ? `${retryAfter} 秒后可重试` : '重新发送' }}</button></div></form>
      </div>
    </template>
  </section>
</template>

<style scoped lang="scss">
.chat-page { position: relative; z-index: 1; display: grid; width: 100%; height: 100%; min-height: 0; max-width: 1280px; grid-template-columns: minmax(220px,300px) minmax(0,1fr); gap: 18px; margin: 0 auto; overflow: hidden; }.eyebrow { margin: 0; color: #6f7aa9; font: 9px 'DM Mono',monospace; letter-spacing: .16em; span { margin-right: 9px; color: #5cf5d4; } }.oracle-rail,.conversation-panel { min-height: 0; overflow: hidden; border: 1px solid rgba(121,144,215,.22); background: rgba(11,18,48,.82); backdrop-filter: blur(18px); }.oracle-rail { padding: 27px; background: linear-gradient(180deg,rgba(21,23,53,.94),rgba(28,15,42,.9)); }.oracle-glyph { display: flex; align-items: center; gap: 12px; margin: 45px 0 28px; color: #dca260; font-size: 72px; line-height: 1; text-shadow: 0 0 30px rgba(220,162,96,.3); b { color: #65709b; font: 18px 'DM Mono',monospace; text-shadow: none; } }.oracle-name { display: grid; gap: 6px; padding: 18px 0; border-top: 1px solid rgba(121,144,215,.16); small,span { color: #6e7aa7; font: 9px 'DM Mono',monospace; } strong { color: #f1f3ff; font: 30px 'Noto Serif SC',serif; } &.transformed strong { color: #8ef5e4; } }.boundary { margin-top: 30px; color: #69759e; font-size: 11px; line-height: 1.8; }.conversation-panel { display: grid; grid-template-rows: auto minmax(0,1fr) auto; }.conversation-panel > header { display: flex; align-items: center; justify-content: space-between; padding: 25px clamp(20px,3vw,38px); border-bottom: 1px solid rgba(121,144,215,.16); h1 { margin: 8px 0 0; color: #f2f5ff; font-size: 32px; letter-spacing: -.06em; } }.stream-status { color: #7682ac; font: 9px 'DM Mono',monospace; letter-spacing: .1em; i { display: inline-block; width: 6px; height: 6px; margin-right: 8px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 10px #5cf5d4; } }.message-list { display: grid; min-height: 0; align-content: start; gap: 18px; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; margin: 0; padding: 28px clamp(20px,4vw,50px); list-style: none; li { display: grid; max-width: 82%; grid-template-columns: 34px 1fr; gap: 12px; > span { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid rgba(92,245,212,.38); border-radius: 50%; color: #5cf5d4; font-family: 'Noto Serif SC',serif; } small { color: #64709a; font: 9px 'DM Mono',monospace; letter-spacing: .1em; em { margin-left: 9px; color: #ff9dca; font-style: normal; } } p { margin: 7px 0 0; color: #cbd3ec; font-size: 14px; line-height: 1.85; white-space: pre-wrap; } &.user { position: relative; display: block; justify-self: end; text-align: right; > span { position: absolute; top: 0; right: 0; border-color: rgba(220,162,96,.48); color: #dca260; } > div { display: grid; justify-items: end; } small { display: flex; min-height: 32px; align-items: center; margin-right: 44px; } p { color: #f0e8df; } } &.status-interrupted small em { color: #dca260; } } }.cursor { display: inline-block; width: 6px; height: 15px; margin-left: 4px; background: #5cf5d4; animation: blink .8s steps(2) infinite; vertical-align: middle; }.composer { padding: 18px clamp(20px,3vw,38px) 22px; border-top: 1px solid rgba(121,144,215,.16); background: rgba(6,12,34,.65); label { display: block; margin-bottom: 8px; color: #7d89b2; font-size: 11px; } textarea { width: 100%; resize: none; border: 1px solid rgba(121,144,215,.28); padding: 13px; background: rgba(10,17,44,.88); color: #edf3ff; font: inherit; line-height: 1.6; outline: 0; &:focus { border-color: #5cf5d4; } } }.composer-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 9px; span { color: #56628a; font: 9px 'DM Mono',monospace; } button { min-height: 44px; padding: 0 16px; } }.send-button { border: 1px solid #5cf5d4; background: #153358; color: #eaffff; &:disabled { opacity: .45; } }.stop-button { border: 1px solid #dca260; background: rgba(65,36,41,.7); color: #f0c18d; }.send-error { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 10px; color: #ff9dca; font-size: 11px; p { margin: 0; } button { min-height: 36px; flex: 0 0 auto; border: 1px solid currentColor; padding: 0 12px; background: transparent; color: inherit; &:disabled { opacity: .45; } } }.center-state { position: relative; z-index: 1; display: grid; min-height: 0; grid-column: 1/-1; place-content: center; justify-items: start; span { color: #5cf5d4; font: 10px 'DM Mono',monospace; letter-spacing: .18em; } h1 { margin: 12px 0; color: #f1f4ff; font-size: clamp(40px,6vw,70px); > span { color: inherit; font: inherit; letter-spacing: inherit; } } p { color: #8792ba; } .mobile-error-title,.retry-time-mobile { display: none; } .retry-time { margin-top: 0; color: #dca260; } button { min-height: 44px; border: 1px solid #5cf5d4; padding: 0 16px; background: transparent; color: #8ff3e3; } &.error > span { color: #dca260; } }
@keyframes blink { 50% { opacity: 0; } }
@media (max-width: 760px) { .chat-page { height: auto; grid-template-columns: 1fr; grid-template-rows: auto; gap: 12px; margin-top: 18px; overflow: visible; }.oracle-rail { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); padding: 16px 18px; .eyebrow { grid-column: 1/-1; } &:not(.has-transformed) .oracle-name { grid-column: 1/-1; } }.oracle-glyph { grid-column: 1/-1; justify-content: center; gap: clamp(22px,8vw,46px); margin: 12px 0 6px; font-size: 48px; b { font-size: 16px; } }.oracle-name { justify-items: center; gap: 5px; min-width: 0; padding: 8px 6px 12px; border-top: 0; text-align: center; strong { font-size: 25px; } }.boundary { grid-column: 1/-1; margin: 4px 0 0; border-top: 1px solid rgba(121,144,215,.16); padding-top: 12px; line-height: 1.5; }.conversation-panel { height: clamp(640px,calc(100dvh - 110px),760px); }.message-list li { max-width: 94%; }.conversation-panel > header { align-items: flex-start; padding-block: 16px; h1 { font-size: 26px; } }.stream-status { margin-top: 7px; }.composer { padding-block: 12px 14px; }.keyboard-hint { display: none; }.center-state.error { min-height: calc(100dvh - 92px); place-content: center; justify-items: center; padding: 28px 10px clamp(76px,12vh,112px); text-align: center; .desktop-error-title,.retry-time-desktop { display: none; } .mobile-error-title { display: inline; } > span { font-size: 9px; letter-spacing: .2em; } h1 { max-width: 9em; margin: 14px 0 18px; font-size: clamp(34px,10vw,44px); line-height: 1.18; letter-spacing: -.055em; } .error-detail { max-width: 19em; margin: 0; color: #8e99bd; font-size: 14px; line-height: 1.75; } .retry-time-mobile { position: relative; display: grid; justify-items: center; gap: 5px; margin: 30px 0 28px; padding-top: 22px; color: #dca260; &::before { position: absolute; top: 0; width: 4px; height: 4px; border: 1px solid currentColor; content: ''; transform: rotate(45deg); box-shadow: 0 0 12px rgba(220,162,96,.7); } small { color: #7f89ab; font: 9px 'DM Mono',monospace; letter-spacing: .14em; } strong { color: #e7b06d; font: 21px 'Noto Serif SC',serif; letter-spacing: .01em; } em { color: #69759e; font: 10px 'DM Mono',monospace; font-style: normal; } } button { min-width: 160px; min-height: 48px; padding-inline: 24px; font-size: 15px; } }
}
</style>
