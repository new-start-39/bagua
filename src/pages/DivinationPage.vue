<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { appendHistory, createHistoryRecord, readHistory, writeHistory } from '../utils/history.js'
import { getLineFromCoins, parseTestSequence } from '../utils/hexagram.js'

const MAX_CAST_LINES = 6

const route = useRoute()
const router = useRouter()
const phase = ref('welcome')
const records = ref([])
const isTossing = ref(false)
const isCompleting = ref(false)
const lastCoins = ref([])
let tossTimer

const visibleRecords = computed(() => records.value.slice(0, MAX_CAST_LINES))
const currentAttempt = computed(() => Math.min(visibleRecords.value.length + 1, MAX_CAST_LINES))
const currentPosition = computed(() => ['初爻','二爻','三爻','四爻','五爻','上爻'][currentAttempt.value - 1])
const currentLine = computed(() => lastCoins.value.length ? getLineFromCoins(lastCoins.value) : null)

const randomCoin = () => {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1)
    globalThis.crypto.getRandomValues(buffer)
    return buffer[0] % 2 === 0 ? 'character' : 'back'
  }
  return Math.random() < .5 ? 'character' : 'back'
}

const tossCoins = () => {
  if (isTossing.value || isCompleting.value || records.value.length >= MAX_CAST_LINES) return
  isTossing.value = true
  lastCoins.value = [randomCoin(), randomCoin(), randomCoin()]
  tossTimer = window.setTimeout(() => { isTossing.value = false }, 1150)
}

const startDivination = () => {
  clearTimeout(tossTimer)
  records.value = []
  lastCoins.value = []
  isCompleting.value = false
  phase.value = 'casting'
  router.replace({ query: { phase: 'casting' } })
  tossCoins()
}

const complete = async (values) => {
  const record = createHistoryRecord(values)
  writeHistory(appendHistory(readHistory(), record))
  await router.push({ name: 'result', params: { castId: record.clientId } })
}

const recordCast = async () => {
  if (isTossing.value || isCompleting.value || !currentLine.value) return
  if (records.value.length >= MAX_CAST_LINES) return
  records.value = [...records.value, currentLine.value].slice(0, MAX_CAST_LINES)
  if (records.value.length === MAX_CAST_LINES) {
    isCompleting.value = true
    try {
      await complete(records.value.map((line) => line.value))
    } catch (caught) {
      isCompleting.value = false
      throw caught
    }
    return
  }
  tossCoins()
}

onMounted(() => {
  const sequence = parseTestSequence(route.query.test)
  if (sequence) complete(sequence)
})
watch(() => route.query.phase, (nextPhase) => {
  if (nextPhase === 'casting' || phase.value !== 'casting') return
  clearTimeout(tossTimer)
  phase.value = 'welcome'
  records.value = []
  lastCoins.value = []
  isTossing.value = false
  isCompleting.value = false
})
onBeforeUnmount(() => clearTimeout(tossTimer))
</script>

<template>
  <div class="divination-page">
    <Transition name="view" mode="out-in">
      <section v-if="phase === 'welcome'" key="welcome" class="welcome-view" aria-labelledby="page-title">
        <div class="hero-copy"><p class="eyebrow"><span>01</span> DIGITAL ORACLE / 六爻入场</p><h1 id="page-title"><span class="reveal-line">让未知</span><span class="reveal-line accent">显形<small>。</small></span></h1><p class="intro"><span>三枚铜钱，六次落定。</span><span>在古老的阴阳秩序里，读取属于此刻的卦象。</span></p></div>
        <div class="compass-stage" aria-hidden="true"><div class="compass-orbit orbit-one"></div><div class="compass-orbit orbit-two"></div><div class="compass-ring">乾　坎　艮　震<br />巽　离　坤　兑</div><div class="compass-core">☯<span>CYBER<br />YI</span></div></div>
        <div class="start-panel"><p>准备好让命运掷出第一枚变量了吗？</p><button class="primary-button" type="button" @click="startDivination"><span>开始卜卦</span><strong>↗</strong></button><small>匿名可用 · 六次起卦 · 仅供文化体验</small></div>
      </section>

      <section v-else key="casting" class="casting-view" aria-labelledby="casting-title">
        <div class="section-heading"><div><p class="eyebrow"><span>02</span> CASTING SEQUENCE / 起卦序列</p><h1 id="casting-title">第 {{ currentAttempt }} 次 · <em>{{ currentPosition }}</em></h1></div><div class="progress-orbit" aria-label="起卦进度"><span>{{ String(currentAttempt).padStart(2,'0') }}</span><small>/ 06</small></div></div>
        <div class="casting-grid">
          <div class="coins-panel" :class="{ tossing: isTossing }"><div class="coin-trail" aria-hidden="true"></div><div class="coins" aria-label="三枚铜钱"><div v-for="(coin,index) in lastCoins" :key="`${currentAttempt}-${index}`" class="coin"><div class="coin-face" :class="coin"><span class="coin-hole"></span><template v-if="coin === 'character'"><b class="top">乾</b><b class="right">隆</b><b class="bottom">通</b><b class="left">宝</b></template><template v-else><b class="top">寶</b><b class="right">武</b><b class="bottom">局</b><b class="left">造</b></template></div><small>COIN 0{{ index + 1 }}</small></div></div><p class="cast-status" aria-live="polite">{{ isTossing ? '铜钱正在穿越变量场…' : isCompleting ? '六爻已定 · 正在生成卦象…' : `结果已落定 · ${currentLine?.name}` }}</p><button v-if="!isTossing" class="primary-button compact" type="button" :disabled="isCompleting || records.length >= MAX_CAST_LINES" @click="recordCast">{{ isCompleting ? '正在生成卦象…' : '记录并继续' }} <strong>→</strong></button></div>
          <div class="record-panel"><div class="panel-heading"><span>卦爻记录</span><small>FROM LOW TO HIGH</small></div><ol class="line-list"><li v-for="(line,index) in visibleRecords" :key="index"><span class="line-index">0{{ index + 1 }}</span><span>{{ ['初爻','二爻','三爻','四爻','五爻','上爻'][index] }}</span><span class="line-glyph" :class="line.yinYang">{{ line.yinYang === 'yang' ? '━━━━━' : '━━　━━' }}</span><span>{{ line.value }} · {{ line.name }}</span><b v-if="line.changing">变</b></li><li v-for="index in MAX_CAST_LINES-visibleRecords.length" :key="`empty-${index}`" class="empty-line"><span class="line-index">0{{ visibleRecords.length + index }}</span><span>等待落子…</span></li></ol><p class="record-note">第一次为初爻，位于卦象最下方<br />第六次为上爻，位于卦象最上方</p></div>
        </div>
      </section>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.divination-page { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; }
.welcome-view { display: grid; min-height: calc(100vh - 105px); grid-template-columns: minmax(300px,.9fr) minmax(320px,1.1fr); align-content: center; align-items: center; gap: 4vw; }
.eyebrow { margin: 0 0 22px; color: #6f7aa9; font: 10px 'DM Mono',monospace; letter-spacing: .18em; span { margin-right: 12px; color: #dc9c57; } }
h1 { margin: 0; color: #f1f4ff; font-size: clamp(54px,8vw,112px); letter-spacing: -.1em; line-height: .92; em,.accent { color: #5cf5d4; font-style: normal; text-shadow: 0 0 30px rgba(92,245,212,.3); } }
.reveal-line { display: block; animation: reveal .8s both; &:nth-child(2) { animation-delay: .2s; } }
.intro { display: grid; gap: 3px; margin-top: 30px; color: #9aa4cd; font-size: 15px; line-height: 1.9; }
.compass-stage { position: relative; width: min(42vw,500px); aspect-ratio: 1; justify-self: center; color: #dca260; }
.compass-orbit,.compass-ring { position: absolute; border: 1px solid rgba(220,162,96,.48); border-radius: 50%; }.orbit-one { inset: 7%; border-style: dashed; animation: spin 12s linear infinite; }.orbit-two { inset: 19%; border-color: rgba(92,245,212,.28); animation: spin 9s linear infinite reverse; }.compass-ring { inset: 31%; display: grid; place-items: center; font: 11px/2 'Noto Serif SC',serif; text-align: center; transform: rotate(-18deg); }.compass-core { position: absolute; inset: 39%; display: grid; place-items: center; border: 1px solid #5cf5d4; border-radius: 50%; color: #5cf5d4; font-size: clamp(27px,4vw,46px); box-shadow: 0 0 35px rgba(92,245,212,.28); span { position: absolute; bottom: 17%; color: #7180b8; font: 7px/1.2 'DM Mono',monospace; text-align: center; } }
.start-panel { grid-column: 1/-1; justify-self: center; margin-top: -28px; text-align: center; p { color: #7782ad; font-size: 12px; } small { display: block; margin-top: 13px; color: #55618e; font: 10px 'DM Mono',monospace; } }
.primary-button { display: inline-flex; min-height: 48px; align-items: center; gap: 26px; border: 1px solid #79ffe9; border-radius: 3px; padding: 14px 22px; background: linear-gradient(135deg,#142756,#1b1740 60%,#3a1d55); color: #f4ffff; font-weight: 800; box-shadow: 0 0 35px rgba(92,245,212,.35); &.compact { min-height: 44px; padding: 11px 18px; } &:disabled { cursor: wait; opacity: .62; } strong { color: #ffd18d; } }
.casting-view { padding-top: clamp(72px,10vh,130px); }.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; margin-bottom: 48px; h1 { font-size: clamp(39px,6vw,78px); } }
.progress-orbit { display: grid; width: 78px; height: 78px; place-content: center; border: 1px solid #5cf5d4; border-radius: 50%; color: #eaffff; box-shadow: 0 0 24px rgba(92,245,212,.2); font: 22px 'DM Mono',monospace; small { color: #63709e; font-size: 9px; text-align: center; } }
.casting-grid { display: grid; grid-template-columns: 1.3fr .7fr; gap: 24px; }.coins-panel,.record-panel { border: 1px solid rgba(121,144,215,.23); background: rgba(14,20,52,.72); backdrop-filter: blur(14px); }.coins-panel { position: relative; display: grid; min-height: 430px; place-items: center; align-content: center; overflow: hidden; }.coin-trail { position: absolute; width: 420px; aspect-ratio: 1; border: 1px dashed rgba(220,162,96,.32); border-radius: 50%; animation: spin 30s linear infinite; pointer-events: none; }.coins { position: relative; display: flex; gap: clamp(13px,4vw,34px); }.coin { display: grid; justify-items: center; gap: 16px; color: #6673a2; font: 9px 'DM Mono',monospace; }.coin-face { position: relative; width: clamp(86px,11vw,132px); aspect-ratio: 1; border: 7px solid #8e5527; border-radius: 50%; background: radial-gradient(circle at 32% 20%,#f7d28b,#c68742 27%,#8a4a22 62%,#4a2416); box-shadow: inset 0 0 0 2px #e4aa5e,0 18px 26px rgba(0,0,0,.48); b { position: absolute; color: #4f2917; font-family: 'Noto Serif SC',serif; } .top { top: 15%; left: 44%; } .right { top: 42%; right: 15%; } .bottom { bottom: 15%; left: 44%; } .left { top: 42%; left: 15%; } }.coin-hole { position: absolute; inset: 38%; border: 3px solid #3a2118; background: #27150f; }.tossing .coin-face { animation: coin-flip 1.15s cubic-bezier(.2,.8,.2,1) both; }.cast-status { z-index: 1; margin: 28px 0 18px; color: #a7b4e3; }
.record-panel { padding: 23px; }.panel-heading { display: flex; justify-content: space-between; padding-bottom: 15px; border-bottom: 1px solid rgba(121,144,215,.18); color: #e8edff; small { color: #59668e; font: 9px 'DM Mono',monospace; } }.line-list { display: grid; gap: 6px; margin: 18px 0 0; padding: 0; list-style: none; li { display: grid; min-height: 40px; grid-template-columns: 25px 42px 1fr auto 18px; align-items: center; gap: 7px; border-bottom: 1px solid rgba(121,144,215,.1); color: #a9b3d8; font-size: 11px; } b { color: #ff76cb; } }.line-index { color: #dca260; font: 9px 'DM Mono',monospace; }.line-glyph { color: #5cf5d4; white-space: nowrap; &.yin { color: #dca260; } }.empty-line { color: #48547e !important; }.record-note { margin-top: 28px; color: #65719a; font-size: 11px; line-height: 1.7; }
.view-enter-active,.view-leave-active { transition: .4s ease; }.view-enter-from,.view-leave-to { opacity: 0; transform: translateY(18px); }
@keyframes spin { to { transform: rotate(360deg); } } @keyframes reveal { from { opacity: 0; transform: translateY(24px); filter: blur(8px); } } @keyframes coin-flip { 45% { transform: rotateY(900deg) translateY(-42px); } 100% { transform: rotateY(1800deg); } }
@media (max-width: 760px) { .welcome-view { display: flex; min-height: calc(100vh - 80px); flex-direction: column; justify-content: center; gap: 30px; text-align: center; }.compass-stage { width: min(78vw,370px); }.start-panel { margin: 0; }.casting-grid { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; margin-bottom: 28px; }.coins-panel { min-height: 360px; }.coin-trail { width: 300px; } }
</style>
