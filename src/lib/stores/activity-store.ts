'use client'

import { create } from 'zustand'

export interface ActivityParticipant {
  characterId: number
  characterName?: string
  fit?: string
  shipTypeId?: number
}

export interface Activity {
  id: string
  type: string
  status: 'active' | 'completed'
  startTime: string | Date
  endTime?: string | Date
  isPaused?: boolean
  pausedAt?: string | Date
  accumulatedPausedTime?: number // in ms
  typeId?: number
  region?: string
  space?: string
  data?: any 
  participants: ActivityParticipant[]
}

interface ActivityStore {
  activities: Activity[]
  serverClockOffset: number // ms difference between client and server
  isLoading: boolean
  pollingInterval: NodeJS.Timeout | null
  rattingSyncInterval: NodeJS.Timeout | null
  
  setActivities: (activities: Activity[]) => void
  addActivity: (activity: Activity) => void
  updateActivity: (id: string, updates: Partial<Activity>) => void
  removeActivity: (id: string) => void
  
  getActiveCharacterIds: () => number[]
  isCharacterBusy: (characterId: number) => boolean
  
  fetchFromAPI: (type?: string) => Promise<void>
  syncActivity: (id: string, type?: string) => Promise<Activity | null>
  
  startPolling: (interval?: number) => void
  startRattingAutoSync: (interval?: number) => void
  startMiningAutoSync: (interval?: number) => void
  stopPolling: () => void
  stopRattingAutoSync: () => void
  stopMiningAutoSync: () => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  serverClockOffset: 0,
  isLoading: false,
  pollingInterval: null,
  rattingSyncInterval: null,
  miningSyncInterval: null,

  setActivities: (activities) => set({ activities }),

  addActivity: (activity) => set((state) => ({
    activities: [...state.activities, activity]
  })),

  updateActivity: (id, updates) => set((state) => ({
    activities: state.activities.map((a) => a.id === id ? { ...a, ...updates } : a)
  })),

  removeActivity: (id) => set((state) => ({
    activities: state.activities.filter((a) => a.id !== id)
  })),

  getActiveCharacterIds: () => {
    const { activities } = get()
    return activities
      .filter((a) => a.status === 'active')
      .flatMap((a) => a.participants.map((p) => p.characterId))
  },

  isCharacterBusy: (characterId) => {
    return get().getActiveCharacterIds().includes(characterId)
  },

  fetchFromAPI: async (type?: string) => {
    set({ isLoading: true })
    try {
      const url = type ? `/api/activities?type=${type}` : '/api/activities'
      const res = await fetch(url)
      
      // Calculate clock offset from server 'Date' header
      const serverDateStr = res.headers.get('Date')
      if (serverDateStr) {
        const serverTime = new Date(serverDateStr).getTime()
        const localTime = Date.now()
        set({ serverClockOffset: serverTime - localTime })
      }

      if (res.ok) {
        const data = await res.json()
        set({ activities: Array.isArray(data) ? data : [] })
      }
    } catch (error) {
      console.error('Failed to fetch from API:', error)
      set({ activities: [] })
    } finally {
      set({ isLoading: false })
    }
  },

  syncActivity: async (id: string, type?: string) => {
    try {
      // Determine endpoint based on activity type if not provided
      let syncType = type
      if (!syncType) {
        const { activities } = get()
        syncType = activities.find(a => a.id === id)?.type
      }

      const endpoint = syncType === 'mining' ? 'sync-mining' : 'sync'
      const res = await fetch(`/api/activities/${endpoint}?id=${id}`, { method: 'POST' })
      
      if (res.ok) {
        const updated = await res.json()
        set((state) => ({
          activities: state.activities.map((a) => 
            a.id === id ? { ...a, ...updated } : a
          )
        }))
        return updated
      }
      return null
    } catch (error) {
      console.error('Failed to sync activity:', error)
      return null
    }
  },

  startPolling: (interval = 30000) => {
    const { stopPolling, fetchFromAPI } = get()
    stopPolling()
    
    const pollingId = setInterval(() => {
      fetchFromAPI()
    }, interval)
    
    set({ pollingInterval: pollingId })
    fetchFromAPI()
  },

  stopPolling: () => {
    const { pollingInterval } = get()
    if (pollingInterval) {
      clearInterval(pollingInterval)
      set({ pollingInterval: null })
    }
  },

  startRattingAutoSync: (interval = 300000) => {
    const { stopRattingAutoSync, syncActivity } = get()
    stopRattingAutoSync()
    
    const syncId = setInterval(async () => {
      const { activities } = get()
      
      const rattingToSync = (activities || []).filter(a => {
        if (a.type !== 'ratting') return false
        if (a.status === 'active') return true
        
        // If completed, keep syncing for 2.5 hours (150 minutes) to catch ESS payouts
        if (a.status === 'completed' && a.endTime) {
          const end = new Date(a.endTime).getTime()
          const now = Date.now()
          const diffMinutes = (now - end) / (1000 * 60)
          return diffMinutes <= 150 
        }
        
        return false
      })

      if (rattingToSync.length === 0) return
      
      console.log(`[AUTO-SYNC] Syncing ${rattingToSync.length} ratting activities (active + recently completed)...`)
      for (const activity of rattingToSync) {
        try {
          await syncActivity(activity.id)
        } catch (err) {
          console.error(`[AUTO-SYNC] Error syncing activity ${activity.id}:`, err)
        }
      }
    }, interval)
    
    set({ rattingSyncInterval: syncId })
    console.log(`[AUTO-SYNC] Started auto-sync every ${interval/1000}s for ratting activities`)
  },

  stopRattingAutoSync: () => {
    const { rattingSyncInterval } = get()
    if (rattingSyncInterval) {
      clearInterval(rattingSyncInterval)
      set({ rattingSyncInterval: null })
      console.log('[AUTO-SYNC] Stopped Ratting auto-sync')
    }
  },

  startMiningAutoSync: (interval = 300000) => {
    const { stopMiningAutoSync, syncActivity } = get()
    stopMiningAutoSync()
    
    const syncId = setInterval(async () => {
      const { activities } = get()
      
      const miningToSync = (activities || []).filter(a => {
        if (a.type !== 'mining') return false
        if (a.status === 'active') return true
        
        // If completed, keep syncing for 1 hour (60 minutes)
        if (a.status === 'completed' && a.endTime) {
          const end = new Date(a.endTime).getTime()
          const now = Date.now()
          const diffMinutes = (now - end) / (1000 * 60)
          return diffMinutes <= 60 
        }
        
        return false
      })

      if (miningToSync.length === 0) return
      
      console.log(`[AUTO-SYNC] Syncing ${miningToSync.length} mining activities (active + recently completed)...`)
      for (const activity of miningToSync) {
        try {
          await syncActivity(activity.id, 'mining')
        } catch (err) {
          console.error(`[AUTO-SYNC] Error syncing mining activity ${activity.id}:`, err)
        }
      }
    }, interval)
    
    set({ miningSyncInterval: syncId })
    console.log(`[AUTO-SYNC] Started Mining auto-sync every ${interval/1000}s`)
  },

  stopMiningAutoSync: () => {
    const { miningSyncInterval } = get()
    if (miningSyncInterval) {
      clearInterval(miningSyncInterval)
      set({ miningSyncInterval: null })
      console.log('[AUTO-SYNC] Stopped Mining auto-sync')
    }
  }
}))
