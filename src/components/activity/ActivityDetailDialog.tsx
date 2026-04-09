'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  History, 
  Download, 
  List, 
  Table2, 
  Wallet, 
  TrendingUp, 
  PiggyBank, 
  Package, 
  Wrench, 
  Receipt,
  Filter,
  Clock,
  ArrowRight
} from 'lucide-react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

interface ActivityDetailDialogProps {
  activity: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ActivityDetailDialog({ activity, trigger, open, onOpenChange }: ActivityDetailDialogProps) {
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [logFilterType, setLogFilterType] = useState<string>('all')
  const [logFilterChar, setLogFilterChar] = useState<string>('all')

  const isMiningActivity = activity.type === 'mining'
  const data = (activity.data as any) || {}
  
  const automatedBounties = data.automatedBounties || 0
  const automatedEss = data.automatedEss || 0
  const automatedTaxes = data.automatedTaxes || 0
  const additionalBounties = data.additionalBounties || 0
  const estimatedLootValue = data.estimatedLootValue || 0
  const estimatedSalvageValue = data.estimatedSalvageValue || 0
  
  const miningTotalQuantity = data.totalQuantity || 0
  const miningTotalValue = data.totalEstimatedValue || 0
  
  const grossBounty = data.grossBounties || (automatedBounties + automatedEss + additionalBounties)
  
  const totalRevenue = isMiningActivity 
    ? miningTotalValue 
    : grossBounty + estimatedLootValue + estimatedSalvageValue
    
  const netProfit = isMiningActivity
    ? miningTotalValue
    : totalRevenue - automatedTaxes

  // Calculate elapsed
  const [elapsed, setElapsed] = useState<string>('')
  
  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(activity.startTime).getTime()
      const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
      const diff = end - start
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setElapsed(`${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`)
    }
    
    updateElapsed()
    if (!activity.endTime) {
      const timer = setInterval(updateElapsed, 1000)
      return () => clearInterval(timer)
    }
  }, [activity.startTime, activity.endTime])

  const filteredLogs = useMemo(() => {
    let logs = data.logs || []
    if (logFilterType !== 'all') {
      logs = logs.filter((l: any) => l.type === logFilterType)
    }
    if (logFilterChar !== 'all') {
      logs = logs.filter((l: any) => l.charName === logFilterChar)
    }
    return logs
  }, [data.logs, logFilterType, logFilterChar])

  const uniqueChars = useMemo(() => {
    const chars = new Set<string>()
    ;(data.logs || []).forEach((l: any) => chars.add(l.charName))
    return Array.from(chars)
  }, [data.logs])

  const handleExportCSV = () => {
    const logs = data.logs || []
    if (logs.length === 0) return
    
    const headers = isMiningActivity 
      ? "Date,Character,Ore,Quantity,EstimatedValue\n"
      : "Date,Character,Type,Amount\n"
      
    const rows = logs.map((l: any) => {
      if (isMiningActivity) {
        return `${new Date(l.date).toISOString()},${l.charName},${l.oreName},${l.quantity},${l.value}`
      }
      return `${new Date(l.date).toISOString()},${l.charName},${l.type},${l.amount}`
    }).join("\n")
    
    const blob = new Blob([headers + rows], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `activity_log_${activity.id}.csv`
    a.click()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="bg-[#0a0a0f] border-zinc-800/50 sm:max-w-[700px] max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0 shadow-2xl">
        <div className="bg-zinc-950/80 backdrop-blur-md border-b border-zinc-900/50 p-6">
          <DialogHeader className="p-0">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.8)] animate-pulse" />
                <Badge variant="outline" className="text-[10px] uppercase font-black tracking-widest border-zinc-800 text-zinc-400">
                  {activity.type}
                </Badge>
                <div className="text-zinc-700 mx-1">/</div>
                <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-widest">
                  {activity.id.slice(0, 8)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Duração</span>
                  <span className="text-xs font-mono font-bold text-zinc-300">{elapsed}</span>
                </div>
              </div>
            </div>
            <DialogTitle className="text-xl font-bold text-white flex items-center gap-3">
              {data.siteName || activity.type.toUpperCase()}
              {activity.status === 'completed' && (
                <Badge className="bg-zinc-800 text-zinc-400 hover:bg-zinc-800 border-none px-2 py-0 h-5 text-[10px]">
                  Finalizado
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-zinc-500 font-medium">
              Sessão iniciada em {new Date(activity.startTime).toLocaleString()} - 
              {activity.endTime ? ` finalizada em ${new Date(activity.endTime).toLocaleString()}` : ' Em andamento'}
            </DialogDescription>
          </DialogHeader>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-zinc-950/40 border border-zinc-900/50 rounded-xl p-4 flex flex-col justify-between group transition-all hover:border-eve-accent/30">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3.5 w-3.5 text-green-400" />
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Receita Bruta</span>
              </div>
              <div className="text-lg font-bold text-white font-mono tracking-tighter">
                {formatISK(grossBounty)}
              </div>
            </div>
            
            <div className="bg-zinc-950/40 border border-zinc-900/50 rounded-xl p-4 flex flex-col justify-between group transition-all hover:border-blue-500/30">
              <div className="flex items-center gap-2 mb-1">
                <Package className="h-3.5 w-3.5 text-blue-400" />
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Loot & Salvage</span>
              </div>
              <div className="text-lg font-bold text-white font-mono tracking-tighter">
                {formatISK(estimatedLootValue + estimatedSalvageValue)}
              </div>
            </div>

            <div className="bg-eve-accent/5 border border-eve-accent/10 rounded-xl p-4 flex flex-col justify-between group transition-all hover:border-eve-accent/30">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="h-3.5 w-3.5 text-eve-accent" />
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">Eficiência (ISK/h)</span>
              </div>
              <div className="text-lg font-bold text-eve-accent font-mono tracking-tighter">
                {(() => {
                  const start = new Date(activity.startTime).getTime()
                  const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
                  const hours = (end - start) / 3600000
                  return hours > 0.01 ? formatISK(netProfit / hours) : formatISK(0)
                })()}
              </div>
            </div>
          </div>

          {/* Type Specific Content */}
          <div className="space-y-4">
             <div className="flex items-center justify-between border-b border-zinc-900/50 pb-2">
                <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500">
                  {isMiningActivity ? 'Mining Ledger' : 'Transaction History'}
                </h4>
                <div className="flex items-center gap-2">
                   <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 text-zinc-500 hover:text-white"
                    onClick={handleExportCSV}
                   >
                     <Download className="h-4 w-4" />
                   </Button>
                   <div className="flex bg-zinc-950 border border-zinc-900 rounded p-0.5">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-6 w-6 rounded-sm p-0", viewMode === 'list' ? 'bg-zinc-800 text-white' : 'text-zinc-600')}
                        onClick={() => setViewMode('list')}
                      >
                         <List className="h-3.5 w-3.5" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-6 w-6 rounded-sm p-0", viewMode === 'table' ? 'bg-zinc-800 text-white' : 'text-zinc-600')}
                        onClick={() => setViewMode('table')}
                      >
                         <Table2 className="h-3.5 w-3.5" />
                      </Button>
                   </div>
                </div>
             </div>

             {/* Filters */}
             <div className="flex gap-2">
                {!isMiningActivity && (
                  <select 
                    value={logFilterType} 
                    onChange={e => setLogFilterType(e.target.value)}
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 outline-none focus:border-eve-accent/50 appearance-none"
                  >
                    <option value="all">TODOS OS TIPOS</option>
                    <option value="bounty">BOUNTY</option>
                    <option value="ess">ESS</option>
                    <option value="tax">CORP TAX</option>
                  </select>
                )}
                <select 
                  value={logFilterChar} 
                  onChange={e => setLogFilterChar(e.target.value)}
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] text-zinc-400 outline-none focus:border-eve-accent/50 appearance-none"
                >
                  <option value="all">TODOS OS PERSONAGENS</option>
                  {uniqueChars.map(char => (
                    <option key={char} value={char}>{char}</option>
                  ))}
                </select>
             </div>

             {/* Logs */}
             <div className="bg-zinc-950/20 border border-zinc-900/50 rounded-xl overflow-hidden">
                {viewMode === 'list' ? (
                  <div className="divide-y divide-zinc-900/30 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {filteredLogs.length === 0 ? (
                      <div className="p-12 text-center text-zinc-600 italic text-xs">
                        Nenhum registro encontrado para os filtros selecionados.
                      </div>
                    ) : (
                      filteredLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-3 flex items-center justify-between hover:bg-zinc-900/20 transition-colors">
                           <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8 border border-zinc-800">
                                <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
                                <AvatarFallback className="text-[10px] bg-zinc-900 text-zinc-600">{log.charName?.slice(0, 2)}</AvatarFallback>
                              </Avatar>
                              <div>
                                 <p className="text-[11px] font-bold text-zinc-300">{log.charName}</p>
                                 <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest flex items-center gap-1.5">
                                    {log.type === 'bounty' && <Wallet className="h-2.5 w-2.5" />}
                                    {log.type === 'ess' && <PiggyBank className="h-2.5 w-2.5" />}
                                    {log.type === 'tax' && <Receipt className="h-2.5 w-2.5" />}
                                    {log.type}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={cn(
                                "text-xs font-mono font-bold",
                                log.type === 'tax' ? 'text-red-400' : 'text-green-400'
                              )}>
                                {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                              </p>
                              <p className="text-[8px] text-zinc-600 font-mono">
                                {new Date(log.date).toLocaleTimeString()}
                              </p>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <table className="w-full text-[10px] font-mono">
                      <thead className="bg-zinc-950 sticky top-0 z-10">
                        <tr className="text-zinc-600 uppercase tracking-tighter border-b border-zinc-900">
                           <th className="p-3 text-left font-black">Horário</th>
                           <th className="p-3 text-left font-black">Personagem</th>
                           <th className="p-3 text-left font-black">Tipo</th>
                           <th className="p-3 text-right font-black">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900/30">
                        {filteredLogs.map((log: any, idx: number) => (
                          <tr key={idx} className="hover:bg-zinc-900/20 transition-colors">
                            <td className="p-3 text-zinc-500">{new Date(log.date).toLocaleTimeString()}</td>
                            <td className="p-3 font-bold text-zinc-300">{log.charName}</td>
                            <td className="p-3">
                               <Badge variant="outline" className={cn(
                                 "text-[8px] border-none px-1.5 py-0 h-4 uppercase",
                                 log.type === 'bounty' ? 'bg-green-500/10 text-green-500' :
                                 log.type === 'ess' ? 'bg-zinc-800 text-zinc-400' :
                                 'bg-red-500/10 text-red-400'
                               )}>
                                 {log.type}
                               </Badge>
                            </td>
                            <td className={cn(
                              "p-3 text-right font-black",
                              log.type === 'tax' ? 'text-red-400' : 'text-green-400'
                            )}>
                              {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>

          {/* Participants */}
          <div className="space-y-3">
             <h4 className="text-[10px] uppercase font-black tracking-[0.2em] text-zinc-500">Participantes</h4>
             <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {activity.participants.map((p: any) => (
                  <div key={p.characterId} className="bg-zinc-950/40 border border-zinc-900/50 rounded-xl p-2.5 flex items-center gap-3">
                    <Avatar className="h-8 w-8 border border-zinc-900">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="text-[8px] bg-zinc-900 uppercase">{p.characterName?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-bold text-zinc-300 truncate">{p.characterName}</p>
                      <p className="text-[8px] text-zinc-500 truncate uppercase font-medium">{p.fit || 'Sem Ship'}</p>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Footer with Balance */}
        <div className="bg-zinc-950 p-6 border-t border-zinc-900/50">
          <div className="flex items-center justify-between mb-4">
             <div className="space-y-1">
                <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Total Gasto / Taxas</span>
                <p className="text-sm font-bold text-red-500 font-mono">-{formatISK(automatedTaxes)}</p>
             </div>
             <div className="text-right space-y-1">
                <span className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">Lucro Líquido Final</span>
                <p className="text-2xl font-black text-eve-accent font-mono tracking-tighter">
                  {formatISK(netProfit)}
                </p>
             </div>
          </div>
          <Button 
            className="w-full bg-eve-accent hover:bg-eve-accent/80 text-black font-black uppercase text-xs tracking-widest h-11 rounded-xl shadow-[0_0_20px_rgba(0,255,255,0.15)]"
            onClick={() => onOpenChange?.(false)}
          >
            Fechar Relatório
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
