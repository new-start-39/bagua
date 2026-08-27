<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import HexagramSummary from '../components/HexagramSummary.vue'
import { HEXAGRAM_BY_NUMBER } from '../data/hexagrams.js'
import { getDivination } from '../api/divinations.js'
import { useSession } from '../composables/useSession.js'
import { findAccountHistoryRecord } from '../utils/account-history.js'
import { findHistoryRecord } from '../utils/history.js'
import { getHexagramFromLines } from '../utils/hexagram.js'
import { findTransientDivination, rememberTransientDivination } from '../utils/transient-divination.js'

const props = defineProps({ castId: { type: String, required: true } })
const router = useRouter()
const session = useSession()
const record = ref(null)
const loading = ref(true)
const loadError = ref('')
const result = computed(() => {
  if (!record.value) return null
  if (record.value.lines) {
    const calculated = getHexagramFromLines(record.value.lines)
    return {
      ...calculated,
      transformed: calculated.changingLines.length ? calculated.transformed : null,
    }
  }
  return {
    lines: [], changingLines: [],
    original: HEXAGRAM_BY_NUMBER[record.value.original.number],
    transformed: record.value.transformed ? HEXAGRAM_BY_NUMBER[record.value.transformed.number] : null,
  }
})
const displayLines = computed(() => result.value ? [...result.value.lines].reverse() : [])
let loadGeneration = 0

const load = async () => {
  const generation = ++loadGeneration
  const castId = props.castId
  loading.value = true
  loadError.value = ''
  record.value = null
  try {
    let loaded = findHistoryRecord(castId) ?? findTransientDivination(castId)
    if (!loaded) {
      await session.ensureSession()
      loaded = findAccountHistoryRecord(session.user.value?.id, castId)
    }
    if (!loaded && session.state.value === 'authenticated' && castId.startsWith('div_')) {
      loaded = await getDivination(castId)
      rememberTransientDivination(loaded)
    }
    if (generation === loadGeneration && castId === props.castId) record.value = loaded
  } catch (caught) {
    if (generation === loadGeneration) loadError.value = caught?.message ?? '卦象读取失败，请稍后重试。'
  } finally {
    if (generation === loadGeneration && castId === props.castId) loading.value = false
  }
}

watch(() => props.castId, load, { immediate: true })
</script>

<template>
  <section class="result-view" aria-labelledby="result-title">
    <div v-if="loading" class="missing-state"><span>LOADING CAST</span><h1>正在载入卦象…</h1></div>
    <template v-else-if="result">
      <div class="section-heading"><div><p class="eyebrow"><span>03</span> ORACLE RESOLVED / 卦象已成</p><h1 id="result-title">此刻，<em>有象</em>。</h1></div><button class="ghost-button" type="button" @click="router.push('/')">重新起卦 ↗</button></div>
      <div class="result-grid"><HexagramSummary :hexagram="result.original" label="本卦 / PRESENT FORM" /><HexagramSummary v-if="result.transformed" :hexagram="result.transformed" label="变卦 / EMERGING FORM" transformed /></div>
      <section class="ai-entry" aria-labelledby="ai-entry-title"><div><p class="eyebrow"><span>AI</span> CONTINUE THE READING</p><h2 id="ai-entry-title">想就此卦继续问？</h2><p>进入对话后，解读只绑定当前这一次起卦记录。</p></div><RouterLink class="ai-button" :to="{ name: 'ai-init', params: { castId } }">AI 解读此卦 <strong>↗</strong></RouterLink></section>
      <div class="result-footer"><div v-if="displayLines.length" class="mini-lines"><span v-for="(line,index) in displayLines" :key="index" :class="[line.yinYang,{ changing: line.changing }]">{{ line.yinYang === 'yang' ? '━━━━━' : '━━　━━' }}</span></div><p>{{ displayLines.length ? (result.changingLines.length ? `动爻：${result.changingLines.map((index) => ['初','二','三','四','五','上'][index]+'爻').join('、')}` : '本次无动爻 · 静卦仅取本卦') : '账户云端记录 · 展示已确认的本卦与变卦' }}<br><small>卦辞据《周易》原典 · 结果仅供传统文化体验</small></p></div>
    </template>
    <div v-else class="missing-state"><span>CAST NOT FOUND</span><h1>该卦象已不存在</h1><p>{{ loadError || '它可能已从本机或账户历史中清除。系统不会用最新一卦替代。' }}</p><RouterLink to="/">返回首页</RouterLink></div>
  </section>
</template>

<style scoped lang="scss">
.result-view { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; padding-top: clamp(72px,10vh,130px); }.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; margin-bottom: 48px; }.eyebrow { margin: 0 0 20px; color: #6f7aa9; font: 10px 'DM Mono',monospace; letter-spacing: .18em; span { margin-right: 12px; color: #dc9c57; } } h1 { margin: 0; color: #f1f4ff; font-size: clamp(42px,6vw,78px); letter-spacing: -.09em; em { color: #dca260; font-style: normal; } }.ghost-button { min-height: 44px; border: 1px solid rgba(92,245,212,.42); padding: 10px 14px; background: transparent; color: #8cefe0; }.result-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; }.ai-entry { display: flex; align-items: center; justify-content: space-between; gap: 30px; margin-top: 24px; border: 1px solid rgba(92,245,212,.28); padding: clamp(22px,3vw,34px); background: linear-gradient(105deg,rgba(13,30,63,.9),rgba(31,17,57,.82)); box-shadow: inset 0 0 50px rgba(92,245,212,.04); h2 { margin: 0; color: #f0f5ff; font-size: clamp(24px,3vw,38px); } p { margin: 10px 0 0; color: #7f8bb6; font-size: 13px; } }.ai-button { display: inline-flex; min-height: 50px; align-items: center; gap: 22px; border: 1px solid #79ffe9; padding: 14px 20px; background: rgba(26,47,90,.8); color: #eaffff; font-weight: 800; text-decoration: none; box-shadow: 0 0 30px rgba(92,245,212,.22); strong { color: #ffd18d; } }.result-footer { display: flex; align-items: center; justify-content: center; gap: 32px; margin-top: 26px; padding: 22px; border-top: 1px solid rgba(121,144,215,.16); color: #8490bb; font-size: 12px; p { margin: 0; line-height: 1.8; } small { color: #58658f; } }.mini-lines { display: grid; gap: 3px; color: #5cf5d4; font-size: 10px; .yin { color: #dca260; } .changing { color: #ff76cb; } }.missing-state { min-height: 70vh; display: grid; place-content: center; justify-items: start; span { color: #dca260; font: 10px 'DM Mono',monospace; letter-spacing: .18em; } p { color: #8490bb; } a { margin-top: 15px; color: #5cf5d4; } }
@media (max-width: 760px) { .result-grid { grid-template-columns: 1fr; }.section-heading,.ai-entry { align-items: flex-start; flex-direction: column; }.ai-button { width: 100%; justify-content: space-between; }.result-footer { align-items: flex-start; padding-inline: 0; } }
</style>
