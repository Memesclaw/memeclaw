// WebSocket Context - 全局共享 WebSocket 连接状态
import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'

interface WebSocketContextType {
  ws: WebSocket | null
  messages: any[]
  error: string | null
  isConnected: boolean
  connect: (url: string) => void
  disconnect: () => void
  send: (data: any) => boolean
  clearMessages: () => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const wsRef = useRef<WebSocket | null>(null)

  const connect = useCallback((url: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return
    }

    const socket = new WebSocket(url)
    wsRef.current = socket

    socket.onopen = () => {
      console.log('WebSocket connected')
      setError(null)
      setWs(socket)
      setIsConnected(true)
    }

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        console.log('Received message:', message)
        setMessages(prev => [...prev, message])
      } catch (e) {
        console.error('Failed to parse message:', e)
      }
    }

    socket.onerror = (event) => {
      console.error('WebSocket error:', event)
      setError('Connection error')
      setIsConnected(false)
    }

    socket.onclose = () => {
      console.log('WebSocket closed')
      setWs(null)
      setIsConnected(false)

      // 尝试重连
      reconnectTimeoutRef.current = setTimeout(() => {
        connect(url)
      }, 3000)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }
    wsRef.current?.close()
    setWs(null)
    setIsConnected(false)
  }, [])

  const send = useCallback((data: any) => {
    console.log('📤 发送消息:', data);
    console.log('📊 WebSocket 状态:', wsRef.current?.readyState);
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
      console.log('✅ 消息已发送');
      return true;
    }
    console.log('❌ WebSocket 未连接');
    return false;
  }, [])

  const clearMessages = useCallback(() => {
    setMessages([])
  }, [])

  useEffect(() => {
    // 自动连接
    connect('ws://127.0.0.1:18789/ws')

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [connect])

  return (
    <WebSocketContext.Provider
      value={{
        ws,
        messages,
        error,
        isConnected,
        connect,
        disconnect,
        send,
        clearMessages,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  )
}

export function useWebSocket() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider')
  }
  return context
}
