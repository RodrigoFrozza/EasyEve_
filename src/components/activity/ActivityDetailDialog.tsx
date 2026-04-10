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
  ArrowRight,
  RefreshCw
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
    ;(data.logs || []).forEach((l: any) => {
      if (l.charName) chars.add(l.charName)
    })
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
      <DialogContent className="bg-[#050507] border-white/[0.05] sm:max-w-[750px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 shadow-2xl glass-effect">
        {/* Animated Background Orbs */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-eve-accent/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="bg-zinc-950/40 backdrop-blur-3xl border-b border-white/[0.05] p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8">
             <div className="flex flex-col items-end">
                <p className="text-[10px] text-zinc-500 font-black tracking-[0.3em] uppercase opacity-50 mb-1.5">MISSION CLOCK</p>
                <div className="bg-black/60 border border-white/[0.05] px-4 py-2 rounded-xl shadow-inner">
                   <p className="text-xl font-black font-mono text-eve-accent tracking-tighter leading-none">{elapsed}</p>
                </div>
             </div>
          </div>

          <DialogHeader className="p-0 text-left relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-3 w-3 rounded-full bg-eve-accent shadow-[0_0_15px_rgba(0,255,255,0.8)] animate-pulse" />
              <Badge variant="outline" className="px-3 py-1 text-[10px] uppercase font-black tracking-[0.2em] border-eve-accent/30 text-eve-accent bg-eve-accent/5 rounded-full">
                {activity.type} DEPLOYMENT
              </Badge>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <div className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-widest">
                REF_ID: {activity.id.slice(0, 12)}
              </div>
            </div>
            
            <DialogTitle className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
              {data.siteName || (activity.type || 'Activity').toUpperCase()}
              {activity.status === 'completed' && (
                <div className="flex items-center gap-2 bg-zinc-900 border border-white/[0.05] px-3 py-1 rounded-lg">
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-500" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">ARCHIVED</span>
                </div>
              )}
            </DialogTitle>
            
            <DialogDescription className="text-xs text-zinc-500 font-bold uppercase tracking-[0.1em] mt-3 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              SESSION START: {new Date(activity.startTime).toLocaleString()}
              {activity.endTime && (
                <>
                   <ArrowRight className="h-3 w-3 mx-1 text-zinc-700" />
                   TERMINATED: {new Date(activity.endTime).toLocaleString()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 relative z-10">
          {/* Main Stats Grid - Cockpit Instruments */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-5 flex flex-col justify-between group transition-all hover:bg-zinc-900/60 hover:border-green-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 bg-green-500/5 blur-2xl rounded-full" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-green-500/10 rounded-lg">
                   <Wallet className="h-4 w-4 text-green-400" />
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] font-mono">GROSS REVENUE</span>
              </div>
              <div className="text-2xl font-black text-white font-mono tracking-tighter leading-none">
                {formatISK(grossBounty)}
              </div>
              <div className="h-1 w-full bg-zinc-900 mt-4 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500/40 w-[85%]" />
              </div>
            </div>
            
            <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-5 flex flex-col justify-between group transition-all hover:bg-zinc-900/60 hover:border-blue-500/30 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 bg-blue-500/5 blur-2xl rounded-full" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                   <Package className="h-4 w-4 text-blue-400" />
                </div>
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.2em] font-mono">ASSET LOGISTICS</span>
              </div>
              <div className="text-2xl font-black text-white font-mono tracking-tighter leading-none">
                {formatISK(estimatedLootValue + estimatedSalvageValue)}
              </div>
              <div className="h-1 w-full bg-zinc-900 mt-4 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-500/40 w-[40%]" />
              </div>
            </div>

            <div className="bg-eve-accent/5 border border-eve-accent/20 rounded-2xl p-5 flex flex-col justify-between group transition-all hover:bg-eve-accent/10 hover:border-eve-accent/40 shadow-xl relative overflow-hidden">
              <div className="absolute -top-4 -right-4 h-24 w-24 bg-eve-accent/10 blur-[40px] rounded-full" />
              <div className="flex items-center gap-2.5 mb-3">
                <div className="p-2 bg-eve-accent/20 rounded-lg">
                   <TrendingUp className="h-4 w-4 text-eve-accent" />
                </div>
                <span className="text-[10px] text-eve-accent font-black tracking-[0.2em] font-mono uppercase">EFFICIENCY RATING</span>
              </div>
              <div className="text-2xl font-black text-white font-mono tracking-tighter leading-none">
                {(() => {
                  const start = new Date(activity.startTime).getTime()
                  const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
                  const hours = (end - start) / 3600000
                  return hours > 0.01 ? formatISK(netProfit / hours) : formatISK(0)
                })()}
                <span className="text-[10px] text-zinc-600 font-black ml-1.5">/H</span>
              </div>
              <div className="flex items-center gap-1.5 mt-4">
                 <div className="h-1 flex-1 bg-eve-accent/20 rounded-full" />
                 <div className="h-1 flex-1 bg-eve-accent/20 rounded-full" />
                 <div className="h-1 flex-1 bg-eve-accent rounded-full" />
                 <div className="h-1 flex-1 bg-zinc-900 rounded-full" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
             <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
                <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-zinc-900 rounded-lg">
                      <List className="h-4 w-4 text-zinc-400" />
                   </div>
                   <h4 className="text-[11px] uppercase font-black tracking-[0.3em] text-zinc-400 font-mono">
                     {isMiningActivity ? 'CENTRAL MINING LEDGER' : 'SATCOM TRANSACTION LOG'}
                   </h4>
                </div>
                <div className="flex items-center gap-3">
                   <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 px-3 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 border border-zinc-800/50 rounded-lg"
                    onClick={handleExportCSV}
                   >
                     <Download className="h-3.5 w-3.5 mr-2" />
                     EXPORT.CSV
                   </Button>
                   <div className="flex bg-black/40 border border-white/[0.05] rounded-xl p-1 shadow-inner">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-7 w-7 rounded-lg transition-all", viewMode === 'list' ? 'bg-eve-accent text-black shadow-lg' : 'text-zinc-600 hover:text-zinc-400')}
                        onClick={() => setViewMode('list')}
                      >
                         <List className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn("h-7 w-7 rounded-lg transition-all", viewMode === 'table' ? 'bg-eve-accent text-black shadow-lg' : 'text-zinc-600 hover:text-zinc-400')}
                        onClick={() => setViewMode('table')}
                      >
                         <Table2 className="h-4 w-4" />
                      </Button>
                   </div>
                </div>
             </div>

             <div className="grid grid-cols-2 gap-3">
                {!isMiningActivity && (
                  <div className="relative group">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600 group-focus-within:text-eve-accent transition-colors" />
                    <select 
                      value={logFilterType} 
                      onChange={e => setLogFilterType(e.target.value)}
                      className="w-full bg-zinc-950/60 border border-white/[0.05] rounded-xl pl-9 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 outline-none focus:border-eve-accent/40 focus:bg-zinc-900 transition-all appearance-none cursor-pointer"
                    >
                      <option value="all">FILTER://ALL_TYPES</option>
                      <option value="bounty">QUERY://BOUNTY</option>
                      <option value="ess">QUERY://ESS_PAYOUT</option>
                      <option value="tax">QUERY://TAX_ADJUSTMENT</option>
                    </select>
                  </div>
                )}
                <div className="relative group col-span-1">
                   <Avatar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 border border-zinc-800 opacity-50">
                      <AvatarFallback className="text-[8px] bg-zinc-900">U</AvatarFallback>
                   </Avatar>
                  <select 
                    value={logFilterChar} 
                    onChange={e => setLogFilterChar(e.target.value)}
                    className="w-full bg-zinc-950/60 border border-white/[0.05] rounded-xl pl-10 pr-4 py-3 text-[10px] font-black uppercase tracking-[0.15em] text-zinc-400 outline-none focus:border-eve-accent/40 focus:bg-zinc-900 transition-all appearance-none cursor-pointer"
                  >
                    <option value="all">ENTITY://ALL_PARTICIPANTS</option>
                    {uniqueChars.map(char => (
                      <option key={char} value={char}>{(char || 'Unknown').toUpperCase()}</option>
                    ))}
                  </select>
                </div>
             </div>

             <div className="bg-zinc-950/40 border border-white/[0.05] rounded-2xl overflow-hidden shadow-2xl">
                {viewMode === 'list' ? (
                  <div className="divide-y divide-white/[0.03] max-h-[350px] overflow-y-auto custom-scrollbar">
                    {filteredLogs.length === 0 ? (
                      <div className="p-20 text-center flex flex-col items-center gap-4">
                        <div className="p-4 bg-zinc-900/50 rounded-full border border-zinc-800">
                           <History className="h-8 w-8 text-zinc-700 opacity-20" />
                        </div>
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-[0.2em] italic">
                          NO DATA RECORDED FOR CURRENT FILTER PARAMETERS
                        </p>
                      </div>
                    ) : (
                      filteredLogs.map((log: any, idx: number) => (
                        <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all group/log relative">
                           <div className="absolute inset-y-0 left-0 w-1 bg-eve-accent opacity-0 group-hover/log:opacity-100 transition-opacity" />
                           <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="h-11 w-11 border-2 border-zinc-900 shadow-xl group-hover/log:scale-105 transition-transform">
                                  <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
                                  <AvatarFallback className="text-[10px] bg-zinc-950 text-zinc-600 font-black">{log.charName?.slice(0, 2)}</AvatarFallback>
                                </Avatar>
                                <div className="absolute -bottom-1 -right-1 p-1 bg-zinc-950 border border-white/[0.05] rounded-md shadow-lg">
                                   {log.type === 'bounty' && <Wallet className="h-2.5 w-2.5 text-green-500" />}
                                   {log.type === 'ess' && <PiggyBank className="h-2.5 w-2.5 text-yellow-500" />}
                                   {log.type === 'tax' && <Receipt className="h-2.5 w-2.5 text-red-500" />}
                                </div>
                              </div>
                              <div className="space-y-0.5">
                                 <p className="text-sm font-black text-zinc-200 group-hover/log:text-white transition-colors">{log.charName}</p>
                                 <div className="flex items-center gap-2">
                                    <p className={cn(
                                      "text-[9px] font-black uppercase tracking-[0.2em]",
                                      log.type === 'bounty' ? 'text-green-500/70' :
                                      log.type === 'ess' ? 'text-yellow-500/70' :
                                      'text-red-500/70'
                                    )}>
                                       {log.type}
                                    </p>
                                    <span className="text-zinc-800 font-black">•</span>
                                    <p className="text-[9px] text-zinc-600 font-black font-mono">HASH_{Math.random().toString(36).substring(7).toUpperCase()}</p>
                                 </div>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={cn(
                                "text-lg font-black font-mono tracking-tighter transition-all group-hover/log:scale-110 origin-right",
                                log.type === 'tax' ? 'text-red-500' : 'text-green-400'
                              )}>
                                {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                              </p>
                              <div className="flex items-center justify-end gap-1.5 text-zinc-600 mt-1">
                                 <Clock className="h-2.5 w-2.5" />
                                 <p className="text-[9px] font-black font-mono uppercase tracking-widest">
                                   {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                 </p>
                              </div>
                           </div>
                        </div>
                      ))
                    )}
                  </div>
                ) : (
                  <div className="max-h-[350px] overflow-y-auto custom-scrollbar overflow-x-hidden">
                    <table className="w-full text-[10px] font-mono border-collapse">
                      <thead className="bg-zinc-950 sticky top-0 z-20">
                        <tr className="text-zinc-600 uppercase tracking-widest border-b border-white/[0.05]">
                           <th className="p-4 text-left font-black tracking-[0.2em]">TIMESTAMP</th>
                           <th className="p-4 text-left font-black tracking-[0.2em]">DECRYPT_IDENTITY</th>
                           <th className="p-4 text-left font-black tracking-[0.2em]">TRANS_TYPE</th>
                           <th className="p-4 text-right font-black tracking-[0.2em]">AMOUNT_CREDITED</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03]">
                        {filteredLogs.map((log: any, idx: number) => (
                          <tr key={idx} className="hover:bg-white/[0.02] transition-colors group/row">
                            <td className="p-4 text-zinc-600 group-hover:text-zinc-400 font-black">{new Date(log.date).toLocaleTimeString()}</td>
                            <td className="p-4">
                               <div className="flex items-center gap-2">
                                  <Avatar className="h-6 w-6 border border-zinc-800">
                                    <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
                                  </Avatar>
                                  <span className="font-black text-zinc-300 group-hover:text-white">{log.charName}</span>
                               </div>
                            </td>
                            <td className="p-4">
                                <Badge variant="outline" className={cn(
                                  "text-[8px] border-none px-2 py-0.5 h-5 font-black uppercase tracking-widest rounded-md",
                                  log.type === 'bounty' ? 'bg-green-500/10 text-green-500 shadow-[0_0_10px_rgba(34,197,94,0.1)]' :
                                  log.type === 'ess' ? 'bg-yellow-500/10 text-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.1)]' :
                                  'bg-red-500/10 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.1)]'
                                )}>
                                  {log.type}
                                </Badge>
                            </td>
                            <td className={cn(
                              "p-4 text-right font-black text-[11px]",
                              log.type === 'tax' ? 'text-red-500' : 'text-green-400 font-bold'
                            )}>
                              <div className="flex items-center justify-end gap-1.5">
                                 {log.type === 'tax' ? '-' : '+'}
                                 {formatISK(log.amount)}
                                 <span className="text-[8px] text-zinc-700 opacity-50">ISK</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
             </div>
          </div>
          
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

        <div className="bg-zinc-950/80 backdrop-blur-3xl p-8 border-t border-white/[0.05] relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-eve-accent/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between mb-8 relative z-10">
             <div className="space-y-2">
                <span className="text-[10px] text-zinc-500 uppercase font-black tracking-[0.3em] font-mono opacity-50">OPERATIONAL OVERHEAD</span>
                <div className="flex items-center gap-3">
                   <div className="p-1.5 bg-red-500/10 rounded-lg">
                      <Receipt className="h-4 w-4 text-red-400" />
                   </div>
                   <p className="text-xl font-black text-red-500 font-mono tracking-tighter leading-none">-{formatISK(automatedTaxes)}</p>
                </div>
             </div>
             <div className="text-right space-y-2">
                <span className="text-[10px] text-eve-accent font-black tracking-[0.3em] font-mono uppercase">FINAL SETTLEMENT PROFIT</span>
                <div className="flex items-center justify-end gap-4">
                   <p className="text-4xl font-black text-white font-mono tracking-tighter shadow-glow-accent leading-none">
                     {formatISK(netProfit)}
                   </p>
                   <div className="bg-white/10 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-sm font-black text-zinc-400">ISK</span>
                   </div>
                </div>
             </div>
          </div>
          <Button 
            className="w-full bg-eve-accent hover:bg-eve-accent/80 text-black font-black uppercase text-sm tracking-[0.4em] h-[60px] rounded-2xl shadow-[0_0_40px_rgba(0,255,255,0.2)] transition-all duration-500 hover:scale-[1.01] active:scale-[0.99] relative overflow-hidden group/btn"
            onClick={() => onOpenChange?.(false)}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover/btn:animate-shimmer" />
            DISMISS REPORT // CLOSE VIEW
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
