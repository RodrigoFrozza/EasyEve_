'use client'

import { useState, useMemo, useEffect } from 'react'
import { formatISK, cn, calculateNetProfit, timeAgo, formatNumber } from '@/lib/utils'
import { useActivityStore } from '@/lib/stores/activity-store'
import { FleetSection } from '../shared/FleetSection'
import { MTULootField } from '../MTULootField'
import { SalvageField } from '../SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, StopCircle, History, Activity as ActivityIcon, Pause, Play, HelpCircle } from 'lucide-react'
import { Sparkline } from '@/components/ui/Sparkline'
import { ActivityDetailDialog } from '../ActivityDetailDialog'
import { MTUInputModal, SalvageInputModal, ConfirmEndModal } from '../modals'

import { Download } from 'lucide-react'

interface RattingActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  essCountdown?: string
  displayMode?: 'compact' | 'tabs' | 'expanded'
  onEnd?: () => void
  isPaused?: boolean
  onTogglePause?: () => void
}

export function RattingActivityContent({ 
  activity, 
  onSync, 
  isSyncing, 
  syncStatus,
  essCountdown,
  displayMode = 'compact',
  onEnd,
  isPaused,
  onTogglePause
}: RattingActivityContentProps) {
  const [mtuModalOpen, setMtuModalOpen] = useState(false)
  const [salvageModalOpen, setSalvageModalOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [iskPerHour, setIskPerHour] = useState(0)

  const startTimeMs = new Date(activity.startTime).getTime()

  useEffect(() => {
    setMounted(true)
    const update = () => {
      const now = Date.now()
      const totalIsk = calculateNetProfit(activity.data)
      const accumulatedPaused = activity.accumulatedPausedTime || 0
      const currentPauseDuration = activity.isPaused && activity.pausedAt 
        ? Math.max(0, now - new Date(activity.pausedAt).getTime())
        : 0
      
      const diff = Math.max(0, (now - startTimeMs) - accumulatedPaused - currentPauseDuration)
      const durationHours = Math.max(0.01, diff / 3600000)
      setIskPerHour(totalIsk / durationHours)
    }
    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [activity.data, activity.startTime, activity.isPaused, activity.pausedAt, activity.accumulatedPausedTime, startTimeMs])

  const automatedBounties = activity.data?.automatedBounties || 0
  const automatedEss = activity.data?.automatedEss || 0
  const automatedTaxes = activity.data?.automatedTaxes || 0
  const additionalBounties = activity.data?.additionalBounties || 0

  const totalIsk = calculateNetProfit(activity.data)
  const logs = (activity.data as any)?.logs || []
  const incomeHistory = (activity.data as any)?.incomeHistory || []
  const mtuContents = activity.data?.mtuContents || []
  const salvageContents = activity.data?.salvageContents || []
  const iskTrend = (activity.data as any)?.iskTrend || 'stable'
  
  const TrendIcon = iskTrend === 'up' ? TrendingUp : iskTrend === 'down' ? TrendingDown : ActivityIcon
  const trendColor = iskTrend === 'up' ? 'text-green-400' : iskTrend === 'down' ? 'text-red-400' : 'text-zinc-500'

  const handleMTUChange = (newMTUs: any[]) => {
    useActivityStore.getState().updateActivity(activity.id, {
      data: { ...activity.data, mtuContents: newMTUs }
    })
  }

  const handleSalvageChange = (newSalvage: any[]) => {
    useActivityStore.getState().updateActivity(activity.id, {
      data: { ...activity.data, salvageContents: newSalvage }
    })
  }

  const handleConfirmEnd = () => {
    setConfirmEndOpen(false)
    onEnd?.()
  }

  const handleExportCSV = () => {
    if (logs.length === 0) return
    
    // Time, Character, Type (Bounty or ESS), Value
    const headers = ['Time', 'Character', 'Type', 'Value (ISK)']
    const csvRows = [headers.join(',')]
    
    for (const log of logs) {
      const dateStr = new Date(log.date).toISOString().replace(/T/, ' ').replace(/\..+/, '')
      const type = log.type === 'bounty' ? 'Bounty' : 'ESS'
      const value = Math.round(log.amount || 0)
      
      csvRows.push(`${dateStr},${log.charName || 'Unknown'},${type},${value}`)
    }
    
    const csvContent = csvRows.join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `ratting_export_${activity.id}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (displayMode === 'compact') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-green-400/70 uppercase font-black tracking-wider mb-1">Bounty Flow</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(automatedBounties + additionalBounties)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/10 blur-xl rounded-full" />
              <div className="flex items-center justify-between mb-1">
                <p className="text-[8px] text-yellow-400/70 uppercase font-black tracking-wider leading-none">ESS Bank</p>
                {essCountdown && (
                  <span className="text-[8px] text-cyan-400 font-black animate-pulse">{essCountdown}</span>
                )}
              </div>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(automatedEss)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-cyan-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-cyan-400/70 uppercase font-black tracking-wider mb-1">Efficiency</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(iskPerHour)}<span className="text-[8px] text-zinc-500 ml-1">/H</span>
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-white/[0.03] rounded-xl p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[8px] text-zinc-500 uppercase font-black tracking-wider">Loot & Salvage</p>
              <div className="flex gap-1">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setMtuModalOpen(true)}
                className="h-8 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 rounded-lg text-[9px] font-black uppercase tracking-wider"
              >
                + LOOT
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setSalvageModalOpen(true)}
                className="h-8 bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-400 rounded-lg text-[9px] font-black uppercase tracking-wider"
              >
                + Salvage
              </Button>
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
              <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", syncStatus === 'success' && "text-green-500")} />
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

        <MTUInputModal
          open={mtuModalOpen}
          onOpenChange={setMtuModalOpen}
          onSave={handleMTUChange}
          existingItems={mtuContents}
          mtuValues={activity.data?.mtuValues}
        />
        
        <SalvageInputModal
          open={salvageModalOpen}
          onOpenChange={setSalvageModalOpen}
          onSave={handleSalvageChange}
          existingItems={salvageContents}
        />

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
          <div className="absolute inset-0 bg-green-500/[0.02] opacity-0 group-hover/m3:opacity-100 transition-opacity" />
          <p className="text-[9px] text-green-400/70 uppercase font-black tracking-widest mb-1 relative z-10">Total Bounty</p>
          <div className="flex items-baseline gap-2 relative z-10">
            <p className="text-2xl font-black text-white font-mono tracking-tighter">
              {formatISK(automatedBounties + additionalBounties)}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 relative z-10" suppressHydrationWarning>
             <span className="text-[10px] font-mono text-zinc-400 font-bold">{mounted ? formatISK(iskPerHour) : formatISK(0)}</span>
             <span className="text-[8px] text-zinc-600 font-black uppercase">per hour</span>
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-white/[0.03] rounded-xl p-4 relative overflow-hidden group/val">
          <div className="absolute inset-0 bg-yellow-500/[0.02] opacity-0 group-hover/val:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-1 relative z-10">
            <p className="text-[9px] text-yellow-400/70 uppercase font-black tracking-widest leading-none">ESS Bank</p>
            {essCountdown && (
              <span className="text-[9px] text-cyan-400 font-black animate-pulse">{essCountdown}</span>
            )}
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tighter relative z-10">
            {formatISK(automatedEss)}
          </p>
          <div className="h-1 w-full bg-white/5 rounded-full mt-3 overflow-hidden">
             <div className="h-full rounded-full transition-all duration-1000 bg-yellow-500 w-3/4" />
          </div>
        </div>

        <div className="bg-zinc-950/30 border border-white/[0.03] rounded-xl p-4 relative overflow-hidden group/eff">
          <div className="absolute inset-0 bg-cyan-500/[0.02] opacity-0 group-hover/eff:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-1 relative z-10">
            <p className="text-[9px] text-cyan-400/70 uppercase font-black tracking-widest leading-none">Efficiency</p>
            <TrendIcon className={cn("h-3 w-3", trendColor)} />
          </div>
          <p className="text-2xl font-black text-white font-mono tracking-tighter relative z-10">
            {formatISK(iskPerHour)}
          </p>
          <div className="mt-2 flex items-center gap-3 relative z-10" suppressHydrationWarning>
             <div className="flex-1 h-8">
               <Sparkline 
                 data={incomeHistory.map((v: number, i: number, a: number[]) => i === 0 ? v : Math.max(0, v - a[i-1]))} 
                 width={100} 
                 height={30} 
                 color={iskTrend === 'up' ? "#22c55e" : iskTrend === 'down' ? "#ef4444" : "#00d4ff"} 
                 strokeWidth={2}
               />
             </div>
             <span className="text-[8px] text-zinc-600 font-black uppercase whitespace-nowrap">{iskTrend} trend</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4 relative overflow-hidden group/logs">
          <div className="absolute inset-0 bg-green-500/[0.01] opacity-0 group-hover/logs:opacity-100 transition-opacity" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="h-3 w-1 bg-green-500 rounded-full" />
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Live Transactions</span>
          </div>
          <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-2 relative z-10">
            {(logs || []).slice(-15).reverse().map((log: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-[11px] p-2.5 bg-zinc-900/20 border border-white/[0.02] rounded-xl hover:bg-zinc-900/40 transition-colors group/item">
                <div className="flex items-center gap-2">
                  <span className={cn("h-1.5 w-1.5 rounded-full", log.type === 'ess' ? "bg-yellow-500" : "bg-green-500")} />
                  <span className="text-zinc-300 font-bold truncate max-w-[120px]">{log.charName || 'Unknown'}</span>
                </div>
                <div className="text-right">
                  <span className={cn("font-mono font-black", log.type === 'ess' ? "text-yellow-400" : "text-green-400")}>
                    {formatISK(log.amount || 0)}
                  </span>
                  <p className="text-[8px] text-zinc-600 font-black uppercase mt-0.5">{log.type}</p>
                </div>
              </div>
            ))}
            {(logs || []).length === 0 && (
              <div className="py-12 text-center">
                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">No Extraction Data</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-950/30 p-5 rounded-2xl border border-zinc-900/50 relative overflow-hidden group/eff-chart">
          <div className="absolute inset-0 bg-cyan-500/[0.01] opacity-0 group-hover/eff-chart:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <div className="h-3 w-1 bg-cyan-500 rounded-full" />
              <p className="text-[10px] text-zinc-400 uppercase font-black tracking-widest">Efficiency Waveform</p>
            </div>
          </div>
          <div className="h-[120px] w-full relative z-10">
            <Sparkline 
              data={incomeHistory.map((v: number, i: number, a: number[]) => i === 0 ? v : Math.max(0, v - a[i-1]))} 
              width={400} 
              height={120} 
              color="#00d4ff" 
              strokeWidth={3}
            />
          </div>
        </div>
      </div>

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

        <div className="flex-1 flex gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setMtuModalOpen(true)}
            className="flex-1 h-12 bg-blue-500/5 border-blue-500/10 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            + LOOT
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setSalvageModalOpen(true)}
            className="flex-1 h-12 bg-orange-500/5 border-orange-500/10 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
          >
            + Salvage
          </Button>
        </div>
      </div>

      <MTUInputModal
        open={mtuModalOpen}
        onOpenChange={setMtuModalOpen}
        onSave={handleMTUChange}
        existingItems={mtuContents}
        mtuValues={activity.data?.mtuValues}
      />
      
      <SalvageInputModal
        open={salvageModalOpen}
        onOpenChange={setSalvageModalOpen}
        onSave={handleSalvageChange}
        existingItems={salvageContents}
      />

      <ConfirmEndModal
        open={confirmEndOpen}
        onOpenChange={setConfirmEndOpen}
        onConfirm={handleConfirmEnd}
      />
    </div>
  )
}