<script setup>
defineProps({
  hexagram: { type: Object, required: true },
  label: { type: String, required: true },
  transformed: { type: Boolean, default: false },
})
</script>

<template>
  <article class="hexagram-card" :class="{ transformed }">
    <div class="card-kicker">{{ label }}</div>
    <div class="hexagram-symbol" aria-hidden="true">{{ hexagram.symbol }}</div>
    <div class="hexagram-name"><small>第 {{ hexagram.number }} 卦</small><h2>{{ hexagram.name }}</h2></div>
    <div class="trigram-pair"><span>{{ hexagram.upper.symbol }} {{ hexagram.upper.name }} · {{ hexagram.upper.natural }}</span><i>上卦</i><span>{{ hexagram.lower.symbol }} {{ hexagram.lower.name }} · {{ hexagram.lower.natural }}</span><i>下卦</i></div>
    <div class="judgment"><span>卦辞</span><p>{{ hexagram.judgment }}</p></div>
  </article>
</template>

<style scoped lang="scss">
.hexagram-card { position: relative; min-height: 420px; overflow: hidden; border: 1px solid rgba(121,144,215,.23); padding: clamp(22px,3vw,38px); background: rgba(14,20,52,.72); backdrop-filter: blur(14px); &::before { position: absolute; top: 0; right: 0; width: 36%; height: 1px; background: #dca260; box-shadow: 0 0 18px #dca260; content: ''; } &.transformed { border-color: rgba(92,245,212,.32); &::before { background: #5cf5d4; box-shadow: 0 0 18px #5cf5d4; } } }
.card-kicker { color: #7180b8; font: 10px 'DM Mono',monospace; letter-spacing: .14em; }
.hexagram-symbol { margin: 24px 0 3px; color: #dca260; font-size: 76px; line-height: 1; text-shadow: 0 0 25px rgba(220,162,96,.25); }
.transformed .hexagram-symbol, .transformed .judgment span { color: #5cf5d4; }
.hexagram-name { display: flex; align-items: baseline; gap: 12px; small { color: #65719a; font: 10px 'DM Mono',monospace; } h2 { margin: 0; color: #edf1ff; font-size: 30px; } }
.trigram-pair { display: grid; grid-template-columns: 1fr auto; gap: 10px; margin-top: 24px; padding-top: 18px; border-top: 1px solid rgba(121,144,215,.15); color: #aab5df; font-size: 12px; i { color: #61709f; font-style: normal; font-size: 10px; } }
.judgment { margin-top: 25px; span { color: #dca260; font: 10px 'DM Mono',monospace; letter-spacing: .14em; } p { margin: 12px 0 0; color: #e8ecff; font-family: 'Noto Serif SC',serif; line-height: 1.9; } }
@media (max-width: 760px) { .hexagram-card { min-height: auto; } }
</style>
