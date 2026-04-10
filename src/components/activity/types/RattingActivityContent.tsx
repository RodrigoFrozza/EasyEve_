'use client'

import { useState, useMemo } from 'react'
import { formatISK, cn, calculateNetProfit, timeAgo, formatNumber } from '@/lib/utils'
import { useActivityStore } from '@/lib/stores/activity-store'
import { FleetSection } from '../shared/FleetSection'
import { MTULootField } from '../MTULootField'
import { SalvageField } from '../SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw, TrendingUp, TrendingDown, StopCircle, History, Activity as ActivityIcon } from 'lucide-react'
import { Sparkline } from '@/components/ui/Sparkline'
import { ActivityDetailDialog } from '../ActivityDetailDialog'
import { MTUInputModal, SalvageInputModal, ConfirmEndModal } from '../modals'

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
  displayMode = 'compact',
  onEnd
}: RattingActivityContentProps) {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleet: true,
    mtu: false,
    salvage: false
  })

  const [mtuModalOpen, setMtuModalOpen] = useState(false)
  const [salvageModalOpen, setSalvageModalOpen] = useState(false)
  const [confirmEndOpen, setConfirmEndOpen] = useState(false)

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const automatedBounties = activity.data?.automatedBounties || 0
  const automatedEss = activity.data?.automatedEss || 0
  const automatedTaxes = activity.data?.automatedTaxes || 0
  const additionalBounties = activity.data?.additionalBounties || 0

  const totalIsk = calculateNetProfit(activity.data)
  const durationHours = Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)
  const iskPerHour = totalIsk / durationHours

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

  if (displayMode === 'compact') {
    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="space-y-3">
          <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
            {activity.participants.map((p: any) => (
              <div key={p.characterId} className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2 bg-zinc-900/40 border border-white/[0.03] rounded-xl hover:bg-zinc-900/60 transition-colors">
                <Avatar className="h-8 w-8 border border-zinc-700">
                  <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                  <AvatarFallback className="bg-zinc-900 text-[10px] font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <span className="text-[8px] text-zinc-400 font-black uppercase tracking-wider truncate max-w-[50px]">
                  {p.characterName?.split(' ')[0]}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-green-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-green-400/70 uppercase font-black tracking-wider mb-1">Total Bounty</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(automatedBounties + additionalBounties)}
              </p>
            </div>

            <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-8 h-8 bg-yellow-500/10 blur-xl rounded-full" />
              <p className="text-[8px] text-yellow-400/70 uppercase font-black tracking-wider mb-1">Total ESS</p>
              <p className="text-sm font-black text-white font-mono tracking-tight">
                {formatISK(automatedEss)}
              </p>
              {essCountdown && (
                <p className="text-[8px] text-cyan-400 font-mono mt-1">{essCountdown}</p>
              )}
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

          <div className="flex gap-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setMtuModalOpen(true)}
              className="flex-1 h-10 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-wider"
            >
              <span className="mr-1">+</span> Add MTU
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={() => setSalvageModalOpen(true)}
              className="flex-1 h-10 bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-400 rounded-xl text-[10px] font-black uppercase tracking-wider"
            >
              <span className="mr-1">+</span> Add Salvage
            </Button>
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
            Sync API
          </Button>
          
          <Button 
            size="sm" 
            variant="outline"
            className="h-10 px-4 bg-white/[0.02] border-white/[0.05] hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all"
          >
            <History className="h-3.5 w-3.5" />
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
          activityName={activity.data?.siteName || activity.item?.name || 'Ratting'}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
        {activity.participants.map((p: any) => (
          <div key={p.characterId} className="flex-shrink-0 flex flex-col items-center gap-1.5 p-2 bg-zinc-900/40 border border-white/[0.03] rounded-xl hover:bg-zinc-900/60 transition-colors">
            <Avatar className="h-10 w-10 border-2 border-zinc-700">
              <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
              <AvatarFallback className="bg-zinc-900 text-xs font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="text-center">
              <span className="text-[9px] text-zinc-300 font-bold block truncate max-w-[60px]">
                {p.characterName?.split(' ')[0]}
              </span>
              <span className="text-[7px] text-zinc-600 uppercase tracking-wider truncate max-w-[60px] block">
                {p.fit || '—'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-green-500/10 blur-xl rounded-full" />
          <p className="text-[9px] text-green-400/70 uppercase font-black tracking-wider mb-1">Bounty</p>
          <p className="text-xl font-black text-white font-mono tracking-tight">
            {formatISK(automatedBounties + additionalBounties)}
          </p>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 bg-yellow-500/10 blur-xl rounded-full" />
          <p className="text-[9px] text-yellow-400/70 uppercase font-black tracking-wider mb-1">ESS</p>
          <p className="text-xl font-black text-white font-mono tracking-tight">
            {formatISK(automatedEss)}
          </p>
          {essCountdown && (
            <p className="text-[9px] text-cyan-400 font-mono mt-1">{essCountdown}</p>
          )}
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Last Transactions</span>
          </div>
          <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar">
            {((activity.data as any)?.logs || []).slice(-10).reverse().map((log: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs p-2 bg-zinc-900/40 rounded-lg">
                <span className="text-zinc-400 truncate">{log.charName || 'Unknown'}</span>
                <span className="text-green-400 font-mono font-bold">{formatISK(log.amount || 0)}</span>
              </div>
            ))}
            {((activity.data as any)?.logs || []).length === 0 && (
              <p className="text-zinc-500 text-xs text-center py-4">No transactions yet</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-950/40 border border-white/[0.03] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-cyan-500" />
              <span className="text-[10px] text-zinc-400 uppercase font-black tracking-wider">Efficiency Chart</span>
            </div>
          </div>
          <div className="h-[120px] w-full">
            <Sparkline 
              data={incomeHistory} 
              width={300} 
              height={120} 
              color="#00d4ff" 
              strokeWidth={2}
            />
          </div>
        </div>
      </div>

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
            <RefreshCw className={cn("h-4 w-4 mr-2", syncStatus === 'success' && "text-green-500")} />
          )}
          Sync API
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setMtuModalOpen(true)}
          className="flex-1 h-12 bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/20 hover:border-blue-500/50 text-blue-400 rounded-xl text-[11px] font-black uppercase tracking-wider"
        >
          Add MTU
        </Button>

        <Button 
          size="sm" 
          variant="outline"
          onClick={() => setSalvageModalOpen(true)}
          className="flex-1 h-12 bg-orange-500/5 border-orange-500/20 hover:bg-orange-500/20 hover:border-orange-500/50 text-orange-400 rounded-xl text-[11px] font-black uppercase tracking-wider"
        >
          Add Salvage
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
        activityName={activity.data?.siteName || activity.item?.name || 'Ratting'}
      />
    </div>
  )
}