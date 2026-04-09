'use client'

import { formatISK } from '@/lib/utils'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

interface LeaderboardItem {
  userId: string
  total: number
  characterName: string
  characterId: number
}

interface LeaderboardListProps {
  data: LeaderboardItem[]
}

export function LeaderboardList({ data }: LeaderboardListProps) {
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

  const getRankBorderColor = (index: number) => {
    switch (index) {
      case 0: return 'border-yellow-500/50 bg-yellow-500/5'
      case 1: return 'border-gray-400/50 bg-gray-400/5'
      case 2: return 'border-amber-600/50 bg-amber-600/5'
      default: return 'border-eve-border bg-eve-dark/20'
    }
  }

  const getRankTextColor = (index: number) => {
    switch (index) {
      case 0: return 'text-yellow-400'
      case 1: return 'text-gray-300'
      case 2: return 'text-amber-500'
      default: return 'text-gray-400'
    }
  }

  return (
    <div className="space-y-2">
      {data.slice(0, 5).map((item, index) => (
        <div
          key={item.userId}
          className={`flex items-center gap-3 p-2.5 rounded-lg border ${getRankBorderColor(index)} transition-all hover:scale-[1.01]`}
        >
          <span className="text-lg w-6 text-center">{getMedalEmoji(index)}</span>
          
          <Avatar className="h-9 w-9 border-2 border-eve-border">
            <AvatarImage src={`https://images.evetech.net/characters/${item.characterId}/portrait?size=64`} />
            <AvatarFallback className="bg-eve-dark text-xs">{item.characterName.slice(0, 2)}</AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold truncate ${getRankTextColor(index)}`}>
              {item.characterName}
            </p>
            <p className="text-[10px] text-gray-500">Rank {index + 1}</p>
          </div>
          
          <div className="text-right">
            <p className={`text-sm font-bold font-mono ${getRankTextColor(index)}`}>
              {formatISK(item.total)}
            </p>
            <p className="text-[9px] text-gray-500 uppercase tracking-wider">Total</p>
          </div>
        </div>
      ))}
    </div>
  )
}
