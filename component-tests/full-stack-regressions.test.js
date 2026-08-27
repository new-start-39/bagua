import { flushPromises, mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  route: { name: 'result', params: {}, query: {}, meta: {} },
  routerPush: vi.fn(),
  routerReplace: vi.fn(),
  getDivination: vi.fn(),
  createConversation: vi.fn(),
  getConversation: vi.fn(),
  streamConversationMessage: vi.fn(),
  cancelConversationMessage: vi.fn(),
  clearOwnedCache: vi.fn(),
  removeLocal: vi.fn(),
  removeCloud: vi.fn(async () => {}),
  isDeleting: vi.fn(() => false),
}))

const session = {
  state: ref('authenticated'),
  user: ref({ id: 'usr_one', email: 'reader@example.com' }),
  ensureSession: vi.fn(async () => 'authenticated'),
  logout: vi.fn(async () => {
    session.user.value = null
    session.state.value = 'anonymous'
  }),
  register: vi.fn(async () => ({ registered: true })),
  invalidate: vi.fn(),
}

const historyController = {
  items: ref([]), source: ref('local'), loading: ref(false), merging: ref(false), error: ref(''),
  localItems: ref([]), nextCursor: ref(null), localCount: ref(0), canMerge: ref(false),
  refresh: vi.fn(async () => {}), refreshLocal: vi.fn(), mergeLocal: vi.fn(), clearLocal: vi.fn(),
  removeLocal: mocks.removeLocal, removeCloud: mocks.removeCloud, isDeleting: mocks.isDeleting,
  clearOwnedCache: mocks.clearOwnedCache,
}

vi.mock('vue-router', () => ({
  RouterView: { template: '<div />' },
  useRoute: () => mocks.route,
  useRouter: () => ({ push: mocks.routerPush, replace: mocks.routerReplace }),
}))
vi.mock('../src/api/divinations.js', () => ({ getDivination: mocks.getDivination }))
vi.mock('../src/api/conversations.js', () => ({
  createConversation: mocks.createConversation,
  getConversation: mocks.getConversation,
  streamConversationMessage: mocks.streamConversationMessage,
  cancelConversationMessage: mocks.cancelConversationMessage,
}))
vi.mock('../src/composables/useSession.js', () => ({ useSession: () => session }))
vi.mock('../src/composables/useDivinationHistory.js', () => ({
  useDivinationHistory: () => historyController,
}))

import App from '../src/App.vue'
import AiConversationPage from '../src/pages/AiConversationPage.vue'
import DivinationPage from '../src/pages/DivinationPage.vue'
import ResultPage from '../src/pages/ResultPage.vue'
import RegisterPage from '../src/pages/RegisterPage.vue'
import { createHistoryRecord, writeHistory } from '../src/utils/history.js'
import { clearTransientDivination, findTransientDivination } from '../src/utils/transient-divination.js'

const routerLink = { props: ['to'], template: '<a><slot /></a>' }
const record = (id, clientId, number, name) => ({
  id, clientId, createdAt: '2026-08-27T00:00:00.000Z',
  original: { number, name }, transformed: null, schemaVersion: 1,
})
const deferred = () => {
  let resolve
  const promise = new Promise((done) => { resolve = done })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  clearTransientDivination()
  session.state.value = 'authenticated'
  session.user.value = { id: 'usr_one', email: 'reader@example.com' }
  mocks.route.name = 'result'
  mocks.route.params = {}
  mocks.route.query = {}
  mocks.route.meta = {}
  historyController.items.value = []
  historyController.localItems.value = []
  historyController.source.value = 'local'
  historyController.localCount.value = 0
  historyController.canMerge.value = false
})

describe('full-stack page regressions', () => {
  test('rapid completion clicks can never append a seventh divination line', async () => {
    vi.useFakeTimers()
    mocks.route.name = 'divination'
    mocks.routerPush.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(DivinationPage, { global: { stubs: { Transition: false } } })

    try {
      await wrapper.find('.start-panel button').trigger('click')
      for (let index = 0; index < 5; index += 1) {
        await vi.advanceTimersByTimeAsync(1_200)
        await wrapper.find('.coins-panel button').trigger('click')
      }
      await vi.advanceTimersByTimeAsync(1_200)
      const completionButton = wrapper.find('.coins-panel button')
      await completionButton.trigger('click')
      completionButton.element.click()
      completionButton.element.click()
      await nextTick()

      expect(wrapper.findAll('.line-list li:not(.empty-line)')).toHaveLength(6)
      expect(wrapper.find('#casting-title').text()).toContain('第 6 次 · 上爻')
      expect(completionButton.attributes('disabled')).toBeDefined()
      expect(mocks.routerPush).toHaveBeenCalledTimes(1)
    } finally {
      wrapper.unmount()
      vi.useRealTimers()
    }
  })

  test('a directly loaded cloud result is retained for the AI handoff', async () => {
    const cloud = record('div_remote', '123e4567-e89b-42d3-a456-426614174201', 1, '乾')
    mocks.getDivination.mockResolvedValue(cloud)
    const wrapper = mount(ResultPage, {
      props: { castId: cloud.id }, global: { stubs: { RouterLink: routerLink } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('乾')
    expect(mocks.getDivination).toHaveBeenCalledWith(cloud.id)
    expect(findTransientDivination(cloud.clientId)?.id).toBe(cloud.id)
  })

  test('a static local cast never renders the original hexagram again as a transformed card', async () => {
    const local = createHistoryRecord([7, 8, 7, 8, 7, 8], {
      clientId: '123e4567-e89b-42d3-a456-426614174205', createdAt: Date.now(),
    })
    writeHistory([local])
    const wrapper = mount(ResultPage, {
      props: { castId: local.clientId }, global: { stubs: { RouterLink: routerLink } },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('本次无动爻')
    expect(wrapper.text()).not.toContain('变卦 / EMERGING FORM')
    expect(wrapper.findAll('.hexagram-card')).toHaveLength(1)
  })

  test('an older result request cannot overwrite a newer route', async () => {
    const first = deferred()
    const second = deferred()
    mocks.getDivination.mockImplementation((id) => id === 'div_first' ? first.promise : second.promise)
    const wrapper = mount(ResultPage, {
      props: { castId: 'div_first' }, global: { stubs: { RouterLink: routerLink } },
    })
    await flushPromises()
    await wrapper.setProps({ castId: 'div_second' })
    second.resolve(record('div_second', '123e4567-e89b-42d3-a456-426614174202', 2, '坤'))
    await flushPromises()
    expect(wrapper.text()).toContain('坤')
    first.resolve(record('div_first', '123e4567-e89b-42d3-a456-426614174203', 1, '乾'))
    await flushPromises()
    expect(wrapper.text()).toContain('坤')
  })

  test('AI initialization resolves a server divination even without a warmed history cache', async () => {
    const cloud = record('div_ai', '123e4567-e89b-42d3-a456-426614174204', 1, '乾')
    mocks.route.name = 'ai-init'
    mocks.route.params = { castId: cloud.id }
    mocks.getDivination.mockResolvedValue(cloud)
    mocks.createConversation.mockResolvedValue({
      conversationId: 'conv_one', divinationId: cloud.id, clientDivinationId: cloud.clientId,
      oracleContext: { original: { ...cloud.original, judgment: '元亨，利贞。' }, transformed: null },
      messages: [{ id: 'msg_open', role: 'assistant', content: '所问何事？', status: 'completed' }],
    })
    const wrapper = mount(AiConversationPage)
    await flushPromises()
    expect(mocks.getDivination).toHaveBeenCalledWith(cloud.id)
    expect(mocks.createConversation).toHaveBeenCalledWith(expect.objectContaining({
      clientDivinationId: cloud.clientId,
    }))
    expect(wrapper.text()).toContain('问此一卦')
  })

  test('Enter sends, Shift+Enter keeps a newline, and stop explicitly cancels the backend message', async () => {
    const cloud = record('div_chat', '123e4567-e89b-42d3-a456-426614174206', 1, '乾')
    mocks.route.name = 'ai-conversation'
    mocks.route.params = { conversationId: 'conv_keyboard' }
    mocks.getConversation.mockResolvedValue({
      conversationId: 'conv_keyboard', divinationId: cloud.id, clientDivinationId: cloud.clientId,
      oracleContext: { original: { ...cloud.original, judgment: '元亨，利贞。' }, transformed: null },
      messages: [{ id: 'msg_open', role: 'assistant', content: '所问何事？', status: 'completed' }],
    })
    let releaseStream
    mocks.streamConversationMessage.mockImplementation(() => new Promise((resolve) => { releaseStream = resolve }))
    mocks.cancelConversationMessage.mockResolvedValue({ cancelled: true })
    const wrapper = mount(AiConversationPage)
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('工作如何？')
    await textarea.trigger('keydown', { key: 'Enter', shiftKey: true })
    expect(mocks.streamConversationMessage).not.toHaveBeenCalled()
    const submit = textarea.trigger('keydown', { key: 'Enter' })
    await nextTick()
    expect(mocks.streamConversationMessage).toHaveBeenCalledTimes(1)
    const assistantMessages = wrapper.findAll('.message-list li.assistant')
    expect(assistantMessages).toHaveLength(2)
    expect(assistantMessages.at(-1).find('.cursor').exists()).toBe(true)
    expect(wrapper.find('.stop-button').exists()).toBe(true)
    expect(wrapper.find('.stream-status').text()).toContain('正在生成')
    await submit
    await wrapper.find('.stop-button').trigger('click')
    await flushPromises()
    expect(mocks.cancelConversationMessage).toHaveBeenCalledWith(
      'conv_keyboard', expect.any(String),
    )
    releaseStream()
  })

  test('a pre-stream failure removes temporary chat messages and restores the question to the composer', async () => {
    const cloud = record('div_failed', '123e4567-e89b-42d3-a456-426614174208', 1, '乾')
    mocks.route.name = 'ai-conversation'
    mocks.route.params = { conversationId: 'conv_failed' }
    mocks.getConversation.mockResolvedValue({
      conversationId: 'conv_failed', divinationId: cloud.id, clientDivinationId: cloud.clientId,
      oracleContext: { original: { ...cloud.original, judgment: '元亨，利贞。' }, transformed: null },
      messages: [{ id: 'msg_open', role: 'assistant', content: '所问何事？', status: 'completed' }],
    })
    mocks.streamConversationMessage.mockRejectedValue(Object.assign(
      new Error('暂时无法确认问题与卦象的关系，请稍后重试'),
      { code: 'AI_SCOPE_CHECK_UNAVAILABLE' },
    ))
    const wrapper = mount(AiConversationPage)
    await flushPromises()
    const textarea = wrapper.find('textarea')
    await textarea.setValue('工作如何？')
    await textarea.trigger('keydown', { key: 'Enter' })
    await flushPromises()

    expect(wrapper.findAll('.message-list li.user')).toHaveLength(0)
    expect(wrapper.findAll('.message-list li.assistant')).toHaveLength(1)
    expect(wrapper.find('.message-list .cursor').exists()).toBe(false)
    expect(wrapper.find('textarea').element.value).toBe('工作如何？')
    expect(wrapper.find('.send-error').text()).toContain('暂时无法确认问题与卦象的关系')
  })

  test('registration returns to the login page instead of authenticating the user', async () => {
    session.state.value = 'anonymous'
    session.user.value = null
    mocks.route.name = 'register'
    mocks.route.query = { redirect: '/ai/123' }
    const wrapper = mount(RegisterPage, {
      global: { stubs: { RouterLink: routerLink, AuthPanel: false } },
    })
    const inputs = wrapper.findAll('input')
    await inputs[0].setValue('reader@example.com')
    await inputs[1].setValue('123456')
    await inputs[2].setValue('valid password')
    await inputs[3].setValue('valid password')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(session.register).toHaveBeenCalled()
    expect(mocks.routerReplace).toHaveBeenCalledWith({
      name: 'login', query: { redirect: '/ai/123', registered: '1' },
    })
    expect(session.state.value).toBe('anonymous')
  })

  test('logout clears the cache for the user that existed before session invalidation', async () => {
    mocks.route.name = 'result'
    const wrapper = mount(App, {
      global: { stubs: { RouterLink: routerLink, RouterView: { template: '<div />' }, Transition: false } },
    })
    const logout = wrapper.findAll('button').find((button) => button.text() === '退出')
    await logout.trigger('click')
    await flushPromises()
    expect(mocks.clearOwnedCache).toHaveBeenCalledWith('usr_one')
  })

  test('signed-in users can open local history without merging it', async () => {
    const local = createHistoryRecord([7, 8, 7, 8, 7, 8], {
      clientId: '123e4567-e89b-42d3-a456-426614174207', createdAt: Date.now(),
    })
    historyController.source.value = 'cloud'
    historyController.items.value = []
    historyController.localItems.value = [local]
    historyController.localCount.value = 1
    historyController.canMerge.value = true
    const wrapper = mount(App, {
      global: { stubs: { RouterLink: routerLink, RouterView: { template: '<div />' }, Transition: false } },
    })
    await wrapper.find('.history-button').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('本机记录（未合并）')
    expect(wrapper.text()).toContain('合并到账户是可选操作')
    await wrapper.find('.history-view').trigger('click')
    expect(mocks.routerPush).toHaveBeenCalledWith({
      name: 'result', params: { castId: local.clientId },
    })
  })

  test('history entries require confirmation and keep delete separate from opening a result', async () => {
    const cloud = record('div_delete', '123e4567-e89b-42d3-a456-426614174209', 1, '乾')
    historyController.source.value = 'cloud'
    historyController.items.value = [cloud]
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    const wrapper = mount(App, {
      global: { stubs: { RouterLink: routerLink, RouterView: { template: '<div />' }, Transition: false } },
    })
    await wrapper.find('.history-button').trigger('click')
    await wrapper.find('.history-delete').trigger('click')
    await flushPromises()
    expect(mocks.removeCloud).toHaveBeenCalledWith(cloud)
    expect(mocks.routerPush).not.toHaveBeenCalled()
    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('相关 AI 解读对话'))
  })
})
