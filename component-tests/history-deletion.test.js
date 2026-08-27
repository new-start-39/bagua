import { beforeEach, describe, expect, test, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deleteDivination: vi.fn(),
}))

const session = {
  state: { value: 'authenticated' },
  user: { value: { id: 'usr_history' } },
  ensureSession: vi.fn(async () => 'authenticated'),
}

vi.mock('../src/api/divinations.js', () => ({
  deleteDivination: mocks.deleteDivination,
  listDivinations: vi.fn(),
  mergeDivinations: vi.fn(),
}))
vi.mock('../src/composables/useSession.js', () => ({ useSession: () => session }))

import { useDivinationHistory } from '../src/composables/useDivinationHistory.js'
import { readAccountHistory, writeAccountHistory } from '../src/utils/account-history.js'
import { createHistoryRecord, readHistory, writeHistory } from '../src/utils/history.js'

const localRecord = () => createHistoryRecord([7, 8, 7, 8, 7, 8], {
  clientId: '123e4567-e89b-42d3-a456-426614174301', createdAt: Date.now(),
})

describe('history deletion state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    session.user.value = { id: 'usr_history' }
  })

  test('local deletion removes only the selected browser record', () => {
    const selected = localRecord()
    const retained = createHistoryRecord([7, 7, 7, 7, 7, 7], {
      clientId: '123e4567-e89b-42d3-a456-426614174302', createdAt: Date.now() - 1,
    })
    writeHistory([selected, retained])
    const history = useDivinationHistory()
    history.removeLocal(selected)
    expect(readHistory().map((item) => item.clientId)).toEqual([retained.clientId])
  })

  test('account deletion clears the server cache and matching same-device copy', async () => {
    const local = localRecord()
    const cloud = { ...local, id: 'div_history', createdAt: new Date(local.createdAt).toISOString() }
    writeHistory([local])
    writeAccountHistory(session.user.value.id, [cloud])
    mocks.deleteDivination.mockResolvedValue({})
    const history = useDivinationHistory()
    history.source.value = 'cloud'
    history.items.value = [cloud]

    await history.removeCloud(cloud)

    expect(mocks.deleteDivination).toHaveBeenCalledWith(cloud.id)
    expect(history.items.value).toEqual([])
    expect(readAccountHistory(session.user.value.id)).toEqual([])
    expect(readHistory()).toEqual([])
  })

  test('failed account deletion keeps the record and exposes the error', async () => {
    const local = localRecord()
    const cloud = { ...local, id: 'div_history', createdAt: new Date(local.createdAt).toISOString() }
    mocks.deleteDivination.mockRejectedValue(Object.assign(new Error('暂时无法删除'), { code: 'REQUEST_FAILED' }))
    const history = useDivinationHistory()
    history.source.value = 'cloud'
    history.items.value = [cloud]

    await history.removeCloud(cloud)

    expect(history.items.value).toEqual([cloud])
    expect(history.error.value).toBe('暂时无法删除')
    expect(history.isDeleting(cloud)).toBe(false)
  })
})
