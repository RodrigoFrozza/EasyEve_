'use client'

import { useState, useEffect } from 'react'
import { LeaderboardList } from './LeaderboardList'
import { RefreshCw } from 'lucide-react'

interface LeaderboardData {
  userId: string
  total: number
  label1?: number // bounty or quantity
  label2?: number // ess or volume
  characterName: string
  characterId: number
}

interface LeaderboardWrapperProps {
  initialData: LeaderboardData[]
  currentUserId?: string
  period: string
  type?: string
  userRank?: number
  refreshInterval?: number // em milliseconds
}

export function LeaderboardWrapper({
  initialData,
  currentUserId,
  period,
  type = 'ratting',
  userRank,
  refreshInterval = 5 * 60 * 1000 // default 5 min
}: LeaderboardWrapperProps) {
  const [data, setData] = useState<LeaderboardData[]>(initialData)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const res = await fetch(`/api/leaderboard?period=${period}&type=${type}`)
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to refresh leaderboard:', error)
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    if (!refreshInterval || refreshInterval <= 0) return
    
    const interval = setInterval(() => {
      handleRefresh()
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [period, type, refreshInterval])

  return (
    <div className="relative">
      <button
        onClick={handleRefresh}
        disabled={isRefreshing}
        className="absolute top-0 right-0 p-1.5 rounded-lg bg-eve-dark/50 border border-eve-border hover:bg-eve-dark transition-colors disabled:opacity-50"
        title="Refresh leaderboard"
      >
        <RefreshCw className={`h-3.5 w-3.5 text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`} />
      </button>
      
      <LeaderboardList 
        data={data} 
        currentUserId={currentUserId} 
        period={period}
        type={type}
        userRank={userRank}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      
      <div className="text-[10px] text-gray-600 text-center mt-2">
        Last updated: {lastUpdated.toLocaleTimeString()}
      </div>
    </div>
  )
}
