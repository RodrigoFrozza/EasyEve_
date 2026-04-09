'use client'

import { formatISK } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

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
}

export function LeaderboardList({ data, currentUserId }: LeaderboardListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-6 text-gray-500 text-xs">
        <p className="text-gray-400">No activity recorded</p>
      </div>
    )
  }

  const leaderTotal = data[0]?.total || 0

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

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item, index) => {
        const isCurrentUser = currentUserId === item.userId
        const diffFromLeader = leaderTotal - item.total
        const percentOfLeader = leaderTotal > 0 ? (item.total / leaderTotal) * 100 : 0

        return (
          <div
            key={item.userId}
            className={cn(
              "relative flex flex-col gap-2 p-3 rounded-lg border transition-all hover:scale-[1.01]",
              getRankBorderColor(index, isCurrentUser)
            )}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg w-6 text-center">{getMedalEmoji(index)}</span>
              
              <Avatar className="h-10 w-10 border-2 border-eve-border">
                <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
                <AvatarFallback className="bg-eve-dark text-xs">{item.characterName.slice(0, 2)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={cn("text-sm font-bold truncate", getRankTextColor(index, isCurrentUser))}>
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
                <p className={cn("text-sm font-bold font-mono", getRankTextColor(index, isCurrentUser))}>
                  {formatISK(item.total)}
                </p>
                {index > 0 && (
                  <p className="text-[10px] text-red-400">
                    -{formatISK(diffFromLeader)}
                  </p>
                )}
              </div>
            </div>

            <div className="w-full bg-eve-dark rounded-full h-1.5 overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isCurrentUser ? "bg-cyan-500" :
                  index === 0 ? "bg-yellow-500" :
                  index === 1 ? "bg-gray-400" :
                  index === 2 ? "bg-amber-500" : "bg-green-500"
                )}
                style={{ width: `${percentOfLeader}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
