import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  Crosshair,
  KanbanSquare,
  Zap,
  BarChart3,
  MessageSquare,
  Settings,
  ChevronRight,
  X
} from "lucide-react"
import { calibrAPI, type ProfileState } from "@/lib/api"

const navItems = [
  { name: "Intelligence Hub",     id: "intelligence", icon: LayoutDashboard },
  { name: "Opportunity Analysis", id: "apply",        icon: Crosshair },
  { name: "Application Pipeline", id: "tracking",     icon: KanbanSquare },
  { name: "Rejection Intel",      id: "rejected",     icon: Zap },
  { name: "Career Intelligence",  id: "analysis",     icon: BarChart3 },
  { name: "Interview Simulator",  id: "interview",    icon: MessageSquare },
]

const bottomItems = [
  { name: "Settings", id: "settings", icon: Settings },
]

function ProfileSlideOver({ profile, onClose }: { profile: ProfileState; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="ml-auto h-full w-80 flex flex-col p-6 space-y-5 animate-slide-right overflow-y-auto"
        style={{ background: "var(--bg-surface)", borderLeft: "1px solid var(--bg-border)" }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-syne font-bold" style={{ fontSize: 18, color: "var(--text-primary)" }}>
            Your Profile
          </h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)", background: "none", border: "none", cursor: "pointer" }}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg font-syne"
            style={{ background: "rgba(0,229,160,0.15)", color: "var(--accent-mint)" }}
          >
            {profile.profile_name ? profile.profile_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : "?"}
          </div>
          <div>
            <p className="font-syne font-semibold" style={{ color: "var(--text-primary)", fontSize: 15 }}>
              {profile.profile_name || "Anonymous"}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>{profile.skills_count} skills detected</p>
          </div>
        </div>

        {Object.keys(profile.skill_confidence).length > 0 && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)", fontFamily: "DM Sans, sans-serif" }}>
              Skill Confidence
            </p>
            {Object.entries(profile.skill_confidence)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([skill, score]) => {
                const color = score >= 75 ? "var(--accent-mint)" : score >= 55 ? "var(--accent-amber)" : "var(--accent-rose)"
                return (
                  <div key={skill}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-secondary)" }}>{skill}</span>
                      <span className="font-mono font-bold" style={{ color }}>{score}</span>
                    </div>
                    <div className="h-1 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${score}%`, background: color, boxShadow: `0 0 6px ${color}50` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </div>
    </div>
  )
}

export function Sidebar({
  activeTab,
  setActiveTab
}: {
  activeTab: string
  setActiveTab: (id: string) => void
}) {
  const [profile, setProfile] = useState<ProfileState | null>(null)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    calibrAPI.getProfileState().then(setProfile).catch(() => {})
  }, [activeTab])

  const initials = profile?.profile_name
    ? profile.profile_name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()
    : "U"

  return (
    <>
      {showProfile && profile && (
        <ProfileSlideOver profile={profile} onClose={() => setShowProfile(false)} />
      )}
      <div
        className="flex h-full shrink-0"
        style={{ background: 'var(--bg-surface)', borderRight: '1px solid var(--bg-border)' }}
      >
        {/* Icon Rail */}
        <div className="w-[60px] flex flex-col items-center py-4 h-full"
          style={{ borderRight: '1px solid var(--bg-border)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-8 animate-pulse-glow cursor-pointer"
            style={{ background: 'var(--accent-primary)' }}>
            <span className="font-bebas text-lg font-bold" style={{ color: 'var(--text-inverse)' }}>C</span>
          </div>

          <div className="flex-1 flex flex-col gap-1 w-full px-2">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  title={item.name}
                  className={cn(
                    "w-full h-10 rounded-lg flex items-center justify-center transition-all duration-200 group relative",
                    isActive ? "border-l-2" : "hover:bg-[var(--bg-elevated)]"
                  )}
                  style={isActive ? { borderLeftColor: 'var(--accent-primary)', background: 'rgba(0,229,160,0.08)' } : {}}
                >
                  <Icon className="w-4 h-4 transition-colors duration-200"
                    style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>

          <div className="flex flex-col gap-1 w-full px-2 mb-2">
            {bottomItems.map(item => {
              const Icon = item.icon
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)} title={item.name}
                  className="w-full h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:bg-[var(--bg-elevated)]">
                  <Icon className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
              )
            })}
          </div>
        </div>

        {/* Nav Panel */}
        <div className="w-[220px] flex flex-col h-full py-4">
          <div className="px-5 mb-8">
            <p className="font-syne font-bold text-base tracking-widest" style={{ color: 'var(--accent-primary)' }}>CALIBR</p>
            <p className="text-label" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Agentic Career Intelligence</p>
          </div>

          <div className="px-4 mb-2">
            <span className="text-label" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>WORKSPACE</span>
          </div>

          <div className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {navItems.map(item => {
              const Icon = item.icon
              const isActive = activeTab === item.id
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative",
                    isActive ? "" : "hover:text-[var(--text-primary)]")}
                  style={isActive ? {
                    background: 'rgba(0,229,160,0.08)', color: 'var(--accent-primary)',
                    borderLeft: '2px solid var(--accent-primary)', paddingLeft: '10px', fontWeight: 600,
                  } : { color: 'var(--text-secondary)', fontFamily: 'DM Sans, sans-serif' }}>
                  <Icon className="w-4 h-4 shrink-0 transition-colors"
                    style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }} />
                  <span className="truncate font-dm-sans">{item.name}</span>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto opacity-60" style={{ color: 'var(--accent-primary)' }} />}
                </button>
              )
            })}
          </div>

          <div className="px-3 pt-3 space-y-0.5" style={{ borderTop: '1px solid var(--bg-border)' }}>
            {bottomItems.map(item => {
              const Icon = item.icon
              return (
                <button key={item.id} onClick={() => setActiveTab(item.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-primary)')}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-secondary)')}>
                  <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  <span>{item.name}</span>
                </button>
              )
            })}

            {/* Profile Card — clickable */}
            <button
              onClick={() => setShowProfile(true)}
              className="w-full flex items-center gap-3 px-3 py-3 mt-1 rounded-lg transition-all duration-150 text-left"
              style={{ background: 'var(--bg-elevated)' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-border)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-elevated)')}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold font-mono shrink-0"
                style={{ background: 'rgba(0,229,160,0.15)', color: 'var(--accent-primary)' }}>
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                  {profile?.profile_name || "Upload Resume"}
                </p>
                <p className="text-[10px] truncate" style={{ color: 'var(--text-muted)' }}>
                  {profile?.skills_count ? `${profile.skills_count} skills detected` : "No profile yet"}
                </p>
              </div>
              <div className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                style={{ background: 'rgba(0,229,160,0.1)', color: 'var(--accent-primary)', border: '1px solid rgba(0,229,160,0.2)' }}>
                PRO
              </div>
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
