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

interface ActivityCardProps {
  activity: Activity
  onUpdate: (id: string, updates: Partial<Activity>) => void
  onDelete: (id: string) => void
  isCharacterBusy: (charId: number, excludeId?: string) => boolean
}

export function ActivityCard({ activity, onUpdate, onDelete, isCharacterBusy }: ActivityCardProps) {
  const [elapsed, setElapsed] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
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
      
      setElapsed(`${hours}h ${minutes}m ${seconds}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [activity.startTime, activity.endTime])

  const handleSyncFinancials = async () => {
    setIsSyncing(true)
    setSyncStatus('idle')
    try {
      const res = await fetch('/api/activities/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activityId: activity.id })
      })
      if (res.ok) {
        setSyncStatus('success')
        const data = await res.json()
        onUpdate(activity.id, { 
          totalIsk: data.totalBounty + data.totalEss,
          data: { ...activity.data, syncLog: data.log }
        })
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
    <Card className="overflow-hidden border-zinc-800 bg-zinc-900/50 backdrop-blur-sm transition-all hover:bg-zinc-900/80">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("p-2 rounded-lg", typeInfo?.bg)}>
              {typeInfo && <typeInfo.icon className={cn("h-5 w-5", typeInfo.color)} />}
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-zinc-100 uppercase tracking-tighter">
                {typeInfo?.label}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 font-medium">
                ID: {activity.id.slice(-8)} • {new Date(activity.startTime).toLocaleTimeString()}
              </CardDescription>
            </div>
          </div>
          <Badge variant={activity.status === 'active' ? 'default' : 'secondary'} className={cn(
            "text-[10px] uppercase font-bold tracking-widest px-2",
            activity.status === 'active' ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"
          )}>
            {activity.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Financial KPIs */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
            <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-zinc-500 uppercase mb-1">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-500" />
                Net Bounty
              </div>
              {activity.data?.lastSyncAt && (
                <span className="text-[9px] text-zinc-600 font-normal lowercase italic">
                  sync {new Date(activity.data.lastSyncAt).toISOString().split('T')[1].slice(0, 5)} utc
                </span>
              )}
            </div>
            <div className="text-lg font-bold text-zinc-100 tracking-tight">
              {formatISK(activity.totalIsk || 0)}
            </div>
          </div>
          <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800/50">
            <div className="flex items-center gap-2 text-[10px] font-bold text-zinc-500 uppercase mb-1">
              <RefreshCw className="h-3 w-3 text-blue-500" />
              Loot (Est. Jita)
            </div>
            {isAppraising ? (
              <div className="h-7 w-24 bg-zinc-800 animate-pulse rounded mt-1"></div>
            ) : (
              <div className="text-lg font-bold text-zinc-100 tracking-tight">
                {formatISK(estimatedLootValue)}
              </div>
            )}
          </div>
        </div>

        {/* Activity Details / Participants */}
        <div className="flex flex-wrap gap-2 py-1 border-t border-zinc-800/50 mt-2 pt-3">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-800/30 text-[11px] font-medium text-zinc-400">
            <Clock className="h-3 w-3 text-zinc-500" />
            {elapsed}
          </div>
          {activity.participants.map(p => (
            <div key={p.characterId} className="flex items-center gap-1.5 px-2 py-1 rounded bg-blue-500/5 border border-blue-500/10 text-[11px] font-medium text-blue-400">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              {p.characterName}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {activity.status === 'active' ? (
            <Button 
              size="sm" 
              variant="outline"
              className="flex-1 bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all text-xs font-bold uppercase"
              onClick={() => onUpdate(activity.id, { status: 'completed', endTime: new Date().toISOString() })}
            >
              <StopCircle className="mr-2 h-4 w-4" />
              Finalizar
            </Button>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="flex-1 bg-zinc-800/50 border-zinc-700 text-zinc-300 hover:bg-zinc-700 text-xs font-bold uppercase">
                  <History className="mr-2 h-4 w-4" />
                  Histórico
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-zinc-950 border-zinc-800">
                <DialogHeader>
                  <DialogTitle className="text-xl font-bold uppercase tracking-tighter text-zinc-100 flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-500" />
                    Bounty History
                  </DialogTitle>
                  <DialogDescription className="text-zinc-500 text-xs font-medium uppercase mt-1">
                    Auditoria de Wallet e Ingressos de Bounty (Net after Tax)
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                  {activity.data?.syncLog?.map((log: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                          {new Date(log.date).toLocaleTimeString()}
                        </div>
                        <div className="text-xs font-medium text-zinc-300">
                          Transferência Net (Bounty)
                        </div>
                      </div>
                      <div className="text-sm font-bold text-green-400">
                        + {formatISK(log.amount)}
                      </div>
                    </div>
                  ))}
                  {(!activity.data?.syncLog || activity.data.syncLog.length === 0) && (
                    <div className="py-12 text-center space-y-3">
                      <Box className="h-10 w-10 text-zinc-800 mx-auto" />
                      <p className="text-zinc-600 text-sm font-medium">Nenhum registro de bounty sincronizado.</p>
                    </div>
                  )}
                </div>
                <div className="pt-4 border-t border-zinc-800 flex justify-between items-center text-xs">
                  <span className="text-zinc-500 uppercase font-bold tracking-tighter text-sm">Total Acumulado</span>
                  <span className="text-lg font-bold text-zinc-100">{formatISK(activity.totalIsk || 0)}</span>
                </div>
              </DialogContent>
            </Dialog>
          )}

          {activity.status === 'active' && (
            <Button 
              size="sm" 
              variant="outline"
              disabled={isSyncing}
              className={cn(
                "w-12 border-zinc-800 transition-all",
                syncStatus === 'success' && "border-green-500/50 bg-green-500/10 text-green-500",
                syncStatus === 'error' && "border-red-500/50 bg-red-500/10 text-red-500"
              )}
              onClick={handleSyncFinancials}
            >
              {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : 
               syncStatus === 'success' ? <CheckCircle className="h-4 w-4" /> :
               syncStatus === 'error' ? <XCircle className="h-4 w-4" /> :
               <RefreshCw className="h-4 w-4 text-zinc-400" />}
            </Button>
          )}

          <Button 
            size="sm" 
            variant="ghost" 
            className="w-10 text-zinc-600 hover:text-red-500 hover:bg-red-500/10"
            onClick={() => onDelete(activity.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}
