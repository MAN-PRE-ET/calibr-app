import { useState, useEffect, useCallback, useRef } from 'react'
import { Layout } from '@/components/layout/Layout'
import { IntelligenceHubTab } from '@/components/tabs/IntelligenceHubTab'
import { ApplyTab } from '@/components/tabs/ApplyTab'
import { TrackingTab } from '@/components/tabs/TrackingTab'
import { RejectedTab } from '@/components/tabs/RejectedTab'
import { AnalysisTab } from '@/components/tabs/AnalysisTab'
import { InterviewSimulatorTab } from '@/components/tabs/InterviewSimulatorTab'
import { AppLoader } from '@/components/layout/AppLoader'
import { DemoBanner } from '@/components/layout/DemoBanner'
import { ToastProvider, useToast } from '@/lib/toast'
import { calibrAPI } from '@/lib/api'

// ─── Page title map ─────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  intelligence: 'Intelligence Hub — CALIBR',
  apply:        'Opportunity Analysis — CALIBR',
  tracking:     'Application Pipeline — CALIBR',
  rejected:     'Rejection Intel — CALIBR',
  analysis:     'Career Intelligence — CALIBR',
  interview:    'Interview Simulator — CALIBR',
  settings:     'Settings — CALIBR',
}

function SettingsTab() {
  useEffect(() => { document.title = PAGE_TITLES.settings }, [])
  return (
    <div className="p-6 flex items-center justify-center min-h-[500px]">
      <div className="text-center max-w-sm">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.12)' }}
        >
          <span style={{ fontSize: 28 }}>⚙</span>
        </div>
        <h2 className="font-syne font-bold mb-2" style={{ fontSize: 22, color: 'var(--text-primary)' }}>
          System Settings
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }}>
          Manage your CALIBR profile, API keys, integrations, and notification preferences.
        </p>
      </div>
    </div>
  )
}

// ─── Inner App (has access to ToastContext) ──────────────────────────────────
function AppInner() {
  const [activeTab, setActiveTab] = useState('intelligence')
  const [loading, setLoading] = useState(true)
  const [demoActive, setDemoActive] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [transitioning, setTransitioning] = useState(false)
  const pendingTab = useRef<string | null>(null)
  const { toast } = useToast()

  // ─── Auto-seed demo on ?demo=true ────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('demo') === 'true') {
      // Remove ?demo=true from URL without reloading
      window.history.replaceState({}, '', window.location.pathname)
      // Seed demo data then update UI
      ;(calibrAPI as any).seedDemo()
        .then(() => {
          setDemoActive(true)
          setReloadKey(k => k + 1)
          toast('success', '🎉 Welcome to CALIBR! Loaded with sample data.')
        })
        .catch(() => {
          toast('info', '👋 Welcome to CALIBR! (Demo data unavailable — backend may be starting up.)')
        })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ─── Smooth tab transition ───────────────────────────────────────────────
  const handleTabChange = useCallback((id: string) => {
    if (id === activeTab) return
    setTransitioning(true)
    pendingTab.current = id
    setTimeout(() => {
      setActiveTab(pendingTab.current!)
      setTransitioning(false)
    }, 120)
  }, [activeTab])

  // ─── Page titles ─────────────────────────────────────────────────────────
  useEffect(() => {
    document.title = PAGE_TITLES[activeTab] || 'CALIBR'
  }, [activeTab])

  // ─── Keyboard shortcuts ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey

      // Ctrl/Cmd + K → focus agent input
      if (ctrl && e.key === 'k') {
        e.preventDefault()
        const agentInput = document.getElementById('calibr-agent-input')
        agentInput?.focus()
      }

      // Ctrl/Cmd + U → trigger resume upload
      if (ctrl && e.key === 'u') {
        e.preventDefault()
        const uploadInput = document.getElementById('resume-upload-input')
        uploadInput?.click()
      }

      // Escape → close any open panels / slide-overs (just blur focused element)
      if (e.key === 'Escape') {
        const focused = document.activeElement as HTMLElement
        focused?.blur?.()
        // close any overlay dialogs by dispatching a close event
        document.dispatchEvent(new CustomEvent('calibr:escape'))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const renderTab = () => {
    switch (activeTab) {
      case 'intelligence': return <IntelligenceHubTab key={reloadKey} onDemoLoad={() => { setDemoActive(true); setReloadKey(k => k + 1) }} />
      case 'apply':        return <ApplyTab key={reloadKey} />
      case 'tracking':     return <TrackingTab key={reloadKey} />
      case 'rejected':     return <RejectedTab key={reloadKey} />
      case 'analysis':     return <AnalysisTab key={reloadKey} />
      case 'interview':    return <InterviewSimulatorTab key={reloadKey} />
      case 'settings':     return <SettingsTab />
      default:             return <IntelligenceHubTab key={reloadKey} onDemoLoad={() => { setDemoActive(true); setReloadKey(k => k + 1) }} />
    }
  }

  if (loading) {
    return <AppLoader onComplete={() => setLoading(false)} />
  }

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Demo banner — above everything */}
      <DemoBanner
        demoActive={demoActive}
        setDemoActive={setDemoActive}
        onReload={() => setReloadKey(k => k + 1)}
      />
      <div className="flex-1 min-h-0">
        <Layout activeTab={activeTab} setActiveTab={handleTabChange}>
          <div
            style={{
              opacity: transitioning ? 0 : 1,
              transition: 'opacity 200ms ease',
            }}
          >
            {renderTab()}
          </div>
        </Layout>
      </div>
    </div>
  )
}

// ─── Root App — wraps everything in ToastProvider ─────────────────────────────
function App() {
  return (
    <ToastProvider>
      <AppInner />
    </ToastProvider>
  )
}

export default App
