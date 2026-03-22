import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Trash2, Bell, Zap } from "lucide-react"

export function Header({ activeTabName }: { activeTabName: string }) {
  return (
    <header className="h-16 border-b border-white/5 bg-[#0a0f1c]/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-20 w-full shrink-0">
      <div className="flex items-center gap-3 relative group">
        <h1 className="text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
          {activeTabName}
        </h1>
      </div>
      
      <div className="flex items-center space-x-4">
        <Button variant="outline" size="sm" className="bg-transparent border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all rounded-lg">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear Data
        </Button>
        
        <button className="relative p-2 text-slate-400 hover:text-cyan-400 transition-colors group">
          <Bell className="w-5 h-5 group-hover:drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
        </button>
        
        <div className="h-8 w-px bg-white/10 mx-2" />
        
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-white/90 leading-none">Manpreet Singh</p>
            <p className="text-xs text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 font-medium mt-1 flex items-center justify-end gap-1">
              <Zap className="w-3 h-3 text-cyan-400" /> CALIBR Pro
            </p>
          </div>
          <Avatar className="w-9 h-9 ring-2 ring-purple-500/30 cursor-pointer transition-all hover:ring-cyan-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <AvatarImage src="https://github.com/shadcn.png" />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">MS</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  )
}

