'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Clock, Activity as ActivityIcon } from 'lucide-react'
import { cn, formatISK, formatNumber } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { ACTIVITY_UI_MAPPING } from '@/lib/constants/activity-ui'
import { type Activity } from '@/lib/stores/activity-store'
import { Loader2, LayoutGrid, AlignJustify } from 'lucide-react'

interface ActivityCardHeaderProps {
  activity: Activity
}

export function ActivityCardHeader({ activity }: ActivityCardHeaderProps) {
  const [elapsed, setElapsed] = useState('')
  
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)
  
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
  
  const ui = ACTIVITY_UI_MAPPING[activity.type]
    
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={cn("h-1 w-1 rounded-full", ui?.color || "bg-gray-400", "shadow-[0_0_8px_current]")} />
        <div className="flex flex-col">
          <span className="text-[10px] items-center gap-2 flex text-zinc-500 font-bold uppercase tracking-widest leading-none mb-1">
            <ActivityIcon className="h-3 w-3" />
            {activity.type}
          </span>
          <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
            <span className="truncate">{activity.data?.miningType || activity.data?.siteType || activity.type}</span>
          </h3>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-zinc-950 rounded-full p-1 border border-zinc-900 shadow-inner">
          <button
            className={cn(
              "p-1.5 rounded-full transition-all duration-300",
              "bg-blue-500/20 text-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.1)]"
            )}
            title="Compact Mode"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            className={cn(
              "p-1.5 rounded-full transition-all duration-300",
              "text-zinc-600 hover:text-zinc-400"
            )}
            title="Tabs Mode"
          >
            <AlignJustify className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-400 bg-zinc-950 px-2.5 py-1 rounded-full border border-zinc-900 shadow-inner">
          <Clock className="h-3 w-3 text-blue-500" />
          {elapsed}
        </div>
      </div>
    </div>
  )
}