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
import { cn, formatISK, formatNumber, calculateNetProfit } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { type Activity, useActivityStore } from '@/lib/stores/activity-store'
import { ActivityDetailDialog } from './ActivityDetailDialog'
import { MTULootField } from './MTULootField'
import { SalvageField } from './SalvageField'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

import { RattingHelpModal } from './RattingHelpModal'
import { MiningActivityContent } from './types/MiningActivityContent'
import { RattingActivityContent } from './types/RattingActivityContent'
import { Sparkline } from '@/components/ui/Sparkline'
import { useTranslations } from '@/i18n/hooks'


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
  const { t } = useTranslations()

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
  const isMining = activity.type === 'mining'
  const miningLogs = isMining ? (activity.data?.logs || []) : []

  const uniqueChars = useMemo(() => {
    const chars = new Set<string>()
    const logsToUse = isMining ? miningLogs : logsData
    logsToUse.forEach((l: any) => { 
      const name = isMining ? l.characterName : l.charName
      if(name) chars.add(name) 
    })
    return Array.from(chars)
  }, [logsData, miningLogs, isMining])

  const filteredLogs = useMemo(() => {
    const logsToFilter = isMining ? miningLogs : logsData
    return logsToFilter.filter((log: any) => {
      const matchType = logFilterType === 'all' || log.type === logFilterType
      const matchChar = logFilterChar === 'all' || (isMining ? log.characterName : log.charName) === logFilterChar
      return matchType && matchChar
    })
  }, [logsData, miningLogs, logFilterType, logFilterChar, isMining])

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
      ...filteredLogs.map((log: any) => `${new Date(log.date).toISOString().replace(',', '')},${log.charName},${(log.type || 'UNKNOWN').toUpperCase()},${log.amount}`)
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
  const oreBreakdown = isMiningActivity ? (activity.data?.oreBreakdown || {}) : {}
  
  const totalIsk = isMiningActivity 
    ? miningTotalValue 
    : calculateNetProfit(activity.data)

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

  const [essCountdown, setEssCountdown] = useState<string>('')
  
  // ESS Payout Timer (Every 2 hours UTC on even hours)
  useEffect(() => {
    if (activity.type !== 'ratting') return;

    const updateTimer = () => {
      const now = new Date();
      const currentUTCHour = now.getUTCHours();
      const nextPayoutHour = currentUTCHour % 2 === 0 ? currentUTCHour + 2 : currentUTCHour + 1;
      
      const nextPayout = new Date(Date.UTC(
         now.getUTCFullYear(),
         now.getUTCMonth(),
         now.getUTCDate(),
         nextPayoutHour,
         0, 0
      ));

      const diff = nextPayout.getTime() - now.getTime();
      const minutes = Math.floor((diff / (1000 * 60)) % 60);
      const seconds = Math.floor((diff / 1000) % 60);
      const hours = Math.floor(diff / (1000 * 60 * 60));

      setEssCountdown(`${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`);
    };

    const timer = setInterval(updateTimer, 1000);
    updateTimer();
    return () => clearInterval(timer);
  }, [activity.type]);

  const incomeHistory = useMemo(() => {
    const logs = (activity.data as any)?.logs || []
    if (logs.length === 0) return [0, 0]
    let currentTotal = 0
    // Use cumulative total for a growth chart, or just raw amounts for spikes
    // Cumulative is better for "Total ISK" visualization
    return logs.slice().reverse().map((l: any) => {
      currentTotal += (l.amount || 0)
      return currentTotal
    })
  }, [activity.data])


  const handleSyncFinancials = async () => {
    setIsSyncing(true)
    setSyncStatus('idle')
    
    const isMining = activity.type === 'mining'
    const endpoint = isMining ? 'sync-mining' : 'sync'
    const desc = isMining ? "Fetching mining ledger data." : "Fetching latest wallet journal entries."
    const successDesc = isMining ? (updated: any) => {
      const logCount = updated.data?.logs?.length || 0
      console.log('[UI] Mining sync completed, logs:', logCount)
      return `Found ${logCount} mining records.`
    } : (updated: any) => `Found ${updated.data?.logs?.length || 0} recent transactions.`
    
    const toastId = toast.loading("Syncing with ESI...", { description: desc })
    try {
      console.log('[UI] Calling endpoint:', endpoint, 'with id:', activity.id)
      const res = await fetch(`/api/activities/${endpoint}?id=${activity.id}`, { method: 'POST' })
      console.log('[UI] Response status:', res.status)
      
      if (res.ok) {
        const updated = await res.json()
        console.log('[UI] Updated activity data:', updated.data)
        
        useActivityStore.getState().updateActivity(activity.id, updated)
        setSyncStatus('success')
        toast.success("ESI Sync Complete", { id: toastId, description: successDesc(updated) })
        
        if (!isMining && updated.data?.mtuContents?.length > 0) {
          handleRefreshAppraisal(false, updated.data)
        }
      } else {
        const errorText = await res.text()
        console.log('[UI] Error response:', errorText)
        setSyncStatus('error')
        toast.error("Sync Failed", { id: toastId, description: isMining ? "Could not retrieve mining data from ESI." : "Could not retrieve wallet data from ESI." })
      }
    } catch (error) {
      console.error('[UI] Sync error:', error)
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
    <Card className="bg-[#0a0a0f]/80 backdrop-blur-xl border-zinc-800/40 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all duration-500 hover:border-eve-accent/30 group/card relative">
      <div className="absolute inset-0 bg-gradient-to-br from-eve-accent/5 via-transparent to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-700 pointer-events-none" />
      
      <CardHeader className="py-4 px-6 bg-zinc-950/40 border-b border-white/[0.03] relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner group-hover/card:border-eve-accent/50 transition-colors duration-500">
                {typeInfo ? <typeInfo.icon className={cn("h-5 w-5", typeInfo.color)} /> : <ActivityIcon className="h-5 w-5 text-zinc-500" />}
              </div>
              <div className="absolute -bottom-1 -right-1 h-3 w-3 rounded-full bg-green-500 border-2 border-[#0a0a10] animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
                  Tactical Ops // {activity.type}
                </span>
              </div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span className="truncate max-w-[180px]">{(activity as any).item?.name || activity.data?.siteName || 'Active Operations'}</span>
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 bg-black/40 rounded-full p-1 border border-white/[0.05] shadow-inner backdrop-blur-md">
              <button
                onClick={() => setDisplayMode('compact')}
                className={cn(
                  "px-3 py-1 rounded-full transition-all duration-500 text-[10px] font-black uppercase tracking-widest",
                  displayMode === 'compact' ? "bg-eve-accent text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                HUD
              </button>
              <button
                onClick={() => setDisplayMode('tabs')}
                className={cn(
                  "px-3 py-1 rounded-full transition-all duration-500 text-[10px] font-black uppercase tracking-widest",
                  displayMode === 'tabs' ? "bg-eve-accent text-black shadow-[0_0_15px_rgba(0,255,255,0.3)]" : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                DATA
              </button>
            </div>
            
            <div className="flex items-center gap-2 bg-zinc-900/50 px-3 py-1.5 rounded-xl border border-white/[0.03] shadow-inner">
              <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-ping" />
              <span className="text-xs font-mono font-bold text-cyan-400 tracking-tighter">{elapsed}</span>
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
            <ActivityDetailDialog 
              activity={activity} 
              trigger={
                <Button size="sm" variant="ghost" className="h-7 px-2 text-[10px] font-bold text-zinc-500 hover:text-cyan-400 uppercase tracking-widest">
                  <History className="h-3.5 w-3.5 mr-1.5" /> Log
                </Button>
              }
            />
          </div>
        </div>
      </CardContent>
      
      <CardContent className="space-y-3 p-4">
        {displayMode === 'compact' ? (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Ultra Compact Performance Display */}
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
                        {isMiningActivity ? formatISK(miningTotalValue) : formatISK(totalIsk)}
                      </span>
                      <span className="text-xs text-zinc-600 font-bold uppercase tracking-widest">ISK</span>
                    </p>
                  </div>
                  
                  <div className="text-left sm:text-right space-y-1">
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-500">Hourly Rate</p>
                    <p className="text-xl font-black text-cyan-400 font-mono tracking-tighter">
                      {isMiningActivity 
                        ? formatNumber(Math.round(miningTotalQuantity / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000))) + ' m³/h'
                        : formatISK(totalIsk / Math.max(0.01, (Date.now() - new Date(activity.startTime).getTime()) / 3600000)) + '/h'
                      }
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
                  onClick={handleSyncFinancials}
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

            {/* Quick Fleet Preview */}
            <div className="flex items-center justify-between px-2 pt-2">
              <div className="flex -space-x-2">
                {activity.participants.slice(0, 6).map(p => (
                  <Avatar key={p.characterId} className="h-8 w-8 border-2 border-[#0a0a0f] ring-1 ring-white/5">
                    <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                    <AvatarFallback className="bg-zinc-900 text-[10px] font-black">
                      {(p.characterName || '??').slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {activity.participants.length > 6 && (
                  <div className="h-8 w-8 rounded-full bg-zinc-900 border-2 border-[#0a0a0f] ring-1 ring-white/5 flex items-center justify-center text-[10px] font-black text-zinc-400">
                    +{activity.participants.length - 6}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-black uppercase tracking-widest text-zinc-600">
                  Fleet Status: <span className="text-green-500">Optimal</span>
                </div>
              </div>
            </div>
          </div>

        ) : displayMode === 'tabs' ? (
          <>
            {isMiningActivity ? (
              <MiningActivityContent 
                activity={activity} 
                onSync={handleSyncFinancials}
                isSyncing={isSyncing}
                syncStatus={syncStatus}
                onEnd={onEnd}
              />
            ) : activity.type === 'ratting' ? (
              <RattingActivityContent 
                activity={activity} 
                onSync={handleSyncFinancials}
                isSyncing={isSyncing}
                syncStatus={syncStatus}
                essCountdown={essCountdown}
              />
) : (
              /* Fallback for other activity types */
              <div className="py-4 text-center text-zinc-500 text-sm">
                {t('activity.detailedModeNotAvailable')}
              </div>
            )}
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
