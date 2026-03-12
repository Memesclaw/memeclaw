import { useState, useCallback, useRef, useEffect } from 'react'

export function useWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const connect = useCallback((url: string) => {
    if (ws?.readyState === WebSocket.OPEN) {
      return
    }

    const socket = new WebSocket(url)

    socket.onopen = () => {
      console.log('WebSocket connected')
      setError(null)
      setWs(socket)
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        setMessages(prev => [...prev, message])
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    socket.onerror = (event) => {
      console.error('WebSocket error:', event)
      setError('Connection error')
    }

    socket.onclose = () => {
      console.log('WebSocket closed')
      setWs(null)

      // 尝试重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(url)
      }, 3000)
    }

    setWs(socket)
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    ws?.close()
    setWs(null)
  }, [ws])

  const send = useCallback((data: any) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data))
      return true
    }
    return false
  }, [ws])

  useEffect(() => {
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [])

  return {
    ws,
    messages,
    error,
    connect,
    disconnect,
    send,
    clearMessages: () => setMessages([]),
  }
}
