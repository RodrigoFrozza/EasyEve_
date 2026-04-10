'use client'

import { useState, useMemo } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  List, 
  Users, 
  Wallet, 
  PiggyBank, 
  Receipt, 
  History,
  Box,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface RattingSummaryPanelProps {
  activity: any
  logs: any[]
  viewMode: 'detailed' | 'compact'
  onOpenMTU: () => void
}

export function RattingSummaryPanel({ activity, logs, viewMode, onOpenMTU }: RattingSummaryPanelProps) {
  const [searchTerm, setSearchTerm] = useState('')

  const data = (activity.data as any) || {}
  
  const characterData = useMemo(() => {
    const groups: Record<string, {
      charId: number;
      charName: string;
      bounty: number;
      ess: number;
      tax: number;
      total: number;
      logs: any[];
    }> = {}

    logs.forEach(log => {
      const charId = log.charId || 0
      const charName = log.charName || 'Unknown'
      
      if (!groups[charId]) {
        groups[charId] = {
          charId,
          charName,
          bounty: 0,
          ess: 0,
          tax: 0,
          total: 0,
          logs: []
        }
      }

      const amount = log.amount || 0
      if (log.type === 'bounty') groups[charId].bounty += amount
      else if (log.type === 'ess') groups[charId].ess += amount
      else if (log.type === 'tax') groups[charId].tax += amount

      groups[charId].logs.push(log)
      groups[charId].total = (groups[charId].bounty + groups[charId].ess) - groups[charId].tax
    })

    let result = Object.values(groups)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      result = result.filter(r => 
        r.charName.toLowerCase().includes(s) || 
        r.logs.some(l => l.type?.toLowerCase().includes(s))
      )
    }
    return result.sort((a, b) => b.total - a.total)
  }, [logs, searchTerm])

  return (
    <div className="space-y-6">
      {/* Search & Action Bar */}
      <div className="flex flex-col md:flex-row gap-3 sm:gap-4 items-center justify-between bg-zinc-950/40 p-3 sm:p-4 rounded-2xl border border-white/5 shadow-inner">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input 
            placeholder="Search pilot or transaction..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 sm:h-10 bg-black/40 border-white/5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider focus:ring-eve-accent/20 rounded-xl"
          />
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenMTU}
          className="h-9 sm:h-10 px-4 bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest gap-2 w-full md:w-auto rounded-xl shadow-lg shadow-blue-500/5"
        >
          <Box className="h-4 w-4" />
          MTU Registry
        </Button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {characterData.length === 0 ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 opacity-50 bg-zinc-950/20 border border-white/5 rounded-2xl">
            <History className="h-12 w-12 text-zinc-700" />
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">No operational data found</p>
          </div>
        ) : (
          characterData.map((group) => (
            <div key={group.charId} className="bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden transition-all">
              {/* Character Summary Row */}
              <div className={cn(
                "px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors",
                viewMode === 'detailed' && "bg-white/[0.03] border-b border-white/5"
              )}>
                <div className="flex items-center gap-3 sm:gap-4">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-zinc-800">
                    <AvatarImage src={`https://images.evetech.net/characters/${group.charId}/portrait?size=64`} />
                    <AvatarFallback>{group.charName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate">{group.charName}</h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 opacity-60">
                       <div className="flex items-center gap-1">
                          <Wallet className="h-2.5 w-2.5 text-green-500" />
                          <span className="text-[9px] font-black font-mono">{formatISK(group.bounty)}</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <PiggyBank className="h-2.5 w-2.5 text-yellow-500" />
                          <span className="text-[9px] font-black font-mono">{formatISK(group.ess)}</span>
                       </div>
                       <div className="flex items-center gap-1">
                          <Receipt className="h-2.5 w-2.5 text-red-500" />
                          <span className="text-[9px] font-black font-mono">{formatISK(group.tax)}</span>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl sm:text-2xl font-black text-white font-mono tracking-tighter tabular-nums truncate">{formatISK(group.total)}</p>
                  <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Pilot Total</p>
                </div>
              </div>

              {/* Detailed Transaction Logs */}
              {viewMode === 'detailed' && (
                <div className="bg-black/20 divide-y divide-white/[0.03] max-h-[300px] overflow-y-auto custom-scrollbar">
                  {group.logs.map((log, idx) => (
                    <div key={idx} className="px-4 sm:px-6 py-2 sm:py-3 flex items-center justify-between group/row">
                      <div className="flex items-center gap-3 min-w-0">
                         <div className={cn(
                            "w-1 h-3 rounded-full flex-shrink-0",
                            log.type === 'bounty' ? "bg-green-500/40" : log.type === 'ess' ? "bg-yellow-500/40" : "bg-red-500/40"
                         )} />
                         <div className="min-w-0">
                            <p className="text-[9px] sm:text-[10px] font-black uppercase text-zinc-400 tracking-wider truncate">
                              {log.type} <span className="text-zinc-600 mx-1 sm:mx-2">//</span> {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                         </div>
                      </div>
                      <p className={cn(
                        "text-[10px] sm:text-xs font-black font-mono tabular-nums whitespace-nowrap",
                        log.type === 'tax' ? "text-red-500/70" : "text-zinc-300"
                      )}>
                        {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
