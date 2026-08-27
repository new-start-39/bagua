<script setup>
defineProps({ eyebrow: { type: String, required: true }, title: { type: String, required: true }, note: { type: String, required: true } })
</script>

<template>
  <section class="auth-stage">
    <div class="auth-orbit" aria-hidden="true"><i></i><i></i><span>☰</span></div>
    <article class="auth-panel">
      <p class="eyebrow"><span>SESSION</span> {{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p class="note">{{ note }}</p>
      <slot />
    </article>
  </section>
</template>

<style scoped lang="scss">
.auth-stage { position: relative; z-index: 1; display: grid; min-height: calc(100vh - 92px); max-width: 1240px; grid-template-columns: minmax(260px,1fr) minmax(400px,560px); align-items: center; gap: clamp(30px,7vw,96px); margin: 0 auto; }
.auth-orbit { position: relative; width: min(40vw,430px); aspect-ratio: 1; justify-self: center; border: 1px dashed rgba(220,162,96,.34); border-radius: 50%; animation: turn 24s linear infinite; i { position: absolute; inset: 14%; border: 1px solid rgba(92,245,212,.3); border-radius: 50%; &:nth-child(2) { inset: 30%; border-style: dashed; } } span { position: absolute; inset: 39%; display: grid; place-items: center; border: 1px solid #dca260; border-radius: 50%; color: #dca260; font-size: 56px; box-shadow: 0 0 50px rgba(220,162,96,.18); } }
.auth-panel { border: 1px solid rgba(121,144,215,.26); padding: clamp(26px,4vw,46px); background: linear-gradient(145deg,rgba(15,23,58,.94),rgba(23,14,45,.92)); box-shadow: 0 24px 90px rgba(0,0,0,.34),inset 0 0 55px rgba(92,245,212,.03); backdrop-filter: blur(20px); }
.eyebrow { margin: 0 0 18px; color: #6f7aa9; font: 10px 'DM Mono',monospace; letter-spacing: .17em; span { margin-right: 10px; color: #5cf5d4; } }
h1 { margin: 0; color: #f2f5ff; font-size: clamp(38px,4.4vw,58px); letter-spacing: .025em; line-height: 1.12; white-space: nowrap; }
.note { margin: 18px 0 30px; color: #8994bd; font-size: 13px; line-height: 1.8; }
@keyframes turn { to { transform: rotate(360deg); } }
@media (max-width: 760px) { .auth-stage { display: block; padding-top: 70px; }.auth-orbit { position: absolute; top: 35px; right: -100px; width: 270px; opacity: .24; }.auth-panel { position: relative; } h1 { font-size: clamp(34px,10vw,46px); } }
</style>
