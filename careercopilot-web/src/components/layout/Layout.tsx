import { useState } from "react"
import { Sidebar } from "./Sidebar"
import { CalibrAgentPanel } from "./CalibrAgentPanel"
import { MobileNav } from "./MobileNav"

export function Layout({
  children,
  activeTab,
  setActiveTab
}: {
  children: React.ReactNode
  activeTab: string
  setActiveTab: (id: string) => void
}) {
  const [agentOpen, setAgentOpen] = useState(true)

  return (
    <div className="flex h-screen w-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
      {/* Sidebar — hidden on mobile */}
      <div className="hidden lg:flex">
        <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--bg-border)', background: 'var(--bg-surface)' }}>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center animate-pulse-glow"
              style={{ background: 'var(--accent-primary)' }}>
              <span className="font-bebas text-xs font-bold" style={{ color: 'var(--text-inverse)' }}>C</span>
            </div>
            <span className="font-syne font-bold tracking-widest text-sm" style={{ color: 'var(--accent-primary)' }}>CALIBR</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveTab('settings')}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
              style={{
                background: activeTab === 'settings' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'settings' ? 'var(--text-inverse)' : 'var(--text-muted)',
              }}
            >
              ⚙
            </button>
            <button
              onClick={() => setAgentOpen(o => !o)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-mono transition-all duration-200"
              style={{ background: 'var(--bg-elevated)', color: 'var(--accent-primary)', border: '1px solid var(--bg-border)' }}
            >
              AI
            </button>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {children}
        </main>

        {/* Mobile bottom nav */}
        <div className="lg:hidden">
          <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
        </div>
      </div>

      {/* AI Copilot Panel - Desktop */}
      {agentOpen && (
        <div className="hidden lg:flex w-72 xl:w-80 shrink-0 flex-col border-l transition-all duration-300" style={{ borderColor: 'var(--bg-border)' }}>
          <CalibrAgentPanel
            isOpen={agentOpen}
            onClose={() => setAgentOpen(false)}
            currentTab={activeTab}
          />
        </div>
      )}

      {/* AI Copilot Panel - Mobile Slide-over */}
      {agentOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-50 flex justify-end transition-opacity duration-300" 
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={() => setAgentOpen(false)}
        >
          <div 
            className="w-[85vw] max-w-sm h-full flex flex-col shadow-2xl transition-transform duration-300 transform translate-x-0" 
            style={{ background: 'var(--bg-base)', borderLeft: '1px solid var(--bg-border)' }} 
            onClick={e => e.stopPropagation()}
          >
            <CalibrAgentPanel
              isOpen={agentOpen}
              onClose={() => setAgentOpen(false)}
              currentTab={activeTab}
            />
          </div>
        </div>
      )}
      {/* Collapsed FAB */}
      {!agentOpen && (
        <button
          onClick={() => setAgentOpen(true)}
          className="hidden lg:flex fixed bottom-6 right-6 w-12 h-12 rounded-full items-center justify-center shadow-lg transition-all duration-200 z-40"
          style={{ background: 'var(--accent-mint)', boxShadow: '0 0 24px rgba(0,229,160,0.4)' }}
          title="Open CALIBR Agent"
        >
          <span className="text-xs font-bold font-syne" style={{ color: 'var(--text-inverse)' }}>AI</span>
        </button>
      )}
    </div>
  )
}
