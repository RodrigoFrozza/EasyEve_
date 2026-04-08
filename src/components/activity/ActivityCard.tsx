'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Box, 
  Play, 
  StopCircle, 
  Trash2, 
  RefreshCw, 
  History, 
  Clock, 
  TrendingUp, 
  Plus, 
  X,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { cn, formatISK, formatNumber } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { type Activity } from '@/lib/stores/activity-store'
import { MTULootField } from './MTULootField'

export interface ActivityCardProps {
  activity: Activity
  onEnd: () => void
}

export function ActivityCard({ activity, onEnd }: ActivityCardProps) {
  const [elapsed, setElapsed] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAppraising, setIsAppraising] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [esiLootTotal, setEsiLootTotal] = useState(0)
  
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)

  // Pure ESI Market Appraisal
  useEffect(() => {
    const fetchESIAppraisal = async () => {
      if (!activity.data?.mtuContents || activity.data.mtuContents.length === 0) {
        setEsiLootTotal(0)
        return
      }

      setIsAppraising(true)
      const allNames: string[] = []
      activity.data.mtuContents.forEach((mtu: any) => {
        const lines = (mtu.loot || '').split('\n')
        lines.forEach((l: string) => {
          const name = l.split('\t')[0]?.trim()
          if (name && name.length > 2) allNames.push(name)
        })
      })

      if (allNames.length === 0) {
        setEsiLootTotal(0)
        setIsAppraising(false)
        return
      }

      try {
        const res = await fetch('/api/market/appraisal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: Array.from(new Set(allNames)) })
        })
        if (res.ok) {
          const { prices } = await res.json()
          let totalValue = 0
          activity.data.mtuContents.forEach((mtu: any) => {
            const lines = (mtu.loot || '').split('\n')
            lines.forEach((line: string) => {
              const parts = line.split('\t')
              const name = parts[0]?.trim().toLowerCase()
              const qty = parseInt(parts[1]?.replace(/[^0-9]/g, '')) || 1
              if (name && prices[name]) {
                totalValue += (prices[name] * qty)
              }
            })
          })
          setEsiLootTotal(totalValue)
        }
      } catch (e) {
        console.error('ESI Appraisal failed:', e)
      } finally {
        setIsAppraising(false)
      }
    }

    fetchESIAppraisal()
  }, [activity.data?.mtuContents])

  const estimatedLootValue = useMemo(() => esiLootTotal || 0, [esiLootTotal])

  useEffect(() => {
    const timer = setInterval(() => {
      const start = new Date(activity.startTime).getTime()
      const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
      const diff = end - start
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setElapsed(`${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [activity.startTime, activity.endTime])

  const handleSyncFinancials = async () => {
    setIsSyncing(true)
    setSyncStatus('idle')
    try {
      const res = await fetch(`/api/activities/sync?id=${activity.id}`, { method: 'POST' });
      if (res.ok) {
        setSyncStatus('success')
        const updated = await res.json()
        const store = (await import('@/lib/stores/activity-store')).useActivityStore.getState();
        store.updateActivity(activity.id, updated)
      } else {
        setSyncStatus('error')
      }
    } catch (e) {
      setSyncStatus('error')
    } finally {
      setTimeout(() => {
        setIsSyncing(false)
        setTimeout(() => setSyncStatus('idle'), 3000)
      }, 500)
    }
  }

  return (
    <Card className="bg-eve-panel border-eve-border overflow-hidden relative group">
      <div className={cn("absolute top-0 left-0 w-1 h-full", typeInfo?.color.replace('text-', 'bg-'))} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={cn("capitalize", typeInfo?.bg, typeInfo?.color)}>
            {activity.type}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {elapsed}
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <CardTitle className="text-xl mt-2 flex items-center justify-between cursor-pointer hover:text-eve-accent transition-colors">
              <span className="truncate">{(activity as any).item?.name || activity.data?.siteName || 'Active Operations'}</span>
              <div className="flex items-center gap-2">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnd();
                  }}
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10 rounded-full"
                >
                  <StopCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardTitle>
          </DialogTrigger>
          <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[500px]">
            <DialogHeader className="border-b border-eve-border/50 pb-4">
              <DialogTitle className="text-center font-mono uppercase tracking-[0.2em] text-gray-400">
                Bounty History
              </DialogTitle>
              <DialogDescription className="text-center text-[10px] text-gray-500">
                Session: {new Date(activity.startTime).toLocaleTimeString()} - {activity.endTime ? new Date(activity.endTime).toLocaleTimeString() : 'Active'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {/* Transaction Logs */}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto px-2 custom-scrollbar">
                {(activity.data?.logs || []).length === 0 ? (
                  <p className="text-center text-[10px] text-gray-600 italic py-8 border border-dashed border-eve-border/30 rounded">
                    No transactions recorded yet. Click "Sync" to update.
                  </p>
                ) : (
                  (activity.data?.logs || []).map((log: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] font-mono py-1.5 border-b border-eve-border/10">
                      <div className="flex flex-col">
                        <span className="text-gray-400 font-bold uppercase text-[9px]">{log.type}</span>
                        <span className="text-gray-600 text-[9px]">{log.charName}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-bold",
                          log.type === 'tax' ? 'text-red-400' : 'text-green-400/80'
                        )}>
                          {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                        </span>
                        <p className="text-[8px] text-gray-600">
                          {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Section */}
              <div className="border-t border-eve-border/50 pt-6 space-y-3 font-mono">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Bounty</span>
                  <span className="text-green-400 font-bold">+{formatISK((activity.data?.automatedBounties || 0) + (activity.data?.additionalBounties || 0))}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">ESS (BANCO)</span>
                  <span className="text-green-400 font-bold">+{formatISK(activity.data?.automatedEss || 0)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">LOOT</span>
                  <span className="text-blue-400 font-bold">+{formatISK(estimatedLootValue)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">CORP TAX</span>
                  <span className="text-red-400 font-bold">-{formatISK(activity.data?.automatedTaxes || 0)}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-eve-border/30 flex justify-between items-baseline">
                  <span className="text-[10px] uppercase font-black text-gray-500">NET RUN PROFIT</span>
                  <span className="text-xl font-black text-eve-accent tracking-tighter">
                    {formatISK(
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0) + 
                      estimatedLootValue - 
                      (activity.data?.automatedTaxes || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Detail Grid */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Space Type</p>
            <div className="flex items-center gap-2 text-white font-medium">
              <Box className="h-3 w-3 text-zinc-500" />
              {activity.space || 'Unknown'}
            </div>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Detail</p>
            <div className="text-white font-medium">
              {activity.data?.siteType || activity.data?.tier || activity.data?.miningType || 'General'}
            </div>
          </div>
        </div>

        {/* Participants */}
        <div className="space-y-2">
          <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Active Fleet</p>
          <div className="flex flex-wrap gap-2">
            {activity.participants.map(p => (
              <div key={p.characterId} className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-950/50 border border-zinc-800 text-[11px] font-medium text-zinc-400">
                <div className="w-1.5 h-1.5 rounded-full bg-eve-accent animate-pulse" />
                {p.characterName}
              </div>
            ))}
          </div>
        </div>

        {/* Financial Highlights */}
        {activity.type === 'ratting' && (
          <div className="space-y-3 pt-2 border-t border-eve-border/30">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Net ISK Profit</p>
                <div className="text-lg font-bold text-green-400 font-mono leading-none">
                  {formatISK(
                    (activity.data?.automatedBounties || 0) + 
                    (activity.data?.automatedEss || 0) + 
                    (activity.data?.additionalBounties || 0)
                  )}
                </div>
                {isAppraising ? (
                   <div className="h-4 w-24 bg-zinc-800 animate-pulse rounded mt-1"></div>
                ) : (
                  estimatedLootValue > 0 && (
                    <div className="text-xs font-bold text-blue-400 font-mono mt-0.5">
                      + {formatISK(estimatedLootValue)} (Loot)
                    </div>
                  )
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Est. ISK/hr</p>
                <div className="text-sm font-medium text-eve-accent font-mono">
                  {(() => {
                    const start = new Date(activity.startTime).getTime()
                    const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
                    const hours = (end - start) / 3600000;
                    const total = 
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0);
                    return hours > 0.01 ? formatISK(total / hours) : formatISK(0);
                  })()}/hr
                </div>
              </div>
            </div>

            {/* ESS Payout Timer */}
            <div className="bg-zinc-950/50 rounded p-2 flex items-center justify-between border border-eve-border/20">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-yellow-500/70" />
                <span className="text-[10px] uppercase font-bold text-zinc-500">Next ESS Payout</span>
              </div>
              <span className="text-[11px] font-mono text-yellow-500 font-bold">
                {(() => {
                  const logs = activity.data?.logs || [];
                  const essLogs = logs.filter((l: any) => l.type === 'ess');
                  if (essLogs.length === 0) return 'WAITING SYNC...';
                  
                  const lastPayout = new Date(essLogs[0].date).getTime();
                  const nextPayout = lastPayout + (160 * 60 * 1000); // 2h 40m
                  const diff = nextPayout - Date.now();
                  
                  if (diff <= 0) return 'PAYING NOW...';
                  
                  const h = Math.floor(diff / 3600000);
                  const m = Math.floor((diff % 3600000) / 60000);
                  return `${h}h ${m}m`;
                })()}
              </span>
            </div>

            {/* Actions for Ratting */}
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                disabled={isSyncing}
                className={cn(
                  "flex-1 text-[10px] h-8 transition-all duration-300 uppercase font-black tracking-tighter",
                  syncStatus === 'success' ? "bg-green-500/20 border-green-500/50 text-green-400" :
                  syncStatus === 'error' ? "bg-red-500/20 border-red-500/50 text-red-400" :
                  "bg-eve-accent/10 border-eve-accent/20 text-white hover:bg-eve-accent hover:text-black"
                )}
                onClick={handleSyncFinancials}
              >
                {isSyncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                 syncStatus === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                 syncStatus === 'error' ? <XCircle className="h-3 w-3 mr-1" /> :
                 <RefreshCw className="h-3 w-3 mr-1" />}
                {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Updated' : syncStatus === 'error' ? 'Failed' : 'Sync ESI'}
              </Button>
            </div>
          </div>
        )}

        {/* Managed MTUs & Loot Section */}
        <div className="space-y-3 pt-4 border-t border-eve-border/30">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Box className="h-3 w-3" /> Managed MTUs & Loot
            </p>
            <Badge variant="outline" className="text-[9px] h-4 bg-zinc-950/50 border-zinc-800 text-zinc-500">
              {activity.data?.mtuContents?.length || 0} Blocks
            </Badge>
          </div>

          <MTULootField 
            value={activity.data?.mtuContents || []} 
            activityId={activity.id}
            onChange={async (mtus) => {
              const store = (await import('@/lib/stores/activity-store')).useActivityStore.getState();
              store.updateActivity(activity.id, {
                data: { ...activity.data, mtuContents: mtus }
              });
            }} 
          />
        </div>
      </CardContent>
    </Card>
  )
}
