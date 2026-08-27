<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AuthPanel from '../components/AuthPanel.vue'
import { sendVerificationCode } from '../api/auth.js'
import { isRecoverableSessionError, useSession } from '../composables/useSession.js'
import { sanitizeRedirect } from '../utils/navigation.js'
import { isValidEmail } from '../utils/validation.js'

const route = useRoute()
const router = useRouter()
const session = useSession()
const email = ref('')
const code = ref('')
const password = ref('')
const confirmPassword = ref('')
const pending = ref(false)
const sendingCode = ref(false)
const cooldown = ref(0)
const error = ref('')
const codeSentFor = ref(null)
const redirect = sanitizeRedirect(route.query.redirect)
const emailValid = computed(() => isValidEmail(email.value))
const sessionReady = computed(() => session.state.value !== 'unknown')
const codeSent = computed(() => codeSentFor.value !== null &&
  email.value.trim().toLowerCase() === codeSentFor.value)
let countdownTimer

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

const sendCode = async () => {
  if (!emailValid.value) { error.value = '请输入有效的邮箱地址。'; return }
  const submittedEmail = email.value.trim()
  sendingCode.value = true
  error.value = ''
  codeSentFor.value = null
  try {
    await session.ensureSession()
    const result = await sendVerificationCode(submittedEmail)
    codeSentFor.value = submittedEmail.toLowerCase()
    cooldown.value = result.resendAfter
    clearInterval(countdownTimer)
    countdownTimer = window.setInterval(() => {
      cooldown.value -= 1
      if (cooldown.value <= 0) clearInterval(countdownTimer)
    }, 1000)
  } catch (caught) {
    if (isRecoverableSessionError(caught)) session.resetBootstrap()
    error.value = caught.message
    await recoverSession()
  } finally { sendingCode.value = false }
}

const submit = async () => {
  if (!emailValid.value) { error.value = '请输入有效的邮箱地址。'; return }
  if (password.value !== confirmPassword.value) { error.value = '两次输入的密码不一致。'; return }
  pending.value = true
  error.value = ''
  try {
    await session.ensureSession()
    await session.register({ email: email.value.trim(), code: code.value.trim(), password: password.value })
    await router.replace({ name: 'login', query: { redirect, registered: '1' } })
  } catch (caught) {
    error.value = caught.message
    await recoverSession()
  } finally { pending.value = false }
}
onMounted(prepareSession)
onBeforeUnmount(() => clearInterval(countdownTimer))
</script>

<template>
  <AuthPanel eyebrow="CREATE ACCOUNT" title="建立观象账户" note="验证码仅用于注册；注册成功后，请使用新账户登录。">
    <form class="auth-form" @submit.prevent="submit"><label>邮箱<div class="field-action"><input v-model="email" type="email" autocomplete="email" required aria-describedby="register-error register-code-status" placeholder="name@example.com"><button type="button" :disabled="sendingCode || cooldown > 0 || !emailValid || !sessionReady" @click="sendCode">{{ !sessionReady ? '连接中' : cooldown > 0 ? `${cooldown}s` : sendingCode ? '发送中' : '发送验证码' }}</button></div></label><p v-if="codeSent" id="register-code-status" class="form-success" role="status">如果该邮箱可用于注册，验证码已发送，请检查收件箱和垃圾邮件。若你已有账户，请<RouterLink :to="{ name: 'login', query: { redirect } }">直接登录</RouterLink>。</p><label>验证码<input v-model="code" inputmode="numeric" autocomplete="one-time-code" required maxlength="6" placeholder="6 位验证码"></label><label>设置密码<input v-model="password" type="password" autocomplete="new-password" required minlength="8" placeholder="至少 8 位字符"></label><label>确认密码<input v-model="confirmPassword" type="password" autocomplete="new-password" required minlength="8" placeholder="再次输入密码"></label><p v-if="error" id="register-error" class="form-error" role="alert">{{ error }}</p><button class="submit-button" type="submit" :disabled="pending || !sessionReady">{{ !sessionReady ? '正在连接账户服务…' : pending ? '正在创建账户…' : '完成注册' }} <strong>→</strong></button></form>
    <p class="switch-link">已有账户？<RouterLink :to="{ name: 'login', query: { redirect } }">返回登录</RouterLink></p>
  </AuthPanel>
</template>

<style scoped lang="scss">
.auth-form { display: grid; gap: 15px; label { display: grid; gap: 7px; color: #aab3d5; font-size: 12px; } input { width: 100%; min-height: 46px; border: 1px solid rgba(121,144,215,.28); border-radius: 2px; padding: 0 14px; background: rgba(5,11,34,.7); color: #eef4ff; outline: 0; &:focus { border-color: #5cf5d4; box-shadow: 0 0 0 3px rgba(92,245,212,.08); } } }.field-action { display: grid; grid-template-columns: 1fr auto; gap: 8px; button { min-width: 106px; border: 1px solid rgba(220,162,96,.45); background: rgba(48,31,42,.72); color: #e0b781; font-size: 11px; &:disabled { opacity: .5; } } }.submit-button { display: flex; min-height: 50px; align-items: center; justify-content: space-between; border: 1px solid #5cf5d4; padding: 0 17px; background: linear-gradient(110deg,#173464,#281947); color: #f0ffff; font-weight: 800; &:disabled { opacity: .55; } strong { color: #dca260; } }.form-error { margin: 0; color: #ff9dca; font-size: 12px; }.form-success { margin: 0; border: 1px solid rgba(92,245,212,.3); padding: 11px 13px; background: rgba(24,69,76,.26); color: #9df6e8; font-size: 12px; line-height: 1.6; a { color: #dca260; font-weight: 700; } }.switch-link { margin: 20px 0 0; color: #6f7ba7; font-size: 12px; a { color: #8ff3e3; } }
@media (max-width: 420px) { .field-action { grid-template-columns: 1fr; button { min-height: 44px; } } }
</style>
