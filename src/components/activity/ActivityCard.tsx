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
  ChevronUp,
  Activity as ActivityIcon
} from 'lucide-react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog'
import { cn, formatISK, formatNumber } from '@/lib/utils'
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

  const logsData = (activity.data as any)?.logs || []

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

  const isMiningActivity = activity.type === 'mining'
  
  const miningTotalQuantity = isMiningActivity ? (activity.data?.totalQuantity || 0) : 0
  const miningTotalValue = isMiningActivity ? (activity.data?.totalEstimatedValue || 0) : 0
  const miningLogs = isMiningActivity ? (activity.data?.logs || []) : []
  const oreBreakdown = isMiningActivity ? (activity.data?.oreBreakdown || {}) : {}
  
  const totalIsk = isMiningActivity 
    ? miningTotalValue 
    : automatedBounties + automatedEss + (activity.data?.additionalBounties || 0) + estimatedLootValue + estimatedSalvageValue

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
    
    const isMining = activity.type === 'mining'
    const endpoint = isMining ? 'sync-mining' : 'sync'
    const desc = isMining ? "Fetching mining ledger data." : "Fetching latest wallet journal entries."
    const successDesc = isMining ? (updated: any) => `Found ${updated.data?.logs?.length || 0} mining records.` : (updated: any) => `Found ${updated.data?.logs?.length || 0} recent transactions.`
    
    const toastId = toast.loading("Syncing with ESI...", { description: desc })
    try {
      const res = await fetch(`/api/activities/${endpoint}?id=${activity.id}`, { method: 'POST' })
      if (res.ok) {
        const updated = await res.json()
        useActivityStore.getState().updateActivity(activity.id, updated)
        setSyncStatus('success')
        toast.success("ESI Sync Complete", { id: toastId, description: successDesc(updated) })
        
        if (!isMining && updated.data?.mtuContents?.length > 0) {
          handleRefreshAppraisal(false, updated.data)
        }
      } else {
        setSyncStatus('error')
        toast.error("Sync Failed", { id: toastId, description: isMining ? "Could not retrieve mining data from ESI." : "Could not retrieve wallet data from ESI." })
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
    <Card className="bg-[#0a0a0f] border-zinc-800/50 rounded-xl overflow-hidden shadow-2xl transition-all hover:border-zinc-700/50 group/card">
      <CardHeader className="py-3 px-4 bg-zinc-950/50 border-b border-zinc-900/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-6 w-1 bg-eve-accent rounded-full shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
            <div className="flex flex-col">
              <span className="text-[10px] items-center gap-2 flex text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">
                <ActivityIcon className="h-3 w-3" />
                {activity.type}
              </span>
              <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                <span className="truncate">{(activity as any).item?.name || activity.data?.siteName || 'Active Operations'}</span>
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-zinc-950 rounded-full p-1 border border-zinc-900 shadow-inner">
              <button
                onClick={() => setDisplayMode('compact')}
                className={cn(
                  "p-1.5 rounded-full transition-all duration-300",
                  displayMode === 'compact' ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "text-zinc-600 hover:text-zinc-400"
                )}
                title="Compact Mode"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setDisplayMode('tabs')}
                className={cn(
                  "p-1.5 rounded-full transition-all duration-300",
                  displayMode === 'tabs' ? "bg-cyan-500/20 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.1)]" : "text-zinc-600 hover:text-zinc-400"
                )}
                title="Tabs Mode"
              >
                <AlignJustify className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-900 shadow-inner">
              <Clock className="h-3 w-3 text-cyan-500" />
              {elapsed}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4 -mt-1 px-1">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={cn("text-[8px] uppercase font-black tracking-widest border-zinc-800", typeInfo?.color)}>
              {activity.status}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-bold text-zinc-500 hover:text-cyan-400 uppercase tracking-widest">
                  <History className="h-3.5 w-3.5 mr-1.5" /> Log
                </Button>
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
                    <span className="text-[9px] text-green-400/70 uppercase font-bold tracking-wider">Gross Bounty</span>
                  </div>
                  <div className="text-sm font-bold text-green-400 font-mono">
                    {formatISK(activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.automatedEss || 0) + (activity.data?.additionalBounties || 0))}
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
                  <div className="text-sm font-bold text-eve-accent font-mono tabular-nums">
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
                  <span className="text-gray-500 uppercase tracking-tighter">Gross Bounty</span>
                  <span className="text-green-400 font-bold">+{formatISK(activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.automatedEss || 0) + (activity.data?.additionalBounties || 0))}</span>
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
                  <span className="text-xl font-mono font-black text-eve-accent tracking-tighter">
                    {formatISK(
                      (activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.automatedEss || 0) + (activity.data?.additionalBounties || 0)) + 
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
      </div>
    </div>
  </CardContent>
      
      <CardContent className="space-y-3 p-4">
        {displayMode === 'compact' ? (
          <>
            {/* Compact Stats Grid - Mining */}
            {isMiningActivity ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-blue-500/30">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Mined</p>
                  <p className="text-sm font-bold text-blue-400 font-mono">{formatNumber(miningTotalQuantity)} m3</p>
                </div>
                <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-green-500/30">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Est. Value</p>
                  <p className="text-sm font-bold text-green-400 font-mono">{formatISK(miningTotalValue)}</p>
                </div>
                <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-cyan-500/30">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">m3/hr</p>
                  <p className="text-sm font-bold text-cyan-400 font-mono">{formatNumber(miningTotalQuantity / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000))}</p>
                </div>
                <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-yellow-500/30">
                  <p className="text-[10px] text-gray-500 uppercase tracking-tighter">ISK/hr</p>
                  <p className="text-sm font-bold text-yellow-400 font-mono">{formatISK(miningTotalValue / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000))}</p>
                </div>
              </div>
            ) : (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-green-500/30">
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Bounty</p>
                <p className="text-sm font-bold text-green-400 font-mono">{formatISK(activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.automatedEss || 0) + (activity.data?.additionalBounties || 0))}</p>
              </div>
              <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-yellow-500/30">
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">ESS</p>
                <p className="text-sm font-bold text-yellow-400 font-mono">{formatISK(activity.data?.automatedEss || 0)}</p>
              </div>
              <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-blue-500/30">
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Loot</p>
                <p className="text-sm font-bold text-blue-400 font-mono">{formatISK(estimatedLootValue)}</p>
              </div>
              <div className="bg-[#12121a]/50 backdrop-blur-sm border border-zinc-800/50 rounded-lg p-3 text-center transition-all hover:border-orange-500/30">
                <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Salvage</p>
                <p className="text-sm font-bold text-orange-400 font-mono">{formatISK(estimatedSalvageValue)}</p>
              </div>
            </div>
            )}

            {/* Summary Bar */}
            <div className="flex items-center justify-between bg-[#12121a]/80 backdrop-blur-md border border-zinc-800/50 rounded-xl p-3 shadow-lg">
              <div>
                <p className="text-[10px] text-gray-500 uppercase font-black">{isMiningActivity ? 'Est. Value' : 'Total'}</p>
                <p className="text-xl font-black text-green-400 font-mono leading-tight tracking-tighter">{isMiningActivity ? formatISK(miningTotalValue) : formatISK(totalIsk)}</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <div>
                  <p className="text-[10px] text-gray-500 uppercase font-black">Rate</p>
                  <p className="text-sm font-bold text-cyan-400 font-mono leading-tight">{formatISK(totalIsk / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000))}/h</p>
                </div>
              {(activity.type === 'ratting' || activity.type === 'mining') && (
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
<div className="flex items-center gap-2">
              {activity.type === 'ratting' && (
                <>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const newMTUs = [...mtuContents, { loot: '' }]
                      handleMTUChange(newMTUs)
                      setDisplayMode('tabs')
                      setExpandedSections(prev => ({ ...prev, mtu: true }))
                    }}
                    className="text-xs text-blue-400 font-bold hover:text-blue-300 hover:bg-blue-400/10 rounded-full px-3"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    MTU
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const newSalvage = [...salvageContents, { loot: '' }]
                      handleSalvageChange(newSalvage)
                      setDisplayMode('tabs')
                      setExpandedSections(prev => ({ ...prev, salvage: true }))
                    }}
                    className="text-xs text-orange-400 font-bold hover:text-orange-300 hover:bg-orange-400/10 rounded-full px-3"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Salvage
                  </Button>
                </>
              )}
              <Button 
                variant="outline" 
                 size="sm"
                onClick={() => setDisplayMode('tabs')}
                className="text-xs border-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 rounded-full px-4"
              >
                View Details
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={onEnd}
                className="text-xs border-red-500/30 text-red-500/70 hover:text-red-400 hover:bg-red-500/10 rounded-full px-3"
                title="Finalizar Atividade"
              >
                <StopCircle className="h-3.5 w-3.5" />
              </Button>
              </div>
            </div>
          </>
        ) : displayMode === 'tabs' ? (
          <>
            {/* Tabs Mode - Stats + Unified Metrics */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-green-500/5 border border-green-500/10 rounded-lg p-2.5 backdrop-blur-sm shadow-inner group/stat">
                <p className="text-[9px] text-green-400/50 uppercase font-bold tracking-widest mb-1">Bounties</p>
                <p className="text-lg font-bold text-green-400 font-mono tracking-tight">{formatISK(activity.data?.grossBounties || (activity.data?.automatedBounties || 0) + (activity.data?.automatedEss || 0) + (activity.data?.additionalBounties || 0))}</p>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/10 rounded-lg p-2.5 backdrop-blur-sm shadow-inner group/stat">
                <p className="text-[9px] text-yellow-400/50 uppercase font-bold tracking-widest mb-1">ESS</p>
                <p className="text-lg font-bold text-yellow-400 font-mono tracking-tight">{formatISK(activity.data?.automatedEss || 0)}</p>
              </div>
            </div>

            {/* Financial Status Bar */}
            <div className="mb-3 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/10 backdrop-blur-md flex items-center justify-between shadow-lg">
              <div className="space-y-0.5">
                <p className="text-[8px] text-cyan-400/50 uppercase font-black tracking-[0.2em]">Net ISK Profit</p>
                <p className="text-sm font-bold text-white font-mono leading-none">
                  {formatISK(
                    (activity.data?.automatedBounties || 0) + 
                    (activity.data?.automatedEss || 0) + 
                    (activity.data?.additionalBounties || 0) +
                    estimatedLootValue +
                    estimatedSalvageValue
                  )}
                </p>
              </div>
              <div className="h-8 w-[1px] bg-cyan-500/10" />
              <div className="space-y-0.5 text-right">
                <p className="text-[8px] text-zinc-500 uppercase font-black tracking-[0.2em]">Efficiency</p>
                <p className="text-xs font-bold text-cyan-400 font-mono leading-none">
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
                  })()}/h
                </p>
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
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {activity.participants.map(p => (
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
              )}

              {expandedSections.mtu && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              )}

              {expandedSections.salvage && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
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
              )}
            </div>
            
            <div className="pt-4 mt-2 border-t border-zinc-900/50 flex gap-2">
              <Button 
                size="sm" 
                variant="ghost" 
                disabled={isSyncing}
                onClick={handleSyncFinancials}
                className="flex-1 h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-zinc-900/50 hover:bg-zinc-800 text-zinc-500 hover:text-white border border-zinc-800/50"
              >
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
                 syncStatus === 'success' ? <CheckCircle className="h-4 w-4 mr-2 text-green-500" /> :
                 syncStatus === 'error' ? <XCircle className="h-4 w-4 mr-2 text-red-500" /> :
                 <RefreshCw className="h-4 w-4 mr-2" />}
                {isSyncing ? 'Synchronizing...' : 'Sync ESI'}
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onEnd}
                className="flex-1 h-10 text-[10px] uppercase font-black tracking-[0.2em] rounded-xl bg-red-950/10 hover:bg-red-950/30 text-red-500/70 hover:text-red-400 border border-red-900/20"
              >
                <StopCircle className="h-4 w-4 mr-2" />
                Finalizar
              </Button>
            </div>
          </>
        ) : (
          /* Expanded Mode - Full layout */
          <div className="space-y-6 animate-in fade-in duration-500">
            {/* Top Grid - Fleet & Basics */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div className="space-y-3 bg-zinc-950/30 p-4 rounded-xl border border-zinc-900/50 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-1 bg-eve-accent rounded-full shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-cyan-400">Fleet Operations</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] font-bold border border-cyan-500/20">
                    {activity.participants.length} Members
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[180px] overflow-y-auto pr-1 custom-scrollbar">
                  {activity.participants.map(p => (
                    <div key={p.characterId} className="flex items-center gap-3 p-2 bg-zinc-950/60 border border-zinc-900/50 rounded-lg group transition-all hover:bg-zinc-900/80 hover:border-zinc-800">
                      <Avatar className="h-9 w-9 border border-zinc-800 transition-transform group-hover:scale-105">
                        <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                        <AvatarFallback className="bg-zinc-900 text-[10px]">{p.characterName?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-zinc-100 truncate tracking-tight">{p.characterName}</p>
                        <p className="text-[9px] text-zinc-600 truncate uppercase font-bold tracking-widest leading-none mt-1 group-hover:text-zinc-400 transition-colors">{p.fit || 'No fit recorded'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Financial Dashboard - Expanded */}
              <div className="bg-zinc-950/30 p-4 rounded-xl border border-zinc-900/50 space-y-4 backdrop-blur-sm relative overflow-hidden group/fin">
                <div className="absolute top-0 right-0 p-8 bg-green-500/5 blur-3xl rounded-full -mr-10 -mt-10" />
                <div className="flex items-center justify-between relative z-10">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-1 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    <span className="text-[10px] uppercase font-black tracking-[0.2em] text-green-400">Yield Analytics</span>
                  </div>
                  <Wallet className="h-4 w-4 text-zinc-800 group-hover/fin:text-green-500/50 transition-colors duration-500" />
                </div>
                
                <div className="grid grid-cols-2 gap-4 relative z-10">
                  <div className="space-y-1">
                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Net Profit</p>
                    <p className="text-2xl font-bold text-green-400 font-mono tracking-tighter leading-none">
                      {formatISK(
                        (activity.data?.automatedBounties || 0) + 
                        (activity.data?.automatedEss || 0) + 
                        (activity.data?.additionalBounties || 0) +
                        estimatedLootValue +
                        estimatedSalvageValue
                      )}
                    </p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[9px] text-zinc-500 uppercase font-black tracking-widest">Efficiency</p>
                    <p className="text-2xl font-bold text-cyan-400 font-mono tracking-tighter leading-none">
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
                      })()}/h
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 relative z-10">
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-900/50 group-hover/fin:border-zinc-800 transition-colors">
                    <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1 leading-none">Space Tier</p>
                    <p className="text-[11px] font-bold text-zinc-300 truncate">{activity.space || '—'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-900/50 group-hover/fin:border-zinc-800 transition-colors">
                    <p className="text-[8px] text-zinc-600 uppercase font-black tracking-widest mb-1 leading-none">Activity Focus</p>
                    <p className="text-[11px] font-bold text-zinc-300 truncate tracking-tight">{activity.data?.siteType ||'Combat Operations'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Grid - Inventory Systems */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2 mb-1">
                  <div className="h-4 w-1 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)]" />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-blue-400">Inventory Management</span>
                </div>
                <div className="bg-zinc-950/20 p-2 rounded-2xl border border-zinc-900/30 backdrop-blur-md">
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
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 px-2 mb-1">
                  <div className="h-4 w-1 bg-orange-500 rounded-full shadow-[0_0_8px_rgba(249,115,22,0.4)]" />
                  <span className="text-[10px] uppercase font-black tracking-[0.2em] text-orange-400">Reclamation Systems</span>
                </div>
                <div className="bg-zinc-950/20 p-2 rounded-2xl border border-zinc-900/30 backdrop-blur-md">
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

            <div className="pt-2 flex gap-3">
              <Button 
                size="sm" 
                variant="ghost" 
                disabled={isSyncing}
                onClick={handleSyncFinancials}
                className="flex-1 h-12 text-[11px] uppercase font-black tracking-[0.2em] rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 hover:from-zinc-900 hover:to-zinc-800 text-zinc-500 hover:text-white border border-zinc-800/50 shadow-2xl transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
                 syncStatus === 'success' ? <CheckCircle className="h-4 w-4 mr-2 text-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]" /> :
                 syncStatus === 'error' ? <XCircle className="h-4 w-4 mr-2 text-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]" /> :
                 <RefreshCw className="h-4 w-4 mr-3 group-hover:rotate-180 transition-transform duration-700" />}
                <span className="relative z-10">{isSyncing ? 'Synchronizing...' : 'Synchronize ESI Assets'}</span>
              </Button>
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={onEnd}
                className="flex-1 h-12 text-[11px] uppercase font-black tracking-[0.2em] rounded-2xl bg-gradient-to-br from-zinc-950 via-zinc-950 to-red-950/10 hover:from-red-950/20 hover:to-red-950/30 text-red-500/70 hover:text-red-400 border border-red-900/20 shadow-2xl transition-all duration-500 group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-red-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <StopCircle className="h-4 w-4 mr-3 group-hover:scale-110 transition-transform duration-500" />
                <span className="relative z-10">Finalizar Operação</span>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
