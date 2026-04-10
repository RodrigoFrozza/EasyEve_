'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription 
} from '@/components/ui/dialog'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { FleetSection } from '../shared/FleetSection'
import { Button } from '@/components/ui/button'
import { Loader2, Gem, Download, MapPin, Clock, Users, Layers, TrendingUp, Activity as ActivityIcon } from 'lucide-react'
import { Sparkline } from '@/components/ui/Sparkline'

interface MiningActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  onEnd: () => void
  displayMode?: 'compact' | 'expanded'
}

export function MiningActivityContent({ 
  activity, onSync, isSyncing, syncStatus, onEnd, displayMode = 'expanded' 
}: MiningActivityContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    mining: true,
    ledger: false
  })
  const [logFilterChar, setLogFilterChar] = useState('all')
  const [logFilterSystem, setLogFilterSystem] = useState('all')
  const [oreNames, setOreNames] = useState<Record<number, string>>({})
  const [systemNames, setSystemNames] = useState<Record<number, string>>({})

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const logs = (activity.data as any)?.logs || []
  const miningTotalQuantity = (activity.data?.totalQuantity || 0)
  const miningTotalValue = (activity.data?.totalEstimatedValue || 0)
  const oreBreakdown = (activity.data?.oreBreakdown || {})
  const participantEarnings = (activity.data?.participantEarnings || {})
  const lastSyncAt = (activity.data as any)?.lastSyncAt

  // Fetch ore names when logs change
  useEffect(() => {
    const typeIds = Array.from(new Set(logs.map((l: any) => l.typeId).filter(Boolean)))
    if (typeIds.length === 0) return

    fetch('/api/sde/resolve-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeIds })
    })
      .then(res => res.json())
      .then(data => setOreNames(data))
      .catch(() => {})
  }, [logs])

  // Fetch solar system names when logs change
  useEffect(() => {
    const rawSystemIds = logs.map((l: any) => l.solarSystemId).filter((id: any): id is number => id && typeof id === 'number')
    const systemIds = Array.from(new Set(rawSystemIds))
    if (systemIds.length === 0) return

    const fetchSystemNames = async () => {
      const results: Record<number, string> = {}
      for (const sysId of systemIds as number[]) {
        try {
          const res = await fetch(`/api/sde/system-name?systemId=${sysId}`)
          if (res.ok) {
            const data = await res.json()
            results[sysId] = data.name || `System ${sysId}`
          }
        } catch {
          results[sysId] = `System ${sysId}`
        }
      }
      setSystemNames(results)
    }
    fetchSystemNames()
  }, [logs])

  const uniqueChars = useMemo(() => {
    const chars = new Set<string>()
    logs.forEach((l: any) => { if(l.characterName) chars.add(l.characterName) })
    return Array.from(chars)
  }, [logs])

  const uniqueSystems = useMemo(() => {
    const systems = new Set<string>()
    logs.forEach((l: any) => { 
      if (l.solarSystemId) {
        systems.add(systemNames[Number(l.solarSystemId)] || `System ${l.solarSystemId}`)
      }
    })
    return Array.from(systems)
  }, [logs, systemNames])

  // Get main system (most used)
  const mainSystem = useMemo(() => {
    const systemCounts: Record<string, number> = {}
    logs.forEach((l: any) => {
      if (l.solarSystemId) {
        const sysName = systemNames[Number(l.solarSystemId)] || `System ${l.solarSystemId}`
        systemCounts[sysName] = (systemCounts[sysName] || 0) + l.quantity
      }
    })
    const sorted = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])
    return sorted[0]?.[0] || 'Unknown'
  }, [logs, systemNames])

  const filteredLogs = useMemo(() => {
    return logs.filter((log: any) => {
      const matchChar = logFilterChar === 'all' || log.characterName === logFilterChar
      const logSystem = log.solarSystemId ? (systemNames[Number(log.solarSystemId)] || `System ${log.solarSystemId}`) : null
      const matchSystem = logFilterSystem === 'all' || logSystem === logFilterSystem
      return matchChar && matchSystem
    })
  }, [logs, logFilterChar, logFilterSystem, systemNames])

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

  // Sort ores by value (descending)
  const sortedOreTypes = useMemo(() => {
    return Object.keys(oreBreakdown).sort((a, b) => {
      const valueA = oreBreakdown[a]?.estimatedValue || 0
      const valueB = oreBreakdown[b]?.estimatedValue || 0
      return valueB - valueA
    })
  }, [oreBreakdown])

  // Check if activity is still active
  const startTimeMs = new Date(activity.startTime).getTime()
  const hoursElapsed = (Date.now() - startTimeMs) / 3600000
  const isActivityActive = !activity.endTime && hoursElapsed < 24
  
  const iskPerHour = isActivityActive ? miningTotalValue / Math.max(0.01, hoursElapsed) : 0
  const m3PerHour = isActivityActive ? miningTotalQuantity / Math.max(0.01, hoursElapsed) : 0

  // Format last sync time
  const lastSyncFormatted = useMemo(() => {
    if (!lastSyncAt) return null
    const syncTime = new Date(lastSyncAt).getTime()
    const minutesAgo = Math.floor((Date.now() - syncTime) / 60000)
    if (minutesAgo < 1) return 'agora'
    if (minutesAgo < 60) return `${minutesAgo} min`
    const hours = Math.floor(minutesAgo / 60)
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
  }, [lastSyncAt])

  // Calculate activity duration
  const activityDuration = useMemo(() => {
    const start = new Date(activity.startTime).getTime()
    const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
    const diffMs = end - start
    const hours = Math.floor(diffMs / 3600000)
    const minutes = Math.floor((diffMs % 3600000) / 60000)
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }, [activity.startTime, activity.endTime])

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    const headers = ['Date', 'Character', 'Ore', 'System', 'Quantity (m3)', 'Est. Value (ISK)']
    const csvRows = [headers.join(',')]
    
    for (const log of logs) {
      const oreName = oreNames[Number(log.typeId)] || `Type ${log.typeId}`
      const systemName = log.solarSystemId ? (systemNames[Number(log.solarSystemId)] || `System ${log.solarSystemId}`) : 'Unknown'
      const dateStr = new Date(log.date).toLocaleDateString('en-CA')
      const quantity = log.quantity
      const value = Math.round(log.estimatedValue || 0)
      
      csvRows.push(`${dateStr},${log.characterName},"${oreName}","${systemName}",${quantity},${value}`)
    }
    
    const csvContent = csvRows.join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `mining_history_${activity.id}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (displayMode === 'compact') {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.1)]">
              <Gem className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] text-blue-400/50 uppercase font-bold tracking-widest mb-0.5">Yield Actual</p>
              <p className="text-lg font-black text-white font-mono leading-none">{formatNumber(Math.round(m3PerHour))}<span className="text-xs text-blue-400 ml-1">m³/h</span></p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-green-400/50 uppercase font-bold tracking-widest mb-0.5">Est. Profit</p>
            <p className="text-lg font-black text-white font-mono leading-none">{formatNumber(Math.round(iskPerHour / 1000000))}<span className="text-xs text-green-400 ml-1">M/h</span></p>
          </div>
        </div>

        {/* Tactical Sparkline */}
        <div className="h-16 bg-zinc-950/50 rounded-xl border border-white/[0.03] overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-t from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <Sparkline 
            data={logs.map((l: any) => l.quantity)} 
            color="#3b82f6" 
            height={64}
          />
          <div className="absolute top-2 left-2 flex items-center gap-1.5">
            <TrendingUp className="h-3 w-3 text-blue-400/50" />
            <span className="text-[8px] text-blue-400/30 uppercase font-bold tracking-widest">Extraction Volume Flux</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-white/[0.02] flex items-center justify-between">
            <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Total</span>
            <span className="text-xs font-bold text-blue-400 font-mono">{formatNumber(miningTotalQuantity)} m³</span>
          </div>
          <div className="bg-zinc-900/40 p-2.5 rounded-lg border border-white/[0.02] flex items-center justify-between">
             <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-wider">Sync</span>
             <span className="text-xs font-bold text-zinc-400 font-mono uppercase">{lastSyncFormatted || 'PENDING'}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Main Stats Grid - Focus on 2 columns as per user request */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-[9px] text-blue-400/50 uppercase font-bold tracking-widest mb-1">Total Minerado</p>
          <p className="text-xl font-bold text-blue-400 font-mono tracking-tight">{formatNumber(miningTotalQuantity)} m³</p>
          <p className="text-[9px] text-blue-400/30 mt-1">{formatNumber(Math.round(m3PerHour))} m³/h</p>
        </div>
        <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-3 backdrop-blur-sm">
          <p className="text-[9px] text-green-400/50 uppercase font-bold tracking-widest mb-1">Valor Estimado</p>
          <p className="text-xl font-bold text-green-400 font-mono tracking-tight">{formatISK(miningTotalValue)}</p>
          <p className="text-[9px] text-green-400/30 mt-1">{formatISK(iskPerHour)}/h</p>
        </div>
      </div>

      {/* Tabs Navigation - Simplified (No Fleet tab) */}
      <div className="flex gap-1.5 p-1 rounded-full bg-zinc-950/80 border border-zinc-900/50 mb-3 backdrop-blur-xl">
        <button
          onClick={() => setExpandedSections({ mining: true, ledger: false })}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.mining 
              ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_12px_rgba(34,197,94,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Ores ({sortedOreTypes.length})
        </button>
        <button
          onClick={() => setExpandedSections({ mining: false, ledger: true })}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.ledger 
              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Ledger ({logs.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[180px]">
        {expandedSections.mining && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {sortedOreTypes.length === 0 ? (
              <p className="text-center text-[10px] text-gray-600 italic py-8">No mining data yet. Click Sync to fetch from ESI.</p>
            ) : (
              <div className="space-y-1.5">
                {sortedOreTypes.map((typeId, idx) => {
                  const quantity = oreBreakdown[typeId]?.quantity || 0
                  const value = oreBreakdown[typeId]?.estimatedValue || 0
                  const maxValue = oreBreakdown[sortedOreTypes[0]]?.estimatedValue || 1
                  const percentage = Math.round((value / maxValue) * 100)
                  const oreName = oreNames[Number(typeId)] || `Type ${typeId}`
                  
                  return (
                    <div key={typeId} className="flex items-center gap-3 p-2.5 bg-green-950/10 border border-green-900/20 rounded-lg">
                      <span className="text-[10px] font-bold text-green-500 w-4">{idx + 1}.</span>
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Gem className="h-4 w-4 text-green-400 flex-shrink-0" />
                        <span className="text-xs font-bold text-gray-300 truncate">{oreName}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="w-16 h-2 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                        <div 
                          className="h-full bg-gradient-to-r from-green-600 to-green-400 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="text-right flex-shrink-0 w-24">
                        <p className="text-sm font-bold text-green-400 font-mono">{formatNumber(quantity)} m³</p>
                        <p className="text-[10px] text-gray-500">{formatISK(value)}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {expandedSections.ledger && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Filters */}
            <div className="flex items-center gap-2 mb-2">
              <select 
                value={logFilterChar} 
                onChange={e => setLogFilterChar(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-zinc-500 flex-1"
              >
                <option value="all">All Pilots</option>
                {uniqueChars.map(char => (
                  <option key={char} value={char}>{char}</option>
                ))}
              </select>
              <select 
                value={logFilterSystem} 
                onChange={e => setLogFilterSystem(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-zinc-500 flex-1"
              >
                <option value="all">All Systems</option>
                {uniqueSystems.map(sys => (
                  <option key={sys} value={sys}>{sys}</option>
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
              <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar">
                {filteredLogs.map((log: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between py-2 px-3 rounded border-l-2 border-l-purple-500 bg-purple-950/10">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={`https://images.evetech.net/characters/${log.characterId}/portrait?size=64`} />
                        <AvatarFallback className="text-[7px] bg-zinc-800 text-zinc-400">
                          {(log.characterName || '??').slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-gray-300 text-[10px] font-medium">{log.characterName}</span>
                        <span className="text-[8px] text-gray-500">
                          {oreNames[Number(log.typeId)] || `Type ${log.typeId}`}
                          {log.solarSystemId && ` • ${systemNames[Number(log.solarSystemId)] || `Sys ${log.solarSystemId}`}`}
                        </span>
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
      <div className="pt-3 mt-2 border-t border-zinc-900/50 flex items-center gap-2">
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
        {lastSyncFormatted && (
          <span className="text-[9px] text-zinc-600 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {lastSyncFormatted}
          </span>
        )}
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
