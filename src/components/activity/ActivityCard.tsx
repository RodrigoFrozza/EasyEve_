'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Image from 'next/image'
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
  Table2,
  HelpCircle,
  Download,
  Filter,
  LayoutGrid,
  AlignJustify,
  ChevronDown,
  ChevronUp
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
import { type Activity, useActivityStore } from '@/lib/stores/activity-store'
import { MTULootField } from './MTULootField'
import { SalvageField } from './SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

import { RattingHelpModal } from './RattingHelpModal'

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
  const [esiSalvageTotal, setEsiSalvageTotal] = useState(0)
  const [isSalvageAppraising, setIsSalvageAppraising] = useState(false)
  
  const [logFilterType, setLogFilterType] = useState('all')
  const [logFilterChar, setLogFilterChar] = useState('all')

  // Toggle de visualização
  const [displayMode, setDisplayMode] = useState<'compact' | 'tabs' | 'expanded'>('compact')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fleet: true,
    mtu: true,
    salvage: true,
    transactions: false
  })

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))
  }

  const logs = (activity.data as any)?.logs || []
  const [logsData, setLogsData] = useState<any[]>(logs)

  useEffect(() => {
    const syncStore = () => {
      const currentActivity = useActivityStore.getState().activities.find(a => a.id === activity.id);
      if (currentActivity) {
        setLogsData((currentActivity.data as any)?.logs || []);
      }
    };
    syncStore();
  }, [activity.id]);

  const uniqueChars = useMemo(() => {
    const chars = new Set<string>()
    logsData.forEach((l: any) => { if(l.charName) chars.add(l.charName) })
    return Array.from(chars)
  }, [logsData])

  const filteredLogs = useMemo(() => {
    return logsData.filter((log: any) => {
      const matchType = logFilterType === 'all' || log.type === logFilterType
      const matchChar = logFilterChar === 'all' || log.charName === logFilterChar
      return matchType && matchChar
    })
  }, [logsData, logFilterType, logFilterChar])

  const handleMTUChange = async (mtus: any[]) => {
    // 1. Atualiza store local (feedback imediato)
    useActivityStore.getState().updateActivity(activity.id, {
      data: { ...activity.data, mtuContents: mtus }
    });
    
    // 2. Persiste no banco
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { mtuContents: mtus } })
      });
      if (!res.ok) throw new Error('Failed to save MTU');
    } catch (e) {
      toast.error('Failed to save MTU changes. Please try again.');
    }
  }

  const handleSalvageChange = async (salvage: any[]) => {
    // 1. Atualiza store local (feedback imediato)
    useActivityStore.getState().updateActivity(activity.id, {
      data: { ...activity.data, salvageContents: salvage }
    });
    
    // 2. Persiste no banco
    try {
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { salvageContents: salvage } })
      });
      if (!res.ok) throw new Error('Failed to save Salvage');
    } catch (e) {
      toast.error('Failed to save Salvage changes. Please try again.');
    }
  }

  const [mtuPage, setMtuPage] = useState(0)
  const [salvagePage, setSalvagePage] = useState(0)
  const MTUS_PER_PAGE = 4
  const SALVAGE_PER_PAGE = 4

  const mtuContents = (activity.data?.mtuContents as any[]) || []
  const salvageContents = (activity.data?.salvageContents as any[]) || []
  const mtuTotalPages = Math.ceil(mtuContents.length / MTUS_PER_PAGE) || 1
  const salvageTotalPages = Math.ceil(salvageContents.length / SALVAGE_PER_PAGE) || 1

  const paginatedMtus = mtuContents.slice(mtuPage * MTUS_PER_PAGE, (mtuPage + 1) * MTUS_PER_PAGE)
  const paginatedSalvage = salvageContents.slice(salvagePage * SALVAGE_PER_PAGE, (salvagePage + 1) * SALVAGE_PER_PAGE)

  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export')
      return;
    }
    
    // Sort array by date so older is at the top or bottom depending on user preference, we export newest first (as displayed).
    const headers = ['Date', 'Character', 'Type', 'Amount (ISK)']
    const csvContent = [
      headers.join(','),
      ...filteredLogs.map((log: any) => `${new Date(log.date).toISOString().replace(',', '')},${log.charName},${log.type.toUpperCase()},${log.amount}`)
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `financial_history_${activity.id}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Export Complete', { description: 'CSV file generated successfully.' })
  }

  // Combined Totals from Activity Data (Appraised on Server)
  const { 
    automatedBounties = 0, 
    automatedEss = 0, 
    automatedTaxes = 0,
    estimatedLootValue = 0,
    estimatedSalvageValue = 0,
    lootAppraisedAt = null
  } = (activity.data as any) || {}

  const totalIsk = automatedBounties + automatedEss + estimatedLootValue + estimatedSalvageValue

  // Elapsed Time Timer
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
    const toastId = toast.loading("Syncing with ESI...", { description: "Fetching latest wallet journal entries." })
    try {
      const res = await fetch(`/api/activities/sync?id=${activity.id}`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        useActivityStore.getState().updateActivity(activity.id, updated)
        setSyncStatus('success')
        const newLogsCount = updated.data?.logs?.length || 0
        toast.success("ESI Sync Complete", { id: toastId, description: `Found ${newLogsCount} recent transactions.` })
        
        // Also refresh appraisal automatically on sync if needed - use UPDATED data, not old activity.data
        if (updated.data?.mtuContents?.length > 0) {
          handleRefreshAppraisal(false, updated.data)
        }
      } else {
        setSyncStatus('error')
        toast.error("Sync Failed", { id: toastId, description: "Could not retrieve wallet data from ESI." })
      }
    } catch (error) {
      setSyncStatus('error')
      toast.error("Sync Error", { id: toastId, description: "A network error occurred." })
    } finally {
      setTimeout(() => {
        setIsSyncing(false)
        setTimeout(() => setSyncStatus('idle'), 3000)
      }, 500)
    }
  }

  const handleRefreshAppraisal = async (showToast = true, appraisalData?: any) => {
    if (isAppraising) return
    setIsAppraising(true)
    let toastId;
    if (showToast) toastId = toast.loading("Appraising Loot...", { description: "Fetching live prices from Jita 4-4." })
    try {
      const dataToSend = appraisalData || (activity.data as any)
      const res = await fetch(`/api/activities/${activity.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: dataToSend
        })
      })
      if (res.ok) {
        const updated = await res.json()
        useActivityStore.getState().updateActivity(activity.id, updated)
        if (showToast) toast.success("Appraisal Complete", { id: toastId, description: "Loot values have been updated." })
      } else {
         if (showToast) toast.error("Appraisal Failed", { id: toastId, description: "Could not reach market endpoints." })
      }
    } catch (e) {
      console.error('Appraisal failed:', e)
      if (showToast) toast.error("Appraisal Error", { id: toastId, description: "Failed to estimate market values." })
    } finally {
      setIsAppraising(false)
    }
  }

  return (
    <Card className="bg-[#0a0a0f] border-[#1f1f2e] rounded-xl overflow-hidden">
      <CardHeader className="pb-2 px-4 py-3 border-b border-[#1f1f2e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-2 h-2 rounded-full",
              activity.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-500"
            )} />
            <Badge className={cn("capitalize text-[10px] uppercase tracking-wider", typeInfo?.bg, typeInfo?.color)}>
              {activity.type}
            </Badge>
            <span className="text-sm text-gray-400 truncate max-w-[150px]">
              {activity.data?.siteName || activity.data?.siteType || activity.space || 'Active Operations'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#12121a] rounded-lg p-0.5">
              <button
                onClick={() => setDisplayMode('compact')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  displayMode === 'compact' ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"
                )}
                title="Compact"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setDisplayMode('tabs')}
                className={cn(
                  "p-1.5 rounded transition-colors",
                  displayMode === 'tabs' ? "bg-cyan-500/20 text-cyan-400" : "text-gray-500 hover:text-gray-300"
                )}
                title="Tabs"
              >
                <AlignJustify className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-400 bg-[#12121a] px-2 py-1 rounded">
              <Clock className="h-3 w-3" />
              {elapsed}
            </div>
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <CardTitle className="text-lg mt-2 flex items-center justify-between cursor-pointer hover:text-cyan-400 transition-colors">
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
                    onClick={handleExportCSV}
                    className="p-1.5 rounded transition-colors text-gray-500 hover:text-green-400"
                    title="Export CSV"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                  <div className="w-px h-4 bg-zinc-800 mx-1"></div>
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
                    {formatISK(activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.additionalBounties || 0))}
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

              {/* Metrics Summary & Filters */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <select 
                    value={logFilterType} 
                    onChange={e => setLogFilterType(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-zinc-500 flex-1"
                  >
                    <option value="all">All Types</option>
                    <option value="bounty">Bounty</option>
                    <option value="ess">ESS</option>
                    <option value="tax">Corp Tax</option>
                  </select>
                  <select 
                    value={logFilterChar} 
                    onChange={e => setLogFilterChar(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-[10px] text-gray-300 outline-none focus:border-zinc-500 flex-1"
                  >
                    <option value="all">All Characters</option>
                    {uniqueChars.map(char => (
                      <option key={char} value={char}>{char}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center justify-between text-[10px] text-gray-500 bg-zinc-900/30 rounded px-2 py-1.5">
                  <div className="flex gap-2 items-center">
                    <Filter className="h-3 w-3" />
                    <span>{filteredLogs.length} transactions</span>
                  </div>
                  <span className="text-gray-400">
                    Avg: {formatISK((filteredLogs.reduce((sum: number, l: any) => sum + l.amount, 0)) / Math.max(filteredLogs.length, 1))}
                  </span>
                </div>
              </div>

              {/* Transaction Logs - List View */}
              {viewMode === 'list' && (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto px-1 custom-scrollbar">
                  {filteredLogs.length === 0 ? (
                    <p className="text-center text-[10px] text-gray-600 italic py-8 border border-dashed border-eve-border/30 rounded">
                      No transactions match the current filters or none recorded.
                    </p>
                  ) : (
                    filteredLogs.map((log: any, idx: number) => {
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
                              <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
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
                      {filteredLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="text-center text-gray-600 italic py-8">
                            No transactions match the current filters.
                          </td>
                        </tr>
                      ) : (
                        filteredLogs.map((log: any, idx: number) => (
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
                                  <AvatarImage src={`https://images.evetech.net/characters/${log.charId}/portrait?size=64`} />
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
                      (activity.data?.grossBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
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
      
      <CardContent className="space-y-3 p-4">
        {displayMode === 'compact' ? (
          <>
            {/* Compact Stats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#12121a] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Bounty</p>
                <p className="text-sm font-bold text-green-400">{formatISK(activity.data?.grossBounties || activity.data?.automatedBounties || 0)}</p>
              </div>
              <div className="bg-[#12121a] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">ESS</p>
                <p className="text-sm font-bold text-yellow-400">{formatISK(activity.data?.automatedEss || 0)}</p>
              </div>
              <div className="bg-[#12121a] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Loot</p>
                <p className="text-sm font-bold text-blue-400">{formatISK(estimatedLootValue)}</p>
              </div>
              <div className="bg-[#12121a] rounded-lg p-3 text-center">
                <p className="text-[10px] text-gray-500 uppercase">Salvage</p>
                <p className="text-sm font-bold text-orange-400">{formatISK(estimatedSalvageValue)}</p>
              </div>
            </div>

            {/* Summary Bar */}
            <div className="flex items-center justify-between bg-[#12121a] rounded-xl p-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Total</p>
                <p className="text-lg font-bold text-green-400">{formatISK(totalIsk)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase">Rate</p>
                <p className="text-sm font-medium text-cyan-400">{formatISK(totalIsk / Math.max(1, (Date.now() - new Date(activity.startTime).getTime()) / 3600000))}/h</p>
              </div>
              {activity.type === 'ratting' && (
                <Button 
                  size="sm" 
                  variant="outline"
                  disabled={isSyncing}
                  onClick={handleSyncFinancials}
                  className="h-8"
                >
                  {isSyncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              )}
            </div>

            {/* Quick Fleet Preview */}
            <div className="flex items-center justify-between">
              <div className="flex -space-x-2">
                {activity.participants.slice(0, 4).map(p => (
                  <Avatar key={p.characterId} className="h-8 w-8 border-2 border-[#0a0a0f]">
                    <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                    <AvatarFallback className="bg-[#12121a] text-[10px]">
                      {p.characterName?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activity.participants.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-[#12121a] border-2 border-[#0a0a0f] flex items-center justify-center text-[10px] text-gray-400">
                    +{activity.participants.length - 4}
                  </div>
                )}
              </div>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setDisplayMode('tabs')}
                className="text-xs text-gray-500"
              >
                View Details
              </Button>
            </div>
          </>
        ) : displayMode === 'tabs' ? (
          <>
            {/* Tabs Mode - Stats + Actions */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-950/20 border border-green-900/30 rounded-lg p-2">
                <p className="text-[10px] text-green-400/70 uppercase">Bounty</p>
                <p className="text-lg font-bold text-green-400">{formatISK(activity.data?.grossBounties || 0)}</p>
              </div>
              <div className="bg-yellow-950/20 border border-yellow-900/30 rounded-lg p-2">
                <p className="text-[10px] text-yellow-400/70 uppercase">ESS</p>
                <p className="text-lg font-bold text-yellow-400">{formatISK(activity.data?.automatedEss || 0)}</p>
              </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex gap-1 bg-[#12121a] p-1 rounded-lg overflow-x-auto">
              <button
                onClick={() => toggleSection('fleet')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap",
                  expandedSections.fleet ? "bg-cyan-500/20 text-cyan-400" : "text-gray-400"
                )}
              >
                Fleet ({activity.participants.length})
              </button>
              <button
                onClick={() => toggleSection('mtu')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap",
                  expandedSections.mtu ? "bg-blue-500/20 text-blue-400" : "text-gray-400"
                )}
              >
                MTU ({mtuContents.length})
              </button>
              <button
                onClick={() => toggleSection('salvage')}
                className={cn(
                  "flex-1 px-3 py-1.5 text-xs rounded transition-colors whitespace-nowrap",
                  expandedSections.salvage ? "bg-orange-500/20 text-orange-400" : "text-gray-400"
                )}
              >
                Salvage ({salvageContents.length})
              </button>
            </div>

            {/* Tab Content */}
            {expandedSections.fleet && (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {activity.participants.map(p => (
                  <div key={p.characterId} className="flex items-center gap-2 p-2 bg-[#12121a] rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="bg-[#12121a] text-xs">{p.characterName?.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{p.characterName}</p>
                      <p className="text-[10px] text-gray-500 truncate">{p.fit || 'No fit'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {expandedSections.mtu && (
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                {mtuContents.map((mtu, idx) => (
                  <div key={idx} className="bg-blue-950/20 border border-blue-900/30 rounded p-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-blue-400">MTU #{idx + 1}</span>
                      <span className="text-xs text-gray-500">{mtu.loot ? mtu.loot.split('\n').length : 0} items</span>
                    </div>
                  </div>
                ))}
                <div 
                  className="bg-zinc-950/30 rounded border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-center p-2 min-h-[40px] group"
                  onClick={() => {
                    const newMTUs = [...mtuContents, { loot: '' }]
                    handleMTUChange(newMTUs)
                  }}
                >
                  <div className="text-center flex items-center gap-2">
                    <Plus className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                    <span className="text-[10px] text-zinc-600">Add MTU</span>
                  </div>
                </div>
              </div>
            )}

            {expandedSections.salvage && (
              <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                {salvageContents.map((s, idx) => (
                  <div key={idx} className="bg-orange-950/20 border border-orange-900/30 rounded p-2">
                    <div className="flex justify-between">
                      <span className="text-xs text-orange-400">Salvage #{idx + 1}</span>
                      <span className="text-xs text-gray-500">{s.loot ? s.loot.split('\n').length : 0} items</span>
                    </div>
                  </div>
                ))}
                <div 
                  className="bg-zinc-950/30 rounded border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-center p-2 min-h-[40px] group"
                  onClick={() => {
                    const newSalvage = [...salvageContents, { loot: '' }]
                    handleSalvageChange(newSalvage)
                  }}
                >
                  <div className="text-center flex items-center gap-2">
                    <Plus className="h-3 w-3 text-zinc-600 group-hover:text-zinc-400" />
                    <span className="text-[10px] text-zinc-600">Add Salvage</span>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Expanded Mode - Full layout */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {/* FLEET COLUMN */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-zinc-800"></div>
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Fleet</span>
                <div className="h-px flex-1 bg-zinc-800"></div>
              </div>
              <div className="space-y-2">
                {activity.participants.map(p => (
                  <div key={p.characterId} className="flex items-center gap-3 p-2 rounded bg-zinc-900/40 border border-zinc-800/30 hover:border-eve-accent/30 transition-colors group">
                    <Avatar className="h-10 w-10 border border-zinc-800">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                        {p.characterName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{p.characterName}</p>
                      {p.shipTypeId && (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Image 
                            src={`https://images.evetech.net/types/${p.shipTypeId}/icon?size=32`}
                            alt="ship"
                            width={16}
                            height={16}
                            className="object-contain"
                          />
                          <span className="text-[10px] text-zinc-500 truncate">{p.fit || 'Unknown'}</span>
                        </div>
                      )}
                    </div>
                    <div className="w-1.5 h-8 bg-green-500/20 rounded-full group-hover:bg-green-500/50 transition-colors"></div>
                  </div>
                ))}
              </div>
              
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="bg-zinc-900/40 rounded p-2 border border-zinc-800/30 text-center">
                  <p className="text-[9px] text-zinc-600 uppercase">Space</p>
                  <p className="text-xs text-zinc-300 truncate">{activity.space || '—'}</p>
                </div>
                <div className="bg-zinc-900/40 rounded p-2 border border-zinc-800/30 text-center">
                  <p className="text-[9px] text-zinc-600 uppercase">Site</p>
                  <p className="text-xs text-zinc-300 truncate">{activity.data?.siteType || '—'}</p>
                </div>
              </div>
            </div>

            {/* MTU INVENTORY */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Image 
                    src="https://images.evetech.net/Render/33475_512.png"
                    alt="MTU"
                    width={18}
                    height={18}
                    className="object-contain"
                  />
                  <span className="text-xs uppercase tracking-wider text-blue-400/70 font-bold">Loot Containers</span>
                </div>
                <div className="flex items-center gap-2">
                  {mtuTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setMtuPage(p => Math.max(0, p - 1))} 
                        disabled={mtuPage === 0}
                        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <span className="text-xs text-zinc-500">{mtuPage + 1}/{mtuTotalPages}</span>
                      <button 
                        onClick={() => setMtuPage(p => Math.min(mtuTotalPages - 1, p + 1))} 
                        disabled={mtuPage >= mtuTotalPages - 1}
                        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-zinc-500">{mtuContents.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {paginatedMtus.map((mtu: any, idx: number) => {
                  const actualIdx = mtuPage * MTUS_PER_PAGE + idx
                  const lines = (mtu.loot || '').split('\n').filter((l: string) => l.trim())
                  const mtuValue = (activity.data?.mtuValues as number[])?.[actualIdx] || 0
                  return (
                    <div key={actualIdx} className="relative bg-zinc-950/60 rounded border border-blue-900/30 hover:border-blue-500/50 transition-all cursor-pointer group p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-400">#{actualIdx + 1}</span>
                        <span className="text-[10px] text-zinc-600">{lines.length} items</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate leading-relaxed mt-1">
                        {mtu.loot ? mtu.loot.substring(0, 40) : 'Empty'}
                      </p>
                      <p className="text-sm font-mono text-blue-400/80 text-right mt-2">
                        {mtuValue > 0 ? formatISK(mtuValue) : '—'}
                      </p>
                    </div>
                  )
                })}
                <div 
                  className="bg-zinc-950/30 rounded border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-center min-h-[70px] group"
                  onClick={() => {
                    const newMTUs = [...mtuContents, { loot: '' }]
                    handleMTUChange(newMTUs)
                  }}
                >
                  <div className="text-center">
                    <Plus className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 mx-auto" />
                    <span className="text-[10px] text-zinc-600">Add MTU</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-blue-900/30">
                <span className="text-xs text-zinc-500">Total Loot</span>
                <span className="text-base font-bold text-blue-400 font-mono">
                  {isAppraising ? '...' : formatISK(estimatedLootValue)}
                </span>
              </div>
            </div>

            {/* SALVAGE INVENTORY + FINANCIAL FOOTER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Wrench className="h-4 w-4 text-orange-400/70" />
                  <span className="text-xs uppercase tracking-wider text-orange-400/70 font-bold">Salvage</span>
                </div>
                <div className="flex items-center gap-2">
                  {salvageTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => setSalvagePage(p => Math.max(0, p - 1))} 
                        disabled={salvagePage === 0}
                        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      >
                        ‹
                      </button>
                      <span className="text-xs text-zinc-500">{salvagePage + 1}/{salvageTotalPages}</span>
                      <button 
                        onClick={() => setSalvagePage(p => Math.min(salvageTotalPages - 1, p + 1))} 
                        disabled={salvagePage >= salvageTotalPages - 1}
                        className="text-xs text-zinc-500 hover:text-zinc-300 disabled:opacity-30"
                      >
                        ›
                      </button>
                    </div>
                  )}
                  <span className="text-xs text-zinc-500">{salvageContents.length}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {paginatedSalvage.map((salvage: any, idx: number) => {
                  const actualIdx = salvagePage * SALVAGE_PER_PAGE + idx
                  const lines = (salvage.loot || '').split('\n').filter((l: string) => l.trim())
                  return (
                    <div key={actualIdx} className="relative bg-zinc-950/60 rounded border border-orange-900/30 hover:border-orange-500/50 transition-all cursor-pointer group p-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-orange-400">#{actualIdx + 1}</span>
                        <span className="text-[10px] text-zinc-600">{lines.length} items</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 truncate leading-relaxed mt-1">
                        {salvage.loot ? salvage.loot.substring(0, 40) : 'Empty'}
                      </p>
                    </div>
                  )
                })}
                <div 
                  className="bg-zinc-950/30 rounded border border-dashed border-zinc-800 hover:border-zinc-600 transition-colors cursor-pointer flex items-center justify-center min-h-[60px] group"
                  onClick={() => {
                    const newSalvage = [...salvageContents, { loot: '' }]
                    handleSalvageChange(newSalvage)
                  }}
                >
                  <div className="text-center">
                    <Plus className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 mx-auto" />
                    <span className="text-[10px] text-zinc-600">Add</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-orange-900/30">
                <span className="text-xs text-zinc-500">Total Salvage</span>
                <span className="text-base font-bold text-orange-400 font-mono">
                  {isSalvageAppraising ? '...' : formatISK(estimatedSalvageValue)}
                </span>
              </div>

              {/* FINANCIAL FOOTER */}
              <div className="bg-zinc-950/60 rounded-lg border border-zinc-800/60 p-3 mt-2 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">Net Profit</span>
                  <span className="text-lg font-bold text-green-400 font-mono">
                    {formatISK(
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0) +
                      estimatedLootValue +
                      estimatedSalvageValue
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">ISK/hr</span>
                  <span className="text-sm font-medium text-eve-accent font-mono">
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
                      return hours > 0.01 ? formatISK(total / hours) : '0';
                    })()}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/50">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-yellow-500/70" />
                    <span className="text-xs text-zinc-500">ESS Payout</span>
                  </div>
                  <span className="text-sm font-mono text-yellow-500">
                    {(() => {
                      const logs = activity.data?.logs || [];
                      const essLogs = logs.filter((l: any) => l.type === 'ess');
                      if (essLogs.length === 0) return '—';
                      const lastPayout = new Date(essLogs[0].date).getTime();
                      const nextPayout = lastPayout + (168 * 60 * 1000);
                      const diff = nextPayout - Date.now();
                      if (diff <= 0) return 'NOW';
                      const h = Math.floor(diff / 3600000);
                      const m = Math.floor((diff % 3600000) / 60000);
                      return `${h}h ${m}m`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Non-ratting expanded layout */}
        {displayMode === 'expanded' && activity.type !== 'ratting' && (
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
            <div className="col-span-2 space-y-3">
              <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Active Fleet</p>
              <div className="flex flex-wrap gap-4">
                {activity.participants.map(p => (
                  <div key={p.characterId} className="relative group/participant">
                    <Avatar className="h-12 w-12 border-2 border-zinc-900 group-hover/participant:border-cyan-400 transition-all duration-300">
                      <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                      <AvatarFallback className="bg-zinc-800 text-zinc-400 text-xs">
                        {p.characterName?.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {p.shipTypeId && (
                      <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-black border border-zinc-800 flex items-center justify-center overflow-hidden group-hover/participant:border-cyan-400 transition-colors">
                        <Image 
                          src={`https://images.evetech.net/types/${p.shipTypeId}/icon?size=32`}
                          alt="ship"
                          fill
                          className="object-cover p-0.5"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex gap-2 pt-3 border-t border-[#1f1f2e]">
          {activity.type === 'ratting' && displayMode !== 'compact' && (
            <Button 
              size="sm" 
              variant="outline" 
              disabled={isSyncing}
              onClick={handleSyncFinancials}
              className="flex-1"
            >
              {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
               syncStatus === 'success' ? <CheckCircle className="h-4 w-4 mr-2" /> :
               syncStatus === 'error' ? <XCircle className="h-4 w-4 mr-2" /> :
               <RefreshCw className="h-4 w-4 mr-2" />}
              {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Updated' : syncStatus === 'error' ? 'Failed' : 'Sync ESI'}
            </Button>
          )}
        </div>

        {/* Non-ratting financial and loot sections */}
        {activity.type !== 'ratting' && (
          <>
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
            </div>

            <div className="space-y-3 pt-4 border-t border-eve-border/30">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Box className="h-3 w-3" /> Loot & Salvage
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <p className="text-[9px] text-blue-400/50 uppercase font-bold tracking-wider">MTU Loot</p>
                  <MTULootField 
                    value={activity.data?.mtuContents || []} 
                    activityId={activity.id}
                    mtuValues={activity.data?.mtuValues || []}
                    onChange={async (mtus) => {
                      useActivityStore.getState().updateActivity(activity.id, {
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
                      useActivityStore.getState().updateActivity(activity.id, {
                        data: { ...activity.data, salvageContents: salvage }
                      });
                    }} 
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
