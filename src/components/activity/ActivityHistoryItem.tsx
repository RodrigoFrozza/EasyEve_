'use client'

import { useState, useEffect } from 'react'
import { formatISK, formatNumber, cn } from '@/lib/utils'
import { 
  Clock, 
  Users, 
  Trash2, 
  ChevronRight, 
  Pickaxe, 
  Sword, 
  Compass, 
  ShieldAlert,
  Zap,
  Info
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ActivityDetailDialog } from './ActivityDetailDialog'
import { useTranslations } from '@/i18n/hooks'

interface ActivityHistoryItemProps {
  activity: any
  onDelete: (id: string) => void
}

export function ActivityHistoryItem({ activity, onDelete }: ActivityHistoryItemProps) {
  const { t } = useTranslations()
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const [isDetailOpen, setIsDetailOpen] = useState(false)

  const startTime = new Date(activity.startTime)
  const endTime = activity.endTime ? new Date(activity.endTime) : new Date()
  const durationMs = endTime.getTime() - startTime.getTime()
  
  const hours = Math.floor(durationMs / (1000 * 60 * 60))
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
  const durationText = `${hours > 0 ? `${hours}h ` : ''}${minutes}m`

  const isMining = activity.type === 'mining'
  const data = activity.data || {}
  
  const earnings = isMining 
    ? (data.totalEstimatedValue || 0)
    : (data.automatedBounties || 0) + (data.automatedEss || 0) + (data.additionalBounties || 0) + (data.estimatedLootValue || 0) + (data.estimatedSalvageValue || 0)

  const netEarnings = isMining
    ? earnings
    : earnings - (data.automatedTaxes || 0)

  const getRelativeTime = (date: Date) => {
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days === 0) return 'Hoje'
    if (days === 1) return 'Ontem'
    return `há ${days} dias`
  }

  const getTypeIcon = () => {
    switch (activity.type) {
      case 'mining': return <Pickaxe className="h-4 w-4 text-blue-400" />
      case 'ratting': return <Sword className="h-4 w-4 text-red-400" />
      case 'exploration': return <Compass className="h-4 w-4 text-green-400" />
      case 'abyssal': return <Zap className="h-4 w-4 text-purple-400" />
      default: return <Pickaxe className="h-4 w-4 text-zinc-400" />
    }
  }

  return (
    <div className="group relative">
      <div 
        onClick={() => setIsDetailOpen(true)}
        className="bg-zinc-950/40 border border-zinc-900/50 rounded-xl p-4 hover:bg-zinc-900/40 hover:border-zinc-800 transition-all cursor-pointer group/item"
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            {/* Left: Icon & Title */}
            <div className="h-10 w-10 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 group-hover/item:border-eve-accent/30 transition-colors">
              {getTypeIcon()}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-zinc-100 truncate capitalize tracking-tight">
                  {data.siteName || activity.type}
                </span>
                <Badge variant="outline" className={cn(
                  "text-[8px] h-4 uppercase font-black tracking-widest px-1.5",
                  activity.space === 'high' && "text-green-500 border-green-500/20 bg-green-500/5",
                  activity.space === 'low' && "text-yellow-500 border-yellow-500/20 bg-yellow-500/5",
                  activity.space === 'null' && "text-red-500 border-red-500/20 bg-red-500/5"
                )}>
                  {activity.space || 'Sec'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                <span className="flex items-center gap-1.5 shrink-0">
                  <Clock className="h-3 w-3 text-zinc-600" />
                  {durationText}
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Users className="h-3 w-3 text-zinc-600" />
                  {activity.participants.length} P
                </span>
                {isMining && data.totalQuantity > 0 && (
                   <span className="flex items-center gap-1.5 shrink-0 text-blue-400/70">
                     <Info className="h-3 w-3" />
                     {formatNumber(data.totalQuantity)} m³
                   </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: Metrics & Actions */}
          <div className="flex items-center gap-6">
            <div className="text-right shrink-0">
              <p className={cn(
                "text-sm font-black font-mono tracking-tighter",
                netEarnings > 0 ? "text-eve-accent" : "text-zinc-500"
              )}>
                {formatISK(netEarnings)}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase font-black tracking-widest">
                {t('activity.netProfit')}
              </p>
            </div>
            
            <div className="text-right shrink-0 min-w-[70px]">
              <p className="text-xs font-bold text-zinc-300 mb-0.5" suppressHydrationWarning>
                {mounted ? getRelativeTime(startTime) : '--'}
              </p>
              <p className="text-[9px] text-zinc-600 font-mono" suppressHydrationWarning>
                {mounted ? startTime.toLocaleDateString() : '--/--/----'}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
               <ChevronRight className="h-4 w-4 text-zinc-800 group-hover/item:text-eve-accent transition-all transform group-hover/item:translate-x-1" />
            </div>
          </div>
        </div>
      </div>

      {/* Delete Action */}
      <Button
        variant="ghost"
        size="icon"
        title="Apagar Registro"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(activity.id)
        }}
        className="absolute -right-3 -top-3 h-8 w-8 rounded-full bg-zinc-950 border border-zinc-900 text-zinc-600 hover:text-red-500 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 z-10 shadow-xl"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <ActivityDetailDialog 
        activity={activity} 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
      />
    </div>
  )
}
