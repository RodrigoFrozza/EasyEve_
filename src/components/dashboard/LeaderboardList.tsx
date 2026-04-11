'use client'

import { formatISK } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import { Provider as TooltipProvider } from '@radix-ui/react-tooltip'
import { Target, Zap, Clock, TrendingUp, ChevronLeft, ChevronRight, Minus, Hexagon } from 'lucide-react'
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
  total: number
  label1?: number // bounty (ratting) or quantity (mining)
  label2?: number // ess (ratting)
  characterName: string
  characterId: number
}

interface LeaderboardListProps {
  data: LeaderboardItem[]
  currentUserId?: string
  period?: string
  type?: string
  userRank?: number
  onRefresh?: () => void
  isRefreshing?: boolean
}

function getCountdown(period: string): string {
  const now = new Date()
  if (period === 'alltime') return 'N/A'
  let target: Date
  switch (period) {
    case 'daily': target = addDays(startOfDay(now), 1); break
    case 'weekly': target = addWeeks(startOfWeek(now, { weekStartsOn: 1 }), 1); break
    case 'monthly': target = addMonths(startOfMonth(now), 1); break
    default: return '--'
  }
  const diff = differenceInSeconds(target, now)
  const hours = Math.floor(diff / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  const secs = diff % 60
  return `${hours}h ${mins}m ${secs}s`
}

function FuturisticMedal({ rank, className }: { rank: number; className?: string }) {
  const colors = [
    'text-cyan-400 fill-cyan-400/20 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]', // 1st
    'text-yellow-500 fill-yellow-500/20 drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]', // 2nd
    'text-amber-600 fill-amber-600/20 drop-shadow-[0_0_8px_rgba(217,119,6,0.5)]', // 3rd
  ]
  
  if (rank > 3) return <span className="text-[10px] font-bold text-gray-500">#{rank}</span>

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <Hexagon className={cn("h-6 w-6 stroke-[1.5]", colors[rank - 1])} />
      <span className="absolute text-[10px] font-black text-white">{rank}</span>
    </div>
  )
}

export function LeaderboardList({ 
  data, 
  currentUserId, 
  period,
  type = 'ratting',
  userRank,
  onRefresh,
  isRefreshing 
}: LeaderboardListProps) {
  const [prevData, setPrevData] = useState<LeaderboardItem[]>([])
  const [page, setPage] = useState(0)
  const [countdown, setCountdown] = useState('')
  const itemsPerPage = 6 // Slightly more for the compact view
  
  const top3 = data.slice(0, 3)
  const remainingData = data.slice(3)
  const paginatedData = remainingData.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const totalPages = Math.ceil(remainingData.length / itemsPerPage)
  
  const currentUserPosition = data.findIndex(item => item.userId === currentUserId) + 1

  useEffect(() => {
    setPrevData(data)
  }, [data])

  useEffect(() => {
    if (!period || period === 'alltime') return
    setCountdown(getCountdown(period))
    const interval = setInterval(() => setCountdown(getCountdown(period)), 1000)
    return () => clearInterval(interval)
  }, [period])

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <TrendingUp className="h-10 w-10 text-gray-700 mb-2" />
        <p className="text-gray-400 text-sm">No activity recorded</p>
      </div>
    )
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* Compact Podium Top 3 */}
        <div className="grid grid-cols-3 gap-2 pb-2">
          {top3.map((item, index) => {
            const isCurrentUser = currentUserId === item.userId
            const rank = index + 1
            return (
              <motion.div
                key={item.userId}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={cn(
                  "relative flex flex-col items-center p-2 rounded-xl border border-white/5 bg-[#0a0a0f]/40 backdrop-blur-md overflow-hidden",
                  isCurrentUser && "border-cyan-500/30 bg-cyan-500/5 ring-1 ring-cyan-500/20"
                )}
              >
                <div className="absolute top-0 right-0 p-1">
                  <FuturisticMedal rank={rank} />
                </div>
                
                <Avatar className={cn(
                  "h-10 w-10 border border-white/10 mt-1",
                  rank === 1 && "h-12 w-12 ring-2 ring-cyan-400/30"
                )}>
                  <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                  <AvatarFallback>{item.characterName[0]}</AvatarFallback>
                </Avatar>

                <div className="mt-2 text-center w-full">
                  <p className="text-[10px] font-bold text-white truncate max-w-full px-1">
                    {item.characterName}
                  </p>
                  <p className="text-[11px] font-mono font-black text-cyan-400 mt-0.5">
                    {formatISK(item.total)}
                  </p>
                  {type === 'mining' && typeof item.label1 === 'number' ? (
                    <p className="text-[9px] font-mono text-zinc-500 font-bold uppercase tracking-tight">
                       {Math.round(item.label1).toLocaleString()} m³
                    </p>
                  ) : (
                    <p className="text-[9px] font-mono text-zinc-600 uppercase tracking-tight">Efficiency Leader</p>
                  )}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* User Rank Indicator (Only if not in top 3) */}
        {currentUserPosition > 3 && (
          <div className="flex items-center justify-between py-1.5 px-3 rounded-lg border border-cyan-500/30 bg-cyan-500/10 mb-2">
             <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold">Your Rank</span>
                <span className="text-sm font-black text-cyan-400">#{currentUserPosition}</span>
             </div>
             <div className="text-[10px] text-gray-500 font-mono">
                {formatISK(data[currentUserPosition-1].total)}
             </div>
          </div>
        )}

        {/* Compact List for Remaining */}
        <AnimatePresence mode="wait">
          <motion.div
            key={period + page}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-1.5"
          >
            {paginatedData.map((item, index) => {
              const globalIndex = 3 + page * itemsPerPage + index
              const isCurrentUser = currentUserId === item.userId
              const leaderTotal = data[0]?.total || 0
              const percentOfLeader = leaderTotal > 0 ? (item.total / leaderTotal) * 100 : 0

              return (
                <motion.div
                  key={item.userId}
                  variants={itemVariants}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-3 rounded-lg border border-white/5 bg-[#0a0a0f]/20 hover:bg-[#0a0a0f]/40 transition-colors group",
                    isCurrentUser && "border-cyan-500/20 bg-cyan-500/5"
                  )}
                >
                  <span className="w-5 text-[10px] font-bold text-gray-600 text-center">
                    {globalIndex + 1}
                  </span>
                  
                  <Avatar className="h-7 w-7 border border-white/5">
                    <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                    <AvatarFallback className="text-[10px]">{item.characterName[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <p className={cn(
                        "text-[11px] font-semibold truncate",
                        isCurrentUser ? "text-cyan-400" : "text-gray-300"
                      )}>
                        {item.characterName}
                      </p>
                        <p className="text-[11px] font-mono text-white font-bold">
                          {formatISK(item.total)}
                        </p>
                        {type === 'mining' && typeof item.label1 === 'number' && (
                          <p className="text-[9px] font-mono text-zinc-500 font-bold leading-none mt-1">
                            {Math.round(item.label1).toLocaleString()} m³
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="w-full bg-white/5 h-0.5 mt-1 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentOfLeader}%` }}
                        className={cn(
                          "h-full rounded-full transition-all duration-1000",
                          isCurrentUser ? "bg-cyan-500" : "bg-gray-600 group-hover:bg-gray-500"
                        )}
                      />
                    </div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {/* Compact Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-1 px-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-1 rounded hover:bg-white/5 disabled:opacity-20 transition-colors"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="text-[9px] uppercase tracking-widest text-gray-600 font-bold">
              Page {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1 rounded hover:bg-white/5 disabled:opacity-20 transition-colors"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Stats Footer */}
        {countdown && period !== 'alltime' && (
          <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-500">
              <Clock className="h-3 w-3 text-cyan-500/50" />
              <span>Resets in: <span className="text-gray-300 font-mono">{countdown}</span></span>
            </div>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className={cn("text-[9px] text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 transition-colors", isRefreshing && "animate-pulse")}
              >
                Syncing <TrendingUp className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  )
}