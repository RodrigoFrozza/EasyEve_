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
  typeId?: number
  region?: string
  space?: string
  data?: any 
  participants: ActivityParticipant[]
}

interface ActivityStore {
  activities: Activity[]
  isLoading: boolean
  pollingInterval: NodeJS.Timeout | null
  
  setActivities: (activities: Activity[]) => void
  addActivity: (activity: Activity) => void
  updateActivity: (id: string, updates: Partial<Activity>) => void
  removeActivity: (id: string) => void
  
  getActiveCharacterIds: () => number[]
  isCharacterBusy: (characterId: number) => boolean
  
  fetchFromAPI: (type?: string) => Promise<void>
  syncActivity: (id: string) => Promise<Activity | null>
  
  startPolling: (interval?: number) => void
  stopPolling: () => void
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],
  isLoading: false,
  pollingInterval: null,

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
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          set({ activities: data })
        }
      }
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      set({ isLoading: false })
    }
  },

  syncActivity: async (id: string) => {
    try {
      const res = await fetch(`/api/activities/sync?id=${id}`, { method: 'POST' })
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
  }
}))
