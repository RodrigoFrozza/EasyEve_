import { Card, CardContent } from "@/components/ui/card"
import { Users, Zap, Wallet, Fingerprint } from "lucide-react"
import { formatISK } from "@/lib/utils"

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
      bg: "bg-blue-500/10"
    },
    {
      label: "Assinaturas Ativas",
      value: activeSubscriptions,
      icon: Zap,
      color: "text-green-400",
      bg: "bg-green-500/10"
    },
    {
      label: "ISK Pendente",
      value: formatISK(pendingIsk),
      icon: Wallet,
      color: "text-yellow-400",
      bg: "bg-yellow-500/10"
    },
    {
      label: "Personagens",
      value: totalCharacters,
      icon: Fingerprint,
      color: "text-purple-400",
      bg: "bg-purple-500/10"
    }
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <Card key={i} className="bg-eve-panel border-eve-border overflow-hidden relative group hover:border-eve-accent/30 transition-all duration-300">
          <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-bl-full -mr-12 -mt-12 transition-all group-hover:scale-110 opacity-50`} />
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">{stat.label}</p>
                <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
