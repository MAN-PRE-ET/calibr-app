import {
  LayoutDashboard,
  Crosshair,
  KanbanSquare,
  Zap,
  BarChart3,
  MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"

const mobileNavItems = [
  { name: "Hub",        id: "intelligence", icon: LayoutDashboard },
  { name: "Analyze",   id: "apply",        icon: Crosshair },
  { name: "Pipeline",  id: "tracking",     icon: KanbanSquare },
  { name: "Rejection", id: "rejected",     icon: Zap },
  { name: "Intel",     id: "analysis",     icon: BarChart3 },
  { name: "Interview", id: "interview",    icon: MessageSquare },
]

export function MobileNav({
  activeTab,
  setActiveTab
}: {
  activeTab: string
  setActiveTab: (id: string) => void
}) {
  return (
    <div
      className="flex items-center justify-around px-2 pt-2 border-t"
      style={{
        background: 'var(--bg-surface)',
        borderColor: 'var(--bg-border)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
      }}
    >
      {mobileNavItems.map(item => {
        const Icon = item.icon
        const isActive = activeTab === item.id
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all duration-200 relative"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Icon
              className="w-5 h-5 transition-colors"
              style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}
            />
            {isActive && (
              <span
                className="text-[9px] font-medium"
                style={{ color: 'var(--accent-primary)', letterSpacing: '0.05em' }}
              >
                {item.name}
              </span>
            )}
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full"
                style={{ background: 'var(--accent-primary)' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
