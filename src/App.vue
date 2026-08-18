<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { getHexagramFromLines, getLineFromCoins } from './utils/hexagram.js'

const phases = Object.freeze({ welcome: 'welcome', casting: 'casting', result: 'result' })
const phase = ref(phases.welcome)
const records = ref([])
const result = ref(null)
const isTossing = ref(false)
const lastCoins = ref([])
const motionPaused = ref(false)
let tossTimer

const particles = Array.from({ length: 36 }, (_, index) => ({
  id: index,
  left: `${(index * 29) % 100}%`,
  top: `${(index * 47) % 100}%`,
  delay: `${(index % 7) * -0.8}s`,
  duration: `${5 + (index % 5)}s`,
}))

const currentAttempt = computed(() => records.value.length + 1)
const currentPosition = computed(() => ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][records.value.length] ?? '上爻')
const currentLine = computed(() => lastCoins.value.length ? getLineFromCoins(lastCoins.value) : null)
const isComplete = computed(() => records.value.length === 6)

const randomCoin = () => {
  if (globalThis.crypto?.getRandomValues) {
    const buffer = new Uint32Array(1)
    globalThis.crypto.getRandomValues(buffer)
    return buffer[0] % 2 === 0 ? 'character' : 'back'
  }
  return Math.random() < 0.5 ? 'character' : 'back'
}

const startDivination = () => {
  clearTimeout(tossTimer)
  records.value = []
  result.value = null
  lastCoins.value = []
  phase.value = phases.casting
  tossCoins()
}

const tossCoins = () => {
  if (isTossing.value || isComplete.value) return
  isTossing.value = true
  lastCoins.value = [randomCoin(), randomCoin(), randomCoin()]
  tossTimer = window.setTimeout(() => { isTossing.value = false }, 1150)
}

const recordCast = () => {
  if (isTossing.value || !currentLine.value) return
  records.value = [...records.value, currentLine.value]
  if (records.value.length === 6) {
    result.value = getHexagramFromLines(records.value.map((line) => line.value))
    phase.value = phases.result
    return
  }
  tossCoins()
}

onBeforeUnmount(() => clearTimeout(tossTimer))
</script>

<template>
  <main id="main-content" class="app-shell" :class="[`phase-${phase}`, { 'motion-paused': motionPaused }]">
    <div class="ambient ambient-one"></div><div class="ambient ambient-two"></div>
    <div class="particle-field" aria-hidden="true">
      <i v-for="particle in particles" :key="particle.id" class="particle" :style="{ left: particle.left, top: particle.top, '--delay': particle.delay, '--duration': particle.duration }"></i>
    </div>

    <header class="topbar">
      <button class="brand" type="button" aria-label="返回赛博八卦首页" @click="phase = phases.welcome"><span class="brand-seal">✦</span><span>赛博八卦</span></button>
      <div class="topbar-tools"><button class="motion-toggle" type="button" :aria-pressed="!motionPaused" @click="motionPaused = !motionPaused"><span>{{ motionPaused ? '动效已暂停' : '动效开启' }}</span><i></i></button><span class="system-status"><i></i> 易象引擎在线</span></div>
    </header>

    <Transition name="phase" mode="in-out">
    <section v-if="phase === phases.welcome" key="welcome" class="welcome-view" aria-labelledby="page-title">
      <div class="hero-copy">
        <p class="eyebrow"><span>01</span> DIGITAL ORACLE / 六爻入场</p>
        <h1 id="page-title"><span class="reveal-line">让未知</span><span class="reveal-line accent">显形<small>。</small></span></h1>
        <p class="intro"><span class="copy-line">三枚铜钱，六次落定。</span><span class="copy-line">在古老的阴阳秩序里，读取属于此刻的卦象。</span></p>
      </div>
      <div class="compass-stage" aria-hidden="true">
        <div class="compass-orbit orbit-one"></div><div class="compass-orbit orbit-two"></div><div class="compass-ring">乾　坎　艮　震<br />巽　离　坤　兑</div>
        <div class="compass-core">☯<span>CYBER<br />YI</span></div><span class="compass-label label-top">天象 / 64</span><span class="compass-label label-bottom">卦成于变</span>
      </div>
      <div class="start-panel"><p>准备好让命运掷出第一枚变量了吗？</p><button class="primary-button" type="button" @click="startDivination"><span>开始卜卦</span><strong>↗</strong></button><small>纯前端 · 六次起卦 · 仅供文化体验</small></div>
    </section>

    <section v-else-if="phase === phases.casting" key="casting" class="casting-view" aria-labelledby="casting-title">
      <div class="section-heading"><div><p class="eyebrow"><span>02</span> CASTING SEQUENCE / 起卦序列</p><h1 id="casting-title">第 {{ currentAttempt }} 次 · <em>{{ currentPosition }}</em></h1></div><div class="progress-orbit" aria-label="起卦进度"><span>{{ String(currentAttempt).padStart(2, '0') }}</span><small>/ 06</small></div></div>
      <div class="casting-grid">
        <div class="coins-panel" :class="{ tossing: isTossing }">
          <div class="coin-trail" aria-hidden="true"></div>
          <div class="coins" aria-label="三枚铜钱"><div v-for="(coin, index) in lastCoins" :key="`${currentAttempt}-${index}`" class="coin" :style="{ '--coin-delay': `${index * 90}ms` }"><div class="coin-face" :class="coin"><span class="coin-hole"></span><template v-if="coin === 'character'"><b class="coin-script script-top">乾</b><b class="coin-script script-right">隆</b><b class="coin-script script-bottom">通</b><b class="coin-script script-left">宝</b></template><template v-else><b class="coin-script script-top">寶</b><b class="coin-script script-right">武</b><b class="coin-script script-bottom">局</b><b class="coin-script script-left">造</b></template></div><small>COIN 0{{ index + 1 }}</small></div></div>
          <p class="cast-status" aria-live="polite">{{ isTossing ? '铜钱正在穿越变量场…' : `结果已落定 · ${currentLine?.name}` }}</p>
          <button v-if="!isTossing" class="primary-button compact" type="button" @click="recordCast"><span>{{ isComplete ? '查看卦象' : '记录并继续' }}</span><strong>→</strong></button>
        </div>
        <div class="record-panel"><div class="panel-heading"><span>卦爻记录</span><small>FROM LOW TO HIGH</small></div><ol class="line-list"><li v-for="(line, index) in records" :key="`${index}-${line.value}`" :class="{ changing: line.changing }"><span class="line-index">0{{ index + 1 }}</span><span class="line-name">{{ ['初爻', '二爻', '三爻', '四爻', '五爻', '上爻'][index] }}</span><span class="line-glyph" :class="line.yinYang">{{ line.yinYang === 'yang' ? '━━━━━' : '━━　━━' }}</span><span class="line-value">{{ line.value }} · {{ line.name }}</span><b v-if="line.changing">变</b></li><li v-for="index in 6 - records.length" :key="`empty-${index}`" class="empty-line"><span class="line-index">0{{ records.length + index }}</span><span>等待落子…</span></li></ol><p class="record-note">第一次为初爻，位于卦象最下方<br />第六次为上爻，位于卦象最上方</p></div>
      </div>
    </section>

    <section v-else key="result" class="result-view" aria-labelledby="result-title">
      <div class="section-heading"><div><p class="eyebrow"><span>03</span> ORACLE RESOLVED / 卦象已成</p><h1 id="result-title">此刻，<em>有象</em>。</h1></div><button class="ghost-button" type="button" @click="startDivination">重新起卦 ↗</button></div>
      <div class="result-grid"><article v-for="(hexagram, index) in [result.original, result.transformed]" :key="`${hexagram.number}-${index}`" class="hexagram-card" :class="{ transformed: index === 1 }"><div class="card-kicker">{{ index === 0 ? '本卦 / PRESENT FORM' : '变卦 / EMERGING FORM' }}</div><div class="hexagram-symbol" aria-hidden="true">{{ hexagram.symbol }}</div><div class="hexagram-name"><small>第 {{ hexagram.number }} 卦</small><h2>{{ hexagram.name }}</h2></div><div class="trigram-pair"><span>{{ hexagram.upper.symbol }} {{ hexagram.upper.name }} · {{ hexagram.upper.natural }}</span><i>上卦</i><span>{{ hexagram.lower.symbol }} {{ hexagram.lower.name }} · {{ hexagram.lower.natural }}</span><i>下卦</i></div><div class="judgment"><span>卦辞</span><p>{{ hexagram.judgment }}</p></div></article></div>
      <div class="result-footer"><div class="mini-lines"><span v-for="(line, index) in result.lines" :key="index" :class="[line.yinYang, { changing: line.changing }]">{{ line.yinYang === 'yang' ? '━━━━━' : '━━　━━' }}</span></div><p>{{ result.changingLines.length ? `动爻：${result.changingLines.map((index) => ['初', '二', '三', '四', '五', '上'][index] + '爻').join('、')}` : '本次无动爻 · 本卦与变卦相同' }}<br /><small>卦辞据《周易》原典 · 结果仅供传统文化体验</small></p></div>
    </section>
    </Transition>
  </main>
</template>

<style scoped lang="scss">
.app-shell { position: relative; min-height: 100vh; overflow: hidden; padding: 30px clamp(22px, 6vw, 96px) 42px; background: #080b20; isolation: isolate;
  &::before { position: absolute; inset: 0; z-index: -2; background: linear-gradient(120deg, rgba(20,34,88,.58), transparent 42%), radial-gradient(circle at 76% 28%, rgba(78,241,224,.1), transparent 25rem); content: ''; }
  &::after { position: absolute; inset: 0; z-index: -1; opacity: .18; background-image: linear-gradient(rgba(102,120,217,.18) 1px, transparent 1px), linear-gradient(90deg, rgba(102,120,217,.18) 1px, transparent 1px); background-size: 56px 56px; content: ''; mask-image: linear-gradient(to bottom, black, transparent 80%); }
  .ambient { position: absolute; z-index: -1; width: 34rem; height: 34rem; border-radius: 50%; filter: blur(70px); opacity: .13; pointer-events: none; }.ambient-one { top: -18rem; right: -8rem; background: #d98b3a; }.ambient-two { bottom: -20rem; left: -10rem; background: #394bff; }
  .particle-field { position: absolute; inset: 0; z-index: 0; pointer-events: none; }.particle { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #79eadd; box-shadow: 0 0 14px 2px #79eadd; animation: drift var(--duration) var(--delay) ease-in-out infinite alternate; }.topbar { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; max-width: 1280px; margin: 0 auto; }.brand { display: inline-flex; align-items: center; gap: 11px; border: 0; padding: 0; appearance: none; background: transparent; color: #eef1ff; font-weight: 800; letter-spacing: -.04em; }.brand-seal { display: grid; width: 31px; height: 31px; place-items: center; border: 1px solid #dca260; border-radius: 50%; color: #dca260; font-size: 16px; box-shadow: 0 0 20px rgba(220,162,96,.24); animation: seal-pulse 3s ease-in-out infinite; }.topbar-tools { display: flex; align-items: center; gap: 18px; }.motion-toggle { display: inline-flex; align-items: center; gap: 8px; border: 1px solid rgba(92,245,212,.2); padding: 6px 9px; background: rgba(12,24,59,.6); color: #7381b0; font: 9px 'DM Mono', monospace; letter-spacing: .08em; }.motion-toggle i { width: 6px; height: 6px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 10px #5cf5d4; animation: status-pulse 1.4s ease-in-out infinite; }.motion-toggle[aria-pressed="false"] i { background: #7580a9; box-shadow: none; animation: none; }.system-status { color: #7782ad; font: 10px 'DM Mono', monospace; letter-spacing: .12em; text-transform: uppercase; }.system-status i { display: inline-block; width: 6px; height: 6px; margin-right: 7px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 10px #5cf5d4; }
  .welcome-view, .casting-view, .result-view { position: relative; z-index: 1; max-width: 1280px; margin: 0 auto; }.welcome-view { display: grid; min-height: calc(100vh - 105px); grid-template-columns: minmax(300px,.9fr) minmax(320px,1.1fr); align-content: center; align-items: center; gap: 4vw; }.eyebrow { margin: 0 0 22px; color: #6f7aa9; font: 10px 'DM Mono', monospace; letter-spacing: .18em; text-transform: uppercase; }.eyebrow span { margin-right: 12px; color: #dc9c57; } h1 { margin: 0; color: #f1f4ff; font-size: clamp(54px,8vw,112px); letter-spacing: -.1em; line-height: .92; } h1 em { color: #5cf5d4; font-style: normal; text-shadow: 0 0 30px rgba(92,245,212,.3); }.intro { margin: 30px 0 0; color: #9aa4cd; font-size: 15px; line-height: 1.9; }
  .compass-stage { position: relative; width: min(42vw,500px); aspect-ratio: 1; justify-self: center; color: #dca260; }.compass-orbit, .compass-ring { position: absolute; border: 1px solid rgba(220,162,96,.48); border-radius: 50%; }.orbit-one { inset: 7%; animation: spin 12s linear infinite; border-style: dashed; }.orbit-two { inset: 19%; border-color: rgba(92,245,212,.28); animation: spin-reverse 9s linear infinite; }.compass-ring { inset: 31%; display: grid; place-items: center; border-color: rgba(220,162,96,.75); color: #dca260; font: 11px/2 'Noto Serif SC', serif; text-align: center; transform: rotate(-18deg); animation: ring-breathe 4s ease-in-out infinite; }.compass-core { position: absolute; inset: 39%; display: grid; place-items: center; border: 1px solid #5cf5d4; border-radius: 50%; color: #5cf5d4; font-size: clamp(27px,4vw,46px); box-shadow: 0 0 35px rgba(92,245,212,.28), inset 0 0 28px rgba(92,245,212,.13); animation: core-pulse 2.8s ease-in-out infinite; }.compass-core span { position: absolute; bottom: 17%; color: #7180b8; font: 7px/1.2 'DM Mono', monospace; letter-spacing: .18em; text-align: center; }.compass-label { position: absolute; color: #7782ad; font: 10px 'DM Mono', monospace; letter-spacing: .14em; }.label-top { top: 10%; right: 4%; }.label-bottom { bottom: 15%; left: 6%; color: #5cf5d4; }.start-panel { grid-column: 1 / -1; justify-self: center; margin-top: -28px; text-align: center; animation: panel-rise .9s .8s both; }.start-panel p { margin: 0 0 16px; color: #7782ad; font-size: 12px; }.start-panel small { display: block; margin-top: 13px; color: #55618e; font: 10px 'DM Mono', monospace; letter-spacing: .08em; }
  .primary-button { position: relative; display: inline-flex; align-items: center; gap: 26px; overflow: hidden; border: 1px solid #79ffe9; border-radius: 3px; padding: 16px 22px 16px 25px; appearance: none; background: linear-gradient(135deg, #142756, #1b1740 60%, #3a1d55); color: #f4ffff; font-weight: 800; box-shadow: 0 0 0 5px rgba(92,245,212,.08), 0 0 35px rgba(92,245,212,.35), inset 0 0 20px rgba(92,245,212,.08); transition: transform .25s ease, box-shadow .25s ease; }.primary-button::before { position: absolute; inset: 0; background: linear-gradient(110deg, transparent 25%, rgba(255,255,255,.3), transparent 75%); content: ''; transform: translateX(-120%); transition: transform .6s ease; }.primary-button:hover { transform: translateY(-3px); box-shadow: 0 0 0 5px rgba(92,245,212,.12), 0 0 48px rgba(92,245,212,.55), inset 0 0 24px rgba(92,245,212,.12); }.primary-button:hover::before { transform: translateX(120%); }.primary-button strong { color: #ffd18d; font-size: 20px; }.primary-button.compact { padding: 12px 18px 12px 20px; font-size: 13px; }
  .casting-view, .result-view { padding-top: clamp(72px,10vh,130px); }.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 22px; margin-bottom: 48px; }.section-heading h1 { font-size: clamp(39px,6vw,78px); }.section-heading h1 em { color: #dca260; }.progress-orbit { display: grid; width: 78px; height: 78px; place-content: center; border: 1px solid #5cf5d4; border-radius: 50%; color: #eaffff; box-shadow: 0 0 24px rgba(92,245,212,.2); font: 22px 'DM Mono', monospace; }.progress-orbit small { color: #63709e; font-size: 9px; text-align: center; }
  .casting-grid { display: grid; grid-template-columns: 1.3fr .7fr; gap: 24px; }.coins-panel, .record-panel, .hexagram-card { border: 1px solid rgba(121,144,215,.23); background: rgba(14,20,52,.72); backdrop-filter: blur(14px); }.coins-panel { position: relative; display: grid; min-height: 430px; place-items: center; align-content: center; overflow: hidden; perspective: 1100px; }.coin-trail { position: absolute; width: 420px; aspect-ratio: 1; border: 1px dashed rgba(220,162,96,.32); border-radius: 50%; animation: spin 30s linear infinite; }.coin-trail::before, .coin-trail::after { position: absolute; width: 6px; height: 6px; border-radius: 50%; background: #5cf5d4; box-shadow: 0 0 14px #5cf5d4; content: ''; }.coin-trail::before { top: 20%; left: 2%; }.coin-trail::after { right: 10%; bottom: 8%; background: #dca260; box-shadow: 0 0 14px #dca260; }.coins { position: relative; display: flex; align-items: center; gap: clamp(13px,4vw,34px); transform: rotateX(7deg); }.coin { display: grid; justify-items: center; gap: 16px; color: #6673a2; font: 9px 'DM Mono', monospace; letter-spacing: .1em; }.coin-face { position: relative; display: grid; width: clamp(86px,11vw,132px); aspect-ratio: 1; place-items: center; border: 7px solid #8e5527; border-radius: 50%; background: radial-gradient(circle at 32% 20%, #f7d28b 0 8%, #c68742 27%, #8a4a22 62%, #4a2416 100%); color: #4a2818; font: bold clamp(17px,2.4vw,30px) 'Noto Serif SC', serif; box-shadow: inset 0 0 0 2px #e4aa5e, inset 0 0 0 7px rgba(57,27,13,.52), inset 10px -13px 18px rgba(39,17,9,.52), 0 18px 26px rgba(0,0,0,.48), 0 0 18px rgba(220,162,96,.18); transform-style: preserve-3d; transform: rotateY(0); }.coin-face::before { position: absolute; inset: 12%; border: 1px solid rgba(255,207,122,.38); border-radius: 50%; box-shadow: inset 0 0 8px rgba(55,25,10,.7); content: ''; }.coin-hole { position: absolute; z-index: 2; width: 25%; aspect-ratio: 1; border: 3px solid rgba(51,25,13,.72); border-radius: 3px; background: #27150f; box-shadow: inset 2px 2px 4px rgba(0,0,0,.8), 0 0 0 1px rgba(244,190,103,.18); }.coin-script { position: absolute; z-index: 3; color: #4f2917; font: bold clamp(13px,1.7vw,20px) 'Noto Serif SC', serif; text-shadow: 1px 1px 0 rgba(255,209,121,.2); }.script-top { top: 17%; }.script-right { right: 17%; }.script-bottom { bottom: 17%; }.script-left { left: 17%; }.coin-face.back { background: radial-gradient(circle at 28% 18%, #e3b66f 0 6%, #9d6031 31%, #62321f 66%, #321a14 100%); }.coin-face.back::before { border: 2px solid rgba(255,203,117,.3); box-shadow: inset 0 0 0 5px rgba(57,26,13,.33), inset 0 0 12px rgba(0,0,0,.65); }.coin-face.back .coin-script { color: #3a2118; font-size: clamp(12px,1.5vw,18px); }.tossing .coin-face { animation: coin-flip 1.15s var(--coin-delay) cubic-bezier(.2,.8,.2,1) both; }.cast-status { z-index: 1; min-height: 22px; margin: 28px 0 18px; color: #a7b4e3; font-size: 13px; }.record-panel { padding: 23px; }.panel-heading { display: flex; justify-content: space-between; border-bottom: 1px solid rgba(121,144,215,.18); padding-bottom: 15px; color: #e8edff; font-weight: 700; }.panel-heading small { color: #59668e; font: 9px 'DM Mono', monospace; }.line-list { display: grid; gap: 6px; margin: 18px 0 0; padding: 0; list-style: none; }.line-list li { display: grid; grid-template-columns: 25px 42px 1fr auto 18px; align-items: center; gap: 7px; min-height: 40px; border-bottom: 1px solid rgba(121,144,215,.1); color: #a9b3d8; font-size: 11px; }.line-index { color: #dca260; font: 9px 'DM Mono', monospace; }.line-glyph { color: #5cf5d4; font-size: 12px; white-space: nowrap; }.line-glyph.yin { color: #dca260; }.line-value { color: #6d79a4; font-size: 10px; }.line-list b { color: #ff76cb; font-size: 11px; }.empty-line { color: #48547e !important; font: 10px 'DM Mono', monospace; }.record-note { margin: 28px 0 0; color: #65719a; font-size: 11px; line-height: 1.7; }
  .ghost-button { border: 1px solid rgba(92,245,212,.42); padding: 10px 14px; background: transparent; color: #8cefe0; font-size: 12px; }.ghost-button:hover, .ghost-button:focus-visible { border-color: #5cf5d4; background: rgba(92,245,212,.08); }.result-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 24px; }.hexagram-card { position: relative; min-height: 420px; padding: clamp(22px,3vw,38px); overflow: hidden; }.hexagram-card::before { position: absolute; top: 0; right: 0; width: 36%; height: 1px; background: #dca260; box-shadow: 0 0 18px #dca260; content: ''; }.hexagram-card.transformed { border-color: rgba(92,245,212,.32); }.hexagram-card.transformed::before { background: #5cf5d4; box-shadow: 0 0 18px #5cf5d4; }.card-kicker { color: #7180b8; font: 10px 'DM Mono', monospace; letter-spacing: .14em; }.hexagram-symbol { margin: 24px 0 3px; color: #dca260; font-size: 76px; line-height: 1; text-shadow: 0 0 25px rgba(220,162,96,.25); }.transformed .hexagram-symbol { color: #5cf5d4; text-shadow: 0 0 25px rgba(92,245,212,.25); }.hexagram-name { display: flex; align-items: baseline; gap: 12px; }.hexagram-name small { color: #65719a; font: 10px 'DM Mono', monospace; }.hexagram-name h2 { margin: 0; color: #edf1ff; font-size: 30px; }.trigram-pair { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(121,144,215,.15); color: #aab5df; font-size: 12px; }.trigram-pair i { color: #61709f; font-style: normal; font-size: 10px; }.judgment { margin-top: 25px; }.judgment span { color: #dca260; font: 10px 'DM Mono', monospace; letter-spacing: .14em; }.transformed .judgment span { color: #5cf5d4; }.judgment p { margin: 12px 0 0; color: #e8ecff; font-family: 'Noto Serif SC', serif; line-height: 1.9; }.result-footer { display: flex; align-items: center; justify-content: center; gap: 32px; margin-top: 26px; padding: 22px; border-top: 1px solid rgba(121,144,215,.16); color: #8490bb; font-size: 12px; text-align: left; }.result-footer p { margin: 0; line-height: 1.8; }.result-footer small { color: #58658f; font-size: 10px; }.mini-lines { display: grid; gap: 3px; color: #5cf5d4; font-size: 10px; }.mini-lines .yin { color: #dca260; }.mini-lines .changing { color: #ff76cb; }
  .reveal-line { display: block; opacity: 0; animation: text-reveal .9s cubic-bezier(.16,1,.3,1) forwards; }.reveal-line:nth-child(2) { animation-delay: .22s; }.reveal-line.accent { color: #5cf5d4; text-shadow: 0 0 30px rgba(92,245,212,.3); }.reveal-line small { color: #f1f4ff; font-size: .7em; }.copy-line { display: block; opacity: 0; animation: copy-reveal .8s ease forwards; }.copy-line:nth-child(2) { animation-delay: .45s; }.start-panel .primary-button { animation: button-breathe 2.8s 1.55s ease-in-out infinite; }.phase-enter-active, .phase-leave-active { transition: opacity .55s ease, transform .7s cubic-bezier(.16,1,.3,1), filter .55s ease; }.phase-enter-from { opacity: 0; transform: translateY(28px) scale(.98); filter: blur(9px); }.phase-leave-to { opacity: 0; transform: translateY(-24px) scale(1.015); filter: blur(8px); }.casting-view .section-heading { animation: sequence-in .7s .16s both; }.casting-view .coins-panel { animation: sequence-in .85s .32s both; }.casting-view .record-panel { animation: sequence-in .75s .48s both; }.result-view .section-heading { animation: sequence-in .7s .12s both; }.result-view .hexagram-card:first-child { animation: result-card-in .85s .28s both; }.result-view .hexagram-card:nth-child(2) { animation: result-card-in .85s .5s both; }.result-view .result-footer { animation: sequence-in .7s .72s both; }&.motion-paused *, &.motion-paused *::before, &.motion-paused *::after { animation-play-state: paused !important; }
  @keyframes drift { from { transform: translate3d(0,0,0) scale(.7); opacity: .25; } to { transform: translate3d(16px,-22px,0) scale(1.6); opacity: 1; } } @keyframes spin { to { transform: rotate(360deg); } } @keyframes spin-reverse { to { transform: rotate(-360deg); } } @keyframes coin-flip { 0% { transform: rotateY(0) rotateZ(0) translateY(0); } 45% { transform: rotateY(900deg) rotateZ(10deg) translateY(-42px); } 100% { transform: rotateY(1800deg) rotateZ(0) translateY(0); } } @keyframes seal-pulse { 0%, 100% { box-shadow: 0 0 12px rgba(220,162,96,.2); transform: rotate(0); } 50% { box-shadow: 0 0 28px rgba(220,162,96,.65); transform: rotate(12deg); } } @keyframes status-pulse { 50% { transform: scale(1.7); opacity: .45; } } @keyframes ring-breathe { 50% { opacity: .62; transform: rotate(-10deg) scale(1.03); } } @keyframes core-pulse { 50% { box-shadow: 0 0 54px rgba(92,245,212,.52), inset 0 0 38px rgba(92,245,212,.2); } } @keyframes panel-rise { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } } @keyframes sequence-in { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } } @keyframes result-card-in { from { opacity: 0; transform: translateY(28px) scale(.97); } to { opacity: 1; transform: translateY(0) scale(1); } } @keyframes button-breathe { 0%, 100% { transform: translateY(0); box-shadow: 0 0 0 5px rgba(92,245,212,.08), 0 0 35px rgba(92,245,212,.35), inset 0 0 20px rgba(92,245,212,.08); } 50% { transform: translateY(-4px); box-shadow: 0 0 0 10px rgba(92,245,212,.03), 0 0 60px rgba(92,245,212,.58), inset 0 0 30px rgba(92,245,212,.15); } } @keyframes text-reveal { from { opacity: 0; transform: translateY(24px); filter: blur(10px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } } @keyframes copy-reveal { from { opacity: 0; transform: translateX(-14px); } to { opacity: 1; transform: translateX(0); } }
  @media (max-width: 760px) { padding: 22px 18px 32px; .system-status { display: none; }.welcome-view { display: flex; min-height: calc(100vh - 80px); flex-direction: column; align-items: stretch; justify-content: center; gap: 30px; }.hero-copy { text-align: center; }.hero-copy .eyebrow { margin-bottom: 17px; }.intro { margin-top: 23px; }.compass-stage { width: min(78vw,370px); align-self: center; }.start-panel { margin-top: 0; }.casting-view, .result-view { padding-top: 62px; }.casting-grid, .result-grid { grid-template-columns: 1fr; }.section-heading { align-items: flex-start; margin-bottom: 28px; }.progress-orbit { width: 58px; height: 58px; font-size: 16px; }.coins-panel { min-height: 360px; }.coin-trail { width: 300px; }.record-panel { padding: 18px; }.result-grid { gap: 14px; }.hexagram-card { min-height: auto; }.result-footer { align-items: flex-start; gap: 18px; padding: 18px 0; } }
}
</style>
