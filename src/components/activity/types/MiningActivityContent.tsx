'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, Gem, Download, TrendingUp, TrendingDown, Activity as ActivityIcon, Pause, Play, StopCircle } from 'lucide-react'
import { Sparkline } from '@/components/ui/Sparkline'
import { ConfirmEndModal } from '../modals'
import Image from 'next/image'

interface MiningActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  onEnd: () => void
  displayMode?: 'compact' | 'expanded'
  isPaused?: boolean
  onTogglePause?: () => void
}

export function MiningActivityContent({ 
  activity, onSync, isSyncing, syncStatus, onEnd, displayMode = 'compact',
  isPaused, onTogglePause
}: MiningActivityContentProps) {
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [oreNames, setOreNames] = useState<Record<number, string>>({})
  const [oreImages, setOreImages] = useState<Record<number, string>>({})
  const [mounted, setMounted] = useState(false)
  const [iskPerHour, setIskPerHour] = useState(0)
  const [m3PerHour, setM3PerHour] = useState(0)

  const logs = (activity.data as any)?.logs || []
  const miningTotalQuantity = (activity.data?.totalQuantity || 0)
  const miningTotalValue = (activity.data?.totalEstimatedValue || 0)
  const oreBreakdown = (activity.data?.oreBreakdown || {})
  
  const startTimeMs = new Date(activity.startTime).getTime()
  
  useEffect(() => {
    setMounted(true)
    const update = () => {
      const now = Date.now()
      const accumulatedPaused = activity.accumulatedPausedTime || 0
      const currentPauseDuration = activity.isPaused && activity.pausedAt 
        ? Math.max(0, now - new Date(activity.pausedAt).getTime())
        : 0
      
      const diff = Math.max(0, (now - startTimeMs) - accumulatedPaused - currentPauseDuration)
      const hoursElapsed = diff / 3600000
      
      const newIskPerHour = miningTotalValue / Math.max(0.01, hoursElapsed)
      const newM3PerHour = miningTotalQuantity / Math.max(0.01, hoursElapsed)
      
      setIskPerHour(newIskPerHour)
      setM3PerHour(newM3PerHour)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [activity.startTime, activity.endTime, miningTotalValue, miningTotalQuantity, startTimeMs, activity.isPaused, activity.pausedAt, activity.accumulatedPausedTime])

  const m3Trend = (activity.data as any)?.m3Trend || 'stable'
  const TrendIcon = m3Trend === 'up' ? TrendingUp : m3Trend === 'down' ? TrendingDown : ActivityIcon
  const trendColor = m3Trend === 'up' ? 'text-green-400' : m3Trend === 'down' ? 'text-red-400' : 'text-zinc-500'

  useEffect(() => {
    const typeIds = Array.from(new Set(logs.map((l: any) => l.typeId).filter(Boolean)))
    if (typeIds.length === 0) return

    fetch('/api/sde/resolve-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ typeIds })
    })
      .then(res => res.json())
      .then(data => {
        setOreNames(data)
        const images: Record<number, string> = {}
        ;(typeIds as number[]).forEach((id: number) => {
          images[id] = `https://images.evetech.net/types/${id}/icon?size=32`
        })
        setOreImages(images)
      })
      .catch(() => {})
  }, [logs])

  const sortedOreTypes = useMemo(() => {
    return Object.keys(oreBreakdown).sort((a, b) => {
      const valueA = oreBreakdown[a]?.estimatedValue || 0
      const valueB = oreBreakdown[b]?.estimatedValue || 0
      return valueB - valueA
    })
  }, [oreBreakdown])

  const top3Ores = useMemo(() => {
    return sortedOreTypes.slice(0, 3).map(typeId => {
      const breakdown = oreBreakdown[typeId]
      return {
        typeId,
        name: breakdown?.name || oreNames[Number(typeId)] || `Type ${typeId}`,
        image: breakdown?.icon || oreImages[Number(typeId)] || `https://images.evetech.net/types/${typeId}/icon?size=32`,
        quantity: breakdown?.quantity || 0,
        volume: breakdown?.volumeValue || 0,
        value: breakdown?.estimatedValue || 0
      }
    })
  }, [sortedOreTypes, oreNames, oreImages, oreBreakdown])

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    // Time, Character, Ore Type, Quantity, m3, Value
    const headers = ['Time', 'Character', 'Ore Type', 'Quantity', 'Volume (m3)', 'Value (ISK)']
    const csvRows = [headers.join(',')]
    
    for (const log of logs) {
      const oreName = oreNames[Number(log.typeId)] || `Type ${log.typeId}`
      const dateStr = new Date(log.date).toISOString().replace(/T/, ' ').replace(/\..+/, '')
      const quantity = log.quantity
      const volume = log.volumeValue || 0
      const value = Math.round(log.estimatedValue || 0)
      
      csvRows.push(`${dateStr},${log.characterName},"${oreName}",${quantity},${volume},${value}`)
    }
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mining_export_${activity.id}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleConfirmEnd = () => {
    setConfirmEndOpen(false)
    onEnd?.()
  }

  const miningHistory = useMemo(() => {
    return logs.map((l: any) => l.volumeValue || l.quantity)
  }, [logs])

  if (displayMode === 'compact') {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-blue-400/70 uppercase font-black tracking-wider mb-1">Total Yield</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatNumber(Math.round(miningTotalQuantity))} <span className="text-[10px] text-zinc-500 font-bold">m³</span>
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-green-400/70 uppercase font-black tracking-wider mb-1">Total Value</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(miningTotalValue)}
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-white/[0.03] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-wider">Top 3 Ores</p>
              <TrendIcon className={cn("h-3 w-3", trendColor)} />
            </div>
            <div className="space-y-1.5">
              {top3Ores.length > 0 ? top3Ores.map((ore) => (
                <div key={ore.typeId} className="flex items-center gap-2">
                  <img src={ore.image} alt="" className="h-5 w-5 rounded bg-zinc-900 border border-zinc-800" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-zinc-300 font-bold truncate leading-none">{ore.name}</p>
                    <p className="text-[8px] text-zinc-500 font-mono mt-0.5">{formatNumber(ore.quantity)} units</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-blue-400 font-mono font-bold leading-none">{formatNumber(Math.round(ore.volume))} m³</p>
                    <p className="text-[8px] text-green-400/70 font-mono mt-0.5">{formatISK(ore.value)}</p>
                  </div>
                </div>
              )) : (
                <div className="py-4 text-center">
                  <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">No Extraction Data</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-white/[0.03]">
          <Button 
            size="sm" 
            variant="outline"
            disabled={isSyncing}
            onClick={onSync}
            className={cn(
              "flex-1 h-10 bg-zinc-950/60 border-white/[0.05] hover:bg-cyan-500/10 hover:border-cyan-500/50 text-zinc-400 hover:text-cyan-400 transition-all duration-500 rounded-xl text-[10px] font-black uppercase tracking-wider",
              isSyncing && "animate-pulse border-cyan-500/50 bg-cyan-500/5"
            )}
          >
            {isSyncing ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Loader2 className={cn("h-3.5 w-3.5 mr-1.5", syncStatus === 'success' && "text-green-500")} />
            )}
            Sync
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            onClick={onTogglePause}
            className={cn(
              "h-10 px-4 bg-zinc-900/40 border-white/[0.05] rounded-xl transition-all",
              isPaused ? "text-yellow-400 border-yellow-500/30" : "text-zinc-500 hover:text-zinc-300"
            )}
          >
            {isPaused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
          </Button>

          <Button 
            size="sm" 
            variant="outline"
            onClick={handleExportCSV}
            disabled={logs.length === 0}
            className="h-10 px-4 bg-zinc-900/40 border-white/[0.05] hover:bg-green-500/10 hover:border-green-500/50 text-zinc-500 hover:text-green-400 rounded-xl transition-all"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>

          <Button 
            size="sm"
            variant="outline"
            onClick={() => setConfirmEndOpen(true)}
            className="flex-1 h-10 bg-red-500/5 border-red-500/10 hover:bg-red-500 hover:text-white hover:border-red-500 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-wider transition-all"
          >
             End
          </Button>
        </div>

        <ConfirmEndModal
          open={confirmEndOpen}
          onOpenChange={setConfirmEndOpen}
          onConfirm={handleConfirmEnd}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-zinc-950/30 border border-white/[0.03] rounded-xl p-4 relative overflow-hidden group/m3">
          <div className="absolute inset-0 bg-blue-500/[0.02] opacity-0 group-hover/m3:opacity-100 transition-opacity" />
          <p className="text-[9px] text-blue-400/70 uppercase font-black tracking-widest mb-1 relative z-10">Total Yield</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-2xl font-black text-white font-mono tracking-tighter">
              {formatNumber(Math.round(miningTotalQuantity))}
            </p>
            <span className="text-[10px] text-zinc-500 font-bold">m³</span>
          </div>
          <div className="mt-2 flex items-center gap-2 relative z-10" suppressHydrationWarning>
             <span className="text-[10px] font-mono text-zinc-400 font-bold">{mounted ? formatNumber(Math.round(m3PerHour)) : 0}</span>
             <span className="text-[8px] text-zinc-600 font-black uppercase">per hour</span>
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-white/[0.03] rounded-xl p-4 relative overflow-hidden group/val">
          <div className="absolute inset-0 bg-green-500/[0.02] opacity-0 group-hover/val:opacity-100 transition-opacity" />
          <p className="text-[9px] text-green-400/70 uppercase font-black tracking-widest mb-1 relative z-10">Net Market Value</p>
          <p className="text-2xl font-black text-white font-mono tracking-tighter relative z-10">
            {formatISK(miningTotalValue)}
          </p>
          <div className="mt-2 flex items-center gap-2 relative z-10" suppressHydrationWarning>
             <span className="text-[10px] font-mono text-zinc-400 font-bold">{mounted ? formatISK(iskPerHour) : formatISK(0)}</span>
             <span className="text-[8px] text-zinc-600 font-black uppercase">efficiency</span>
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-white/[0.03] rounded-xl p-4 relative overflow-hidden group/eff">
          <div className="absolute inset-0 bg-cyan-500/[0.02] opacity-0 group-hover/eff:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-1 relative z-10">
            <p className="text-[9px] text-cyan-400/70 uppercase font-black tracking-widest leading-none">Yield Trend</p>
            <TrendIcon className={cn("h-3 w-3", trendColor)} />
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tighter relative z-10">
            {m3Trend.toUpperCase()}
          </p>
          <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
             <div className={cn("h-full rounded-full transition-all duration-1000", 
               m3Trend === 'up' ? "bg-green-500 w-full" : 
               m3Trend === 'down' ? "bg-red-500 w-1/2" : "bg-blue-500 w-3/4"
             )} />
          </div>
        </div>
      </div>

      {sortedOreTypes.length > 0 && (
        <div className="space-y-3 bg-zinc-950/30 p-4 rounded-xl border border-zinc-900/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-3 w-1 bg-blue-500 rounded-full" />
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Full Extraction Breakdown</p>
            </div>
            <span className="text-[9px] text-zinc-600 font-mono font-bold tracking-widest">{sortedOreTypes.length} TYPES</span>
          </div>
          
          <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
            {sortedOreTypes.map((typeId, idx) => {
              const quantity = oreBreakdown[typeId]?.quantity || 0
              const volume = oreBreakdown[typeId]?.volumeValue || 0
              const value = oreBreakdown[typeId]?.estimatedValue || 0
              const maxValue = oreBreakdown[sortedOreTypes[0]]?.estimatedValue || 1
              const percentage = Math.round((value / maxValue) * 100)
              
              return (
                <div key={typeId} className="flex items-center gap-4 p-3 bg-zinc-900/20 border border-white/[0.02] rounded-xl hover:bg-zinc-900/40 transition-colors group/item">
                  <span className="text-[10px] font-black text-zinc-700 w-4 group-hover/item:text-blue-500 transition-colors">{idx + 1}.</span>
                  <img 
                    src={oreImages[Number(typeId)] || `https://images.evetech.net/types/${typeId}/icon?size=32`}
                    alt=""
                    className="h-10 w-10 rounded-lg bg-zinc-950 border border-zinc-800 p-1 group-hover/item:border-blue-500/50 transition-colors"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-100 truncate tracking-tight">{oreNames[Number(typeId)] || `Type ${typeId}`}</p>
                    <p className="text-[10px] text-zinc-500 font-mono mt-0.5">{formatNumber(quantity)} <span className="text-[8px] uppercase font-black">units</span></p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5 min-w-[120px]">
                    <p className="text-xs font-black text-blue-400 font-mono tracking-tighter">{formatNumber(Math.round(volume))} m³</p>
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-green-400 font-mono font-bold tracking-tighter">{formatISK(value)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {miningHistory.length > 0 && (
        <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-900/50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-1 bg-cyan-500 rounded-full" />
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Efficiency Waveform</p>
            </div>
          </div>
          <div className="h-[120px] w-full">
            <Sparkline 
              data={miningHistory} 
              width={600} 
              height={120} 
              color="#00d4ff" 
              strokeWidth={3}
            />
          </div>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        <Button 
          size="sm" 
          variant="outline"
          onClick={onTogglePause}
          className={cn(
            "h-12 px-6 bg-zinc-900/40 border-white/[0.05] rounded-xl transition-all font-black uppercase text-[10px] tracking-widest",
            isPaused ? "text-yellow-400 border-yellow-500/30 bg-yellow-500/5" : "text-zinc-500 hover:text-white hover:bg-zinc-800"
          )}
        >
          {isPaused ? <><Play className="h-4 w-4 mr-2" /> Resume</> : <><Pause className="h-4 w-4 mr-2" /> Pause</>}
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="h-12 px-6 bg-zinc-900/40 border-white/[0.05] hover:bg-green-500/10 hover:border-green-500/50 text-zinc-500 hover:text-green-400 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <Download className="h-4 w-4 mr-2" /> Export CSV
        </Button>
      </div>

      <ConfirmEndModal
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        onConfirm={handleConfirmEnd}
      />
    </div>
  )
}