'use client'

import { create } from 'zustand'

export interface ActivityParticipant {
  characterId: number
  characterName?: string
  fit?: string
}

export interface Activity {
  id: string
  type: string // MINING, RATTING, ABYSSAL, etc.
  status: 'active' | 'completed'
  startTime: string | Date
  endTime?: string | Date
  
  // Link to primary item (ship, etc.)
  typeId?: number
  
  // Basic Context
  region?: string
  space?: string
  
  // Flexible data object for activity-specific fields
  // Examples: 
  // { oreMined: {...}, miningType: "..." }
  // { mtuContents: [...], totalBounty: 100 }
  // { tier: "T6", weather: "Dark" }
  data?: any 
  
  participants: ActivityParticipant[]
}

interface ActivityStore {
  activities: Activity[]
  setActivities: (activities: Activity[]) => void
  addActivity: (activity: Activity) => void
  updateActivity: (id: string, updates: Partial<Activity>) => void
  removeActivity: (id: string) => void
  getActiveCharacterIds: () => number[]
  isCharacterBusy: (characterId: number) => boolean
}

export const useActivityStore = create<ActivityStore>((set, get) => ({
  activities: [],

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
  }
}))