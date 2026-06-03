import { useEffect } from 'react'
import { Client } from '@stomp/stompjs'
import SockJS from 'sockjs-client'
import { useQueryClient } from '@tanstack/react-query'

export function useWebSocket(userId: number | string | undefined) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!userId) return

    // Kết nối tới endpoint /ws (đã được cấu hình qua Vite Proxy và Gateway)
    const socketUrl = '/ws'

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
      reconnectDelay: 5000, // Tự động kết nối lại sau 5 giây nếu ngắt kết nối
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log('STOMP: Connected to WebSocket Broker')
        
        // Subscribe vào topic riêng của user để nhận thông báo email mới
        const topic = `/topic/emails/${userId}`
        stompClient.subscribe(topic, (message) => {
          console.log('STOMP: Received message:', message.body)
          try {
            // Khi nhận được sự kiện email mới từ backend, làm mới danh sách email của React Query
            queryClient.invalidateQueries({ queryKey: ['emails'] })
          } catch (err) {
            console.error('STOMP: Failed to invalidate emails query:', err)
          }
        })
      },
      onStompError: (frame) => {
        console.error('STOMP: Broker reported error: ' + frame.headers['message'])
        console.error('STOMP: Additional details: ' + frame.body)
      },
      onDisconnect: () => {
        console.log('STOMP: Disconnected')
      }
    })

    stompClient.activate()

    return () => {
      stompClient.deactivate()
    }
  }, [userId, queryClient])
}
