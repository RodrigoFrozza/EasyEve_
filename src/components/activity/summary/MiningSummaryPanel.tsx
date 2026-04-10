'use client'

import { useMemo } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface MiningSummaryPanelProps {
  activity: any
  logs: any[]
}

export function MiningSummaryPanel({ activity, logs }: MiningSummaryPanelProps) {
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

  if (logs.length === 0) {
    return (
      <div className="p-12 text-center border-2 border-dashed border-white/5 rounded-2xl">
        <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">No mining data recorded</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {groupedByCharacter.map((group) => (
        <div key={group.charId} className="bg-zinc-950/40 border border-white/5 rounded-2xl overflow-hidden">
          <div className="bg-white/5 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-10 w-10 border border-zinc-800">
                <AvatarImage src={`https://images.evetech.net/characters/${group.charId}/portrait?size=64`} />
                <AvatarFallback>{group.charName[0]}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-tight">{group.charName}</h3>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Pilot Haul</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-black text-green-400 font-mono tracking-tighter">{formatISK(group.totalValue)}</p>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{formatNumber(group.totalM3)} m³ total</p>
            </div>
          </div>
          
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.values(group.ores).map((ore, i) => (
              <div key={i} className="bg-black/20 border border-white/[0.03] rounded-xl p-3 flex items-center gap-3">
                <div className="relative h-10 w-10 flex-shrink-0">
                  <img 
                    src={`https://images.evetech.net/types/${ore.typeId}/icon?size=64`} 
                    alt={ore.oreName}
                    className="object-contain"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black text-zinc-200 truncate uppercase tracking-tight">{ore.oreName}</p>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="text-[9px] text-zinc-500 font-bold">{formatNumber(ore.m3)} m³</span>
                    <span className="text-[10px] font-black text-blue-400 font-mono">{formatISK(ore.value)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
