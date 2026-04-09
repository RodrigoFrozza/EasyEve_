'use client'

import { formatISK } from '@/lib/utils'
import { Trophy } from 'lucide-react'

interface LeaderboardItem {
  userId: string
  total: number
  characterName: string
}

interface LeaderboardListProps {
  data: LeaderboardItem[]
}

export function LeaderboardList({ data }: LeaderboardListProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-4 text-gray-500 text-xs">
        <Trophy className="h-5 w-5 mx-auto mb-1 opacity-50" />
        <p>No activity yet</p>
      </div>
    )
  }

  const getRankStyle = (index: number) => {
    switch (index) {
      case 0:
        return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30'
      case 1:
        return 'text-gray-300 bg-gray-500/10 border-gray-500/30'
      case 2:
        return 'text-amber-600 bg-amber-600/10 border-amber-600/30'
      default:
        return 'text-gray-400 bg-gray-500/5 border-gray-500/20'
    }
  }

  return (
    <div className="space-y-1.5">
      {data.slice(0, 3).map((item, index) => (
        <div
          key={item.userId}
          className="flex items-center gap-2 p-2 rounded-md border border-eve-border bg-eve-dark/30 text-xs"
        >
          <div className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${getRankStyle(index)}`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white truncate font-medium">{item.characterName}</p>
          </div>
          <p className="text-green-400 font-mono font-bold">
            {formatISK(item.total)}
          </p>
        </div>
      ))}
    </div>
  )
}
