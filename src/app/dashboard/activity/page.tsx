'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  DialogFooter
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
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
  Trash2
} from 'lucide-react'
import { useActivityStore, type Activity, type ActivityParticipant } from '@/lib/stores/activity-store'
import { useSession } from 'next-auth/react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

// Activity Options from the Plan
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
const SITE_TYPES_RATTING = ['Belt Ratting', 'Combat Anomaly', 'Cosmic Signature', 'DED Complex']
const ABYSSAL_TIERS = ['T0 (Tranquil)', 'T1 (Calm)', 'T2 (Agitated)', 'T3 (Fierce)', 'T4 (Raging)', 'T5 (Chaotic)', 'T6 (Cataclysmic)']
const ABYSSAL_WEATHER = ['Electrical', 'Dark', 'Exotic', 'Firestorm', 'Gamma']
const SHIP_SIZES = ['Frigate', 'Destroyer', 'Cruiser']
const EXPLORATION_SITE_TYPES = ['Relic Site', 'Data Site', 'Ghost Site', 'Gas Site', 'Sleeper Cache', 'Wormhole']
const DIFFICULTIES = ['Level I', 'Level II', 'Level III', 'Level IV', 'Level V']
const CRAB_PHASES = ['Deployment', 'Linking (4min)', 'Scanning (10min)', 'Rewards']
const DED_LEVELS = ['1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10']

export default function ActivityTrackerPage() {
  const { data: session } = useSession()
  const { activities, setActivities, addActivity, updateActivity, removeActivity, isCharacterBusy } = useActivityStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  
  // Form State
  const [newActivity, setNewActivity] = useState<Partial<Activity>>({
    type: 'mining',
    status: 'active',
    participants: []
  })

  // Fetch activities on load
  useEffect(() => {
    fetch('/api/activities')
      .then(res => res.json())
      .then(data => {
        setActivities(data)
        setIsLoading(false)
      })
      .catch(err => {
        console.error('Failed to fetch activities:', err)
        setIsLoading(false)
      })
  }, [setActivities])

  const handleStartActivity = async () => {
    if (!newActivity.type || !newActivity.participants?.length) return

    try {
      const response = await fetch('/api/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newActivity)
      })

      if (response.ok) {
        const startedActivity = await response.json()
        addActivity(startedActivity)
        setIsDialogOpen(false)
        // Reset form
        setNewActivity({
          type: 'mining',
          status: 'active',
          participants: []
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
        body: JSON.stringify({ status: 'completed', endedAt: new Date().toISOString() })
      })

      if (response.ok) {
        updateActivity(id, { status: 'completed', endedAt: new Date() })
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

  const activeActivities = activities.filter(a => a.status === 'active')
  const completedActivities = activities.filter(a => a.status === 'completed').slice(0, 10)

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Activity Tracker</h1>
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
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, miningType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Type" /></SelectTrigger>
                        <SelectContent><SelectContentList items={MINING_TYPES} /></SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {newActivity.type === 'ratting' && (
                  <>
                    <div className="space-y-2">
                      <Label>NPC Faction</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, npcFaction: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Faction" /></SelectTrigger>
                        <SelectContent><SelectContentList items={NPC_FACTIONS} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Site Type</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, siteType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Site Type" /></SelectTrigger>
                        <SelectContent><SelectContentList items={SITE_TYPES_RATTING} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 col-span-2">
                      <Label>Site Name (Optional)</Label>
                      <Input 
                        placeholder="e.g. Haven, Forsaken Hub" 
                        onBlur={(e) => setNewActivity({ ...newActivity, siteName: e.target.value })}
                        className="bg-eve-dark border-eve-border"
                      />
                    </div>
                  </>
                )}

                {newActivity.type === 'abyssal' && (
                  <>
                    <div className="space-y-2">
                      <Label>Tier</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, tier: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Tier" /></SelectTrigger>
                        <SelectContent><SelectContentList items={ABYSSAL_TIERS} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Weather</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, weather: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Weather" /></SelectTrigger>
                        <SelectContent><SelectContentList items={ABYSSAL_WEATHER} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Ship Size</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, shipSize: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Ship Size" /></SelectTrigger>
                        <SelectContent><SelectContentList items={SHIP_SIZES} /></SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {newActivity.type === 'exploration' && (
                  <>
                    <div className="space-y-2">
                      <Label>Site Type</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, explorationSiteType: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Site Type" /></SelectTrigger>
                        <SelectContent><SelectContentList items={EXPLORATION_SITE_TYPES} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Difficulty</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, difficulty: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Difficulty" /></SelectTrigger>
                        <SelectContent><SelectContentList items={DIFFICULTIES} /></SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                {newActivity.type === 'crab' && (
                  <div className="space-y-2">
                    <Label>Starting Phase</Label>
                    <Select onValueChange={(v) => setNewActivity({ ...newActivity, crabPhase: v })}>
                      <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Phase" /></SelectTrigger>
                      <SelectContent><SelectContentList items={CRAB_PHASES} /></SelectContent>
                    </Select>
                  </div>
                )}

                {newActivity.type === 'escalations' && (
                  <>
                    <div className="space-y-2">
                      <Label>Faction</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, escalationFaction: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Faction" /></SelectTrigger>
                        <SelectContent><SelectContentList items={NPC_FACTIONS} /></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>DED Level</Label>
                      <Select onValueChange={(v) => setNewActivity({ ...newActivity, dedLevel: v })}>
                        <SelectTrigger className="bg-eve-dark border-eve-border"><SelectValue placeholder="Select Level" /></SelectTrigger>
                        <SelectContent><SelectContentList items={DED_LEVELS} /></SelectContent>
                      </Select>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {session?.user?.characters?.map((char) => {
                    const busy = isCharacterBusy(char.id)
                    const selected = newActivity.participants?.some(p => p.characterId === char.id)
                    
                    return (
                      <button
                        key={char.id}
                        disabled={busy}
                        onClick={() => toggleParticipant(char.id, char.name)}
                        className={cn(
                          "flex items-center gap-3 p-2 rounded-md border transition-all text-left",
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
                            <p className="text-xs text-gray-500">{activity.siteType || activity.subType}</p>
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
                        {new Date(activity.startedAt).toLocaleDateString()}
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
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === activity.type)

  useEffect(() => {
    const timer = setInterval(() => {
      const diff = new Date().getTime() - new Date(activity.startedAt).getTime()
      const hours = Math.floor(diff / 3600000)
      const mins = Math.floor((diff % 3600000) / 60000)
      const secs = Math.floor((diff % 60000) / 1000)
      setElapsed(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`)
    }, 1000)
    return () => clearInterval(timer)
  }, [activity.startedAt])

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
        <CardTitle className="text-xl mt-2 flex items-center justify-between">
          <span className="truncate">{activity.name || (activity.siteName || 'Active Operations')}</span>
          <Button 
            size="icon" 
            variant="ghost"
            onClick={onEnd}
            className="h-8 w-8 text-red-400 hover:bg-red-500/10 rounded-full"
          >
            <StopCircle className="h-5 w-5" />
          </Button>
        </CardTitle>
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
              {activity.tier || activity.siteType || activity.miningType || 'N/A'}
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
