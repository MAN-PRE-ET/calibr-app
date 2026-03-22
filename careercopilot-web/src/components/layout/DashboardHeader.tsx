import { motion } from "framer-motion"
import { ShieldCheck, Target, Zap } from "lucide-react"

export function DashboardHeader() {
  const metrics = [
    {
      title: "Career Readiness",
      value: "84%",
      trend: "+5%",
      icon: ShieldCheck,
      color: "from-blue-500 to-cyan-400",
      bgLight: "bg-blue-500/10",
      textClass: "text-blue-400"
    },
    {
      title: "Active Pipeline",
      value: "12",
      trend: "2 pending",
      icon: Target,
      color: "from-purple-500 to-indigo-500",
      bgLight: "bg-purple-500/10",
      textClass: "text-purple-400"
    },
    {
      title: "Top Priority Gap",
      value: "System Design",
      trend: "High Impact",
      icon: Zap,
      color: "from-amber-400 to-orange-500",
      bgLight: "bg-amber-500/10",
      textClass: "text-amber-400"
    }
  ]

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          CALIBR <span className="text-slate-500 font-light">|</span> Intelligence Center
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {metrics.map((m, i) => {
          const Icon = m.icon
          return (
            <motion.div
              key={m.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * i, duration: 0.4 }}
              className="relative overflow-hidden group rounded-2xl border border-white/5 bg-[#0a0f1c]/50 p-5 backdrop-blur-xl hover:bg-white/5 transition-all"
            >
              <div className={`absolute -right-10 -top-10 w-32 h-32 rounded-full blur-3xl opacity-20 bg-gradient-to-br ${m.color} group-hover:opacity-40 transition-opacity duration-500`}></div>
              
              <div className="flex items-start justify-between relative z-10">
                <div>
                  <p className="text-sm font-medium text-slate-400">{m.title}</p>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-white tracking-tight">{m.value}</span>
                  </div>
                  <span className={`text-xs font-semibold mt-1 inline-block ${m.textClass}`}>
                    {m.trend}
                  </span>
                </div>
                
                <div className={`p-3 rounded-xl ${m.bgLight} border border-white/5 shadow-inner`}>
                  <Icon className={`w-5 h-5 ${m.textClass}`} />
                </div>
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
