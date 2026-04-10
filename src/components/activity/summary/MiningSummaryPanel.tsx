'use client'

import { useMemo } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Package, Gem, MoveRight } from 'lucide-react'

interface MiningSummaryPanelProps {
  activity: any
  logs: any[]
  viewMode: 'detailed' | 'compact'
}

export function MiningSummaryPanel({ activity, logs, viewMode }: MiningSummaryPanelProps) {
  const groupedByCharacter = useMemo(() => {
    const groups: Record<string, {
      charId: number;
      charName: string;
      ores: Record<string, {
        oreName: string;
        typeId: number;
        quantity: number;
        m3: number;
        value: number;
      }>;
      totalValue: number;
      totalM3: number;
    }> = {}

    logs.forEach(log => {
      const charId = log.charId || 0
      const charName = log.charName || 'Unknown'
      
      if (!groups[charId]) {
        groups[charId] = {
          charId,
          charName,
          ores: {},
          totalValue: 0,
          totalM3: 0
        }
      }

      const oreKey = log.oreName || 'Unknown'
      if (!groups[charId].ores[oreKey]) {
        groups[charId].ores[oreKey] = {
          oreName: oreKey,
          typeId: log.typeId,
          quantity: 0,
          m3: 0,
          value: 0
        }
      }

      groups[charId].ores[oreKey].quantity += (log.quantity || 0)
      groups[charId].ores[oreKey].m3 += (log.volumeValue || 0)
      groups[charId].ores[oreKey].value += (log.value || 0)
      
      groups[charId].totalValue += (log.value || 0)
      groups[charId].totalM3 += (log.volumeValue || 0)
    })

    return Object.values(groups).sort((a, b) => b.totalValue - a.totalValue)
  }, [logs])

  const globalOreSummary = useMemo(() => {
    const globalOres: Record<string, { oreName: string, typeId: number, quantity: number, m3: number, value: number }> = {}
    logs.forEach(log => {
      const oreKey = log.oreName || 'Unknown'
      if (!globalOres[oreKey]) {
        globalOres[oreKey] = { oreName: oreKey, typeId: log.typeId, quantity: 0, m3: 0, value: 0 }
      }
      globalOres[oreKey].quantity += (log.quantity || 0)
      globalOres[oreKey].m3 += (log.volumeValue || 0)
      globalOres[oreKey].value += (log.value || 0)
    })
    return Object.values(globalOres).sort((a, b) => b.value - a.value)
  }, [logs])

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center border border-white/5 bg-zinc-950/20 rounded-2xl">
        <Package className="h-10 w-10 text-zinc-800 mx-auto mb-4" />
        <p className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">No mineral extraction recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* Global Inventory Summary */}
      <div className="bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-4 sm:mb-6">
           <Gem className="h-4 w-4 text-blue-400" />
           <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">Consolidated Fleet Cargo</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
           {globalOreSummary.slice(0, 8).map((ore, i) => (
             <div key={i} className="flex items-center gap-2 sm:gap-3 bg-white/[0.02] p-2 rounded-lg border border-white/5">
                <img src={`https://images.evetech.net/types/${ore.typeId}/icon?size=32`} className="h-5 w-5 sm:h-6 sm:w-6 opacity-60" alt="" />
                <div className="min-w-0">
                   <p className="text-[9px] sm:text-[10px] font-black text-zinc-300 uppercase truncate">{ore.oreName}</p>
                   <p className="text-[8px] sm:text-[9px] font-mono text-zinc-500">{formatNumber(ore.m3)} m³</p>
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* Character Breakdown */}
      <div className="space-y-4">
        {groupedByCharacter.map((group) => (
          <div key={group.charId} className="bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden shadow-xl shadow-black/20">
            <div className={cn(
              "px-4 sm:px-6 py-4 sm:py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors",
              viewMode === 'detailed' ? "bg-white/[0.03] border-b border-white/5" : "hover:bg-white/[0.02]"
            )}>
              <div className="flex items-center gap-3 sm:gap-4">
                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border border-zinc-900 shadow-inner">
                  <AvatarImage src={`https://images.evetech.net/characters/${group.charId}/portrait?size=64`} />
                  <AvatarFallback>{group.charName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-tight truncate">{group.charName}</h3>
                  <div className="flex items-center gap-3 mt-1 opacity-70">
                     <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">{formatNumber(group.totalM3)} m³ Extracted</span>
                  </div>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xl sm:text-2xl font-black text-green-400 font-mono tracking-tighter tabular-nums">{formatISK(group.totalValue)}</p>
                <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest">Post-Operational Value</p>
              </div>
            </div>
            
            {viewMode === 'detailed' && (
              <div className="p-3 sm:p-4 bg-black/20">
                <div className="grid grid-cols-1 divide-y divide-white/[0.03]">
                  {Object.values(group.ores).map((ore, i) => (
                    <div key={i} className="py-2.5 sm:py-3 px-1 sm:px-2 flex items-center justify-between group">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className="relative h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0 bg-white/[0.02] rounded-lg p-1 border border-white/5">
                          <img 
                            src={`https://images.evetech.net/types/${ore.typeId}/icon?size=64`} 
                            alt={ore.oreName}
                            className="object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] sm:text-xs font-black text-zinc-200 uppercase tracking-tight truncate">{ore.oreName}</p>
                          <div className="flex items-center gap-2 mt-0.5 opacity-50 whitespace-nowrap overflow-hidden">
                             <span className="text-[8px] sm:text-[9px] font-bold">{formatNumber(ore.quantity)} Units</span>
                             <span className="text-zinc-700">//</span>
                             <span className="text-[8px] sm:text-[9px] font-bold">{formatNumber(ore.m3)} m³</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2 sm:gap-4">
                         <div className="scale-x-[-1] opacity-10 hidden sm:block">
                            <MoveRight className="h-4 w-4" />
                         </div>
                         <span className="text-xs sm:text-sm font-black text-blue-400 font-mono tabular-nums">{formatISK(ore.value)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
