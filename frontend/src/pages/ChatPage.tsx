import { useState, useRef, useEffect } from 'react'
import { Send, Trash2, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import { useWebSocket } from '../context/WebSocketContext'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const processedCountRef = useRef(0)
  const { send, messages: wsMessages, isConnected, clearMessages } = useWebSocket()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const startIndex = processedCountRef.current
    const newMessages = wsMessages.slice(startIndex)

    if (newMessages.length === 0) return

    newMessages.forEach((msg: any) => {
      console.log('Processing message:', msg?.type, msg)

      if (msg?.type === 'error') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Error: ${msg.data?.error || 'Unknown error occurred'}`,
          timestamp: msg.timestamp,
        }])
        setIsLoading(false)
      }

      if (msg?.type === 'response' || msg?.type === 'message') {
        if (msg.data?.role === 'assistant') {
          setMessages(prev => [...prev, {
            id: msg.data.id || Date.now().toString(),
            role: 'assistant',
            content: msg.data.content,
            timestamp: msg.timestamp,
          }])
          setIsLoading(false)
        }
      }

      if (msg?.type === 'thinking_start') {
        setIsLoading(true)
      }
      if (msg?.type === 'thinking_end') {
        setIsLoading(false)
      }
    })

    processedCountRef.current = wsMessages.length
  }, [wsMessages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    if (!isConnected) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**MemeClaw Offline Mode**

WebSocket is not connected. Please start the backend:

\`\`\`bash
npm run gateway
\`\`\`

Or check your configuration in Settings.`,
          timestamp: Date.now(),
        }])
        setIsLoading(false)
      }, 1000)
      return
    }

    send({
      type: 'message',
      data: {
        role: 'user',
        content: userMessage.content,
      },
      sessionId: 'default',
    })
  }

  const handleClear = () => {
    setMessages([])
    clearMessages()
    processedCountRef.current = 0
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const suggestions = [
    'What is my BNB balance?',
    'Get BNB price',
    'Create a reminder in 30 minutes',
    'Save this to memory: I like pizza'
  ]

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
            <span className="text-xl">🦞</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Chat with MemeClaw</h2>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              <p className="text-xs text-slate-400">{isConnected ? 'Connected' : 'Disconnected'}</p>
            </div>
          </div>
        </div>
        <button
          onClick={handleClear}
          className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          <span className="text-sm">Clear</span>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-yellow-500/20">
              <span className="text-4xl">🦞</span>
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">
              Start a Conversation
            </h3>
            <p className="text-slate-400 max-w-md mb-6">
              Ask me anything about BNB Chain, crypto prices, or use my skills to help you.
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm hover:bg-slate-700 transition-colors border border-slate-700"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <span className="text-lg">🦞</span>
                </div>
              )}
              <div
                className={`max-w-2xl rounded-2xl px-4 py-3 ${
                  message.role === 'user'
                    ? 'bg-gradient-to-r from-yellow-600 to-amber-600 text-white'
                    : 'bg-slate-800 text-slate-100 border border-slate-700'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="markdown-content">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-yellow-500 to-amber-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-lg">🦞</span>
            </div>
            <div className="bg-slate-800 rounded-2xl px-4 py-3 border border-slate-700">
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-slate-700/50 bg-slate-800/50 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message... (Shift+Enter for new line)"
              className="flex-1 bg-slate-800 text-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder-slate-500 border border-slate-700"
              rows={1}
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 bg-gradient-to-r from-yellow-600 to-amber-600 text-white rounded-xl hover:from-yellow-500 hover:to-amber-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg shadow-yellow-500/20"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
