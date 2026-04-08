'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ActivityCard } from '@/components/activity/ActivityCard'
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
  
  const { activities, setActivities, addActivity, updateActivity, removeActivity, isCharacterBusy } = useActivityStore()
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

  // Fetch activities on load
  useEffect(() => {
    const url = typeParam ? `/api/activities?type=${typeParam}` : '/api/activities'
    fetch(url)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (Array.isArray(data)) {
          setActivities(data)
        } else {
          console.error('Activities data is not an array:', data)
          setActivities([])
        }
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch activities:', err)
        setActivities([]) // Reset to empty array on error
        setIsLoading(false)
      })
  }, [setActivities, typeParam])

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
    
  const totalDuration = activities.reduce((sum, a) => {
    const end = a.endTime ? new Date(a.endTime).getTime() : new Date().getTime()
    return sum + (end - new Date(a.startTime).getTime())
  }, 0)

  const formatDuration = (ms: number) => {
    const hours = Math.floor(ms / 3600000)
    const mins = Math.floor((ms % 3600000) / 60000)
    return `${hours}h ${mins}m`
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {currentTypeInfo && <currentTypeInfo.icon className={cn("h-5 w-5", currentTypeInfo.color)} />}
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
          <DialogContent className="bg-eve-panel border-eve-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>Launch Activity Fleet</DialogTitle>
                {newActivity.type === 'ratting' && (
                  <RattingHelpModal />
                )}
              </div>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Activity Type Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACTIVITY_TYPES.map((type) => {
                  const hasAccess = userAllowedActivities.includes(type.id) || userRole === 'master'
                  return (
                    <button
                      key={type.id}
                      disabled={!hasAccess}
                      onClick={() => setNewActivity({ ...newActivity, type: type.id as any })}
                      className={cn(
                        "flex flex-col items-center justify-center p-3 rounded-lg border transition-all gap-2",
                        !hasAccess && "opacity-50 cursor-not-allowed",
                        newActivity.type === type.id 
                          ? "border-eve-accent bg-eve-accent/10" 
                          : "border-eve-border bg-eve-dark/50 hover:bg-eve-dark"
                      )}
                    >
                      {hasAccess ? (
                        <type.icon className={cn("h-6 w-6", type.color)} />
                      ) : (
                        <Lock className="h-6 w-6 text-gray-500" />
                      )}
                      <span className={cn("text-xs font-medium", !hasAccess && "text-gray-500")}>{type.label}</span>
                    </button>
                  )
                })}
              </div>

              {/* Dynamic Fields based on Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Space Type</Label>
                  <Select onValueChange={(v) => setNewActivity({ ...newActivity, space: v })}>
                    <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Space" /></SelectTrigger>
                    <SelectContent><SelectContentList items={SPACE_TYPES} /></SelectContent>
                  </Select>
                </div>

                {newActivity.type === 'mining' && (
                  <>
                    <div className="space-y-2">
                      <Label>Region</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, region: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Region" /></SelectTrigger>
                        <SelectContent><SelectContentList items={REGIONS} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Mining Type</Label>
                      <Select onValueChange={(v) => updateData({ miningType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent><SelectContentList items={MINING_TYPES} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Primary Ore (Optional)</Label>
                      <Select onValueChange={(v) => updateData({ oreType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Ore" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Veldspar">Veldspar</SelectItem>
                          <SelectItem value="Scordite">Scordite</SelectItem>
                          <SelectItem value="Pyroxeres">Pyroxeres</SelectItem>
                          <SelectItem value="Plagioclase">Plagioclase</SelectItem>
                          <SelectItem value="Omber">Omber</SelectItem>
                          <SelectItem value="Kernite">Kernite</SelectItem>
                          <SelectItem value="Gneiss">Gneiss</SelectItem>
                          <SelectItem value="Mercoxit">Mercoxit</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Initial Quantity (m³)</Label>
                      <Input 
                        type="number"
                        placeholder="0"
                        onChange={(e) => updateData({ quantity: Number(e.target.value) })}
                        className="bg-eve-dark border-eve-border"
                      />
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Melhores Minérios para Minerar</Label>
                      <MiningValuableOres />
                    </div>
                  </>
                )}

                {newActivity.type === 'ratting' && (
                  <>
                    <div className="space-y-2">
                      <Label>NPC Faction</Label>
                      <Select onValueChange={(v) => updateData({ npcFaction: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Faction" /></SelectTrigger>
                        <SelectContent><SelectContentList items={NPC_FACTIONS} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Site Type</Label>
                      <Select onValueChange={(v) => updateData({ siteType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Site Type" /></SelectTrigger>
                        <SelectContent><SelectContentList items={SITE_TYPES_RATTING} /></SelectContent>
                      </Select>
                    </div>
                    
                    {newActivity.data?.siteType === 'Combat Anomaly' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Anomalies ({newActivity.data?.npcFaction || 'Select Faction first'})</Label>
                        <Select onValueChange={(v) => updateData({ siteName: v })}>
                          <SelectTrigger className="bg-eve-dark border-eve-border">
                            <SelectValue placeholder="Select Anomaly" />
                          </SelectTrigger>
                          <SelectContent>
                            {anomalies.map((a: any) => (
                              <SelectItem key={a.id} value={a.name}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </>
                )}

              {newActivity.type === 'abyssal' && (
                <>
                  <div className="space-y-2">
                    <Label>Tier</Label>
                    <Select onValueChange={(v) => updateData({ tier: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Tier" /></SelectTrigger>
                      <SelectContent><SelectContentList items={ABYSSAL_TIERS} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Weather</Label>
                    <Select onValueChange={(v) => updateData({ weather: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Weather" /></SelectTrigger>
                      <SelectContent><SelectContentList items={ABYSSAL_WEATHER} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Ship Size</Label>
                    <Select onValueChange={(v) => updateData({ shipSize: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Ship Size" /></SelectTrigger>
                      <SelectContent><SelectContentList items={SHIP_SIZES} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Containers (Antes da Run)</Label>
                    <textarea
                      value={newActivity.data?.lootBefore || ''}
                      onChange={(e) => updateData({ lootBefore: e.target.value })}
                      placeholder="Cole o conteúdo dos containers antes da run..."
                      className="w-full bg-eve-dark border-eve-border rounded-md p-2 text-xs text-white min-h-[80px] font-mono"
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Loot (Depois da Run)</Label>
                    <textarea
                      value={newActivity.data?.lootAfter || ''}
                      onChange={(e) => updateData({ lootAfter: e.target.value })}
                      placeholder="Cole o loot depois da run..."
                      className="w-full bg-eve-dark border-eve-border rounded-md p-2 text-xs text-white min-h-[80px] font-mono"
                    />
                  </div>
                </>
              )}

              {newActivity.type === 'exploration' && (
                <>
                  <div className="space-y-2">
                    <Label>Site Type</Label>
                    <Select onValueChange={(v) => updateData({ explorationSiteType: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Site Type" /></SelectTrigger>
                      <SelectContent><SelectContentList items={EXPLORATION_SITE_TYPES} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Difficulty</Label>
                    <Select onValueChange={(v) => updateData({ difficulty: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Difficulty" /></SelectTrigger>
                      <SelectContent><SelectContentList items={DIFFICULTIES} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Loot Coletado</Label>
                    <textarea
                      value={newActivity.data?.lootCollected || ''}
                      onChange={(e) => updateData({ lootCollected: e.target.value })}
                      placeholder="Cole o conteúdo das caixas coletadas..."
                      className="w-full bg-eve-dark border-eve-border rounded-md p-2 text-xs text-white min-h-[80px] font-mono"
                    />
                  </div>
                </>
              )}

              {newActivity.type === 'crab' && (
                <div className="space-y-2">
                  <Label>Starting Phase</Label>
                  <Select onValueChange={(v) => updateData({ crabPhase: v })}>
                    <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Phase" /></SelectTrigger>
                    <SelectContent><SelectContentList items={CRAB_PHASES} /></SelectContent>
                  </Select>
                </div>
              )}

              {newActivity.type === 'escalations' && (
                <>
                  <div className="space-y-2">
                    <Label>Faction</Label>
                    <Select onValueChange={(v) => updateData({ escalationFaction: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Faction" /></SelectTrigger>
                      <SelectContent><SelectContentList items={NPC_FACTIONS} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>DED Level</Label>
                    <Select onValueChange={(v) => updateData({ dedLevel: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Level" /></SelectTrigger>
                      <SelectContent><SelectContentList items={DED_LEVELS} /></SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Loot Coletado</Label>
                    <textarea
                      value={newActivity.data?.escalationLoot || ''}
                      onChange={(e) => updateData({ escalationLoot: e.target.value })}
                      placeholder="Cole o loot da escalation..."
                      className="w-full bg-eve-dark border-eve-border rounded-md p-2 text-xs text-white min-h-[80px] font-mono"
                    />
                  </div>
                </>
              )}

              {newActivity.type === 'pvp' && (
                <>
                  <div className="space-y-2">
                    <Label>PVP Type</Label>
                    <Select onValueChange={(v) => updateData({ pvpType: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Type" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Ganking">Ganking</SelectItem>
                        <SelectItem value="Small Gang">Small Gang</SelectItem>
                        <SelectItem value="Fleet">Fleet</SelectItem>
                        <SelectItem value="Solo">Solo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Loot / Killmail</Label>
                    <textarea
                      value={newActivity.data?.pvpLoot || ''}
                      onChange={(e) => updateData({ pvpLoot: e.target.value })}
                      placeholder="Cole o loot ou killmail..."
                      className="w-full bg-eve-dark border-eve-border rounded-md p-2 text-xs text-white min-h-[80px] font-mono"
                    />
                  </div>
                </>
              )}
              </div>

              {/* Participant Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Participants
                </Label>
                <div className="grid grid-cols-1 gap-3">
                  {session?.user?.characters?.map((char) => {
                    const busy = isCharacterBusy(char.id)
                    const participant = newActivity.participants?.find(p => p.characterId === char.id)
                    const selected = !!participant
                    
                    return (
                      <div key={char.id} className="space-y-2">
                        <button
                          disabled={busy}
                          onClick={() => toggleParticipant(char.id, char.name)}
                          className={cn(
                            "w-full flex items-center gap-3 p-2 rounded-md border transition-all text-left",
                            selected 
                              ? "border-eve-accent bg-eve-accent/10" 
                              : "border-eve-border bg-eve-dark/50 hover:bg-eve-dark",
                            busy && "opacity-50 cursor-not-allowed border-red-500/30"
                          )}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=64`} />
                            <AvatarFallback>{char.name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{char.name}</p>
                            {busy && <span className="text-[10px] text-red-500 font-bold uppercase">Busy</span>}
                          </div>
                        </button>
                        
                        {selected && (
                          <div className="pl-11 pr-2 pb-1">
                            <Select 
                              value={participant.fit || ''} 
                              onValueChange={(v) => setParticipantFit(char.id, v)}
                            >
                              <SelectTrigger className="h-8 text-xs bg-eve-dark border-eve-border">
                                <SelectValue placeholder="Select Fit / Loadout" />
                              </SelectTrigger>
                              <SelectContent>
                                {userFits.map(fit => (
                                  <SelectItem key={fit.id} value={fit.id}>{fit.name} ({fit.shipName})</SelectItem>
                                ))}
                                {userFits.length === 0 && (
                                  <div className="p-2 text-[10px] text-gray-500 italic">No fits found. Create one in the Ship Fits tool.</div>
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
            </div>

            <DialogFooter>
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                className="text-gray-400"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleStartActivity}
                disabled={!newActivity.participants?.length}
                className="bg-eve-accent text-black hover:bg-eve-accent/80 font-bold"
              >
                Launch Operations
              </Button>
            </DialogFooter>
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
                <p className="text-2xl font-bold text-white">{formatDuration(totalDuration)}</p>
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
          activeActivities.map(activity => (
            <ActivityCard 
              key={activity.id} 
              activity={activity} 
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
              {completedActivities.slice(0, 10).map((activity) => {
                const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)
                const startTime = new Date(activity.startTime)
                const endTime = activity.endTime ? new Date(activity.endTime) : null
                const durationMs = endTime ? endTime.getTime() - startTime.getTime() : 0
                const durationHours = Math.floor(durationMs / (1000 * 60 * 60))
                const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60))
                const durationText = durationHours > 0 ? `${durationHours}h ${durationMinutes}m` : `${durationMinutes}m`
                
                const earnings = activity.data?.totalBounty || activity.data?.loot || activity.data?.iskPerMinute * (durationMs / 60000) || 0
                
                return (
                  <div 
                    key={activity.id} 
                    className="group relative bg-eve-dark/30 hover:bg-eve-dark/50 rounded-xl p-4 border border-eve-border/30 hover:border-eve-border transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      {/* Left: Type & Info */}
                      <div className="flex items-center gap-4">
                        <div className={cn("p-3 rounded-xl", typeInfo?.bg || "bg-gray-500/10")}>
                          {typeInfo ? (
                            <typeInfo.icon className={cn("h-6 w-6", typeInfo.color)} />
                          ) : (
                            <Target className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white capitalize">{activity.type}</span>
                            <Badge variant="outline" className={cn(
                              "text-[10px] h-5",
                              activity.space === 'high' && "text-green-400 border-green-400/30",
                              activity.space === 'low' && "text-yellow-400 border-yellow-400/30",
                              activity.space === 'null' && "text-red-400 border-red-400/30"
                            )}>
                              {activity.space === 'high' && 'High Sec'}
                              {activity.space === 'low' && 'Low Sec'}
                              {activity.space === 'null' && 'Null Sec'}
                              {activity.space && !['high', 'low', 'null'].includes(activity.space) && activity.space}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {durationText}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {activity.participants.length} participante{activity.participants.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Earnings & Date */}
                      <div className="flex items-center gap-4">
                        {earnings > 0 && (
                          <div className="text-right">
                            <p className="text-green-400 font-semibold">{formatISK(earnings)}</p>
                            <p className="text-[10px] text-gray-500 uppercase">receita</p>
                          </div>
                        )}
                        <div className="text-right min-w-[80px]">
                          <p className="text-gray-400 text-sm">{getRelativeTime(startTime)}</p>
                          <p className="text-[10px] text-gray-600">{startTime.toLocaleDateString('pt-BR')}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="h-8 w-8 text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Bottom: Additional info */}
                    {(activity.data?.siteType || activity.data?.tier || activity.data?.filamentType) && (
                      <div className="mt-3 pt-3 border-t border-eve-border/30 flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 uppercase tracking-wide">Detalhes:</span>
                        <span className="text-xs text-gray-400">
                          {activity.data?.siteType || activity.data?.tier || activity.data?.filamentType || 'Geral'}
                        </span>
                      </div>
                    )}
                  </div>
                )
              })}
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

