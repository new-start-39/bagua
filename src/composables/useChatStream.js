import { ref } from 'vue'
import { cancelConversationMessage, streamConversationMessage } from '../api/conversations.js'

export const useChatStream = () => {
  const isGenerating = ref(false)
  const error = ref(null)
  let controller = null
  let activeMessage = null
  const stop = () => {
    if (!controller || !activeMessage) return
    void cancelConversationMessage(activeMessage.conversationId, activeMessage.clientMessageId).catch(() => {})
    controller.abort(new DOMException('Generation stopped', 'AbortError'))
  }
  const send = async ({ conversationId, content, clientMessageId, onEvent }) => {
    controller = new AbortController()
    activeMessage = { conversationId, clientMessageId }
    isGenerating.value = true
    error.value = null
    try {
      await streamConversationMessage({ conversationId, content, clientMessageId, signal: controller.signal, onEvent })
    } catch (caught) {
      if (caught?.name !== 'AbortError') error.value = caught
      throw caught
    } finally {
      isGenerating.value = false
      controller = null
      activeMessage = null
    }
  }
  return { isGenerating, error, send, stop }
}
