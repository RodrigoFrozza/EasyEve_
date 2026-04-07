'use client'

import { create } from 'zustand'

export interface ActivityParticipant {
  characterId: number
  characterName?: string
  fit?: string
}

export interface Activity {
  id: string
  type: 'mining' | 'ratting' | 'abyssal' | 'exploration' | 'crab' | 'escalations' | 'pvp'
  name?: string
  region?: string
  space?: string
  miningType?: string
  oreMined?: { typeId: number; quantity: number; value: number }[]
  npcFaction?: string
  siteName?: string
  siteType?: string
  mtuContents?: { loot: string }[]
  tier?: string
  weather?: string
  shipSize?: string
  lootBefore?: string
  lootAfter?: string
  explorationSiteType?: string
  difficulty?: string
  lootCollected?: string
  dedLevel?: string
  escalationFaction?: string
  escalationLoot?: string
  crabPhase?: string
  crabBounties?: { amount: number; timestamp: string }[]
  pvpType?: string
  pvpLoot?: string
  fit?: string
  status: 'active' | 'completed'
  startedAt: Date
  endedAt?: Date
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