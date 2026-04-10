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
  ChevronRight
} from 'lucide-react'
import { Input } from '@/components/ui/input'

interface RattingSummaryPanelProps {
  activity: any
  logs: any[]
  onOpenMTU: () => void
}

export function RattingSummaryPanel({ activity, logs, onOpenMTU }: RattingSummaryPanelProps) {
  const [viewMode, setViewMode] = useState<'detailed' | 'compact'>('detailed')
  const [searchTerm, setSearchTerm] = useState('')

  const data = (activity.data as any) || {}
  
  const filteredLogs = useMemo(() => {
    if (!searchTerm) return logs
    const s = searchTerm.toLowerCase()
    return logs.filter(l => 
      l.charName?.toLowerCase().includes(s) || 
      l.type?.toLowerCase().includes(s)
    )
  }, [logs, searchTerm])

  const characterSummaries = useMemo(() => {
    const summaries: Record<string, {
      charId: number;
      charName: string;
      bounty: number;
      ess: number;
      tax: number;
      total: number;
    }> = {}

    logs.forEach(log => {
      const charId = log.charId || 0
      const charName = log.charName || 'Unknown'
      
      if (!summaries[charId]) {
        summaries[charId] = {
          charId,
          charName,
          bounty: 0,
          ess: 0,
          tax: 0,
          total: 0
        }
      }

      const amount = log.amount || 0
      if (log.type === 'bounty') summaries[charId].bounty += amount
      else if (log.type === 'ess') summaries[charId].ess += amount
      else if (log.type === 'tax') summaries[charId].tax += amount

      summaries[charId].total = (summaries[charId].bounty + summaries[charId].ess) - summaries[charId].tax
    })

    let result = Object.values(summaries)
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      result = result.filter(r => r.charName.toLowerCase().includes(s))
    }
    return result.sort((a, b) => b.total - a.total)
  }, [logs, searchTerm])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-950/40 p-4 rounded-2xl border border-white/5">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input 
            placeholder="Search pilot or type..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-10 bg-black/40 border-white/5 text-[11px] font-bold uppercase tracking-wider focus:ring-eve-accent/20"
          />
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenMTU}
            className="h-10 px-4 bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 text-[10px] font-black uppercase tracking-widest gap-2 flex-1 sm:flex-none"
          >
            <Box className="h-4 w-4" />
            Manage MTUs
          </Button>

          <div className="flex bg-black/60 p-1 rounded-xl border border-white/5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('detailed')}
              className={cn(
                "h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 rounded-lg transition-all",
                viewMode === 'detailed' ? "bg-eve-accent text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Detailed
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('compact')}
              className={cn(
                "h-8 px-3 text-[10px] font-black uppercase tracking-widest gap-2 rounded-lg transition-all",
                viewMode === 'compact' ? "bg-eve-accent text-black shadow-lg" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Users className="h-3.5 w-3.5" />
              Compact
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden min-h-[300px]">
        {viewMode === 'detailed' ? (
          <div className="divide-y divide-white/[0.03] max-h-[500px] overflow-y-auto custom-scrollbar">
            {filteredLogs.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4 opacity-50">
                <History className="h-12 w-12 text-zinc-700" />
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">No transactions matched</p>
              </div>
            ) : (
              filteredLogs.map((log, idx) => (
                <div key={idx} className="p-4 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10 border border-zinc-900 group-hover:scale-105 transition-transform">
                      <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
                      <AvatarFallback>{log.charName?.[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-black text-zinc-200">{log.charName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          log.type === 'bounty' ? "text-green-500/70" : log.type === 'ess' ? "text-yellow-500/70" : "text-red-500/70"
                        )}>
                          {log.type} // {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-lg font-black font-mono tracking-tighter",
                      log.type === 'tax' ? "text-red-500" : "text-green-400"
                    )}>
                      {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="divide-y divide-white/[0.03]">
            {characterSummaries.length === 0 ? (
              <div className="p-20 text-center flex flex-col items-center gap-4 opacity-50">
                <Users className="h-12 w-12 text-zinc-700" />
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em]">No characters active</p>
              </div>
            ) : (
              characterSummaries.map((summary) => (
                <div key={summary.charId} className="p-5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border border-zinc-800">
                      <AvatarImage src={`https://images.evetech.net/characters/${summary.charId}/portrait?size=64`} />
                      <AvatarFallback>{summary.charName[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-tight">{summary.charName}</h3>
                      <div className="flex items-center gap-3 mt-1.5 opacity-60">
                         <div className="flex items-center gap-1">
                            <Wallet className="h-2.5 w-2.5 text-green-500" />
                            <span className="text-[9px] font-black font-mono">{formatISK(summary.bounty)}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <PiggyBank className="h-2.5 w-2.5 text-yellow-500" />
                            <span className="text-[9px] font-black font-mono">{formatISK(summary.ess)}</span>
                         </div>
                         <div className="flex items-center gap-1">
                            <Receipt className="h-2.5 w-2.5 text-red-500" />
                            <span className="text-[9px] font-black font-mono">{formatISK(summary.tax)}</span>
                         </div>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-white font-mono tracking-tighter shadow-sm">{formatISK(summary.total)}</p>
                    <p className="text-[9px] text-zinc-500 font-black uppercase tracking-widest">Pilot Net Settlement</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
