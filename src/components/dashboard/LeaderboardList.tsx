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
import * as Tooltip from '@radix-ui/react-tooltip'

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
  const currentUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds())
  
  switch (period) {
    case 'daily':
      target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))
      break
    case 'weekly':
      // Get next Monday 00:00 UTC
      const day = now.getUTCDay()
      const diffToMonday = (day === 0 ? 1 : 8 - day)
      target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + diffToMonday))
      break
    case 'monthly':
      target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
      break
    default:
      return '--'
  }

  const diff = Math.floor((target.getTime() - now.getTime()) / 1000)
  if (diff <= 0) return 'Resetting...'

  const days = Math.floor(diff / 86400)
  const hours = Math.floor((diff % 86400) / 3600)
  const mins = Math.floor((diff % 3600) / 60)
  
  if (days > 0) {
    return `${days}d ${hours}h ${mins}m`
  }
  return `${hours}h ${mins}m ${diff % 60}s`
}

function PlayerTooltip({ item, rank, type, children }: { item: LeaderboardItem; rank: number; type: string; children: React.ReactNode }) {
  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        {children}
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          side="top"
          align="center"
          sideOffset={5}
          className="z-50 animate-in fade-in zoom-in duration-200"
        >
          <div className="w-64 overflow-hidden rounded-xl border border-white/10 bg-[#0a0a0f]/95 p-3 shadow-2xl backdrop-blur-xl">
             <div className="flex items-center gap-3 border-b border-white/5 pb-2 mb-2">
                <Avatar className="h-10 w-10 border border-white/10 shadow-inner">
                  <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                  <AvatarFallback>{item.characterName[0]}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h4 className="text-xs font-black text-white truncate">{item.characterName}</h4>
                  <p className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">Rank #{rank}</p>
                </div>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-gray-500 uppercase font-bold tracking-tighter">Total Earnings</span>
                  <span className="text-white font-mono font-black">{formatISK(item.total)}</span>
                </div>
                
                {type === 'ratting' && (
                  <>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase font-bold tracking-tighter">Bounties</span>
                      <span className="text-zinc-300 font-mono italic">{formatISK(item.label1 || 0)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-gray-500 uppercase font-bold tracking-tighter">ESS Bank</span>
                      <span className="text-zinc-300 font-mono italic">{formatISK(item.label2 || 0)}</span>
                    </div>
                  </>
                )}

                {type === 'mining' && (
                   <div className="flex justify-between items-center text-[10px]">
                    <span className="text-gray-500 uppercase font-bold tracking-tighter">Volume Mined</span>
                    <span className="text-zinc-300 font-mono italic">{(item.label1 || 0).toLocaleString()} m³</span>
                  </div>
                )}
             </div>

             <div className="mt-3 pt-2 border-t border-white/5 flex justify-center">
                <div className={cn(
                  "px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-[0.2em]",
                  rank === 1 ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-gray-500"
                )}>
                  {rank === 1 ? "Elite Operative" : "Active Pilot"}
                </div>
             </div>
          </div>
          <Tooltip.Arrow className="fill-[#0a0a0f]/95" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  )
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
  const itemsPerPage = 6 
  
  const top3 = data.slice(0, 3)
  // Podium Order: [2nd, 1st, 3rd]
  const podiumOrder = top3.length === 3 
    ? [top3[1], top3[0], top3[2]] 
    : top3.length === 2 
      ? [top3[1], top3[0]] 
      : top3

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
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-3">
        {/* Podium Top 3 */}
        <div className="grid grid-cols-3 gap-2 pb-2 items-end min-h-[140px]">
          {podiumOrder.map((item) => {
            const isCurrentUser = currentUserId === item.userId
            const rank = data.findIndex(i => i.userId === item.userId) + 1
            const isFirst = rank === 1
            
            return (
              <PlayerTooltip key={item.userId} item={item} rank={rank} type={type}>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rank * 0.1 }}
                  className={cn(
                    "relative flex flex-col items-center p-2 rounded-xl border border-white/5 bg-[#0a0a0f]/40 backdrop-blur-md transition-all duration-300",
                    isFirst ? "h-[130px] z-10 scale-105" : "h-[110px]",
                    isCurrentUser && "border-cyan-500/30 bg-cyan-500/5 ring-1 ring-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                  )}
                >
                  <div className="absolute top-0 right-0 p-1">
                    <FuturisticMedal rank={rank} />
                  </div>
                  
                  <Avatar className={cn(
                    "mt-1 border border-white/10 transition-transform duration-300",
                    isFirst ? "h-14 w-14 ring-4 ring-cyan-500/20" : "h-10 w-10"
                  )}>
                    <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                    <AvatarFallback>{item.characterName[0]}</AvatarFallback>
                  </Avatar>

                  <div className="mt-2 text-center w-full flex-1 flex flex-col justify-center">
                    <p className={cn(
                      "font-bold truncate max-w-full px-1",
                      isFirst ? "text-[11px] text-white" : "text-[10px] text-gray-300"
                    )}>
                      {item.characterName}
                    </p>
                    <p className={cn(
                      "font-mono font-black mt-0.5",
                      isFirst ? "text-xs text-cyan-400" : "text-[10px] text-cyan-500/80"
                    )}>
                      {formatISK(item.total)}
                    </p>
                  </div>

                  {/* Podium Base/Pedestal effect */}
                  <div className={cn(
                    "absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r",
                    rank === 1 ? "from-cyan-500 via-white/40 to-cyan-500" : rank === 2 ? "from-yellow-500/50 to-yellow-600/50" : "from-amber-600/50 to-amber-700/50"
                  )} />
                </motion.div>
              </PlayerTooltip>
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
              const rank = globalIndex + 1
              const leaderTotal = data[0]?.total || 0
              const percentOfLeader = leaderTotal > 0 ? (item.total / leaderTotal) * 100 : 0

              return (
                <PlayerTooltip key={item.userId} item={item} rank={rank} type={type}>
                  <motion.div
                    variants={itemVariants}
                    className={cn(
                      "flex flex-col gap-1 p-2 pr-4 rounded-lg border border-white/5 bg-[#0a0a0f]/20 hover:bg-[#0a0a0f]/40 transition-all group cursor-help",
                      isCurrentUser && "border-cyan-500/20 bg-cyan-500/5 shadow-[0_0_10px_rgba(6,182,212,0.05)]"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 text-[10px] font-bold text-gray-600 text-center group-hover:text-gray-400 transition-colors">
                        {rank}
                      </span>
                      
                      <Avatar className="h-8 w-8 border border-white/5 shadow-inner">
                        <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                        <AvatarFallback className="text-[10px]">{item.characterName[0]}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className={cn(
                            "text-[11px] font-bold truncate",
                            isCurrentUser ? "text-cyan-400" : "text-gray-300 group-hover:text-white transition-colors"
                          )}>
                            {item.characterName}
                          </p>
                          <p className="text-[11px] font-mono text-cyan-400/90 font-black">
                            {formatISK(item.total)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="ml-8 mt-1 space-y-1">
                      <div className="w-full bg-white/[0.02] h-1 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${percentOfLeader}%` }}
                          className={cn(
                            "h-full rounded-full transition-all duration-1000",
                            isCurrentUser ? "bg-cyan-500" : "bg-zinc-700 group-hover:bg-zinc-600"
                          )}
                        />
                      </div>
                    </div>
                  </motion.div>
                </PlayerTooltip>
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
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <span className="text-[9px] uppercase tracking-[0.2em] text-gray-600 font-black">
               {page + 1} <span className="text-gray-800">/</span> {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-1.5 rounded-lg hover:bg-white/5 disabled:opacity-20 transition-all"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Stats Footer */}
        {countdown && period !== 'alltime' && (
          <div className="flex items-center justify-between px-2 pt-2 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider text-gray-500 font-bold">
              <Clock className="h-3 w-3 text-cyan-500/50" />
              <span>Reset: <span className="text-zinc-300 font-mono tracking-normal">{countdown}</span></span>
            </div>
            {onRefresh && (
              <button 
                onClick={onRefresh}
                className={cn(
                  "text-[9px] text-cyan-400/70 hover:text-cyan-400 flex items-center gap-1 transition-all uppercase font-black tracking-tighter",
                  isRefreshing && "animate-pulse"
                )}
              >
                Syncing <TrendingUp className="h-2.5 w-2.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </Tooltip.Provider>
  )
}