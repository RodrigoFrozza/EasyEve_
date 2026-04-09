'use client'

import { useState, useMemo } from 'react'
import { formatISK, cn, calculateNetProfit, timeAgo } from '@/lib/utils'
import { useActivityStore } from '@/lib/stores/activity-store'
import { FleetSection } from '../shared/FleetSection'
import { MTULootField } from '../MTULootField'
import { SalvageField } from '../SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

interface RattingActivityContentProps {
  activity: any
  onSync: () => void
  isSyncing: boolean
  syncStatus: 'idle' | 'success' | 'error'
  essCountdown?: string
}

export function RattingActivityContent({ 
  activity, 
  onSync, 
  isSyncing, 
  syncStatus,
  essCountdown 
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

  return (
    <div className="space-y-3">
      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2 backdrop-blur-sm">
          <p className="text-[8px] text-green-400/50 uppercase font-bold tracking-widest mb-1">Bounty</p>
          <p className="text-xs font-bold text-green-400 font-mono tracking-tight">
            {formatISK(automatedBounties + additionalBounties)}
          </p>
        </div>
        <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <p className="text-[8px] text-yellow-400/50 uppercase font-bold tracking-widest mb-1">ESS</p>
            <p className="text-xs font-bold text-yellow-400 font-mono tracking-tight text-green-400">{formatISK(automatedEss)}</p>
          </div>
        </div>
        <div className="bg-red-500/5 border border-red-500/10 rounded-lg p-2 backdrop-blur-sm">
          <p className="text-[8px] text-red-400/50 uppercase font-bold tracking-widest mb-1">Taxes</p>
          <p className="text-xs font-bold text-red-400 font-mono tracking-tight">
            {formatISK(automatedTaxes)}
          </p>
        </div>
      </div>

      {/* Status Bar */}
      <div className="mb-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 backdrop-blur-md flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[8px] text-cyan-400/50 uppercase font-black tracking-[0.2em]">Net ISK Profit</p>
          <p className="text-sm font-bold text-white font-mono leading-none">{formatISK(totalIsk)}</p>
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
              ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Fleet
        </button>
        <button
          onClick={() => toggleSection('mtu')}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.mtu 
              ? "bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-[0_0_12px_rgba(59,130,246,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          MTU
        </button>
        <button
          onClick={() => toggleSection('salvage')}
          className={cn(
            "flex-1 px-4 py-2 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300",
            expandedSections.salvage 
              ? "bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_12px_rgba(249,115,22,0.1)]" 
              : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-900/50"
          )}
        >
          Salvage
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[220px]">
        {expandedSections.fleet && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              {activity.participants.map((p: any) => (
                <div key={p.characterId} className="flex items-center gap-3 p-2.5 bg-zinc-950/40 border border-zinc-900/50 rounded-lg backdrop-blur-sm group/p">
                  <Avatar className="h-10 w-10 border border-zinc-800 group-hover/p:border-cyan-500/50 transition-colors">
                    <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                    <AvatarFallback className="bg-zinc-900 text-[10px] tracking-tighter">{p.characterName?.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200 truncate tracking-tight">{p.characterName}</p>
                    <p className="text-[10px] text-zinc-600 truncate uppercase font-bold tracking-widest">{p.fit || 'No fit recorded'}</p>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-green-500/50 animate-pulse" />
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
      
      {/* Sync Button & Info */}
      <div className="pt-4 mt-2 border-t border-zinc-900/50 space-y-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-[8px] text-zinc-600 uppercase font-bold tracking-widest">
            {activity.data?.lastSyncAt ? `Last Sync: ${timeAgo(activity.data.lastSyncAt)}` : 'No sync data'}
          </p>
          {essCountdown && activity.status === 'active' && (
            <p className="text-[8px] text-cyan-500 font-mono font-bold uppercase tracking-wider">Next Payout: {essCountdown}</p>
          )}
        </div>
        <button 
          disabled={isSyncing}
          onClick={onSync}
          className="w-full h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-800/50 flex items-center justify-center gap-2 transition-all"
        >
          {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> :
           syncStatus === 'success' ? <span className="text-green-500">✓</span> :
           syncStatus === 'error' ? <span className="text-red-500">✗</span> :
           <span className="text-zinc-400">⟳</span>}
          {isSyncing ? 'Syncing...' : 'Sync ESI'}
        </button>
      </div>
    </div>
  )
}