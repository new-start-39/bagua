import { computed, ref } from 'vue'
import { deleteDivination, listDivinations, mergeDivinations } from '../api/divinations.js'
import { clearAccountHistory, readAccountHistory, removeAccountHistoryRecords, writeAccountHistory } from '../utils/account-history.js'
import { readHistory, removeHistoryRecords, toApiDivination, writeHistory } from '../utils/history.js'
import { useSession } from './useSession.js'

export const useDivinationHistory = () => {
  const session = useSession()
  const items = ref(readHistory())
  const source = ref('local')
  const loading = ref(false)
  const merging = ref(false)
  const deletingIds = ref(new Set())
  const error = ref('')
  const nextCursor = ref(null)
  const localItems = ref(readHistory())
  const localCount = computed(() => localItems.value.length)
  const canMerge = computed(() => session.state.value === 'authenticated' && localCount.value > 0)

  const refreshLocal = () => {
    localItems.value = readHistory()
    items.value = localItems.value
    source.value = 'local'
    nextCursor.value = null
  }

  const refresh = async ({ append = false } = {}) => {
    await session.ensureSession()
    if (session.state.value !== 'authenticated') { refreshLocal(); return }
    loading.value = true
    error.value = ''
    try {
      const page = await listDivinations({ cursor: append ? nextCursor.value : null, limit: 20 })
      const combined = append ? [...items.value, ...page.items] : page.items
      items.value = writeAccountHistory(session.user.value.id, combined)
      source.value = 'cloud'
      nextCursor.value = page.nextCursor
      localItems.value = readHistory()
    } catch (caught) {
      const cached = readAccountHistory(session.user.value?.id)
      if (!append && cached.length) items.value = cached
      source.value = 'cloud'
      error.value = caught.message
    } finally { loading.value = false }
  }

  const mergeLocal = async () => {
    const local = readHistory()
    if (!local.length || session.state.value !== 'authenticated') return
    merging.value = true
    error.value = ''
    try {
      const result = await mergeDivinations(local.map(toApiDivination))
      const acceptedIds = result.items
        .filter((item) => item.status === 'created' || item.status === 'duplicate')
        .map((item) => item.clientId)
      writeHistory(removeHistoryRecords(local, acceptedIds))
      localItems.value = readHistory()
      await refresh()
      const failed = result.items.filter((item) => item.status === 'failed').length
      if (failed) error.value = `${failed} 条本机记录暂未合并，记录仍保留在本机，可直接查看或稍后重试。`
    } catch (caught) { error.value = caught.message } finally { merging.value = false }
  }

  const clearLocal = () => { writeHistory([]); refreshLocal() }
  const clearOwnedCache = (userId = session.user.value?.id) => clearAccountHistory(userId)

  const removeLocal = (record) => {
    const remaining = writeHistory(removeHistoryRecords(readHistory(), [record.clientId]))
    localItems.value = remaining
    if (source.value === 'local') items.value = remaining
  }

  const removeCloud = async (record) => {
    const identifier = record.id
    if (!identifier || deletingIds.value.has(identifier)) return
    deletingIds.value = new Set(deletingIds.value).add(identifier)
    error.value = ''
    try {
      await deleteDivination(identifier)
    } catch (caught) {
      if (caught.code !== 'DIVINATION_NOT_FOUND') {
        error.value = caught.message
        return
      }
    } finally {
      const next = new Set(deletingIds.value)
      next.delete(identifier)
      deletingIds.value = next
    }

    const identifiers = [identifier, record.clientId]
    items.value = items.value.filter((item) => !identifiers.includes(item.id) && !identifiers.includes(item.clientId))
    if (session.user.value?.id) removeAccountHistoryRecords(session.user.value.id, identifiers)
    removeLocal(record)
  }

  const isDeleting = (record) => deletingIds.value.has(record.id)

  return {
    items, localItems, source, loading, merging, deletingIds, error, nextCursor, localCount, canMerge,
    refresh, refreshLocal, mergeLocal, removeLocal, removeCloud, isDeleting, clearLocal, clearOwnedCache,
  }
}
