import SockJS from 'sockjs-client'
import Stomp from 'stompjs/lib/stomp.js'

const WS_URL = import.meta.env.VITE_WS_URL || '/ws'

let stompClient = null
let currentSubscription = null

export function connectQueueSocket(onConnect, onError) {
  if (stompClient && stompClient.connected) {
    if (onConnect) onConnect()
    return
  }

  try {
    const socket = new SockJS(WS_URL)
    stompClient = Stomp.over(socket)
    stompClient.debug = () => {}

    stompClient.connect(
      {},
      () => {
        if (onConnect) onConnect()
      },
      (error) => {
        if (onError) onError(error)
      }
    )
  } catch (error) {
    stompClient = null
    if (onError) onError(error)
  }
}

export function subscribeQueue(branchId, serviceId, onMessage) {
  if (!stompClient || !stompClient.connected) return

  unsubscribeQueue()

  const topic = `/topic/queue/branch/${branchId}/service/${serviceId}`
  currentSubscription = stompClient.subscribe(topic, (message) => {
    try {
      const data = JSON.parse(message.body)
      onMessage(data)
    } catch {
      onMessage({ message: 'Invalid queue update data received' })
    }
  })
}

export function unsubscribeQueue() {
  if (currentSubscription) {
    currentSubscription.unsubscribe()
    currentSubscription = null
  }
}

export function disconnectQueueSocket() {
  unsubscribeQueue()
  if (stompClient && stompClient.connected) {
    stompClient.disconnect()
  }
  stompClient = null
}
