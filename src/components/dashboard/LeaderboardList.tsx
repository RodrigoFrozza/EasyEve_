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
      <div className="text-center py-8 text-gray-500">
        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No ratting activity recorded yet</p>
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
    <div className="space-y-2">
      {data.map((item, index) => (
        <div
          key={item.userId}
          className="flex items-center gap-3 p-3 rounded-lg border border-eve-border bg-eve-dark/50"
        >
          <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${getRankStyle(index)}`}>
            {index + 1}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {item.characterName}
            </p>
            <p className="text-xs text-gray-500">
              User ID: {item.userId.slice(-6)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-green-400 font-mono">
              {formatISK(item.total)}
            </p>
            <p className="text-xs text-gray-500">Total Bounty</p>
          </div>
        </div>
      ))}
    </div>
  )
}
