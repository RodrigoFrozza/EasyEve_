'use client'

import { useState, useMemo } from 'react'
import { formatISK, cn, calculateNetProfit, timeAgo, formatNumber } from '@/lib/utils'
import { useActivityStore } from '@/lib/stores/activity-store'
import { FleetSection } from '../shared/FleetSection'
import { MTULootField } from '../MTULootField'
import { SalvageField } from '../SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, TrendingUp, StopCircle, History } from 'lucide-react'
import { Sparkline } from '@/components/ui/Sparkline'
import { ActivityDetailDialog } from '../ActivityDetailDialog'

interface RattingActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  essCountdown?: string
  displayMode?: 'compact' | 'tabs' | 'expanded'
  onEnd?: () => void
}

export function RattingActivityContent({ 
  activity, 
  onSync, 
  isSyncing, 
  syncStatus,
  essCountdown,
  displayMode = 'expanded',
  onEnd
}: RattingActivityContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleet: true,
    mtu: false,
    salvage: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const automatedBounties = activity.data?.automatedBounties || 0
  const automatedEss = activity.data?.automatedEss || 0
  const automatedTaxes = activity.data?.automatedTaxes || 0
  const additionalBounties = activity.data?.additionalBounties || 0
  const estimatedLootValue = activity.data?.estimatedLootValue || 0 
  const estimatedSalvageValue = activity.data?.estimatedSalvageValue || 0

  const totalIsk = calculateNetProfit(activity.data)
  const durationHours = Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)
  const iskPerHour = totalIsk / durationHours

  const incomeHistory = (activity.data as any)?.incomeHistory || []
  const mtuContents = activity.data?.mtuContents || []
  const salvageContents = activity.data?.salvageContents || []

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

  if (displayMode === 'compact') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid grid-cols-1 gap-4">
          <div className="relative bg-gradient-to-br from-zinc-900 to-black p-6 rounded-2xl border border-white/[0.03] overflow-hidden group/hud shadow-2xl">
            {/* Background Sparkline */}
            <div className="absolute inset-x-0 bottom-0 top-1/2 opacity-20 pointer-events-none transition-opacity group-hover/hud:opacity-40">
              <Sparkline 
                data={incomeHistory} 
                width={400} 
                height={80} 
                color="#00ffff" 
                className="w-full h-full"
                strokeWidth={3}
              />
            </div>

            <div className="relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 flex items-center gap-2">
                   <TrendingUp className="h-3 w-3 text-eve-accent" />
                   Net Revenue
                </p>
                <p className="text-4xl font-black text-white font-mono tracking-tighter flex items-baseline gap-2">
                  <span className="text-eve-accent drop-shadow-[0_0_10px_rgba(0,255,255,0.4)]">
                    {formatISK(totalIsk)}
                  </span>
                  <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">ISK</span>
                </p>
              </div>
              
              <div className="text-left sm:text-right space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Hourly Rate</p>
                <p className="text-xl font-black text-cyan-400 font-mono tracking-tighter">
                  {formatISK(iskPerHour)}/h
                </p>
              </div>
            </div>
          </div>

          {/* Action Cluster */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="outline"
              disabled={isSyncing}
              onClick={onSync}
              className={cn(
                "flex-1 h-12 bg-white/[0.02] border-white/[0.05] hover:bg-eve-accent/10 hover:border-eve-accent/50 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-eve-accent transition-all duration-500 rounded-xl",
                isSyncing && "animate-pulse border-eve-accent/50 bg-eve-accent/5"
              )}
            >
              {isSyncing ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className={cn("h-4 w-4 mr-2", syncStatus === 'success' && "text-green-500")} />
              )}
              {isSyncing ? 'Linking ESI...' : 'Synchronize'}
            </Button>
            
            <ActivityDetailDialog 
              activity={activity} 
              trigger={
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-12 px-6 bg-white/[0.02] border-white/[0.05] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
                >
                  <History className="h-4 w-4" />
                </Button>
              }
            />
            
            <Button 
              size="sm"
              variant="outline"
              onClick={onEnd}
              className="h-12 px-6 bg-red-500/5 border-red-500/10 hover:bg-red-500 hover:text-black hover:border-red-500 rounded-xl text-red-500 transition-all group/end"
            >
              <StopCircle className="h-4 w-4 group-hover/end:scale-110 transition-transform" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats Grid - Instruments Style */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group/inst transition-all hover:border-eve-accent/20">
            <div className="absolute top-0 right-0 p-4 bg-green-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
              BOUNTY
            </p>
            <div className="space-y-0.5 relative z-10">
              <p className="text-xl font-black text-white font-mono tracking-tighter">
                {formatISK(automatedBounties + additionalBounties)}
              </p>
              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                 <div className="h-full bg-green-500/50 w-[70%]" />
              </div>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group/inst transition-all hover:border-eve-accent/20">
            <div className="absolute top-0 right-0 p-4 bg-yellow-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
              ESS
            </p>
            <div className="space-y-0.5 relative z-10">
              <p className="text-xl font-black text-white font-mono tracking-tighter">
                {formatISK(automatedEss)}
              </p>
              {essCountdown && (
                <p className="text-[9px] text-cyan-500 font-mono font-bold animate-pulse">{essCountdown}</p>
              )}
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4 backdrop-blur-md relative overflow-hidden group/inst transition-all hover:border-eve-accent/20">
            <div className="absolute top-0 right-0 p-4 bg-red-500/5 blur-2xl rounded-full" />
            <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-2 flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
              TAXES
            </p>
            <div className="space-y-0.5 relative z-10">
              <p className="text-xl font-black text-zinc-400 font-mono tracking-tighter">
                {formatISK(automatedTaxes)}
              </p>
              <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden">
                 <div className="h-full bg-red-500/30 w-[15%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Summary HUD */}
        <div className="p-5 rounded-2xl bg-gradient-to-r from-eve-accent/10 to-transparent border border-eve-accent/20 backdrop-blur-xl flex items-center justify-between shadow-[0_0_30px_rgba(0,255,255,0.05)]">
          <div className="space-y-1">
            <p className="text-[10px] text-eve-accent font-black tracking-[0.3em] uppercase opacity-70">METRIC ANALYTICS // PROFIT</p>
            <p className="text-3xl font-black text-white font-mono tracking-tighter leading-none flex items-baseline gap-2">
              {formatISK(totalIsk)}
              <span className="text-sm text-zinc-600 font-black uppercase">ISK</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 font-black tracking-[0.2em] uppercase mb-1">EFFICIENCY SCALE</p>
            <div className="bg-black/40 px-4 py-2 rounded-xl border border-white/[0.05] shadow-inner">
              <p className="text-lg font-black text-cyan-400 font-mono leading-none tracking-tighter">{formatISK(iskPerHour)}/h</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex gap-1.5 p-1.5 rounded-2xl bg-zinc-950/60 border border-white/[0.03] mb-6 mt-4 backdrop-blur-xl shadow-inner">
        <button
          onClick={() => setExpandedSections({ fleet: true, mtu: false, salvage: false })}
          className={cn(
            "flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500",
            expandedSections.fleet 
              ? "bg-eve-accent text-black shadow-[0_0_20px_rgba(0,255,255,0.2)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]"
          )}
        >
          Fleet
        </button>
        <button
          onClick={() => setExpandedSections({ fleet: false, mtu: true, salvage: false })}
          className={cn(
            "flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500",
            expandedSections.mtu 
              ? "bg-blue-500 text-black shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]"
          )}
        >
          MTU
        </button>
        <button
          onClick={() => setExpandedSections({ fleet: false, mtu: false, salvage: true })}
          className={cn(
            "flex-1 px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl transition-all duration-500",
            expandedSections.salvage 
              ? "bg-orange-500 text-black shadow-[0_0_20px_rgba(249,115,22,0.2)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.02]"
          )}
        >
          Salvage
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[220px] relative">
        {expandedSections.fleet && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activity.participants.map((p: any) => (
                <div key={p.characterId} className="flex items-center gap-4 p-4 bg-zinc-950/40 border border-white/[0.03] rounded-2xl backdrop-blur-sm group/p transition-all hover:bg-zinc-900/60 hover:border-eve-accent/30 shadow-lg">
                  <div className="relative">
                    <Avatar className="h-12 w-12 border-2 border-zinc-800 transition-transform group-hover/p:scale-110 group-hover/p:border-eve-accent/50 duration-500 shadow-xl">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="bg-zinc-900 text-xs font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -top-1 -right-1 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-[#050507] shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-zinc-100 truncate tracking-tight group-hover/p:text-white transition-colors">{p.characterName}</p>
                    <p className="text-[10px] text-zinc-600 truncate uppercase font-black tracking-widest leading-none mt-1.5 group-hover/p:text-eve-accent transition-colors">{p.fit || '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {expandedSections.mtu && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <MTULootField 
              value={mtuContents} 
              activityId={activity.id}
              mtuValues={activity.data?.mtuValues || []}
              onChange={handleMTUChange}
            />
          </div>
        )}

        {expandedSections.salvage && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <SalvageField 
              value={salvageContents} 
              activityId={activity.id}
              onChange={handleSalvageChange}
            />
          </div>
        )}
      </div>
      
      {/* Sync Footer */}
      <div className="pt-6 mt-6 border-t border-white/[0.05] space-y-4">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-2">
             <div className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
             <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest font-mono">
               {activity.data?.lastSyncAt ? `Last Sync: ${timeAgo(activity.data.lastSyncAt)}` : 'ESI Data Pending...'}
             </p>
          </div>
        </div>
        <button 
          disabled={isSyncing}
          onClick={onSync}
          className={cn(
            "w-full h-14 text-[11px] uppercase font-black tracking-[0.3em] rounded-2xl transition-all duration-700 flex items-center justify-center gap-3 relative overflow-hidden group/sync",
            isSyncing 
              ? "bg-eve-accent/10 border-eve-accent/30 text-eve-accent animate-pulse" 
              : "bg-zinc-950/60 border border-white/[0.05] hover:bg-zinc-900 text-zinc-500 hover:text-white hover:border-eve-accent/50 shadow-2xl"
          )}
        >
          <div className="absolute inset-x-0 bottom-0 h-0.5 bg-eve-accent opacity-0 group-hover/sync:opacity-100 transition-opacity" />
          {isSyncing ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <RefreshCw className={cn("h-5 w-5 transition-transform duration-700 group-hover/sync:rotate-180", syncStatus === 'success' && "text-green-500")} />
          )}
          <span>{isSyncing ? 'Linking Satellite Data...' : 'Synchronize ESI'}</span>
        </button>
      </div>
    </div>
  )
}