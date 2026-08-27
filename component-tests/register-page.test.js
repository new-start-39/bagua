import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  route: { query: { redirect: '/ai/123' } },
  sendVerificationCode: vi.fn(),
}))

const session = {
  state: ref('anonymous'),
  ensureSession: vi.fn(async () => 'anonymous'),
  register: vi.fn(async () => ({ registered: true })),
}

vi.mock('vue-router', () => ({
  useRoute: () => mocks.route,
  useRouter: () => ({ replace: vi.fn() }),
}))
vi.mock('../src/api/auth.js', () => ({
  sendVerificationCode: mocks.sendVerificationCode,
}))
vi.mock('../src/composables/useSession.js', () => ({
  isRecoverableSessionError: () => false,
  useSession: () => session,
}))

import RegisterPage from '../src/pages/RegisterPage.vue'

const routerLink = {
  props: ['to'],
  template: '<a><slot /></a>',
}

beforeEach(() => {
  vi.clearAllMocks()
  session.state.value = 'anonymous'
  mocks.sendVerificationCode.mockResolvedValue({ expiresIn: 600, resendAfter: 60 })
})

describe('registration verification feedback', () => {
  test('shows generic delivery guidance without revealing whether the account exists', async () => {
    const wrapper = mount(RegisterPage, {
      global: { stubs: { RouterLink: routerLink, AuthPanel: false } },
    })

    try {
      expect(wrapper.find('[role="status"]').exists()).toBe(false)

      await wrapper.find('input[type="email"]').setValue('existing@example.com')
      await wrapper.find('.field-action button').trigger('click')
      await flushPromises()

      expect(mocks.sendVerificationCode).toHaveBeenCalledWith('existing@example.com')
      expect(wrapper.find('[role="status"]').text()).toContain('如果该邮箱可用于注册')
      expect(wrapper.find('[role="status"]').text()).toContain('直接登录')
      expect(wrapper.find('.field-action button').text()).toBe('60s')
      expect(wrapper.text()).not.toContain('该邮箱已注册')

      await wrapper.find('input[type="email"]').setValue('another@example.com')
      expect(wrapper.find('[role="status"]').exists()).toBe(false)
    } finally {
      wrapper.unmount()
    }
  })
})
