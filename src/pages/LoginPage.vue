<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'
import { useSession } from '../composables/useSession.js'
import { sanitizeRedirect } from '../utils/navigation.js'
import { isValidEmail } from '../utils/validation.js'

const route = useRoute()
const router = useRouter()
const session = useSession()
const email = ref('')
const password = ref('')
const pending = ref(false)
const error = ref('')
const redirect = sanitizeRedirect(route.query.redirect)
const sessionReady = computed(() => session.state.value !== 'unknown')
const registrationComplete = computed(() => route.query.registered === '1')

const prepareSession = async () => {
  try {
    await session.ensureSession()
  } catch (caught) {
    error.value = caught.message
  }
}

const recoverSession = async () => {
  if (session.state.value !== 'unknown') return
  try {
    await session.ensureSession()
  } catch {
    // Keep the operation error visible; the next explicit attempt can retry bootstrap.
  }
}

const submit = async () => {
  if (!isValidEmail(email.value)) { error.value = '请输入有效的邮箱地址。'; return }
  pending.value = true
  error.value = ''
  try {
    await session.ensureSession()
    await session.login({ email: email.value.trim(), password: password.value })
    await router.replace(redirect)
  } catch (caught) {
    error.value = caught.message
    await recoverSession()
  } finally { pending.value = false }
}
onMounted(prepareSession)
</script>

<template>
  <AuthPanel eyebrow="AUTHENTICATION" title="继续观象" note="登录成功后，将返回你刚才查看的同一卦象。">
    <form class="auth-form" @submit.prevent="submit"><p v-if="registrationComplete" class="form-success" role="status">注册成功，请登录新账户。</p><label>邮箱<input v-model="email" type="email" autocomplete="email" required placeholder="name@example.com"></label><label>密码<input v-model="password" type="password" autocomplete="current-password" required minlength="8" placeholder="至少 8 位字符"></label><p v-if="error" class="form-error" role="alert">{{ error }}</p><button class="submit-button" type="submit" :disabled="pending || !sessionReady">{{ !sessionReady ? '正在连接账户服务…' : pending ? '正在校验…' : '登录并继续' }} <strong>→</strong></button></form>
    <p class="switch-link">还没有账户？<RouterLink :to="{ name: 'register', query: { redirect } }">前往注册</RouterLink></p>
  </AuthPanel>
</template>

<style scoped lang="scss">
.auth-form { display: grid; gap: 18px; label { display: grid; gap: 8px; color: #aab3d5; font-size: 12px; } input { min-height: 48px; border: 1px solid rgba(121,144,215,.28); border-radius: 2px; padding: 0 14px; background: rgba(5,11,34,.7); color: #eef4ff; outline: 0; &:focus { border-color: #5cf5d4; box-shadow: 0 0 0 3px rgba(92,245,212,.08); } } }.submit-button { display: flex; min-height: 50px; align-items: center; justify-content: space-between; border: 1px solid #5cf5d4; padding: 0 17px; background: linear-gradient(110deg,#173464,#281947); color: #f0ffff; font-weight: 800; box-shadow: 0 0 28px rgba(92,245,212,.2); &:disabled { opacity: .55; cursor: wait; } strong { color: #dca260; } }.form-error { margin: 0; color: #ff9dca; font-size: 12px; }.switch-link { margin: 22px 0 0; color: #6f7ba7; font-size: 12px; a { color: #8ff3e3; } }
.form-success { margin: 0; border: 1px solid rgba(92,245,212,.3); padding: 11px 13px; background: rgba(24,69,76,.26); color: #9df6e8; font-size: 12px; }
</style>
