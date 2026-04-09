'use client'

import { useState, useMemo } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription 
} from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { FleetSection } from '../shared/FleetSection'
import { Button } from '@/components/ui/button'
import { Loader2, Gem, List, Table2, Download, Filter, TrendingUp } from 'lucide-react'

interface MiningActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  onEnd: () => void
}

export function MiningActivityContent({ activity, onSync, isSyncing, syncStatus, onEnd }: MiningActivityContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleet: true,
    mining: false,
    ledger: false
  })
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [logFilterChar, setLogFilterChar] = useState('all')

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

  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const matchChar = logFilterChar === 'all' || log.characterName === logFilterChar
      return matchChar
    })
  }, [logs, logFilterChar])

  const participantBreakdown = useMemo(() => {
    const breakdown: Record<number, { name: string; quantity: number; value: number }> = {}
    logs.forEach((log: any) => {
      if (!breakdown[log.characterId]) {
        breakdown[log.characterId] = { name: log.characterName, quantity: 0, value: 0 }
      }
      breakdown[log.characterId].quantity += log.quantity
      breakdown[log.characterId].value += log.estimatedValue || 0
    })
    return breakdown
  }, [logs])

  const oreTypes = Object.keys(oreBreakdown)
  const iskPerHour = miningTotalValue / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)
  const m3PerHour = miningTotalQuantity / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    const headers = ['Date', 'Character', 'Type ID', 'Quantity (m3)', 'Est. Value']
    const csvContent = [
      headers.join(','),
      ...logs.map((log: any) => `${new Date(log.date).toISOString()},${log.characterName},${log.typeId},${log.quantity},${log.estimatedValue || 0}`)
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
          <p className="text-[9px] text-blue-400/30 mt-1">{formatNumber(Math.round(m3PerHour))} m³/h</p>
        </div>
        <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2.5 backdrop-blur-sm">
          <p className="text-[9px] text-green-400/50 uppercase font-bold tracking-widest mb-1">Valor Estimado</p>
          <p className="text-lg font-bold text-green-400 font-mono tracking-tight">{formatISK(miningTotalValue)}</p>
          <p className="text-[9px] text-green-400/30 mt-1">{formatISK(iskPerHour)}/h</p>
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
          <p className="text-xs font-bold text-cyan-400 font-mono leading-none">{formatNumber(Math.round(m3PerHour))} m³/h</p>
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
          Ore Breakdown
        </button>
        <button
          onClick={() => toggleSection('ledger')}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.ledger 
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Ledger
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

        {expandedSections.ledger && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Filters */}
            <div className="flex items-center justify-between gap-2 mb-2">
              <select 
                value={logFilterChar} 
                onChange={e => setLogFilterChar(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-zinc-500 flex-1"
              >
                <option value="all">All Characters</option>
                {uniqueChars.map(char => (
                  <option key={char} value={char}>{char}</option>
                ))}
              </select>
              <button
                onClick={handleExportCSV}
                className="p-1.5 rounded transition-colors text-gray-500 hover:text-green-400"
                title="Export CSV"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] text-gray-500 bg-zinc-900/30 rounded px-2 py-1.5 mb-2">
              <span>{filteredLogs.length} registros</span>
              <span>Média: {formatNumber(Math.round((filteredLogs.reduce((s: number, l: any) => s + l.quantity, 0)) / Math.max(filteredLogs.length, 1)))} m³</span>
            </div>

            {filteredLogs.length === 0 ? (
              <p className="text-center text-[10px] text-gray-600 italic py-8">No mining records.</p>
            ) : (
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar">
                {filteredLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded border-l-2 border-l-purple-500 bg-purple-950/10">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`https://images.evetech.net/characters/${log.characterId}/portrait?size=64`} />
                        <AvatarFallback className="text-[7px] bg-zinc-800 text-zinc-400">
                          {log.characterName?.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-[10px] font-medium">{log.characterName}</span>
                        <span className="text-[8px] text-gray-500">Type: {log.typeId}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-bold text-[11px] text-purple-400">
                        {formatNumber(log.quantity)} m³
                      </span>
                      <p className="text-[8px] text-gray-600">
                        {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
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
          onClick={onEnd}
          className="flex-1 h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-red-950/10 hover:bg-red-950/30 text-red-500/70 hover:text-red-400 border border-red-900/20 flex items-center justify-center gap-2"
        >
          Finalizar
        </button>
      </div>
    </div>
  )
}