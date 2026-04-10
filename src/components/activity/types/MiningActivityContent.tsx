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
}

export function MiningActivityContent({ 
  activity, onSync, isSyncing, syncStatus, onEnd, displayMode = 'compact' 
}: MiningActivityContentProps) {
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [oreNames, setOreNames] = useState<Record<number, string>>({})
  const [oreImages, setOreImages] = useState<Record<number, string>>({})

  const logs = (activity.data as any)?.logs || []
  const miningTotalQuantity = (activity.data?.totalQuantity || 0)
  const miningTotalValue = (activity.data?.totalEstimatedValue || 0)
  const oreBreakdown = (activity.data?.oreBreakdown || {})
  
  const startTimeMs = new Date(activity.startTime).getTime()
  const hoursElapsed = (Date.now() - startTimeMs) / 3600000
  const isActivityActive = !activity.endTime && hoursElapsed < 24
  
  const iskPerHour = isActivityActive ? miningTotalValue / Math.max(0.01, hoursElapsed) : 0
  const m3PerHour = isActivityActive ? miningTotalQuantity / Math.max(0.01, hoursElapsed) : 0

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
    return sortedOreTypes.slice(0, 3).map(typeId => ({
      typeId,
      name: oreNames[Number(typeId)] || `Type ${typeId}`,
      image: oreImages[Number(typeId)] || `https://images.evetech.net/types/${typeId}/icon?size=32`,
      quantity: oreBreakdown[typeId]?.quantity || 0,
      volume: oreBreakdown[typeId]?.volumeValue || 0,
      value: oreBreakdown[typeId]?.estimatedValue || 0
    }))
  }, [sortedOreTypes, oreNames, oreImages, oreBreakdown])

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    const headers = ['Date', 'Character', 'Ore', 'System', 'Quantity (m3)', 'Est. Value (ISK)']
    const csvRows = [headers.join(',')]
    
    for (const log of logs) {
      const oreName = oreNames[Number(log.typeId)] || `Type ${log.typeId}`
      const dateStr = new Date(log.date).toLocaleDateString('en-CA')
      const quantity = log.quantity
      const value = Math.round(log.estimatedValue || 0)
      
      csvRows.push(`${dateStr},${log.characterName},"${oreName}",Unknown,${quantity},${value}`)
    }
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `mining_history_${activity.id}.csv`
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
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {activity.participants.map((p: any) => (
              <div key={p.characterId} className="flex-shrink-0 relative">
                <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-900/40 border border-white/[0.03] rounded-xl hover:bg-zinc-900/60 transition-colors">
                  <div className="relative">
                    <Avatar className="h-8 w-8 border border-zinc-700">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="bg-zinc-900 text-[10px] font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    {p.fit && (
                      <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-blue-500 rounded-full flex items-center justify-center border border-zinc-900">
                        <Gem className="h-2 w-2 text-white" />
                      </div>
                    )}
                  </div>
                  <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider truncate max-w-[50px]">
                    {p.characterName?.split(' ')[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-blue-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-blue-400/70 uppercase font-black tracking-wider mb-1">Total m³</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatNumber(Math.round(miningTotalQuantity))}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-green-400/70 uppercase font-black tracking-wider mb-1">Valor</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(miningTotalValue)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-500/10 blur-xl rounded-full" />
              <div className="flex items-center gap-1 mb-1">
                <p className="text-[8px] text-cyan-400/70 uppercase font-black tracking-wider">ISK/h</p>
                <TrendIcon className={cn("h-2.5 w-2.5", trendColor)} />
              </div>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(iskPerHour)}
              </p>
            </div>
          </div>

          {top3Ores.length > 0 && (
            <div className="space-y-2">
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-wider">Top Ores</p>
              <div className="space-y-1">
                {top3Ores.map((ore) => (
                  <div key={ore.typeId} className="flex items-center gap-2 p-2 bg-zinc-900/40 border border-white/[0.02] rounded-lg">
                    <img 
                      src={ore.image} 
                      alt={ore.name}
                      className="h-6 w-6 rounded-md bg-zinc-900"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-zinc-300 font-bold truncate">{ore.name}</p>
                      <p className="text-[8px] text-zinc-500">{formatNumber(ore.quantity)} units</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-400 font-mono font-bold">{formatNumber(Math.round(ore.volume))} m³</p>
                      <p className="text-[8px] text-green-400/70 font-mono">{formatISK(ore.value)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            onClick={() => setIsPaused(!isPaused)}
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
            className="flex-1 h-10 bg-red-500/5 border-red-500/10 hover:bg-red-500 hover:text-black hover:border-red-500 rounded-xl text-red-500 text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <StopCircle className="h-3.5 w-3.5 mr-1" />
            End
          </Button>
        </div>

        <ConfirmEndModal
          open={confirmEndOpen}
          onOpenChange={setConfirmEndOpen}
          onConfirm={handleConfirmEnd}
          activityName={activity.data?.oreType || activity.item?.name || 'Mining'}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {activity.participants.map((p: any) => (
          <div key={p.characterId} className="flex-shrink-0 relative">
            <div className="flex flex-col items-center gap-1.5 p-2 bg-zinc-900/40 border border-white/[0.03] rounded-xl hover:bg-zinc-900/60 transition-colors">
              <div className="relative">
                <Avatar className="h-10 w-10 border-2 border-zinc-700">
                  <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                  <AvatarFallback className="bg-zinc-900 text-xs font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                {p.fit && (
                  <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-blue-500 rounded-full flex items-center justify-center border-2 border-zinc-900">
                    <Gem className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="text-center">
                <span className="text-[9px] text-zinc-300 font-bold block truncate max-w-[60px]">
                  {p.characterName?.split(' ')[0]}
                </span>
                <span className="text-[7px] text-zinc-600 uppercase tracking-wider truncate max-w-[60px] block">
                  {p.fit || '—'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-blue-500/10 blur-xl rounded-full" />
          <p className="text-[9px] text-blue-400/70 uppercase font-black tracking-wider mb-1">Total m³</p>
          <p className="text-xl font-black text-white font-mono tracking-tight">
            {formatNumber(Math.round(miningTotalQuantity))}
          </p>
          <p className="text-[9px] text-blue-400/50 mt-1">{formatNumber(Math.round(m3PerHour))} m³/h</p>
        </div>

        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-green-500/10 blur-xl rounded-full" />
          <p className="text-[9px] text-green-400/70 uppercase font-black tracking-wider mb-1">Valor</p>
          <p className="text-xl font-black text-white font-mono tracking-tight">
            {formatISK(miningTotalValue)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-cyan-500/10 blur-xl rounded-full" />
          <div className="flex items-center gap-1 mb-1">
            <p className="text-[9px] text-cyan-400/70 uppercase font-black tracking-wider">ISK/h</p>
            <TrendIcon className={cn("h-3 w-3", trendColor)} />
          </div>
          <p className="text-xl font-black text-white font-mono tracking-tight">
            {formatISK(iskPerHour)}
          </p>
        </div>
      </div>

      {sortedOreTypes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-wider">Ore Breakdown</p>
            <span className="text-[9px] text-zinc-600 font-mono">{sortedOreTypes.length} types</span>
          </div>
          
          <div className="h-2 w-full flex rounded-full overflow-hidden bg-zinc-900 border border-white/[0.05]">
            {sortedOreTypes.map((typeId, idx) => {
              const volume = oreBreakdown[typeId]?.volumeValue || 0
              const percent = (volume / Math.max(1, miningTotalQuantity)) * 100
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-yellow-500', 'bg-cyan-500', 'bg-pink-500']
              if (percent < 1) return null
              return (
                <div 
                  key={typeId}
                  className={cn("h-full transition-all duration-1000", colors[idx % colors.length])}
                  style={{ width: `${percent}%` }}
                />
              )
            })}
          </div>

          <div className="space-y-2 max-h-[200px] overflow-y-auto custom-scrollbar pr-2">
            {sortedOreTypes.map((typeId, idx) => {
              const quantity = oreBreakdown[typeId]?.quantity || 0
              const volume = oreBreakdown[typeId]?.volumeValue || 0
              const value = oreBreakdown[typeId]?.estimatedValue || 0
              const maxValue = oreBreakdown[sortedOreTypes[0]]?.estimatedValue || 1
              const percentage = Math.round((value / maxValue) * 100)
              
              return (
                <div key={typeId} className="flex items-center gap-3 p-3 bg-zinc-900/40 border border-white/[0.02] rounded-xl hover:bg-zinc-900/60 transition-colors">
                  <span className="text-[10px] font-bold text-zinc-600 w-4">{idx + 1}.</span>
                  <img 
                    src={oreImages[Number(typeId)] || `https://images.evetech.net/types/${typeId}/icon?size=32`}
                    alt={oreNames[Number(typeId)] || typeId}
                    className="h-8 w-8 rounded-md bg-zinc-900"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate">{oreNames[Number(typeId)] || `Type ${typeId}`}</p>
                    <p className="text-[9px] text-zinc-500">{formatNumber(quantity)} units</p>
                  </div>
                  <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <div className="text-right w-24">
                    <p className="text-xs font-bold text-blue-400 font-mono">{formatNumber(Math.round(volume))} m³</p>
                    <p className="text-[9px] text-green-400/70 font-mono">{formatISK(value)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {miningHistory.length > 0 && (
        <div className="bg-zinc-950/40 border border-white/[0.03] rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Efficiency Chart</span>
            </div>
          </div>
          <div className="h-[100px] w-full">
            <Sparkline 
              data={miningHistory} 
              width={400} 
              height={100} 
              color="#00d4ff" 
              strokeWidth={2}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-4 border-t border-white/[0.05]">
        <Button 
          size="sm" 
          variant="outline"
          disabled={isSyncing}
          onClick={onSync}
          className={cn(
            "flex-1 h-12 bg-zinc-950/60 border-white/[0.05] hover:bg-cyan-500/10 hover:border-cyan-500/50 text-zinc-400 hover:text-cyan-400 transition-all duration-500 rounded-xl text-[11px] font-black uppercase tracking-wider",
            isSyncing && "animate-pulse border-cyan-500/50 bg-cyan-500/5"
          )}
        >
          {isSyncing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Loader2 className={cn("h-4 w-4 mr-2", syncStatus === 'success' && "text-green-500")} />
          )}
          Sync API
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setIsPaused(!isPaused)}
          className={cn(
            "h-12 px-6 bg-zinc-900/40 border-white/[0.05] rounded-xl transition-all",
            isPaused ? "text-yellow-400 border-yellow-500/30" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={handleExportCSV}
          disabled={logs.length === 0}
          className="h-12 px-6 bg-zinc-900/40 border-white/[0.05] hover:bg-green-500/10 hover:border-green-500/50 text-zinc-500 hover:text-green-400 rounded-xl transition-all"
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button 
          size="sm"
          variant="outline"
          onClick={() => setConfirmEndOpen(true)}
          className="flex-1 h-12 bg-red-500/5 border-red-500/10 hover:bg-red-500 hover:text-black hover:border-red-500 rounded-xl text-red-500 text-[11px] font-black uppercase tracking-wider transition-all"
        >
          <StopCircle className="h-4 w-4 mr-2" />
          End
        </Button>
      </div>

      <ConfirmEndModal
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        onConfirm={handleConfirmEnd}
        activityName={activity.data?.oreType || activity.item?.name || 'Mining'}
      />
    </div>
  )
}