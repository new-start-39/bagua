<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { useDivinationHistory } from './composables/useDivinationHistory.js'
import { useSession } from './composables/useSession.js'
import { getPostLogoutLocation } from './utils/navigation.js'

const route = useRoute()
const router = useRouter()
const session = useSession()
const divinationHistory = useDivinationHistory()
const motionPaused = ref(false)
const historyOpen = ref(false)
const historyCount = computed(() => divinationHistory.items.value.length)
const visibleHistoryCount = computed(() => historyCount.value + (
  divinationHistory.source.value === 'cloud' ? divinationHistory.localCount.value : 0
))
const historyCountLabel = computed(() => divinationHistory.source.value === 'cloud'
  ? String(visibleHistoryCount.value)
  : `${historyCount.value}/10`)
const historyAvailable = computed(() => route.name !== 'divination' || route.query.phase !== 'casting')
const isAiConversationPage = computed(() => ['ai-init', 'ai-conversation'].includes(route.name))
const particles = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  top: `${(index * 47) % 100}%`,
  delay: `${(index % 7) * -0.8}s`,
  duration: `${5 + (index % 5)}s`,
}))

watch(() => route.fullPath, () => {
  if (!historyOpen.value) divinationHistory.refreshLocal()
  historyOpen.value = false
})
watch(historyOpen, (isOpen) => globalThis.document?.body.classList.toggle('history-open', isOpen))

const openHistory = async () => {
  historyOpen.value = true
  await divinationHistory.refresh()
}
const viewHistory = (record) => router.push({
  name: 'result', params: { castId: record.id ?? record.clientId },
})
const isCurrentHistory = (record) => route.name === 'result' && [record.id, record.clientId].includes(route.params.castId)
const removeLocalHistory = async (record) => {
  if (!window.confirm('确定删除这条本机历史吗？此操作只影响当前浏览器。')) return
  divinationHistory.removeLocal(record)
  if (isCurrentHistory(record)) { historyOpen.value = false; await router.replace('/') }
}
const removeCloudHistory = async (record) => {
  if (!window.confirm('删除后，账户记录及相关 AI 解读对话将永久删除；当前设备上的同一记录也会移除。确定继续吗？')) return
  await divinationHistory.removeCloud(record)
  if (!divinationHistory.error.value && isCurrentHistory(record)) { historyOpen.value = false; await router.replace('/') }
}
const clearHistory = () => {
  if (!historyCount.value || divinationHistory.source.value !== 'local' || !window.confirm('确定要清空全部本机卦象历史吗？')) return
  divinationHistory.clearLocal()
}
const handleLogout = async () => {
  const destination = getPostLogoutLocation(route, globalThis.history?.state?.back)
  const userId = session.user.value?.id
  await session.logout()
  divinationHistory.clearOwnedCache(userId)
  divinationHistory.refreshLocal()
  await router.replace(destination)
}
const handleAuthRequired = () => {
  session.invalidate()
  if (route.meta.requiresAuth) router.replace({ name: 'login', query: { redirect: route.fullPath } })
}
const formatHistoryDate = (timestamp) => new Intl.DateTimeFormat('zh-CN', {
  month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
}).format(new Date(timestamp))

session.ensureSession().catch(() => {})
onMounted(() => globalThis.addEventListener('bagua:auth-required', handleAuthRequired))
onBeforeUnmount(() => {
  globalThis.removeEventListener('bagua:auth-required', handleAuthRequired)
  globalThis.document?.body.classList.remove('history-open')
})
</script>

<template>
  <main id="main-content" class="app-shell" :class="{ 'motion-paused': motionPaused, 'chat-shell': isAiConversationPage }">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <div class="particle-field" aria-hidden="true">
      <i v-for="particle in particles" :key="particle.id" class="particle" :style="{ left: particle.left, top: particle.top, '--delay': particle.delay, '--duration': particle.duration }"></i>
    </div>

    <header class="topbar">
      <RouterLink class="brand" to="/" aria-label="返回赛博八卦首页"><span class="brand-seal">✦</span><span>赛博八卦</span></RouterLink>
      <div class="topbar-tools">
        <button v-if="historyAvailable" class="history-button" type="button" @click="openHistory"><span>历史记录</span><b>{{ historyCountLabel }}</b></button>
        <RouterLink v-if="session.state.value === 'anonymous'" class="account-link" :to="{ name: 'login' }">登录</RouterLink>
        <button v-else-if="session.state.value === 'authenticated'" class="account-link" type="button" @click="handleLogout">退出</button>
        <button class="motion-toggle" type="button" :aria-label="motionPaused ? '开启页面动效' : '暂停页面动效'" :aria-pressed="!motionPaused" @click="motionPaused = !motionPaused"><span>{{ motionPaused ? '动效已暂停' : '动效开启' }}</span><i></i></button>
        <span class="system-status"><i></i> 易象引擎在线</span>
      </div>
    </header>

    <Transition name="history">
      <div v-if="historyOpen" class="history-layer">
        <button class="history-backdrop" type="button" aria-label="关闭历史记录" @click="historyOpen = false"></button>
        <aside class="history-drawer" aria-labelledby="history-title">
          <div class="history-drawer-heading"><div><p class="eyebrow"><span>HISTORY</span> {{ divinationHistory.source.value === 'cloud' ? 'ACCOUNT ARCHIVE' : 'LOCAL ARCHIVE' }}</p><h2 id="history-title">卦象历史</h2></div><button class="history-close" type="button" aria-label="关闭历史记录" @click="historyOpen = false">×</button></div>
          <div class="history-content">
            <div v-if="divinationHistory.canMerge.value" class="history-merge"><p>另有 {{ divinationHistory.localCount.value }} 条本机记录，可直接在下方查看。合并到账户是可选操作。</p><button type="button" :disabled="divinationHistory.merging.value" @click="divinationHistory.mergeLocal">{{ divinationHistory.merging.value ? '正在合并…' : '合并到账户' }}</button></div>
            <p v-if="divinationHistory.error.value" class="history-error" role="alert">{{ divinationHistory.error.value }}</p>
            <p v-if="divinationHistory.loading.value && !historyCount" class="history-empty">正在读取账户历史…</p>
            <p v-else-if="!visibleHistoryCount" class="history-empty">完成一次起卦后，结果会自动保存在这里。</p>
            <p v-if="divinationHistory.source.value === 'cloud' && historyCount" class="history-section-title">账户记录</p>
            <ol v-if="historyCount" class="history-list">
              <li v-for="(record, index) in divinationHistory.items.value" :key="record.id ?? record.clientId" class="history-item">
                <button class="history-view" type="button" @click="viewHistory(record)"><span class="history-item-index">{{ String(index + 1).padStart(2, '0') }}</span><span class="history-item-main"><strong>{{ record.original.name }}</strong><small>{{ formatHistoryDate(record.createdAt) }} · {{ record.transformed ? `变卦 ${record.transformed.name}` : '静卦' }}</small></span><span class="history-arrow">↗</span></button>
                <button v-if="divinationHistory.source.value === 'cloud'" class="history-delete" type="button" :disabled="divinationHistory.isDeleting(record)" :aria-label="`删除${record.original.name}账户历史`" @click="removeCloudHistory(record)">{{ divinationHistory.isDeleting(record) ? '…' : '删除' }}</button>
                <button v-else class="history-delete" type="button" :aria-label="`删除${record.original.name}本机历史`" @click="removeLocalHistory(record)">删除</button>
              </li>
            </ol>
            <template v-if="divinationHistory.source.value === 'cloud' && divinationHistory.localCount.value">
              <p class="history-section-title">本机记录（未合并）</p>
              <ol class="history-list history-list-local">
                <li v-for="(record, index) in divinationHistory.localItems.value" :key="record.clientId" class="history-item">
                  <button class="history-view" type="button" @click="viewHistory(record)"><span class="history-item-index">{{ String(index + 1).padStart(2, '0') }}</span><span class="history-item-main"><strong>{{ record.original.name }}</strong><small>{{ formatHistoryDate(record.createdAt) }} · {{ record.transformed ? `变卦 ${record.transformed.name}` : '静卦' }}</small></span><span class="history-arrow">↗</span></button>
                  <button class="history-delete" type="button" :aria-label="`删除${record.original.name}本机历史`" @click="removeLocalHistory(record)">删除</button>
                </li>
              </ol>
            </template>
            <button v-if="divinationHistory.nextCursor.value" class="history-more" type="button" :disabled="divinationHistory.loading.value" @click="divinationHistory.refresh({ append: true })">{{ divinationHistory.loading.value ? '载入中…' : '载入更多' }}</button>
            <button v-if="historyCount && divinationHistory.source.value === 'local'" class="history-clear" type="button" @click="clearHistory">清空本机历史</button>
          </div>
          <small class="history-note">{{ divinationHistory.source.value === 'cloud' ? '账户历史由服务端保存 · 退出后清除本机账户缓存' : '仅保存在当前浏览器 · 最多保留 10 条' }}</small>
        </aside>
      </div>
    </Transition>

    <RouterView v-slot="{ Component }"><Transition name="phase" mode="out-in"><component :is="Component" /></Transition></RouterView>
  </main>
</template>

<style scoped lang="scss">
.app-shell {
  position: relative; min-height: 100vh; overflow: hidden; padding: 30px clamp(22px, 6vw, 96px) 42px; background: #080b20; isolation: isolate;
  &::before { position: absolute; inset: 0; z-index: -2; background: linear-gradient(120deg, rgba(20,34,88,.58), transparent 42%), radial-gradient(circle at 76% 28%, rgba(78,241,224,.1), transparent 25rem); content: ''; }
  &::after { position: absolute; inset: 0; z-index: -1; opacity: .18; background-image: linear-gradient(rgba(102,120,217,.18) 1px, transparent 1px), linear-gradient(90deg,rgba(102,120,217,.18) 1px,transparent 1px); background-size: 56px 56px; content: ''; mask-image: linear-gradient(to bottom,black,transparent 80%); }
  &.motion-paused *, &.motion-paused *::before, &.motion-paused *::after { animation-play-state: paused !important; }
}
.app-shell.chat-shell { display: grid; height: 100vh; height: 100dvh; min-height: 0; grid-template-rows: auto minmax(0,1fr); row-gap: 30px; overflow: clip; padding-bottom: 30px; }
.ambient { position: absolute; z-index: -1; width: 34rem; height: 34rem; border-radius: 50%; filter: blur(70px); opacity: .13; pointer-events: none; &-one { top: -18rem; right: -8rem; background: #d98b3a; } &-two { bottom: -20rem; left: -10rem; background: #394bff; } }
.particle-field { position: absolute; inset: 0; z-index: 0; pointer-events: none; }
.particle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #79eadd; box-shadow: 0 0 14px 2px #79eadd; animation: drift var(--duration) var(--delay) ease-in-out infinite alternate; }
.topbar { position: relative; z-index: 5; display: flex; width: 100%; max-width: 1280px; align-items: center; justify-content: space-between; margin: 0 auto; }
.brand { display: inline-flex; align-items: center; gap: 11px; color: #eef1ff; font-weight: 800; letter-spacing: -.04em; text-decoration: none; }
.brand-seal { display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid #dca260; border-radius: 50%; color: #dca260; box-shadow: 0 0 20px rgba(220,162,96,.24); animation: seal-pulse 3s ease-in-out infinite; }
.topbar-tools { display: flex; align-items: center; gap: 14px; }
.history-button, .account-link, .motion-toggle { border: 1px solid rgba(92,245,212,.2); padding: 7px 10px; background: rgba(12,24,59,.65); color: #8592bd; font: 9px 'DM Mono', monospace; letter-spacing: .08em; text-decoration: none; }
.history-button { color: #d8b285; border-color: rgba(220,162,96,.38); b { margin-left: 8px; color: #f1dfc9; font-weight: 400; } }
.account-link:hover, .history-button:hover { border-color: #5cf5d4; color: #cafff7; }
.motion-toggle { display: inline-flex; align-items: center; gap: 8px; i { width: 6px; height: 6px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 10px #5cf5d4; animation: status-pulse 1.4s ease-in-out infinite; } &[aria-pressed="false"] i { background: #7580a9; box-shadow: none; animation: none; } }
.system-status { color: #7782ad; font: 10px 'DM Mono', monospace; letter-spacing: .12em; i { display: inline-block; width: 6px; height: 6px; margin-right: 7px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 10px #5cf5d4; } }
.history-layer { position: fixed; inset: 0; z-index: 10; }
.history-backdrop { position: absolute; inset: 0; width: 100%; border: 0; background: rgba(3,6,22,.7); backdrop-filter: blur(5px); }
.history-drawer { position: absolute; top: 0; right: 0; display: flex; width: min(430px,92vw); height: 100vh; height: 100dvh; flex-direction: column; padding: 34px clamp(22px,4vw,42px); border-left: 1px solid rgba(92,245,212,.24); background: linear-gradient(160deg,rgba(13,21,55,.98),rgba(18,11,35,.98)); box-shadow: -18px 0 70px rgba(0,0,0,.34); }
.history-drawer-heading { display: flex; flex: 0 0 auto; justify-content: space-between; padding-bottom: 25px; border-bottom: 1px solid rgba(121,144,215,.18); h2 { margin: 10px 0 0; color: #eef2ff; font-size: 31px; } }
.history-content { min-height: 0; flex: 1; overflow-y: auto; overscroll-behavior: contain; padding-right: 6px; scrollbar-gutter: stable; }
.eyebrow { margin: 0; color: #6f7aa9; font: 10px 'DM Mono', monospace; letter-spacing: .18em; span { color: #dc9c57; } }
.history-close { width: 36px; height: 36px; border: 1px solid rgba(92,245,212,.24); background: transparent; color: #8cefe0; font-size: 25px; }
.history-empty { color: #8490bb; line-height: 1.9; }
.history-merge { margin-top: 18px; border: 1px solid rgba(220,162,96,.32); padding: 14px; background: rgba(54,34,43,.55); p { margin: 0 0 11px; color: #b9a58f; font-size: 11px; line-height: 1.7; } button { min-height: 40px; border: 1px solid #dca260; padding: 0 13px; background: transparent; color: #f0c795; &:disabled { opacity: .5; } } }
.history-error { margin: 14px 0 0; color: #ff9dca; font-size: 11px; line-height: 1.7; }
.history-section-title { margin: 20px 0 0; color: #8490bb; font: 10px 'DM Mono', monospace; letter-spacing: .12em; }
.history-list { display: grid; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
.history-list-local { margin-bottom: 20px; }
.history-item { position: relative; }
.history-view { display: grid; width: 100%; grid-template-columns: 28px 1fr auto; align-items: center; gap: 13px; border: 1px solid rgba(121,144,215,.14); padding: 14px 62px 14px 13px; background: rgba(10,18,48,.55); color: inherit; text-align: left; &:hover { border-color: rgba(92,245,212,.6); } }
.history-delete { position: absolute; top: 50%; right: 10px; min-width: 42px; min-height: 32px; transform: translateY(-50%); border: 0; background: transparent; color: #c886a9; font-size: 11px; &:hover { color: #ffabd3; } &:disabled { cursor: wait; opacity: .5; } }
.history-item-index { color: #dca260; font: 10px 'DM Mono',monospace; }
.history-item-main { display: grid; gap: 5px; strong { color: #ecf2ff; } small { color: #7180b8; font: 10px 'DM Mono',monospace; } }
.history-arrow { color: #5cf5d4; font-size: 18px; }
.history-clear { display: block; margin-top: 16px; border: 0; background: transparent; color: #c886a9; }
.history-more { display: block; min-height: 40px; margin: 16px auto 0; border: 1px solid rgba(92,245,212,.35); padding: 0 14px; background: transparent; color: #8ff3e3; }
.history-note { flex: 0 0 auto; margin-top: 18px; padding-top: 16px; border-top: 1px solid rgba(121,144,215,.12); color: #58658f; font: 10px 'DM Mono',monospace; }
:global(body.history-open) { overflow: hidden; }
.phase-enter-active, .phase-leave-active { transition: opacity .35s ease, transform .45s ease; }
.phase-enter-from { opacity: 0; transform: translateY(18px); } .phase-leave-to { opacity: 0; transform: translateY(-12px); }
.history-enter-active, .history-leave-active { transition: opacity .3s ease; } .history-enter-from, .history-leave-to { opacity: 0; }
@keyframes drift { from { transform: translate3d(0,0,0) scale(.7); opacity: .25; } to { transform: translate3d(16px,-22px,0) scale(1.6); opacity: 1; } }
@keyframes seal-pulse { 50% { box-shadow: 0 0 28px rgba(220,162,96,.65); transform: rotate(12deg); } }
@keyframes status-pulse { 50% { transform: scale(1.7); opacity: .45; } }
@media (max-width: 760px) {
  .app-shell { padding: 22px 18px 32px; }
  .app-shell.chat-shell { display: block; height: auto; min-height: 100vh; min-height: 100dvh; overflow: clip; padding-bottom: 18px; }
  .system-status, .motion-toggle span, .history-button span { display: none; }
  .topbar-tools { gap: 7px; }
  .history-button, .account-link, .motion-toggle { height: 27px; }
  .motion-toggle { width: 40px; justify-content: center; gap: 0; padding-inline: 0; }
}
</style>
