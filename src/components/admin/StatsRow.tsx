import { Card, CardContent } from "@/components/ui/card"
import { Users, Zap, Wallet, Fingerprint } from "lucide-react"
import { formatISK, cn } from "@/lib/utils"

interface StatsRowProps {
  totalAccounts: number
  activeSubscriptions: number
  pendingIsk: number
  totalCharacters: number
}

export function StatsRow({ totalAccounts, activeSubscriptions, pendingIsk, totalCharacters }: StatsRowProps) {
  const stats = [
    {
      label: "Total de Contas",
      value: totalAccounts,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
      description: "Total de usuários registrados na plataforma"
    },
    {
      label: "Assinaturas Ativas",
      value: activeSubscriptions,
      icon: Zap,
      color: "text-green-400",
      bg: "bg-green-500/10",
      description: "Contas com tempo de assinatura válido"
    },
    {
      label: "ISK Pendente",
      value: formatISK(pendingIsk),
      icon: Wallet,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10",
      description: "Total de ISK em doações aguardando aprovação"
    },
    {
      label: "Personagens",
      value: totalCharacters,
      icon: Fingerprint,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
      description: "Total de personagens vinculados via EVE ESI"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card 
          key={i} 
          className="bg-eve-panel/60 backdrop-blur-md border-eve-border overflow-hidden relative group hover:border-eve-accent/30 transition-all duration-500 shadow-xl"
          title={stat.description}
        >
          <div className={`absolute top-0 right-0 w-32 h-32 ${stat.bg} rounded-full -mr-16 -mt-16 transition-all group-hover:scale-125 opacity-20 blur-2xl`} />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2.5 rounded-lg ${stat.bg} border border-white/5`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className="flex flex-col items-end">
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-[0.2em]">{stat.label}</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-2xl font-bold text-white tracking-tight">{stat.value}</p>
                   <span className={cn("text-[10px] font-bold", i % 2 === 0 ? "text-green-500" : "text-blue-500")}>
                      {i % 2 === 0 ? "+12%" : "+5%"}
                   </span>
                </div>
              </div>
            </div>

            {/* Premium Sparkline SVG */}
            <div className="h-10 w-full mt-2 opacity-40 group-hover:opacity-100 transition-opacity duration-700">
              <svg viewBox="0 0 100 40" className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="currentColor" className={stat.color} stopOpacity="0.3" />
                    <stop offset="100%" stopColor="currentColor" className={stat.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d={`M 0 ${20 + Math.random() * 10} Q 25 ${10 + Math.random() * 20}, 50 ${20 + Math.random() * 10} T 100 ${15 + Math.random() * 15}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={cn(stat.color, "animate-in fade-in duration-1000")}
                  strokeLinecap="round"
                />
                <path
                  d={`M 0 ${20 + Math.random() * 10} Q 25 ${10 + Math.random() * 20}, 50 ${20 + Math.random() * 10} T 100 ${15 + Math.random() * 15} L 100 40 L 0 40 Z`}
                  fill={`url(#grad-${i})`}
                  className={stat.color}
                />
              </svg>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
