'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ActivityCard } from '@/components/activity/ActivityCard'
import { ActivityHistoryItem } from '@/components/activity/ActivityHistoryItem'
import { RattingHelpModal } from '@/components/activity/RattingHelpModal'
import { MiningValuableOres } from '@/components/activity/MiningValuableOres'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card'
import { UTCClock } from '@/components/dashboard/UTCClock'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Box,
  Play, 
  StopCircle,
  Users, 
  Clock, 
  Target, 
  Zap, 
  Gem, 
  Crosshair, 
  Compass, 
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Ship,
  MapPin,
  Trash2,
  Plus,
  Minus,
  TrendingUp,
  DollarSign,
  Star,
  Info,
  Edit2,
  Loader2,
  CheckCircle,
  XCircle,
  Lock,
  History
} from 'lucide-react'
import { ACTIVITY_UI_MAPPING } from '@/lib/constants/activity-ui'
import { useActivityStore, type Activity, type ActivityParticipant } from '@/lib/stores/activity-store'
import { useSession } from '@/lib/session-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatISK, formatNumber } from '@/lib/utils'

function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins} min`
  if (diffHours < 24) return `há ${diffHours}h`
  if (diffDays === 1) return 'ontem'
  if (diffDays < 7) return `há ${diffDays} dias`
  return `há ${Math.floor(diffDays / 7)} sem`
}

import { 
  ACTIVITY_TYPES, 
  REGIONS, 
  SPACE_TYPES, 
  MINING_TYPES, 
  NPC_FACTIONS, 
  SITE_TYPES_RATTING, 
  ANOMALIES_BY_FACTION, 
  ABYSSAL_TIERS, 
  ABYSSAL_WEATHER, 
  SHIP_SIZES, 
  EXPLORATION_SITE_TYPES, 
  DIFFICULTIES, 
  CRAB_PHASES, 
  DED_LEVELS 
} from '@/lib/constants/activity-data'

export default function ActivityTrackerPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground animate-pulse">Carregando rastreador...</p>
      </div>
    }>
      <ActivityTrackerContent />
    </Suspense>
  )
}

function ActivityTrackerContent() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const typeParam = searchParams.get('type')?.toLowerCase()
  
  const userAllowedActivities = session?.user?.allowedActivities || ['ratting']
  const userRole = session?.user?.role || 'user'
  
  const { activities, setActivities, addActivity, updateActivity, removeActivity, isCharacterBusy, fetchFromAPI, startPolling, stopPolling, startRattingAutoSync, stopRattingAutoSync, startMiningAutoSync, stopMiningAutoSync } = useActivityStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [userFits, setUserFits] = useState<any[]>([])

  // Fetch fits on load
  useEffect(() => {
    fetch('/api/fits')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUserFits(data)
      })
      .catch(err => console.error('Failed to fetch fits:', err))
  }, [])
  
  // Form State - Default to type from URL if present
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: (typeParam as any) || 'mining',
    status: 'active',
    participants: [],
    data: {} 
  })

  // Sincronizar o formulário quando a URL mudar
  useEffect(() => {
    if (typeParam) {
      setNewActivity(prev => ({ ...prev, type: typeParam as any }))
    }
  }, [typeParam])

  // Fetch activities on load + start polling
  useEffect(() => {
    fetchFromAPI(typeParam)
    setIsLoading(false)
    
    // Start polling for active activities (every 30s)
    startPolling(30000)
    
    // Start auto-sync for ratting activities (every 5 min)
    startRattingAutoSync(300000)
    
    // Start auto-sync for mining activities (every 5 min)
    startMiningAutoSync(300000)
    
    // Cleanup on unmount
    return () => {
      stopPolling()
      stopRattingAutoSync()
      stopMiningAutoSync()
    }
  }, [setActivities, typeParam, startPolling, stopPolling, startRattingAutoSync, stopRattingAutoSync, startMiningAutoSync, stopMiningAutoSync])

  const handleStartActivity = async () => {
    if (!newActivity.type || !newActivity.participants?.length) return

    try {
      // O backend agora coloca campos extras automaticamente em 'data'
      const payload = {
        type: newActivity.type,
        typeId: newActivity.typeId,
        region: newActivity.region,
        space: newActivity.space,
        participants: newActivity.participants,
        ...newActivity.data // Spread activity-specific fields
      }

      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (response.ok) {
        const startedActivity = await response.json()
        addActivity(startedActivity)
        setIsDialogOpen(false)
        // Reset form
        setNewActivity({
          type: 'mining',
          status: 'active',
          participants: [],
          data: {}
        })
      }
    } catch (error) {
      console.error('Error starting activity:', error)
    }
  }

  const handleEndActivity = async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'completed', endTime: new Date().toISOString() })
      })

      if (response.ok) {
        updateActivity(id, { status: 'completed', endTime: new Date() })
      }
    } catch (error) {
      console.error('Error ending activity:', error)
    }
  }

  const handleDeleteActivity = async (id: string) => {
    try {
      const response = await fetch(`/api/activities/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        removeActivity(id)
      }
    } catch (error) {
      console.error('Error deleting activity:', error)
    }
  }

  const [anomalies, setAnomalies] = useState<any[]>([])

  // Fetch anomalies when faction changes
  useEffect(() => {
    if (newActivity.type === 'ratting' && newActivity.data?.npcFaction) {
      // Use more robust faction name matching
      const faction = newActivity.data.npcFaction.split(' ')[0]
      const siteType = newActivity.data?.siteType || 'Combat Anomaly'
      
      console.log(`[UI] Fetching anomalies for ${faction} type ${siteType}`)
      fetch(`/api/sde/anomalies?faction=${encodeURIComponent(faction)}${siteType ? `&type=${encodeURIComponent(siteType)}` : ''}`)
        .then(res => res.json())
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setAnomalies(data)
          } else if (ANOMALIES_BY_FACTION[newActivity.data?.npcFaction]) {
            // Fallback to static list if SDE is empty or fails
            const staticList = ANOMALIES_BY_FACTION[newActivity.data?.npcFaction].map((n, i) => ({ id: `static-${i}`, name: n }))
            setAnomalies(staticList)
          }
        })
        .catch(err => {
          console.error('Failed to fetch anomalies:', err)
          if (ANOMALIES_BY_FACTION[newActivity.data?.npcFaction]) {
            const staticList = ANOMALIES_BY_FACTION[newActivity.data?.npcFaction].map((n, i) => ({ id: `static-${i}`, name: n }))
            setAnomalies(staticList)
          }
        })
    }
  }, [newActivity.data?.npcFaction, newActivity.data?.siteType, newActivity.type])

  const toggleParticipant = (characterId: number, characterName: string) => {
    const current = newActivity.participants || []
    const exists = current.find(p => p.characterId === characterId)
    
    if (exists) {
      setNewActivity({
        ...newActivity,
        participants: current.filter(p => p.characterId !== characterId)
      })
    } else {
      setNewActivity({
        ...newActivity,
        participants: [...current, { characterId, characterName }]
      })
    }
  }

  const setParticipantFit = (characterId: number, fitId: string) => {
    const current = newActivity.participants || []
    const fit = userFits.find(f => f.id === fitId)
    setNewActivity({
      ...newActivity,
      participants: current.map(p => 
        p.characterId === characterId ? { ...p, fit: fitId, shipTypeId: fit?.shipTypeId } : p
      )
    })
  }

  // Helper para atualizar campos dentro do data
  const updateData = (fields: any) => {
    setNewActivity(prev => ({
      ...prev,
      data: { ...(prev.data || {}), ...fields }
    }))
  }

  const activeActivities = activities.filter(a => a.status === 'active')
  const completedActivities = activities.filter(a => a.status === 'completed').slice(0, 10)

  const currentTypeInfo = ACTIVITY_TYPES.find(t => t.id === typeParam)
  
  const totalQuantity = activities
    .filter(a => a.type === 'mining')
    .reduce((sum, a) => sum + (Number(a.data?.quantity) || 0), 0)
    
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${mins}m`
  }

  const totalDuration = useMemo(() => {
    if (!mounted) return 0
    return activities.reduce((sum, a) => {
      const start = new Date(a.startTime).getTime()
      if (isNaN(start)) return sum
      const end = a.endTime ? new Date(a.endTime).getTime() : new Date().getTime()
      return sum + (end - start)
    }, 0)
  }, [activities, mounted])

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {(() => {
              const ui = ACTIVITY_UI_MAPPING[typeParam || '']
              const Icon = ui?.icon
              return Icon ? <Icon className={cn("h-5 w-5", ui?.color)} /> : null
            })()}
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              {currentTypeInfo ? `${currentTypeInfo.label} Tracker` : 'Activity Tracker'}
              <UTCClock />
            </h1>
          </div>
          <p className="text-gray-400">Track your fleet activities and income performance.</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-eve-accent text-black hover:bg-eve-accent/80 font-bold gap-2">
              <Play className="h-4 w-4 fill-current" />
              Start New Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#050507] border-eve-border/30 text-white max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
            <div className="bg-gradient-to-r from-eve-dark to-zinc-950 p-6 border-b border-eve-border/20">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tighter flex items-center gap-3">
                      <div className="h-6 w-1 bg-eve-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(0,255,255,0.5)]" />
                      Launch Activity Fleet
                    </DialogTitle>
                    <DialogDescription className="text-zinc-500 text-xs font-medium">
                      Configure your tactical operations and fleet deployment.
                    </DialogDescription>
                  </div>
                  {newActivity.type === 'ratting' && (
                    <RattingHelpModal />
                  )}
                </div>
              </DialogHeader>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-eve-border/10">
              <div className="lg:col-span-3 p-6 space-y-8">
                {/* Activity Type Selection */}
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    Mission Category
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ACTIVITY_TYPES.map((type) => {
                      const hasAccess = userAllowedActivities.includes(type.id) || userRole === 'master'
                      const isSelected = newActivity.type === type.id
                      return (
                        <button
                          key={type.id}
                          disabled={!hasAccess}
                          onClick={() => setNewActivity({ ...newActivity, type: type.id as any })}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-300 gap-3 relative group",
                            !hasAccess && "opacity-30 cursor-not-allowed grayscale",
                            isSelected 
                              ? "border-eve-accent bg-eve-accent/5 shadow-[0_0_20px_rgba(0,255,255,0.05)]" 
                              : "border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-800/50 hover:border-zinc-700"
                          )}
                        >
                          <div className="relative">
                            {(() => {
                              const ui = ACTIVITY_UI_MAPPING[type.id]
                              const Icon = ui?.icon
                              if (!hasAccess) return <Lock className="h-6 w-6 text-gray-500" />
                              return Icon ? <Icon className={cn("h-6 w-6 transition-transform group-hover:scale-110", ui?.color)} /> : <Activity className="h-6 w-6 text-gray-500" />
                            })()}
                          </div>
                          <span className={cn("text-[10px] font-bold uppercase tracking-widest", isSelected ? "text-white" : "text-zinc-500 group-hover:text-zinc-400")}>{type.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Tactical Config */}
                <div className="space-y-6">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2">
                    <Target className="h-3 w-3" />
                    Tactical Configuration
                  </Label>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-900/50 backdrop-blur-sm">
                    <div className="space-y-2">
                      <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Security Level / Space</Label>
                      <Select defaultValue={newActivity.space} onValueChange={(v) => setNewActivity({ ...newActivity, space: v })}>
                        <SelectTrigger className="h-10 bg-zinc-900 border-zinc-800 focus:ring-eve-accent/20">
                          <SelectValue placeholder="Select Space" />
                        </SelectTrigger>
                        <SelectContent className="bg-zinc-900 border-zinc-800"><SelectContentList items={SPACE_TYPES} /></SelectContent>
                      </Select>
                    </div>

                    {newActivity.type === 'ratting' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Hostile Faction</Label>
                          <Select onValueChange={(v) => updateData({ npcFaction: v })}>
                            <SelectTrigger className="h-10 bg-zinc-900 border-zinc-800 focus:ring-eve-accent/20">
                              <SelectValue placeholder="Select Faction" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800"><SelectContentList items={NPC_FACTIONS} /></SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Operations Type</Label>
                          <Select onValueChange={(v) => updateData({ siteType: v })}>
                            <SelectTrigger className="h-10 bg-zinc-900 border-zinc-800 focus:ring-eve-accent/20">
                              <SelectValue placeholder="Select Operation" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800"><SelectContentList items={SITE_TYPES_RATTING} /></SelectContent>
                          </Select>
                        </div>
                        
                        {newActivity.data?.siteType === 'Combat Anomaly' && (
                          <div className="space-y-2 col-span-1 sm:col-span-2">
                            <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">
                              Detected Anomalies ({newActivity.data?.npcFaction || 'Awaiting Faction'})
                            </Label>
                            <Select onValueChange={(v) => updateData({ siteName: v })}>
                              <SelectTrigger className="h-11 bg-zinc-900 border-zinc-800 text-cyan-400 font-mono focus:ring-eve-accent/20">
                                <SelectValue placeholder="SELECT ANOMALY TARGET" />
                              </SelectTrigger>
                              <SelectContent className="bg-zinc-900 border-zinc-800">
                                {anomalies.map((a: any) => (
                                  <SelectItem key={a.id} value={a.name} className="font-mono text-xs">{a.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}

                    {newActivity.type === 'mining' && (
                      <>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Mining Category</Label>
                          <Select onValueChange={(v) => updateData({ miningType: v })}>
                            <SelectTrigger className="h-10 bg-zinc-900 border-zinc-800 focus:ring-blue-500/20">
                              <SelectValue placeholder="Select Category" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800">
                              {MINING_TYPES.map((type) => (
                                <SelectItem key={type} value={type} className="text-xs uppercase font-mono">
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] text-zinc-400 font-bold uppercase tracking-tight">Primary Resource Target</Label>
                          <div className="relative group">
                            <Gem className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-blue-500/50 group-focus-within:text-blue-400 transition-colors" />
                            <Input 
                              placeholder="e.g. Kernite, Mercoxit, Monazite"
                              className="h-11 pl-9 bg-zinc-900 border-zinc-800 text-blue-400 placeholder:text-zinc-600 font-mono text-xs focus:ring-blue-500/20 uppercase tracking-tighter"
                              onChange={(e) => updateData({ siteName: e.target.value })}
                            />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Placeholder for other types - mantendo funcionalidade original */}
                    {newActivity.type !== 'ratting' && newActivity.type !== 'mining' && (
                      <div className="col-span-1 sm:col-span-2 py-4 text-center text-zinc-600 text-xs italic">
                        Advanced configuration for {newActivity.type} coming soon.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Fleet Deployment Section */}
              <div className="lg:col-span-2 p-6 bg-zinc-950/30 space-y-6">
                <div className="space-y-4">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-zinc-500 flex items-center gap-2">
                    <Users className="h-3 w-3" />
                    Fleet Deployment
                  </Label>
                  
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {session?.user?.characters?.map((char) => {
                      const busy = isCharacterBusy(char.id)
                      const participant = newActivity.participants?.find(p => p.characterId === char.id)
                      const selected = !!participant
                      
                      return (
                        <div key={char.id} className="space-y-2 animate-in fade-in duration-300">
                          <button
                            disabled={busy}
                            onClick={() => toggleParticipant(char.id, char.name)}
                            className={cn(
                              "w-full flex items-center gap-4 p-3 rounded-xl border transition-all duration-300 relative overflow-hidden group/char",
                              selected 
                                ? "border-eve-accent bg-eve-accent/10 shadow-[0_0_15px_rgba(0,255,255,0.05)]" 
                                : "border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900",
                              busy && "opacity-40 cursor-not-allowed grayscale"
                            )}
                          >
                            <div className="relative">
                              <Avatar className="h-10 w-10 ring-2 ring-zinc-800 group-hover/char:ring-eve-accent/50 transition-all">
                                <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=64`} />
                                <AvatarFallback>{char.name[0]}</AvatarFallback>
                              </Avatar>
                              {selected && <div className="absolute -top-1 -right-1 h-3 w-3 bg-eve-accent rounded-full border-2 border-[#050507]" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={cn("text-xs font-bold truncate", selected ? "text-white" : "text-zinc-400")}>{char.name}</p>
                              {busy && <Badge variant="destructive" className="h-4 px-1 text-[8px] font-black uppercase">Busy</Badge>}
                            </div>
                          </button>
                          
                          {selected && (
                            <div className="pl-4 border-l-2 border-eve-border/30 ml-5 py-1">
                              <Select 
                                value={participant.fit || ''} 
                                onValueChange={(v) => setParticipantFit(char.id, v)}
                              >
                                <SelectTrigger className="h-9 text-[10px] bg-zinc-900/50 border-zinc-800 font-bold uppercase tracking-tighter">
                                  <SelectValue placeholder="SELECT LOADOUT/FIT" />
                                </SelectTrigger>
                                <SelectContent className="bg-zinc-900 border-zinc-800">
                                  {userFits.map(fit => (
                                    <SelectItem key={fit.id} value={fit.id} className="text-[10px] uppercase font-bold">
                                      {fit.name} <span className="text-zinc-500">[{fit.shipName}]</span>
                                    </SelectItem>
                                  ))}
                                  {userFits.length === 0 && (
                                     <div className="p-2 text-[10px] text-gray-500 italic">No fits available.</div>
                                  )}
                                </SelectContent>
                              </Select>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Pre-flight Check */}
                <div className="pt-6 border-t border-eve-border/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Pre-flight Check</span>
                    {newActivity.participants && newActivity.participants.length > 0 ? (
                      <span className="text-[10px] font-bold text-green-500 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" /> Ready
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                        <XCircle className="h-3 w-3" /> No Crew
                      </span>
                    )}
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4 space-y-2 border border-zinc-900/50">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-500">Operations</span>
                      <span className="text-white font-bold">{newActivity.type?.toUpperCase() || '—'}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-500">Fleet Strength</span>
                      <span className="text-white font-bold">{newActivity.participants?.length || 0} Pilots</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span className="text-zinc-500">Targeting</span>
                      <span className="text-eve-accent font-bold truncate max-w-[120px] text-right">{newActivity.data?.siteName || 'UNASSIGNED'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-950 p-6 border-t border-eve-border/10 flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="text-zinc-500 hover:text-white uppercase text-[10px] font-black tracking-widest"
              >
                Abort Mission
              </Button>
              <Button 
                onClick={handleStartActivity}
                disabled={!newActivity.participants?.length || !newActivity.type}
                className="bg-eve-accent text-black hover:bg-eve-accent/80 font-black uppercase text-xs tracking-widest px-8 py-6 rounded-xl shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 h-auto"
              >
                <Play className="h-4 w-4 mr-2 fill-current" />
                Launch Fleet Operations
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <TrendingUp className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Operations</p>
                <p className="text-2xl font-bold text-white">{activities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Duration</p>
                <p className="text-2xl font-bold text-white" suppressHydrationWarning>
                  {mounted ? formatDuration(totalDuration) : '--h --m'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Fleets</p>
                <p className="text-2xl font-bold text-white">{activeActivities.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {typeParam === 'mining' ? (
          <Card className="bg-eve-panel border-eve-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                  <Gem className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Total Mined</p>
                  <p className="text-2xl font-bold text-white">{formatNumber(totalQuantity)} m³</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-eve-panel border-eve-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/20">
                  <DollarSign className="h-6 w-6 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Est. Value (Active)</p>
                  <p className="text-2xl font-bold text-green-400">
                    {formatISK(activeActivities.reduce((sum, a) => {
                      if (a.type === 'ratting') {
                        return sum + (a.data?.automatedBounties || 0) + (a.data?.automatedEss || 0) + (a.data?.additionalBounties || 0);
                      }
                      return sum;
                    }, 0))}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Active Activities Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {activeActivities.length === 0 ? (
          <Card className="col-span-full bg-eve-panel border-dashed border-eve-border py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="bg-eve-dark p-4 rounded-full mb-4">
                <Target className="h-10 w-10 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-white">No active operations</h3>
              <p className="text-sm text-gray-500 max-w-xs mt-2">
                Launch a new activity to start tracking your performance and session data.
              </p>
            </CardContent>
          </Card>
        ) : (
          activeActivities.map((activity, idx) => (
            <ActivityCard 
              key={activity.id} 
              activity={activity} 
              index={idx}
              onEnd={() => handleEndActivity(activity.id)}
            />
          ))
        )}
      </div>

      {/* Recent History */}
      <Card className="bg-eve-panel border-eve-border">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-white flex items-center gap-2">
              <History className="h-5 w-5 text-eve-accent" />
              Histórico de Operações
            </CardTitle>
            <span className="text-xs text-gray-500">{completedActivities.length} registros</span>
          </div>
        </CardHeader>
        <CardContent>
          {completedActivities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="p-4 rounded-full bg-eve-dark/50 mb-4">
                <History className="h-8 w-8 text-gray-600" />
              </div>
              <p className="text-gray-400 font-medium">Nenhuma operação concluída</p>
              <p className="text-gray-600 text-sm mt-1">Inicie uma atividade para começar a registrar</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {completedActivities.slice(0, 10).map((activity) => (
                <ActivityHistoryItem 
                  key={activity.id} 
                  activity={activity} 
                  onDelete={handleDeleteActivity} 
                />
              ))}
            </div>
          )}

          {completedActivities.length > 10 && (
            <div className="mt-4 pt-4 border-t border-eve-border/30 text-center">
              <Button variant="ghost" className="text-sm text-gray-500 hover:text-white">
                Ver todos os {completedActivities.length} registros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SelectContentList({ items }: { items: string[] }) {
  return (
    <>
      {items.map(item => (
        <SelectItem key={item} value={item}>{item}</SelectItem>
      ))}
    </>
  )
}

