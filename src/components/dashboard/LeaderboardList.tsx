'use client'

import { formatISK } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Target, Zap, Clock, TrendingUp, ChevronLeft, ChevronRight, Minus } from 'lucide-react'
import { 
  startOfDay, 
  startOfWeek, 
  startOfMonth,
  addDays,
  addWeeks,
  addMonths,
  differenceInSeconds
} from 'date-fns'

interface LeaderboardItem {
  userId: string
  bounty: number
  ess: number
  total: number
  characterName: string
  characterId: number
}

interface LeaderboardListProps {
  data: LeaderboardItem[]
  currentUserId?: string
  period?: string
  userRank?: number
  onRefresh?: () => void
  isRefreshing?: boolean
}

function getCountdown(period: string): string {
  const now = new Date()
  
  if (period === 'alltime') {
    return 'N/A'
  }
  
  let target: Date
  
  switch (period) {
    case 'daily':
      target = addDays(startOfDay(now), 1)
      break
    case 'weekly':
      target = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1)
      break
    case 'monthly':
      target = addMonths(startOfMonth(now), 1)
      break
    default:
      return '--'
  }
  
  const diff = differenceInSeconds(target, now)
  const hours = Math.floor(diff / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  const secs = diff % 60
  
  return `${hours}h ${mins}m ${secs}s`
}

export function LeaderboardList({ 
  data, 
  currentUserId, 
  period,
  userRank,
  onRefresh,
  isRefreshing 
}: LeaderboardListProps) {
  const [prevData, setPrevData] = useState<LeaderboardItem[]>([])
  const [page, setPage] = useState(0)
  const [countdown, setCountdown] = useState('')
  const itemsPerPage = 5

  const paginatedData = data.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const totalPages = Math.ceil(data.length / itemsPerPage)
  
  const currentUserPosition = data.findIndex(item => item.userId === currentUserId) + 1

  useEffect(() => {
    setPrevData(data)
  }, [data])

  useEffect(() => {
    if (!period || period === 'alltime') return
    
    setCountdown(getCountdown(period))
    const interval = setInterval(() => {
      setCountdown(getCountdown(period))
    }, 1000)
    
    return () => clearInterval(interval)
  }, [period])

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <TrendingUp className="h-12 w-12 text-gray-600 mb-3" />
        <p className="text-gray-400 text-base">No activity recorded</p>
        <p className="text-gray-500 text-sm mt-1">Start a ratting activity to appear on the leaderboard</p>
      </div>
    )
  }

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return `#${index + 1}`
    }
  }

  const getRankBorderColor = (index: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'border-cyan-500 bg-cyan-500/10 ring-1 ring-cyan-500/50'
    switch (index) {
      case 0: return 'border-yellow-500 bg-yellow-500/10 ring-1 ring-yellow-500/50'
      case 1: return 'border-slate-300 bg-slate-300/10 ring-1 ring-slate-300/30'
      case 2: return 'border-amber-600 bg-amber-600/10 ring-1 ring-amber-600/30'
      default: return 'border-eve-border bg-eve-dark/40'
    }
  }

  const getRankTextColor = (index: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'text-cyan-400'
    switch (index) {
      case 0: return 'text-yellow-400'
      case 1: return 'text-slate-200'
      case 2: return 'text-amber-500'
      default: return 'text-gray-300'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0
    }
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-4">
        {currentUserPosition === 0 && currentUserId && userRank && userRank > itemsPerPage && (
          <div className="flex items-center justify-between p-3 rounded-lg border border-cyan-500/50 bg-cyan-500/10">
            <div className="flex items-center gap-2">
              <span className="text-cyan-400 font-bold">Your Rank</span>
              <ChevronRight className="h-4 w-4 text-cyan-400" />
              <span className="text-2xl font-bold text-cyan-400">#{userRank}</span>
            </div>
            <span className="text-xs text-gray-400">Keep ratting to climb!</span>
          </div>
        )}
        
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-3"
          >
            {paginatedData.map((item, index) => {
              const globalIndex = page * itemsPerPage + index
              const isCurrentUser = currentUserId === item.userId
              const leaderTotal = data[0]?.total || 0
              const diffFromLeader = leaderTotal - item.total
              const percentOfLeader = leaderTotal > 0 ? (item.total / leaderTotal) * 100 : 0
              const prevPosition = prevData.findIndex(p => p.userId === item.userId)
              const rankChange = prevPosition !== -1 ? prevPosition - globalIndex : 0

              return (
                <motion.div
                  key={item.userId}
                  variants={itemVariants}
                  layout
                  className={cn(
                    "relative flex flex-col gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.01] md:p-3",
                    getRankBorderColor(globalIndex, isCurrentUser)
                  )}
                >
                  <div className="flex items-center gap-3 md:gap-2">
                    <div className="relative min-w-[2.5rem] md:min-w-[2rem]">
                      <span className="text-xl md:text-lg font-bold text-center block">
                        {getMedalEmoji(globalIndex)}
                      </span>
                      {rankChange !== 0 && (
                        <motion.span 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "absolute -top-1 -right-1 text-xs font-bold flex items-center justify-center",
                            rankChange > 0 ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {rankChange > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                        </motion.span>
                      )}
                    </div>
                    
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <div className="cursor-pointer shrink-0">
                          <Avatar className="h-12 w-12 md:h-10 md:w-10 border-2 border-eve-border hover:border-cyan-500 transition-colors">
                            <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                            <AvatarFallback className="bg-eve-dark text-sm">{item.characterName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content 
                          className="bg-eve-panel border border-eve-border rounded-lg p-4 shadow-xl z-50"
                          sideOffset={5}
                        >
                          <div className="space-y-3 min-w-[200px]">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                              </Avatar>
                              <div>
                                <p className="text-base font-bold text-white">{item.characterName}</p>
                                <p className="text-xs text-gray-400">Rank #{globalIndex + 1}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="bg-eve-dark/50 rounded-lg p-3">
                                <p className="text-gray-400 flex items-center gap-1 text-xs">
                                  <Target className="h-3 w-3" /> Bounty
                                </p>
                                <p className="text-green-400 font-mono font-bold text-sm">{formatISK(item.bounty)}</p>
                              </div>
                              <div className="bg-eve-dark/50 rounded-lg p-3">
                                <p className="text-gray-400 flex items-center gap-1 text-xs">
                                  <Zap className="h-3 w-3" /> ESS
                                </p>
                                <p className="text-blue-400 font-mono font-bold text-sm">{formatISK(item.ess)}</p>
                              </div>
                            </div>
                          </div>
                          <Tooltip.Arrow className="fill-eve-border" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn("text-base md:text-sm font-bold truncate", getRankTextColor(globalIndex, isCurrentUser))}>
                          {item.characterName}
                        </p>
                        {isCurrentUser && (
                          <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-medium">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs md:text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-500" />
                          <span className="text-green-500 font-medium">{formatISK(item.bounty)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-blue-500" />
                          <span className="text-blue-500 font-medium">{formatISK(item.ess)}</span>
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={cn("text-lg md:text-base font-bold font-mono", getRankTextColor(globalIndex, isCurrentUser))}>
                        {formatISK(item.total)}
                      </p>
                      {globalIndex > 0 && (
                        <p className="text-xs text-red-400 flex items-center justify-end gap-1">
                          <Minus className="h-2 w-2" />
                          {formatISK(diffFromLeader)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-eve-dark rounded-full h-2 md:h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentOfLeader}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full",
                        isCurrentUser ? "bg-cyan-500" :
                        globalIndex === 0 ? "bg-yellow-500" :
                        globalIndex === 1 ? "bg-slate-300" :
                        globalIndex === 2 ? "bg-amber-500" : "bg-green-500"
                      )}
                    />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-2 px-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>
            <span className="text-sm text-gray-400">
              {page + 1} <span className="text-gray-600">/</span> {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="flex items-center gap-1 text-sm text-gray-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}

        {countdown && period !== 'alltime' && (
          <div className="flex items-center justify-center gap-2 pt-2 text-sm text-gray-500 border-t border-eve-border">
            <Clock className="h-4 w-4" />
            <span>Resets in:</span>
            <span className="text-cyan-400 font-mono font-bold">{countdown}</span>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  )
}