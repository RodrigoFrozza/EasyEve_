'use client'

import { useState, useMemo } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription 
} from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { FleetSection } from '../shared/FleetSection'
import { Button } from '@/components/ui/button'
import { Loader2, Gem } from 'lucide-react'

interface MiningActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
}

export function MiningActivityContent({ activity, onSync, isSyncing, syncStatus }: MiningActivityContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleet: true,
    mining: false
  })
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const logs = (activity.data as any)?.logs || []
  const miningTotalQuantity = (activity.data?.totalQuantity || 0)
  const miningTotalValue = (activity.data?.totalEstimatedValue || 0)
  const oreBreakdown = (activity.data?.oreBreakdown || {})
  const participantEarnings = (activity.data?.participantEarnings || {})

  const uniqueChars = useMemo(() => {
    const chars = new Set<string>()
    logs.forEach((l: any) => { if(l.characterName) chars.add(l.characterName) })
    return Array.from(chars)
  }, [logs])

  const oreTypes = Object.keys(oreBreakdown)
  const iskPerHour = miningTotalValue / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    const headers = ['Date', 'Character', 'Type ID', 'Quantity (m3)']
    const csvContent = [
      headers.join(','),
      ...logs.map((log: any) => `${new Date(log.date).toISOString()},${log.characterName},${log.typeId},${log.quantity}`)
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mining_history_${activity.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-2.5 backdrop-blur-sm">
          <p className="text-[9px] text-blue-400/50 uppercase font-bold tracking-widest mb-1">Total Minerado</p>
          <p className="text-lg font-bold text-blue-400 font-mono tracking-tight">{formatNumber(miningTotalQuantity)} m³</p>
        </div>
        <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2.5 backdrop-blur-sm">
          <p className="text-[9px] text-green-400/50 uppercase font-bold tracking-widest mb-1">Valor Estimado</p>
          <p className="text-lg font-bold text-green-400 font-mono tracking-tight">{formatISK(miningTotalValue)}</p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mb-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 backdrop-blur-md flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[8px] text-cyan-400/50 uppercase font-black tracking-[0.2em]">Valor Estimado</p>
          <p className="text-sm font-bold text-white font-mono leading-none">{formatISK(miningTotalValue)}</p>
        </div>
        <div className="h-8 w-[1px] bg-cyan-500/10" />
        <div className="space-y-0.5 text-right">
          <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em]">Efficiency</p>
          <p className="text-xs font-bold text-cyan-400 font-mono leading-none">{formatISK(iskPerHour)}/h</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1.5 p-1 rounded-full bg-zinc-950/80 border border-zinc-900/50 mb-4 backdrop-blur-xl">
        <button
          onClick={() => toggleSection('fleet')}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.fleet 
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Fleet
        </button>
        <button
          onClick={() => toggleSection('mining')}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.mining 
              ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Mining
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[220px]">
        {expandedSections.fleet && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <FleetSection 
              participants={activity.participants} 
              participantEarnings={participantEarnings}
              isMining={true}
            />
          </div>
        )}

        {expandedSections.mining && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {oreTypes.length === 0 ? (
              <p className="text-center text-[10px] text-gray-600 italic py-8">No mining data yet. Click Sync to fetch from ESI.</p>
            ) : (
              <div className="space-y-2">
                {oreTypes.map(typeId => (
                  <div key={typeId} className="flex items-center justify-between p-2.5 bg-green-950/20 border border-green-900/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Gem className="h-4 w-4 text-green-400" />
                      <span className="text-xs font-bold text-gray-300">Type ID: {typeId}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-green-400 font-mono">{formatNumber(oreBreakdown[typeId].quantity)} m³</p>
                      <p className="text-[10px] text-gray-500">{formatISK(oreBreakdown[typeId].estimatedValue || 0)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Sync Button */}
      <div className="pt-4 mt-2 border-t border-zinc-900/50 flex gap-2">
        <button 
          disabled={isSyncing}
          onClick={onSync}
          className="flex-1 h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-800/50 flex items-center justify-center gap-2"
        >
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> :
           syncStatus === 'success' ? <span className="text-green-500">✓</span> :
           syncStatus === 'error' ? <span className="text-red-500">✗</span> :
           <span className="text-zinc-400">⟳</span>}
          {isSyncing ? 'Syncing...' : 'Sync ESI'}
        </button>
        <button 
          onClick={() => toggleSection('mining')}
          className="flex-1 h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-red-950/10 hover:bg-red-950/30 text-red-500/70 hover:text-red-400 border border-red-900/20 flex items-center justify-center gap-2"
        >
          Finalizar
        </button>
      </div>
    </div>
  )
}