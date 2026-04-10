'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  Download, 
  Wallet, 
  TrendingUp, 
  Package, 
  Receipt,
  Clock,
  ArrowRight,
  ShieldCheck,
  Zap,
  Box
} from 'lucide-react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { MiningSummaryPanel } from './summary/MiningSummaryPanel'
import { RattingSummaryPanel } from './summary/RattingSummaryPanel'
import { MTUManagementModal } from './summary/MTUManagementModal'
import { toast } from 'sonner'

interface ActivityDetailDialogProps {
  activity: any
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function ActivityDetailDialog({ activity: initialActivity, trigger, open, onOpenChange }: ActivityDetailDialogProps) {
  const [activity, setActivity] = useState(initialActivity)
  const [isMtuModalOpen, setIsMtuModalOpen] = useState(false)
  const [elapsed, setElapsed] = useState<string>('')

  const isMiningActivity = activity.type === 'mining'
  const isRattingActivity = activity.type === 'ratting'
  const data = (activity.data as any) || {}
  
  // Stats calculation
  const automatedBounties = data.automatedBounties || 0
  const automatedEss = data.automatedEss || 0
  const automatedTaxes = data.automatedTaxes || 0
  const additionalBounties = data.additionalBounties || 0
  const estimatedLootValue = data.estimatedLootValue || 0
  const estimatedSalvageValue = data.estimatedSalvageValue || 0
  
  const miningTotalQuantity = data.totalQuantity || 0
  const miningTotalValue = data.totalEstimatedValue || 0
  
  const grossBounty = data.grossBounties || (automatedBounties + automatedEss + additionalBounties)
  const totalRevenue = isMiningActivity 
    ? miningTotalValue 
    : grossBounty + estimatedLootValue + estimatedSalvageValue
    
  const netProfit = isMiningActivity
    ? miningTotalValue
    : totalRevenue - automatedTaxes

  // Timer logic
  useEffect(() => {
    const updateElapsed = () => {
      const start = new Date(activity.startTime).getTime()
      const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
      const diff = end - start
      
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      
      setElapsed(`${hours > 0 ? `${hours}h ` : ''}${minutes}m ${seconds}s`)
    }
    
    updateElapsed()
    if (!activity.endTime) {
      const timer = setInterval(updateElapsed, 1000)
      return () => clearInterval(timer)
    }
  }, [activity.startTime, activity.endTime])

  const handleExportCSV = () => {
    const logs = data.logs || []
    if (logs.length === 0) {
      toast.error('No logs available for export')
      return
    }
    
    const headers = isMiningActivity 
      ? "Date,Character,Ore,Quantity,EstimatedValue\n"
      : "Date,Character,Type,Amount\n"
      
    const rows = logs.map((l: any) => {
      if (isMiningActivity) {
        return `${new Date(l.date).toISOString()},${l.charName},${l.oreName},${l.quantity},${l.value}`
      }
      return `${new Date(l.date).toISOString()},${l.charName},${l.type},${l.amount}`
    }).join("\n")
    
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${activity.type}_history_${activity.id.slice(0, 8)}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleMTUSave = (newMtus: any[]) => {
    setActivity((prev: any) => ({
      ...prev,
      data: {
        ...prev.data,
        mtuSummaries: newMtus,
        estimatedLootValue: newMtus.reduce((sum, m) => sum + (m.value || 0), 0)
      }
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="bg-[#050507] border-white/5 sm:max-w-[850px] max-h-[92vh] overflow-hidden flex flex-col p-0 gap-0 shadow-[0_0_80px_rgba(0,0,0,0.8)]">
        
        {/* Header Section */}
        <div className="bg-zinc-900/50 border-b border-white/5 p-8 relative">
          <div className="absolute top-0 right-0 p-8 flex flex-col items-end gap-2">
            <span className="text-[10px] text-zinc-500 font-black tracking-widest uppercase opacity-40">Operational Clock</span>
            <div className="bg-black/30 border border-white/5 px-4 py-2 rounded-xl">
              <span className="text-2xl font-black font-mono text-eve-accent tracking-tighter tabular-nums">{elapsed}</span>
            </div>
          </div>

          <DialogHeader className="p-0 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Badge variant="outline" className="px-3 py-1 text-[10px] uppercase font-black tracking-[0.2em] border-eve-accent/30 text-eve-accent bg-eve-accent/5 rounded-md">
                {activity.type} OPERATION
              </Badge>
              <div className="h-4 w-[1px] bg-white/10" />
              <div className="text-[10px] font-black font-mono text-zinc-600 uppercase tracking-widest">
                SES_ID: {activity.id.slice(0, 12)}
              </div>
            </div>
            
            <DialogTitle className="text-4xl font-black text-white tracking-tighter flex items-center gap-4">
              {data.siteName || (activity.type || 'Activity').toUpperCase()}
              {activity.status === 'completed' && (
                <Badge className="bg-zinc-800 text-zinc-400 hover:bg-zinc-800 border-none font-black text-[9px] uppercase tracking-widest">
                  ARCHIVED
                </Badge>
              )}
            </DialogTitle>
            
            <DialogDescription className="text-xs text-zinc-500 font-bold uppercase tracking-wider mt-4 flex items-center gap-2">
              <Clock className="h-3 w-3" />
              SESSION START: <span className="text-zinc-400">{new Date(activity.startTime).toLocaleString()}</span>
              {activity.endTime && (
                <>
                   <ArrowRight className="h-3 w-3 mx-1 text-zinc-800" />
                   TERMINATED: <span className="text-zinc-400">{new Date(activity.endTime).toLocaleString()}</span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8">
          
          {/* Top Performance Indicators */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden group">
              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Wallet className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Gross Revenue</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-white font-mono tracking-tighter">{formatISK(totalRevenue)}</p>
                  <p className="text-[10px] text-green-500/50 font-bold mt-1 uppercase">Total credits accrued</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-green-500/20" />
            </div>

            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Efficiency Rating</span>
                </div>
                <div>
                  {(() => {
                    const start = new Date(activity.startTime).getTime()
                    const end = activity.endTime ? new Date(activity.endTime).getTime() : Date.now()
                    const hours = (end - start) / 3600000
                    const iskh = hours > 0.01 ? formatISK(netProfit / hours) : formatISK(0)
                    return (
                      <p className="text-3xl font-black text-white font-mono tracking-tighter">
                        {iskh}<span className="text-xs text-zinc-600 ml-1">/H</span>
                      </p>
                    )
                  })()}
                  <p className="text-[10px] text-blue-500/50 font-bold mt-1 uppercase">Performance frequency</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-blue-500/20" />
            </div>

            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 relative overflow-hidden">
               <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-eve-accent/10 rounded-lg">
                    <ShieldCheck className="h-4 w-4 text-eve-accent" />
                  </div>
                  <span className="text-[10px] text-zinc-500 font-black uppercase tracking-widest">Net Settlement</span>
                </div>
                <div>
                  <p className="text-3xl font-black text-eve-accent font-mono tracking-tighter">{formatISK(netProfit)}</p>
                  <p className="text-[10px] text-eve-accent/30 font-bold mt-1 uppercase">Post-tax calculation</p>
                </div>
              </div>
              <div className="absolute bottom-0 left-0 h-1 w-full bg-eve-accent/20" />
            </div>
          </div>

          {/* Activity Specific Panel */}
          <div className="space-y-4">
             <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-white/5 rounded-xl">
                      <Zap className="h-4 w-4 text-zinc-400" />
                   </div>
                   <h3 className="text-xs font-black uppercase tracking-[0.3em] text-zinc-400">Tactical Insights & Data</h3>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-9 px-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 hover:text-white hover:bg-zinc-900 border border-white/5 rounded-xl"
                  onClick={handleExportCSV}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export .CSV
                </Button>
             </div>

             {isMiningActivity ? (
               <MiningSummaryPanel activity={activity} logs={data.logs || []} />
             ) : isRattingActivity ? (
               <RattingSummaryPanel 
                activity={activity} 
                logs={data.logs || []} 
                onOpenMTU={() => setIsMtuModalOpen(true)}
               />
             ) : (
               <div className="p-20 text-center opacity-40">
                  <p className="text-[10px] font-black uppercase tracking-widest">Summary not available for this activity type</p>
               </div>
             )}
          </div>

          {/* Participants */}
          {activity.participants && activity.participants.length > 0 && (
            <div className="space-y-4">
               <h4 className="text-[10px] uppercase font-black tracking-widest text-zinc-600">Active Crew Members</h4>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {activity.participants.map((p: any) => (
                    <div key={p.characterId} className="bg-zinc-950/40 border border-white/5 rounded-2xl p-3 flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-zinc-900">
                        <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                        <AvatarFallback className="text-[8px] bg-zinc-900 uppercase font-black">{p.characterName?.slice(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-zinc-300 truncate tracking-tight">{p.characterName}</p>
                        <p className="text-[8px] text-zinc-600 truncate uppercase font-bold">{p.fit || 'No Ship'}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-zinc-950 p-8 border-t border-white/5">
          <Button 
            className="w-full bg-white/5 hover:bg-white/10 text-zinc-400 font-black uppercase text-[11px] tracking-[0.3em] h-14 rounded-2xl border border-white/5 transition-all"
            onClick={() => onOpenChange?.(false)}
          >
            Acknowledge Report // Close
          </Button>
        </div>

        {/* Modal Management */}
        <MTUManagementModal 
          activityId={activity.id}
          initialMtus={data.mtuSummaries || []}
          isOpen={isMtuModalOpen}
          onOpenChange={setIsMtuModalOpen}
          onSave={handleMTUSave}
        />
      </DialogContent>
    </Dialog>
  )
}
