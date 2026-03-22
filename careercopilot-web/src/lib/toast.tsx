import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from "react"
import { CheckCircle, XCircle, Info, X } from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────
export type ToastType = "success" | "error" | "info"

export interface Toast {
  id: string
  type: ToastType
  message: string
}

interface ToastContextValue {
  toasts: Toast[]
  toast: (type: ToastType, message: string) => void
  dismiss: (id: string) => void
}

// ─── Context ───────────────────────────────────────────────────────────────
const ToastContext = createContext<ToastContextValue>({
  toasts: [],
  toast: () => {},
  dismiss: () => {},
})

// ─── Provider ──────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev.slice(-2), { id, type, message }])
    setTimeout(() => dismiss(id), 4000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

// ─── Hook ──────────────────────────────────────────────────────────────────
export function useToast() {
  return useContext(ToastContext)
}

// ─── Toast Item ────────────────────────────────────────────────────────────
const BORDER_COLORS: Record<ToastType, string> = {
  success: "var(--accent-mint)",
  error: "var(--accent-rose)",
  info: "var(--accent-sky)",
}

const ICONS: Record<ToastType, typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
}

function ToastItem({ toast: t, dismiss }: { toast: Toast; dismiss: (id: string) => void }) {
  const [visible, setVisible] = useState(false)
  const mounted = useRef(false)
  const borderColor = BORDER_COLORS[t.type]
  const Icon = ICONS[t.type]

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true
      requestAnimationFrame(() => setVisible(true))
    }
  }, [])

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        background: "var(--bg-elevated)",
        border: "1px solid var(--bg-border)",
        borderLeft: `3px solid ${borderColor}`,
        borderRadius: 10,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
        minWidth: 280,
        maxWidth: 380,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateX(0)" : "translateX(100%)",
        transition: "opacity 0.25s ease, transform 0.25s ease",
      }}
    >
      <Icon style={{ color: borderColor, width: 16, height: 16, flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, color: "var(--text-primary)", fontFamily: "DM Sans, sans-serif", lineHeight: 1.4 }}>
        {t.message}
      </span>
      <button
        onClick={() => dismiss(t.id)}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--text-muted)",
          padding: 2,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <X style={{ width: 14, height: 14 }} />
      </button>
    </div>
  )
}

// ─── Container ─────────────────────────────────────────────────────────────
function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div
      style={{
        position: "fixed",
        top: 20,
        right: 20,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        pointerEvents: "none",
      }}
    >
      {toasts.map(t => (
        <div key={t.id} style={{ pointerEvents: "auto" }}>
          <ToastItem toast={t} dismiss={dismiss} />
        </div>
      ))}
    </div>
  )
}
