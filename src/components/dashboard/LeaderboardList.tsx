'use client'

import { formatISK } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'
import * as Tooltip from '@radix-ui/react-tooltip'
import { Target, Zap } from 'lucide-react'

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
  onRefresh?: () => void
  isRefreshing?: boolean
}

export function LeaderboardList({ 
  data, 
  currentUserId, 
  period,
  onRefresh,
  isRefreshing 
}: LeaderboardListProps) {
  const [prevData, setPrevData] = useState<LeaderboardItem[]>([])
  const [page, setPage] = useState(0)
  const itemsPerPage = 5

  const paginatedData = data.slice(page * itemsPerPage, (page + 1) * itemsPerPage)
  const totalPages = Math.ceil(data.length / itemsPerPage)

  useEffect(() => {
    setPrevData(data)
  }, [data])

  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-xs">
        <p className="text-gray-400">No activity recorded</p>
      </div>
    )
  }

  const getMedalEmoji = (index: number) => {
    switch (index) {
      case 0: return '🥇'
      case 1: return '🥈'
      case 2: return '🥉'
      default: return ''
    }
  }

  const getRankBorderColor = (index: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'border-cyan-500/50 bg-cyan-500/10 ring-1 ring-cyan-500/30'
    switch (index) {
      case 0: return 'border-yellow-500/50 bg-yellow-500/5'
      case 1: return 'border-gray-400/50 bg-gray-400/5'
      case 2: return 'border-amber-600/50 bg-amber-600/5'
      default: return 'border-eve-border bg-eve-dark/20'
    }
  }

  const getRankTextColor = (index: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'text-cyan-400'
    switch (index) {
      case 0: return 'text-yellow-400'
      case 1: return 'text-gray-300'
      case 2: return 'text-amber-500'
      default: return 'text-gray-400'
    }
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { 
      opacity: 1, 
      x: 0
    }
  }

  return (
    <Tooltip.Provider delayDuration={200}>
      <div className="space-y-3">
        <AnimatePresence mode="wait">
          <motion.div
            key={period}
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2"
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
                    "relative flex flex-col gap-2 p-3 rounded-lg border transition-all hover:scale-[1.01]",
                    getRankBorderColor(globalIndex, isCurrentUser)
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <span className="text-lg w-6 text-center block">{getMedalEmoji(globalIndex)}</span>
                      {rankChange !== 0 && (
                        <motion.span 
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className={cn(
                            "absolute -top-1 -right-1 text-[10px] font-bold",
                            rankChange > 0 ? "text-green-400" : "text-red-400"
                          )}
                        >
                          {rankChange > 0 ? '↑' : '↓'}
                        </motion.span>
                      )}
                    </div>
                    
                    <Tooltip.Root>
                      <Tooltip.Trigger asChild>
                        <div className="cursor-pointer">
                          <Avatar className="h-10 w-10 border-2 border-eve-border hover:border-cyan-500 transition-colors">
                            <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                            <AvatarFallback className="bg-eve-dark text-xs">{item.characterName.slice(0, 2)}</AvatarFallback>
                          </Avatar>
                        </div>
                      </Tooltip.Trigger>
                      <Tooltip.Portal>
                        <Tooltip.Content 
                          className="bg-eve-panel border border-eve-border rounded-lg p-3 shadow-xl z-50"
                          sideOffset={5}
                        >
                          <div className="space-y-2 min-w-[180px]">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                              </Avatar>
                              <div>
                                <p className="text-sm font-bold text-white">{item.characterName}</p>
                                <p className="text-[10px] text-gray-400">Rank #{globalIndex + 1}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-eve-dark/50 rounded p-2">
                                <p className="text-gray-400 flex items-center gap-1">
                                  <Target className="h-3 w-3" /> Bounty
                                </p>
                                <p className="text-green-400 font-mono font-bold">{formatISK(item.bounty)}</p>
                              </div>
                              <div className="bg-eve-dark/50 rounded p-2">
                                <p className="text-gray-400 flex items-center gap-1">
                                  <Zap className="h-3 w-3" /> ESS
                                </p>
                                <p className="text-blue-400 font-mono font-bold">{formatISK(item.ess)}</p>
                              </div>
                            </div>
                          </div>
                          <Tooltip.Arrow className="fill-eve-border" />
                        </Tooltip.Content>
                      </Tooltip.Portal>
                    </Tooltip.Root>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-sm font-bold truncate", getRankTextColor(globalIndex, isCurrentUser))}>
                          {item.characterName}
                        </p>
                        {isCurrentUser && (
                          <span className="text-[10px] bg-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span>Bounty: <span className="text-green-400">{formatISK(item.bounty)}</span></span>
                        <span>ESS: <span className="text-blue-400">{formatISK(item.ess)}</span></span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className={cn("text-sm font-bold font-mono", getRankTextColor(globalIndex, isCurrentUser))}>
                        {formatISK(item.total)}
                      </p>
                      {globalIndex > 0 && (
                        <p className="text-[10px] text-red-400">
                          -{formatISK(diffFromLeader)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-eve-dark rounded-full h-1.5 overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentOfLeader}%` }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                      className={cn(
                        "h-full rounded-full",
                        isCurrentUser ? "bg-cyan-500" :
                        globalIndex === 0 ? "bg-yellow-500" :
                        globalIndex === 1 ? "bg-gray-400" :
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
          <div className="flex items-center justify-between pt-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Prev
            </button>
            <span className="text-xs text-gray-500">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="text-xs text-gray-500 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </Tooltip.Provider>
  )
}
