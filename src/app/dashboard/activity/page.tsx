'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
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
  XCircle
} from 'lucide-react'
import { useActivityStore, type Activity, type ActivityParticipant } from '@/lib/stores/activity-store'
import { useSession } from '@/lib/session-client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn, formatISK, formatNumber } from '@/lib/utils'

// Activity Options
const ACTIVITY_TYPES = [
  { id: 'mining', label: 'Mining', icon: Gem, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'ratting', label: 'Ratting', icon: Crosshair, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'abyssal', label: 'Abyssal', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'exploration', label: 'Exploration', icon: Compass, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'crab', label: 'Crab Beacon', icon: ShieldCheck, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'pvp', label: 'PVP', icon: Target, color: 'text-pink-400', bg: 'bg-pink-500/10' },
]

const REGIONS = ['Minmatar', 'Gallente', 'Caldari', 'Amarr', 'Jove', 'Wormhole']
const SPACE_TYPES = ['Highsec', 'Lowsec', 'Nullsec', 'Wormhole']
const MINING_TYPES = ['Ore (Minério)', 'Ice (Gelo)', 'Gas']
const NPC_FACTIONS = ['Angel Cartel', 'Blood Raider', 'Guristas', 'Sansha', 'Serpentis', 'Rogue Drones']
const SITE_TYPES_RATTING = ['Combat Anomaly', 'Cosmic Signature', 'DED Complex', 'Belt Ratting']
const ANOMALIES_BY_FACTION: Record<string, string[]> = {
  'Angel Cartel': ['Angel Hub', 'Angel Haven (Rock)', 'Angel Haven (Gas)', 'Angel Sanctum', 'Angel Forsaken Hub', 'Angel Forlorn Hub', 'Angel Rally Point'],
  'Blood Raider': ['Blood Raider Hub', 'Blood Raider Haven', 'Blood Raider Sanctum', 'Blood Raider Forsaken Hub', 'Blood Raider Forlorn Hub'],
  'Guristas': ['Guristas Hub', 'Guristas Haven', 'Guristas Sanctum', 'Guristas Forsaken Hub', 'Guristas Forlorn Hub'],
  'Sansha': ['Sansha Hub', 'Sansha Haven', 'Sansha Sanctum', 'Sansha Forsaken Hub', 'Sansha Forlorn Hub'],
  'Serpentis': ['Serpentis Hub', 'Serpentis Haven', 'Serpentis Sanctum', 'Serpentis Forsaken Hub', 'Serpentis Forlorn Hub'],
  'Rogue Drones': ['Drone Patrol', 'Drone Horde', 'Drone Squad', 'Hive']
}
const ABYSSAL_TIERS = ['T0 (Tranquil)', 'T1 (Calm)', 'T2 (Agitated)', 'T3 (Fierce)', 'T4 (Raging)', 'T5 (Chaotic)', 'T6 (Cataclysmic)']
const ABYSSAL_WEATHER = ['Electrical', 'Dark', 'Exotic', 'Firestorm', 'Gamma']
const SHIP_SIZES = ['Frigate', 'Destroyer', 'Cruiser']
const EXPLORATION_SITE_TYPES = ['Relic Site', 'Data Site', 'Ghost Site', 'Gas Site', 'Sleeper Cache', 'Wormhole']
const DIFFICULTIES = ['Level I', 'Level II', 'Level III', 'Level IV', 'Level V']
const CRAB_PHASES = ['Deployment', 'Linking (4min)', 'Scanning (10min)', 'Rewards']
const DED_LEVELS = ['1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10']

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
    setNewActivity({
      ...newActivity,
      participants: current.map(p => 
        p.characterId === characterId ? { ...p, fit: fitId } : p
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
            <h1 className="text-3xl font-bold text-white">
              {currentTypeInfo ? `${currentTypeInfo.label} Tracker` : 'Activity Tracker'}
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
              <DialogTitle>Launch Activity Fleet</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Activity Type Selection */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACTIVITY_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setNewActivity({ ...newActivity, type: type.id as any })}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-lg border transition-all gap-2",
                      newActivity.type === type.id 
                        ? "border-eve-accent bg-eve-accent/10" 
                        : "border-eve-border bg-eve-dark/50 hover:bg-eve-dark"
                    )}
                  >
                    <type.icon className={cn("h-6 w-6", type.color)} />
                    <span className="text-xs font-medium">{type.label}</span>
                  </button>
                ))}
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
                        return sum + (a.data?.initialBounties || 0) + (a.data?.essPayout || 0) + (a.data?.additionalBounties || 0);
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
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
        <CardHeader>
          <CardTitle className="text-lg font-medium text-white">Recent Operations History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="text-gray-500 border-b border-eve-border">
                  <th className="pb-3 pr-4 font-medium">Activity</th>
                  <th className="pb-3 px-4 font-medium">Participants</th>
                  <th className="pb-3 px-4 font-medium">Space</th>
                  <th className="pb-3 px-4 font-medium">Date</th>
                  <th className="pb-3 pl-4 font-medium text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-eve-border/50">
                {completedActivities.map((activity) => {
                  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)
                  return (
                    <tr key={activity.id} className="text-white hover:bg-eve-dark/20 group">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-2 rounded-lg", typeInfo?.bg)}>
                            {typeInfo && <typeInfo.icon className={cn("h-4 w-4", typeInfo.color)} />}
                          </div>
                          <div>
                            <p className="font-medium capitalize">{activity.type}</p>
                            <p className="text-xs text-gray-500">{activity.data?.siteType || activity.data?.tier || 'General'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {activity.participants.length} Chars
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {activity.space}
                      </td>
                      <td className="py-4 px-4 text-gray-400">
                        {new Date(activity.startTime).toLocaleDateString()}
                      </td>
                      <td className="py-4 pl-4 text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleDeleteActivity(activity.id)}
                          className="h-8 w-8 text-gray-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ActivityCard({ activity, onEnd }: { activity: Activity, onEnd: () => void }) {
  const [elapsed, setElapsed] = useState('')
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [esiLootTotal, setEsiLootTotal] = useState(0)
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)

  // Pure ESI Market Appraisal (Names -> ESI IDs -> ESI Orders -> Jita 4-4 Prices)
  useEffect(() => {
    const fetchESIAppraisal = async () => {
      if (!activity.data?.mtuContents || activity.data.mtuContents.length === 0) {
        setEsiLootTotal(0)
        return
      }

      const allNames: string[] = []
      activity.data.mtuContents.forEach((mtu: any) => {
        const lines = (mtu.loot || '').split('\n')
        lines.forEach((l: string) => {
          const name = l.split('\t')[0]?.trim()
          if (name && name.length > 2) allNames.push(name)
        })
      })

      if (allNames.length === 0) {
        setEsiLootTotal(0)
        return
      }

      try {
        const res = await fetch('/api/market/appraisal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: Array.from(new Set(allNames)) })
        })
        if (res.ok) {
          const { prices } = await res.json()
          
          // Calcular o total baseado nos preços retornados e quantidades do clipboard
          let totalValue = 0
          activity.data.mtuContents.forEach((mtu: any) => {
            const lines = (mtu.loot || '').split('\n')
            lines.forEach((line: string) => {
              const parts = line.split('\t')
              const name = parts[0]?.trim().toLowerCase()
              const qty = parseInt(parts[1]?.replace(/[^0-9]/g, '')) || 1
              if (name && prices[name]) {
                totalValue += (prices[name] * qty)
              }
            })
          })
          setEsiLootTotal(totalValue)
        }
      } catch (e) {
        console.error('ESI Appraisal failed:', e)
      }
    }

    fetchESIAppraisal()
  }, [activity.data?.mtuContents])

  // Accurate Loot Parser (Strictly ESI Prices)
  const estimatedLootValue = useMemo(() => {
    return esiLootTotal || 0;
  }, [esiLootTotal]);

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date().getTime() - new Date(activity.startTime).getTime()
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setElapsed(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [activity.startTime])

  // Automatic ESI Pooling every 10 minutes (ESI wallet journal cache is ~20m)
  useEffect(() => {
    if (activity.type !== 'ratting') return;

    const autoSync = async () => {
      console.log(`[Auto-Sync] Syncing activity ${activity.id}...`);
      try {
        const res = await fetch(`/api/activities/sync?id=${activity.id}`, { method: 'POST' });
        if (res.ok) {
          const updated = await res.json();
          useActivityStore.getState().updateActivity(activity.id, updated);
        }
      } catch (err) {
        console.error('[Auto-Sync] Failed to sync activity:', err);
      }
    };

    const interval = setInterval(autoSync, 10 * 60 * 1000); // 10 minutes
    
    // Also trigger an initial sync when the card mounts if it's new
    const lastSync = activity.data?.lastSyncAt ? new Date(activity.data.lastSyncAt).getTime() : 0;
    const now = new Date().getTime();
    if (now - lastSync > 5 * 60 * 1000) { // If last sync was > 5m ago
      autoSync();
    }

    return () => clearInterval(interval);
  }, [activity.id, activity.type, activity.data?.lastSyncAt])

  return (
    <Card className="bg-eve-panel border-eve-border overflow-hidden relative group">
      <div className={cn("absolute top-0 left-0 w-1 h-full", typeInfo?.color.replace('text-', 'bg-'))} />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={cn("capitalize", typeInfo?.bg, typeInfo?.color)}>
            {activity.type}
          </Badge>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3 w-3" />
            {elapsed}
          </div>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <CardTitle className="text-xl mt-2 flex items-center justify-between cursor-pointer hover:text-eve-accent transition-colors">
              <span className="truncate">{(activity as any).item?.name || activity.data?.siteName || 'Active Operations'}</span>
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-gray-500" />
                <Button 
                  size="icon" 
                  variant="ghost" 
                  onClick={(e) => {
                    e.stopPropagation();
                    onEnd();
                  }}
                  className="h-8 w-8 text-red-400 hover:bg-red-500/10 rounded-full"
                >
                  <StopCircle className="h-5 w-5" />
                </Button>
              </div>
            </CardTitle>
          </DialogTrigger>
          <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[500px]">
            <DialogHeader className="border-b border-eve-border/50 pb-4">
              <DialogTitle className="text-center font-mono uppercase tracking-[0.2em] text-gray-400">
                Bounty History
              </DialogTitle>
              <DialogDescription className="text-center text-[10px] text-gray-500">
                Session: {new Date(activity.startTime).toLocaleTimeString()} - {activity.endTime ? new Date(activity.endTime).toLocaleTimeString() : 'Active'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-6 space-y-6">
              {/* Transaction Logs */}
              <div className="space-y-1.5 max-h-[200px] overflow-y-auto px-2 custom-scrollbar">
                {(activity.data?.logs || []).length === 0 ? (
                  <p className="text-center text-[10px] text-gray-600 italic py-8 border border-dashed border-eve-border/30 rounded">
                    No transactions recorded yet. Click "Sync" to update.
                  </p>
                ) : (
                  (activity.data?.logs || []).map((log: any, idx: number) => (
                    <div key={idx} className="flex justify-between text-[11px] font-mono py-1.5 border-b border-eve-border/10">
                      <div className="flex flex-col">
                        <span className="text-gray-400 font-bold uppercase text-[9px]">{log.type}</span>
                        <span className="text-gray-600 text-[9px]">{log.charName}</span>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "font-bold",
                          log.type === 'tax' ? 'text-red-400' : 'text-green-400/80'
                        )}>
                          {log.type === 'tax' ? '-' : '+'}{formatISK(log.amount)}
                        </span>
                        <p className="text-[8px] text-gray-600">
                          {new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Totals Section */}
              <div className="border-t border-eve-border/50 pt-6 space-y-3 font-mono">
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">Bounty</span>
                  <span className="text-green-400 font-bold">+{formatISK((activity.data?.automatedBounties || 0) + (activity.data?.additionalBounties || 0))}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">ESS (BANCO)</span>
                  <span className="text-green-400 font-bold">+{formatISK(activity.data?.automatedEss || 0)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">LOOT</span>
                  <span className="text-blue-400 font-bold">+{formatISK(estimatedLootValue)}</span>
                </div>
                <div className="flex justify-between text-xs items-center">
                  <span className="text-gray-500 uppercase tracking-tighter">CORP TAX</span>
                  <span className="text-red-400 font-bold">-{formatISK(activity.data?.automatedTaxes || 0)}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-eve-border/30 flex justify-between items-baseline">
                  <span className="text-[10px] uppercase font-black text-gray-500">NET RUN PROFIT</span>
                  <span className="text-xl font-black text-eve-accent tracking-tighter">
                    {formatISK(
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0) + 
                      estimatedLootValue - 
                      (activity.data?.automatedTaxes || 0)
                    )}
                  </span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Location</p>
            <div className="flex items-center gap-2 text-white">
              <MapPin className="h-3 w-3 text-gray-400" />
              {activity.space || 'Unknown Space'}
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Detail</p>
            <div className="flex items-center gap-2 text-white">
              <Zap className="h-3 w-3 text-gray-400" />
              {activity.data?.shipHull || activity.data?.tier || activity.data?.siteType || activity.data?.miningType || 'N/A'}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-gray-500 text-xs uppercase font-bold tracking-wider">Active Fleet</p>
          <div className="flex -space-x-2 overflow-hidden">
            {activity.participants.map((p, idx) => (
              <div key={p.characterId} className="relative inline-block" title={p.characterName}>
                <Avatar className="h-8 w-8 border-2 border-eve-panel shadow-lg ring-1 ring-white/10">
                  <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
                  <AvatarFallback>{p.characterId.toString()[0]}</AvatarFallback>
                </Avatar>
              </div>
            ))}
            </div>
          </div>

          {activity.type === 'ratting' && (
          <div className="space-y-3 pt-2 border-t border-eve-border/30">
            <div className="flex justify-between items-end">
              <div>
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Net ISK Profit</p>
                <div className="text-lg font-bold text-green-400 font-mono leading-none">
                  {formatISK(
                    (activity.data?.automatedBounties || 0) + 
                    (activity.data?.automatedEss || 0) + 
                    (activity.data?.additionalBounties || 0)
                  )}
                </div>
                {estimatedLootValue > 0 && (
                   <div className="text-xs font-bold text-blue-400 font-mono mt-0.5">
                    + {formatISK(estimatedLootValue)} (Loot)
                   </div>
                )}
                {activity.data?.automatedTaxes > 0 && (
                  <p className="text-red-400/80 text-[9px] font-medium font-mono leading-tight mt-1">
                   - {formatISK(activity.data.automatedTaxes)} Corp Tax
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider">Est. ISK/hr</p>
                <div className="text-sm font-medium text-eve-accent font-mono">
                  {(() => {
                    const diff = new Date().getTime() - new Date(activity.startTime).getTime();
                    const hours = diff / 3600000;
                    const total = 
                      (activity.data?.automatedBounties || 0) + 
                      (activity.data?.automatedEss || 0) + 
                      (activity.data?.additionalBounties || 0);
                    return hours > 0.01 ? formatISK(total / hours) : formatISK(0);
                  })()}/hr
                </div>
              </div>
            </div>

            {/* ESS Estimated Timer */}
            {activity.type === 'ratting' && (
              <div className="bg-eve-dark/40 rounded p-2 flex items-center justify-between border border-eve-border/30">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-yellow-500/70" />
                  <span className="text-[10px] uppercase font-bold text-gray-400">Next ESS Payout</span>
                </div>
                <span className="text-[11px] font-mono text-yellow-500">
                  {(() => {
                    const logs = activity.data?.logs || [];
                    const essLogs = logs.filter((l: any) => l.type === 'ess');
                    if (essLogs.length === 0) return 'Waiting for Sync...';
                    
                    const lastPayout = new Date(essLogs[0].date).getTime();
                    // 2 hours and 40 minutes (160 minutes total)
                    const nextPayout = lastPayout + (160 * 60 * 1000);
                    const diff = nextPayout - new Date().getTime();
                    
                    if (diff <= 0) return 'PAYING NOW...';
                    
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor((diff % 3600000) / 60000);
                    return `${hours}h ${mins}m`;
                  })()}
                </span>
              </div>
            )}
            
            <div className="grid grid-cols-3 gap-2">
              <Button 
                size="sm" 
                variant="outline" 
                disabled={isSyncing}
                className={cn(
                  "text-[10px] h-8 transition-all duration-300",
                  syncStatus === 'success' ? "bg-green-500/20 border-green-500/50 text-green-400" :
                  syncStatus === 'error' ? "bg-red-500/20 border-red-500/50 text-red-400" :
                  "bg-eve-accent/20 border-eve-accent/30 text-white hover:bg-eve-accent hover:text-black"
                )}
                onClick={async () => {
                  setIsSyncing(true)
                  setSyncStatus('idle')
                  try {
                    const res = await fetch(`/api/activities/sync?id=${activity.id}`, { method: 'POST' });
                    if (res.ok) {
                      const updated = await res.json();
                      const store = useActivityStore.getState();
                      store.updateActivity(activity.id, updated);
                      setSyncStatus('success')
                    } else {
                      setSyncStatus('error')
                    }
                  } catch (e) {
                    setSyncStatus('error')
                  } finally {
                    setIsSyncing(false)
                    setTimeout(() => setSyncStatus('idle'), 3000)
                  }
                }}
              >
                {isSyncing ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> :
                 syncStatus === 'success' ? <CheckCircle className="h-3 w-3 mr-1" /> :
                 syncStatus === 'error' ? <XCircle className="h-3 w-3 mr-1" /> :
                 <Zap className="h-3 w-3 mr-1 text-eve-accent" />}
                {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Updated' : syncStatus === 'error' ? 'Failed' : 'Sync ESI'}
              </Button>
              
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-eve-dark/30 border-eve-border text-[10px] h-8 hover:bg-white hover:text-black">
                    <Plus className="h-3 w-3 mr-1" /> Income
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[300px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm">Add Income Update</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label className="text-xs">Incoming ISK</Label>
                      <Input 
                        id="update-amount"
                        type="number" 
                        placeholder="0"
                        className="bg-eve-dark border-eve-border h-8 text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = Number((e.currentTarget as HTMLInputElement).value);
                            const store = useActivityStore.getState();
                            const currentData = activity.data || {};
                            store.updateActivity(activity.id, {
                              data: {
                                ...currentData,
                                additionalBounties: (currentData.additionalBounties || 0) + val
                              }
                            });
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }}
                      />
                    </div>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="bg-eve-dark/30 border-eve-border text-[10px] h-8 hover:border-purple-500 hover:text-purple-400">
                    <Star className="h-3 w-3 mr-1" /> Event
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-eve-panel border-eve-border sm:max-w-[400px]">
                  <DialogHeader>
                    <DialogTitle className="text-sm flex items-center gap-2">
                       <Zap className="h-4 w-4 text-purple-400" /> Special Event / Escalation
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 gap-2 py-4">
                    {[
                      { id: '4_10', label: 'Angel 4/10 (Occupied Mining)', color: 'text-blue-400' },
                      { id: '5_10', label: 'Angel 5/10 (Redoubt)', color: 'text-blue-400' },
                      { id: '6_10', label: 'Angel 6/10 (Warehouse)', color: 'text-purple-400' },
                      { id: '7_10', label: 'Angel 7/10 (Military Complex)', color: 'text-purple-400' },
                      { id: '8_10', label: 'Angel 8/10 (Cathedral)', color: 'text-orange-400' },
                      { id: '10_10', label: 'Angel 10/10 (Raiding Outpost)', color: 'text-red-400' },
                      { id: 'dread', label: 'Dreadnought Spawn', color: 'text-red-500 font-bold' },
                      { id: 'faction', label: 'Faction NPC (Commander)', color: 'text-green-400' },
                    ].map(event => (
                      <Button
                        key={event.id}
                        variant="ghost"
                        className={cn("justify-start h-9 text-[11px] bg-eve-dark/30 hover:bg-white hover:text-black", event.color)}
                        onClick={() => {
                          const store = useActivityStore.getState();
                          const currentEsc = activity.data?.escalations || [];
                          store.updateActivity(activity.id, {
                            data: {
                              ...activity.data,
                              escalations: [...currentEsc, { ...event, timestamp: new Date().toISOString() }]
                            }
                          });
                        }}
                      >
                        {event.label}
                      </Button>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Special Events List Display */}
            {(activity.data?.escalations?.length || 0) > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-2">
                {activity.data.escalations.map((esc: any, idx: number) => (
                  <Badge key={idx} variant="outline" className={cn("text-[9px] h-5 bg-purple-500/5 py-0", esc.color.replace('font-bold', ''))}>
                    {esc.label.split('(')[0].trim()}
                  </Badge>
                ))}
              </div>
            )}
            
            <div className="space-y-3 pt-4 border-t border-eve-border/30">
              <div className="flex items-center justify-between">
                <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider flex items-center gap-1.5">
                  <Box className="h-3 w-3" /> Managed MTUs & Loot
                </p>
                <Badge variant="outline" className="text-[9px] h-4 bg-eve-dark/50 border-eve-border text-gray-400">
                  {activity.data?.mtuContents?.length || 0} Active
                </Badge>
              </div>

              <div className="flex items-center justify-between p-2 rounded bg-blue-500/5 border border-blue-500/20">
                <div>
                  <p className="text-[9px] uppercase font-bold text-blue-400/70">Estimated Loot Value</p>
                  <p className="text-sm font-mono text-blue-400">{formatISK(estimatedLootValue)}</p>
                </div>
                <Box className="h-4 w-4 text-blue-500/40" />
              </div>
              
              <MTULootField 
                value={activity.data?.mtuContents || []} 
                activityId={activity.id}
                onChange={(mtus) => {
                  const store = useActivityStore.getState();
                  store.updateActivity(activity.id, {
                    data: { ...activity.data, mtuContents: mtus }
                  });
                }} 
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
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

interface MTULoot {
  loot: string
}

function MTULootField({ value, activityId, onChange }: { value: MTULoot[], activityId: string, onChange: (mtus: MTULoot[]) => void }) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempLoot, setTempLoot] = useState('');

  const saveMTU = async (index: number) => {
    const newMTUs = [...value];
    newMTUs[index] = { loot: tempLoot };
    
    // Save to server immediately to prevent sync data loss
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { mtuContents: newMTUs } })
    });

    if (res.ok) {
      onChange(newMTUs);
      setEditingIndex(null);
    }
  };

  const removeMTU = async (index: number) => {
    const newMTUs = value.filter((_, i) => i !== index);
    const res = await fetch(`/api/activities/${activityId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { mtuContents: newMTUs } })
    });
    if (res.ok) onChange(newMTUs);
  };

  return (
    <div className="space-y-2">
      <div className="max-h-[300px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
        {value.map((mtu, index) => {
          const isEditing = editingIndex === index;
          const lineCount = (mtu.loot || '').split('\n').filter(l => l.trim()).length;

          return (
            <div key={index} className="space-y-1.5 p-2 rounded bg-eve-dark/30 border border-eve-border/50 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">
                  MTU UNIT #{index + 1} {!isEditing && `(${lineCount} items)`}
                </span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!isEditing && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingIndex(index);
                        setTempLoot(mtu.loot);
                      }}
                      className="h-5 w-5 text-gray-400 hover:text-white"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeMTU(index)}
                    className="h-5 w-5 text-gray-400 hover:text-red-400"
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <textarea
                    value={tempLoot}
                    onChange={(e) => setTempLoot(e.target.value)}
                    placeholder="Paste MTU inventory here..."
                    className="w-full bg-eve-dark/70 border border-eve-accent/30 rounded p-2 text-[11px] text-gray-300 min-h-[80px] font-mono resize-none focus:ring-1 focus:ring-eve-accent/30 outline-none"
                    rows={4}
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      className="h-7 text-[10px] flex-1 bg-eve-accent text-black hover:bg-white"
                      onClick={() => saveMTU(index)}
                    >
                      Save Loot Content
                    </Button>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-7 text-[10px] text-gray-500"
                      onClick={() => setEditingIndex(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div 
                  className="text-[10px] text-gray-500 italic truncate cursor-pointer hover:text-gray-400"
                  onClick={() => {
                    setEditingIndex(index);
                    setTempLoot(mtu.loot);
                  }}
                >
                  {mtu.loot ? mtu.loot.substring(0, 100) + '...' : 'Click to paste loot...'}
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        onClick={() => {
          onChange([...value, { loot: '' }]);
          setEditingIndex(value.length);
          setTempLoot('');
        }}
        className="w-full h-8 border border-dashed border-eve-border/50 hover:border-eve-accent/50 text-[10px] text-gray-500 hover:text-eve-accent transition-colors"
      >
        <Plus className="h-3 w-3 mr-2" />
        Register New MTU
      </Button>
    </div>
  )
}


function MiningValuableOres() {
  const [ores, setOres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sde/ores')
      .then(res => res.json())
      .then(data => {
        setOres(data.slice(0, 10))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return <p className="text-gray-500 text-sm">Carregando minérios...</p>
  }

  if (ores.length === 0) {
    return <p className="text-gray-500 text-sm">Nenhum minério disponível</p>
  }

  return (
    <div className="bg-eve-dark/50 rounded-lg p-3 border border-eve-border">
      <p className="text-xs text-gray-400 mb-2">Top 10 Minérios mais valiosos:</p>
      <div className="space-y-1">
        {ores.map((ore, index) => (
          <div key={ore.id || ore.name} className="flex justify-between text-xs">
            <span className="text-gray-300">{index + 1}. {ore.name}</span>
            <span className="text-eve-accent font-mono">
              {(ore.valuePerUnit || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'ISK' })}/un
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
