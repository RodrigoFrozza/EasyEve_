import { useState } from 'react'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Users, Search, Shield, Ban, Zap, Clock, ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface Character {
  id: number
  name: string
  isMain: boolean
  location: string | null
  ship: string | null
  walletBalance: number
}

interface AccountData {
  id: string
  accountCode: string | null
  name: string | null
  role: string
  isBlocked: boolean
  subscriptionEnd: string | null
  allowedActivities: string[]
  characters: Character[]
  _count: {
    characters: number
    activities: number
  }
}

interface AccountListProps {
  accounts: AccountData[]
  onSelectAccount: (account: AccountData) => void
}

export function AccountList({ accounts, onSelectAccount }: AccountListProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'blocked' | 'expired'>('all')

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = 
      acc.name?.toLowerCase().includes(search.toLowerCase()) || 
      acc.accountCode?.toLowerCase().includes(search.toLowerCase()) ||
      acc.id.toLowerCase().includes(search.toLowerCase())
    
    const isExpired = acc.subscriptionEnd && new Date(acc.subscriptionEnd) < new Date()
    
    if (filter === 'active') return matchesSearch && !acc.isBlocked && !isExpired
    if (filter === 'blocked') return matchesSearch && acc.isBlocked
    if (filter === 'expired') return matchesSearch && isExpired
    return matchesSearch
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input 
            placeholder="Buscar por nome, ID ou código..." 
            className="pl-10 bg-eve-panel border-eve-border text-white placeholder:text-gray-500"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex gap-2">
           {(['all', 'active', 'blocked', 'expired'] as const).map((f) => (
             <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                    "px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all",
                    filter === f 
                        ? "bg-eve-accent text-black shadow-lg shadow-eve-accent/20" 
                        : "bg-eve-panel text-gray-400 hover:text-white border border-eve-border"
                )}
             >
                {f === 'all' ? 'Todos' : f === 'active' ? 'Ativos' : f === 'blocked' ? 'Bloqueados' : 'Expirados'}
             </button>
           ))}
        </div>
      </div>

      <div className="rounded-xl border border-eve-border/50 bg-eve-panel overflow-hidden shadow-2xl">
        <Table>
          <TableHeader className="bg-eve-dark/50">
            <TableRow className="border-eve-border/50 hover:bg-transparent">
              <TableHead className="text-gray-400 font-bold text-[10px] uppercase tracking-widest pl-6">Conta</TableHead>
              <TableHead className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Status/Role</TableHead>
              <TableHead className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Assinatura</TableHead>
              <TableHead className="text-gray-400 font-bold text-[10px] uppercase tracking-widest">Módulos</TableHead>
              <TableHead className="text-gray-400 font-bold text-[10px] uppercase tracking-widest text-right pr-6"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAccounts.length === 0 ? (
               <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                     Nenhuma conta encontrada com os filtros selecionados.
                  </TableCell>
               </TableRow>
            ) : (
                filteredAccounts.map((acc) => {
                    const isExpired = acc.subscriptionEnd && new Date(acc.subscriptionEnd) < new Date()
                    const mainChar = acc.characters.find(c => c.isMain) || acc.characters[0]

                    return (
                        <TableRow 
                            key={acc.id} 
                            className="border-eve-border/30 hover:bg-eve-dark/20 cursor-pointer group transition-colors"
                            onClick={() => onSelectAccount(acc)}
                        >
                            <TableCell className="pl-6 py-4">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10 border border-eve-border/50 transition-transform group-hover:scale-105">
                                        <AvatarImage src={mainChar ? `https://images.evetech.net/characters/${mainChar.id}/portrait?size=64` : ''} />
                                        <AvatarFallback className="bg-eve-dark text-eve-accent font-bold">
                                            {acc.name?.[0] || '?'}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="text-sm font-bold text-white group-hover:text-eve-accent transition-colors">
                                            {acc.name || acc.accountCode || 'S/N'}
                                        </p>
                                        <p className="text-[10px] text-gray-500 font-mono opacity-60">ID: {acc.accountCode || acc.id.slice(0, 8)}</p>
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex gap-1.5">
                                        <Badge variant="outline" className={cn(
                                            "text-[9px] px-1.5 py-0 border-none",
                                            acc.isBlocked ? "bg-red-500/20 text-red-500" : "bg-green-500/20 text-green-500"
                                        )}>
                                            {acc.isBlocked ? 'BLOQUEADO' : 'ATIVO'}
                                        </Badge>
                                        {acc.role === 'master' && (
                                            <Badge className="bg-orange-500/20 text-orange-500 border-none text-[9px] px-1.5 py-0">ADMIN</Badge>
                                        )}
                                    </div>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-2">
                                    <Clock className={cn("h-3 w-3", isExpired ? "text-red-500" : "text-gray-500")} />
                                    <span className={cn("text-xs font-medium", isExpired ? "text-red-400" : "text-gray-300")}>
                                        {acc.subscriptionEnd ? new Date(acc.subscriptionEnd).toLocaleDateString() : 'VITALÍCIO'}
                                    </span>
                                </div>
                            </TableCell>
                            <TableCell>
                                <div className="flex items-center gap-1">
                                    <span className="text-xs font-bold text-white">{acc.allowedActivities.length}</span>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold px-1">Ativos</span>
                                </div>
                            </TableCell>
                            <TableCell className="text-right pr-6">
                                <ChevronRight className="h-5 w-5 text-gray-600 group-hover:text-eve-accent group-hover:translate-x-1 transition-all inline-block" />
                            </TableCell>
                        </TableRow>
                    )
                })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
