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
  Loader2,
  Wrench,
  Wallet,
  PiggyBank,
  Package,
  Receipt,
  List,
  Table2
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { cn, formatISK } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { type Activity } from '@/lib/stores/activity-store'
import { MTULootField } from './MTULootField'
import { SalvageField } from './SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export interface ActivityCardProps {
  activity: Activity
  onEnd: () => void
}

export function ActivityCard({ activity, onEnd }: ActivityCardProps) {
  const [elapsed, setElapsed] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [isAppraising, setIsAppraising] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [viewMode, setViewMode] = useState<'list' | 'table'>('list')
  const [esiLootTotal, setEsiLootTotal] = useState(0)
  const [esiSalvageTotal, setEsiSalvageTotal] = useState(0)
  const [isSalvageAppraising, setIsSalvageAppraising] = useState(false)
  
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

  // Salvage ESI Market Appraisal
  useEffect(() => {
    const fetchSalvageAppraisal = async () => {
      if (!activity.data?.salvageContents || activity.data.salvageContents.length === 0) {
        setEsiSalvageTotal(0)
        return
      }

      setIsSalvageAppraising(true)
      const allNames: string[] = []
      activity.data.salvageContents.forEach((salvage: any) => {
        const lines = (salvage.loot || '').split('\n')
        lines.forEach((l: string) => {
          const name = l.split('\t')[0]?.trim()
          if (name && name.length > 2) allNames.push(name)
        })
      })

      if (allNames.length === 0) {
        setEsiSalvageTotal(0)
        setIsSalvageAppraising(false)
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
          activity.data.salvageContents.forEach((salvage: any) => {
            const lines = (salvage.loot || '').split('\n')
            lines.forEach((line: string) => {
              const parts = line.split('\t')
              const name = parts[0]?.trim().toLowerCase()
              const qty = parseInt(parts[1]?.replace(/[^0-9]/g, '')) || 1
              if (name && prices[name]) {
                totalValue += (prices[name] * qty)
              }
            })
          })
          setEsiSalvageTotal(totalValue)
        }
      } catch (e) {
        console.error('Salvage ESI Appraisal failed:', e)
      } finally {
        setIsSalvageAppraising(false)
      }
    }

    fetchSalvageAppraisal()
  }, [activity.data?.salvageContents])

  const estimatedLootValue = useMemo(() => esiLootTotal || 0, [esiLootTotal])
  const estimatedSalvageValue = useMemo(() => esiSalvageTotal || 0, [esiSalvageTotal])

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
          <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-eve-border/50 pb-3">
              <div className="flex items-center justify-between">
                <DialogTitle className="font-mono uppercase tracking-[0.15em] text-gray-300 text-sm">
                  Financial History
                </DialogTitle>
                <div className="flex items-center gap-1 bg-zinc-900/50 rounded p-0.5">
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      viewMode === 'list' ? "bg-eve-accent text-black" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    <List className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('table')}
                    className={cn(
                      "p-1.5 rounded transition-colors",
                      viewMode === 'table' ? "bg-eve-accent text-black" : "text-gray-500 hover:text-gray-300"
                    )}
                  >
                    <Table2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <DialogDescription className="text-[10px] text-gray-500">
                Session: {new Date(activity.startTime).toLocaleTimeString()} - {activity.endTime ? new Date(activity.endTime).toLocaleTimeString() : 'Active'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
              {/* Statistics Cards */}
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-green-950/20 border border-green-900/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wallet className="h-3 w-3 text-green-400" />
                    <span className="text-[9px] text-green-400/70 uppercase font-bold tracking-wider">Bounty</span>
                  </div>
                  <div className="text-sm font-bold text-green-400 font-mono">
                    {formatISK((activity.data?.automatedBounties || 0) + (activity.data?.additionalBounties || 0))}
                  </div>
                </div>
                <div className="bg-zinc-800/30 border border-zinc-700/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <PiggyBank className="h-3 w-3 text-zinc-400" />
                    <span className="text-[9px] text-zinc-400/70 uppercase font-bold tracking-wider">ESS</span>
                  </div>
                  <div className="text-sm font-bold text-zinc-300 font-mono">
                    {formatISK(activity.data?.automatedEss || 0)}
                  </div>
                </div>
                <div className="bg-blue-950/20 border border-blue-900/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Package className="h-3 w-3 text-blue-400" />
                    <span className="text-[9px] text-blue-400/70 uppercase font-bold tracking-wider">Loot</span>
                  </div>
                  <div className="text-sm font-bold text-blue-400 font-mono">
                    {formatISK(estimatedLootValue)}
                  </div>
                </div>
                <div className="bg-orange-950/20 border border-orange-900/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Wrench className="h-3 w-3 text-orange-400" />
                    <span className="text-[9px] text-orange-400/70 uppercase font-bold tracking-wider">Salvage</span>
                  </div>
                  <div className="text-sm font-bold text-orange-400 font-mono">
                    {formatISK(estimatedSalvageValue)}
                  </div>
                </div>
                <div className="bg-red-950/20 border border-red-900/30 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Receipt className="h-3 w-3 text-red-400" />
                    <span className="text-[9px] text-red-400/70 uppercase font-bold tracking-wider">Tax</span>
                  </div>
                  <div className="text-sm font-bold text-red-400 font-mono">
                    -{formatISK(activity.data?.automatedTaxes || 0)}
                  </div>
                </div>
                <div className="bg-eve-accent/10 border border-eve-accent/20 rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <TrendingUp className="h-3 w-3 text-eve-accent" />
                    <span className="text-[9px] text-eve-accent/70 uppercase font-bold tracking-wider">ISK/hr</span>
                  </div>
                  <div className="text-sm font-bold text-eve-accent font-mono">
                    {(() => {
                      const start = new Date(activity.startTime).getTime()
                      const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
                      const hours = (end - start) / 3600000
                      const total = 
                        (activity.data?.automatedBounties || 0) + 
                        (activity.data?.automatedEss || 0) + 
                        (activity.data?.additionalBounties || 0) +
                        estimatedLootValue +
                        estimatedSalvageValue
                      return hours > 0.01 ? formatISK(total / hours) : formatISK(0)
                    })()}
                  </div>
                </div>
              </div>

              {/* Metrics Summary */}
              <div className="flex items-center justify-between text-[10px] text-gray-500 bg-zinc-900/30 rounded px-2 py-1.5">
                <span>{activity.data?.logs?.length || 0} transactions</span>
                <span className="text-gray-400">
                  Avg: {formatISK(((activity.data?.logs || []).reduce((sum: number, l: any) => sum + l.amount, 0)) / Math.max((activity.data?.logs || []).length, 1))}
                </span>
              </div>

              {/* Transaction Logs - List View */}
              {viewMode === 'list' && (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto px-1 custom-scrollbar">
                  {(activity.data?.logs || []).length === 0 ? (
                    <p className="text-center text-[10px] text-gray-600 italic py-8 border border-dashed border-eve-border/30 rounded">
                      No transactions recorded yet. Click &quot;Sync&quot; to update.
                    </p>
                  ) : (
                    (activity.data?.logs || []).map((log: any, idx: number) => {
                      const typeColors: Record<string, string> = {
                        bounty: 'border-l-green-500 bg-green-950/10',
                        ess: 'border-l-zinc-400 bg-zinc-800/20',
                        tax: 'border-l-red-500 bg-red-950/10'
                      }
                      const typeIcons: Record<string, any> = {
                        bounty: Wallet,
                        ess: PiggyBank,
                        tax: Receipt
                      }
                      const IconComponent = typeIcons[log.type] || Wallet
                      
                      return (
                        <div key={idx} className={cn(
                          "flex items-center justify-between text-[11px] font-mono py-2 px-3 rounded border-l-2",
                          typeColors[log.type] || 'border-l-green-500 bg-green-950/10'
                        )}>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={`https://images.evesteam.es/characters/${log.charId}/portrait?size=32`} />
                              <AvatarFallback className="text-[8px] bg-zinc-800 text-zinc-400">
                                {log.charName?.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-gray-300 text-[10px] font-medium">{log.charName}</span>
                              <div className="flex items-center gap-1">
                                <IconComponent className={cn(
                                  "h-2.5 w-2.5",
                                  log.type === 'bounty' ? 'text-green-400' : 
                                  log.type === 'ess' ? 'text-zinc-400' : 'text-red-400'
                                )} />
                                <span className={cn(
                                  "text-[8px] uppercase font-bold",
                                  log.type === 'bounty' ? 'text-green-400/70' : 
                                  log.type === 'ess' ? 'text-zinc-500' : 'text-red-400/70'
                                )}>
                                  {log.type}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className={cn(
                              "font-bold text-[11px]",
                              log.type === 'tax' ? 'text-red-400' : 'text-green-400'
                            )}>
                              {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                            </span>
                            <p className="text-[8px] text-gray-600">
                              {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              )}

              {/* Transaction Logs - Table View */}
              {viewMode === 'table' && (
                <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-[10px] font-mono">
                    <thead className="sticky top-0 bg-zinc-900/90 backdrop-blur">
                      <tr className="text-gray-500 uppercase text-[9px] tracking-wider">
                        <th className="text-left py-2 px-2 font-medium">Time</th>
                        <th className="text-left py-2 px-2 font-medium">Character</th>
                        <th className="text-left py-2 px-2 font-medium">Type</th>
                        <th className="text-right py-2 px-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(activity.data?.logs || []).length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-gray-600 italic py-8">
                            No transactions recorded yet
                          </td>
                        </tr>
                      ) : (
                        (activity.data?.logs || []).map((log: any, idx: number) => (
                          <tr key={idx} className={cn(
                            "border-b border-eve-border/10",
                            idx % 2 === 0 ? "bg-zinc-900/20" : "bg-zinc-900/40"
                          )}>
                            <td className="py-2 px-2 text-gray-400">
                              {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="py-2 px-2">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-5 w-5">
                                  <AvatarImage src={`https://images.evesteam.es/characters/${log.charId}/portrait?size=32`} />
                                  <AvatarFallback className="text-[7px] bg-zinc-800 text-zinc-400">
                                    {log.charName?.slice(0, 2).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-gray-300">{log.charName}</span>
                              </div>
                            </td>
                            <td className="py-2 px-2">
                              <span className={cn(
                                "px-1.5 py-0.5 rounded text-[8px] uppercase font-bold",
                                log.type === 'bounty' ? 'bg-green-950/50 text-green-400' :
                                log.type === 'ess' ? 'bg-zinc-800/50 text-zinc-400' :
                                'bg-red-950/50 text-red-400'
                              )}>
                                {log.type}
                              </span>
                            </td>
                            <td className={cn(
                              "py-2 px-2 text-right font-bold",
                              log.type === 'tax' ? 'text-red-400' : 'text-green-400'
                            )}>
                              {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Totals Section */}
              <div className="border-t border-eve-border/50 pt-4 space-y-2 font-mono">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Bounty</span>
                  <span className="text-green-400 font-bold">+{formatISK((activity.data?.automatedBounties || 0) + (activity.data?.additionalBounties || 0))}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">ESS</span>
                  <span className="text-zinc-300 font-bold">+{formatISK(activity.data?.automatedEss || 0)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Loot</span>
                  <span className="text-blue-400 font-bold">+{formatISK(estimatedLootValue)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Salvage</span>
                  <span className="text-orange-400 font-bold">+{formatISK(estimatedSalvageValue)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Corp Tax</span>
                  <span className="text-red-400 font-bold">-{formatISK(activity.data?.automatedTaxes || 0)}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-eve-border/30 flex justify-between items-baseline">
                  <span className="text-[10px] uppercase font-black text-gray-500">NET RUN PROFIT</span>
                  <span className="text-xl font-black text-eve-accent tracking-tighter">
                    {formatISK(
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0) + 
                      estimatedLootValue +
                      estimatedSalvageValue - 
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
                    (activity.data?.additionalBounties || 0) +
                    estimatedLootValue +
                    estimatedSalvageValue
                  )}
                </div>
                <div className="flex flex-col gap-0.5 mt-1">
                  {(isAppraising || isSalvageAppraising) ? (
                    <div className="h-4 w-32 bg-zinc-800 animate-pulse rounded"></div>
                  ) : (
                    <>
                      {estimatedLootValue > 0 && (
                        <div className="text-xs font-bold text-blue-400 font-mono">
                          + {formatISK(estimatedLootValue)} (Loot)
                        </div>
                      )}
                      {estimatedSalvageValue > 0 && (
                        <div className="text-xs font-bold text-orange-400 font-mono">
                          + {formatISK(estimatedSalvageValue)} (Salvage)
                        </div>
                      )}
                    </>
                  )}
                </div>
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
                      (activity.data?.additionalBounties || 0) +
                      estimatedLootValue +
                      estimatedSalvageValue;
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

        {/* Loot & Salvage Section */}
        <div className="space-y-3 pt-4 border-t border-eve-border/30">
          <div className="flex items-center justify-between">
            <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
              <Box className="h-3 w-3" /> Loot & Salvage
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[9px] h-4 bg-blue-950/30 border-blue-900/30 text-blue-400">
                Loot: {activity.data?.mtuContents?.length || 0}
              </Badge>
              <Badge variant="outline" className="text-[9px] h-4 bg-orange-950/30 border-orange-900/30 text-orange-400">
                Salvage: {activity.data?.salvageContents?.length || 0}
              </Badge>
            </div>
          </div>

          {/* Value Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-blue-950/20 border border-blue-900/30 rounded p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Box className="h-3 w-3 text-blue-400" />
                <span className="text-[10px] text-blue-400/70 font-medium">Loot</span>
              </div>
              {isAppraising ? (
                <div className="h-4 w-16 bg-blue-900/30 animate-pulse rounded"></div>
              ) : (
                <span className="text-xs font-bold text-blue-400 font-mono">
                  {formatISK(estimatedLootValue)}
                </span>
              )}
            </div>
            <div className="bg-orange-950/20 border border-orange-900/30 rounded p-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wrench className="h-3 w-3 text-orange-400" />
                <span className="text-[10px] text-orange-400/70 font-medium">Salvage</span>
              </div>
              {isSalvageAppraising ? (
                <div className="h-4 w-16 bg-orange-900/30 animate-pulse rounded"></div>
              ) : (
                <span className="text-xs font-bold text-orange-400 font-mono">
                  {formatISK(estimatedSalvageValue)}
                </span>
              )}
            </div>
          </div>

          {/* Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-2">
              <p className="text-[9px] text-blue-400/50 uppercase font-bold tracking-wider">MTU Loot</p>
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
            <div className="space-y-2">
              <p className="text-[9px] text-orange-400/50 uppercase font-bold tracking-wider">Salvage</p>
              <SalvageField 
                value={activity.data?.salvageContents || []} 
                activityId={activity.id}
                onChange={async (salvage) => {
                  const store = (await import('@/lib/stores/activity-store')).useActivityStore.getState();
                  store.updateActivity(activity.id, {
                    data: { ...activity.data, salvageContents: salvage }
                  });
                }} 
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
