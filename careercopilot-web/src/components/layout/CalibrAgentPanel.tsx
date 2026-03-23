import { useState, useRef, useEffect } from "react"
import { SendHorizonal, Sparkles, X, Bot, Zap, BarChart3, FileText, MessageSquare } from "lucide-react"
import { calibrAPI } from "@/lib/api"

interface Message {
  role: "user" | "agent"
  text: string
  streaming?: boolean
}

const QUICK_ACTIONS = [
  { label: "Analyze my gaps", icon: BarChart3 },
  { label: "Improve resume",  icon: FileText },
  { label: "Next steps",      icon: Zap },
  { label: "Mock interview",  icon: MessageSquare },
]

interface Props {
  isOpen: boolean
  onClose: () => void
  currentTab?: string
}

export function CalibrAgentPanel({ isOpen, onClose, currentTab = "" }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "agent",
      text: "Hello! I'm CALIBR Agent, your agentic career intelligence system. Upload your resume or paste a job description to begin. I'll help you land your next role.",
    },
  ])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isStreaming) return
    const userMsg = text.trim()
    setInput("")
    setMessages(prev => [...prev, { role: "user", text: userMsg }])
    setIsStreaming(true)
    // Add empty agent message to stream into
    setMessages(prev => [...prev, { role: "agent", text: "", streaming: true }])

    try {
      const stream = calibrAPI.chatWithAgent(userMsg, { tab: currentTab })
      let accumulated = ""
      for await (const chunk of stream) {
        accumulated += chunk
        setMessages(prev =>
          prev.map((m, i) => i === prev.length - 1 ? { ...m, text: accumulated } : m)
        )
      }
      setMessages(prev =>
        prev.map((m, i) => i === prev.length - 1 ? { ...m, streaming: false } : m)
      )
    } catch (e: any) {
      const errMsg = e.message?.includes("GROQ_API_KEY")
        ? "⚠️ Please add your GROQ_API_KEY to the backend .env file to enable CALIBR Agent."
        : `Error: ${e.message}`
      setMessages(prev =>
        prev.map((m, i) => i === prev.length - 1 ? { ...m, text: errMsg, streaming: false } : m)
      )
    } finally {
      setIsStreaming(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="flex flex-col h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid var(--bg-border)', background: 'var(--bg-surface)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.2)' }}>
            <Sparkles className="w-4 h-4" style={{ color: 'var(--accent-mint)' }} />
          </div>
          <div>
            <p className="font-syne font-semibold" style={{ color: 'var(--text-primary)', fontSize: 13 }}>CALIBR Agent</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--accent-mint)' }} />
              <span className="text-label" style={{ color: 'var(--accent-mint)', fontSize: '9px' }}>ONLINE · AGENTIC MODE</span>
            </div>
          </div>
        </div>
        <button onClick={onClose}
          className="w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick actions */}
      <div className="px-4 py-3 flex flex-wrap gap-1.5 shrink-0" style={{ borderBottom: '1px solid var(--bg-border)' }}>
        {QUICK_ACTIONS.map(({ label, icon: Icon }) => (
          <button key={label} onClick={() => sendMessage(label)}
            disabled={isStreaming}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 disabled:opacity-40"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--bg-border)', fontFamily: 'DM Sans, sans-serif' }}
            onMouseEnter={e => { (e.currentTarget.style.background = 'rgba(0,229,160,0.08)'); (e.currentTarget.style.borderColor = 'rgba(0,229,160,0.25)'); (e.currentTarget.style.color = 'var(--accent-mint)') }}
            onMouseLeave={e => { (e.currentTarget.style.background = 'var(--bg-elevated)'); (e.currentTarget.style.borderColor = 'var(--bg-border)'); (e.currentTarget.style.color = 'var(--text-secondary)') }}>
            <Icon className="w-3 h-3" /> {label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} gap-2`}>
            {msg.role === "agent" && (
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'rgba(0,229,160,0.12)', border: '1px solid rgba(0,229,160,0.2)' }}>
                <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent-mint)' }} />
              </div>
            )}
            <div className="max-w-[85%] px-3 py-2.5 text-sm leading-relaxed"
              style={{
                background: msg.role === "user" ? 'var(--accent-mint)' : 'var(--bg-elevated)',
                color: msg.role === "user" ? 'var(--text-inverse)' : 'var(--text-primary)',
                borderRadius: msg.role === "user" ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                fontFamily: 'DM Sans, sans-serif',
              }}>
              {msg.text}
              {!msg.text && msg.streaming && (
                <span className="flex items-center gap-1">
                  {[0, 150, 300].map(delay => (
                    <span key={delay} className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ background: 'var(--accent-mint)', animationDelay: `${delay}ms` }} />
                  ))}
                </span>
              )}
              {msg.text && msg.streaming && (
                <span className="ml-0.5 inline-block w-0.5 h-4 bg-current animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid var(--bg-border)' }}>
        <div className="flex items-center gap-2">
          <div className="flex-1 flex items-center px-4 py-2.5 rounded-full"
            style={{ background: 'var(--bg-elevated)', border: '1px solid var(--bg-border)' }}>
            <input ref={inputRef} value={input}
              id="calibr-agent-input"
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask CALIBR anything…"
              disabled={isStreaming}
              className="flex-1 bg-transparent outline-none text-sm disabled:opacity-40"
              style={{ color: 'var(--text-primary)', fontFamily: 'DM Sans, sans-serif' }} />
          </div>
          
          {/* Send Button placed outside to avoid browser AI extension overlaps */}
          <button onClick={() => sendMessage(input)}
            disabled={!input.trim() || isStreaming}
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-full transition-all duration-200 shadow-sm disabled:opacity-40 disabled:shadow-none"
            style={{ 
              background: input.trim() ? 'var(--accent-mint)' : 'var(--bg-elevated)',
              border: '1px solid var(--bg-border)'
            }}>
            <SendHorizonal className="w-4 h-4" style={{ color: input.trim() ? 'var(--text-inverse)' : 'var(--text-muted)' }} />
          </button>
        </div>
        <p className="text-center mt-1.5 text-xs font-mono" style={{ color: 'var(--text-muted)', opacity: 0.5 }}>⌘ Enter to send</p>
      </div>
    </div>
  )
}
