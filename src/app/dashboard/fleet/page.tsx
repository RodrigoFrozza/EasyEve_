'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatISK } from '@/lib/utils'
import { Calculator, Plus, Trash2, Users, TrendingUp, DollarSign } from 'lucide-react'

interface FleetParticipant {
  id: string
  characterId: number
  characterName: string
  shipTypeId: number
  shipName: string
  fitId?: string
  fitName?: string
  iskPerHour: number
}

interface FleetSession {
  id: string
  fleetType: 'mining' | 'ratting' | 'pve' | 'abyssal'
  activityName: string
  duration: number
  participants: FleetParticipant[]
  totalIskPerHour: number
  iskPerParticipant: number
}

const fleetTypes = [
  { value: 'mining', label: 'Mining Fleet', activities: ['Asteroid Belt Mining', 'Moon Mining', 'Ice Mining', 'Gas Harvesting'] },
  { value: 'ratting', label: 'Ratting Fleet', activities: ['Anomaly Ratting', 'DED Sites', 'Faction Warfare', 'COSMOS'] },
  { value: 'pve', label: 'PVE Activities', activities: ['Mission Running', 'Incursions', 'Daily Missions'] },
  { value: 'abyssal', label: 'Abyssal', activities: ['T1 Filament', 'T2 Filament', 'T3 Filament', 'T4+ Filament'] },
]

export default function FleetCalculatorPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [fleetType, setFleetType] = useState<string>('mining')
  const [activityName, setActivityName] = useState<string>('')
  const [duration, setDuration] = useState<number>(2)
  const [participants, setParticipants] = useState<FleetParticipant[]>([])

  const addParticipant = () => {
    if (characters.length === 0) return
    
    const newParticipant: FleetParticipant = {
      id: crypto.randomUUID(),
      characterId: characters[0].id,
      characterName: characters[0].name,
      shipTypeId: 0,
      shipName: 'Select Ship',
      iskPerHour: 0,
    }
    
    setParticipants([...participants, newParticipant])
  }

  const removeParticipant = (id: string) => {
    setParticipants(participants.filter(p => p.id !== id))
  }

  const updateParticipant = (id: string, field: keyof FleetParticipant, value: any) => {
    setParticipants(participants.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value }
      }
      return p
    }))
  }

  const totalFleetIskPerHour = participants.reduce((sum: number, p: FleetParticipant) => sum + p.iskPerHour, 0)
  const iskPerParticipant = participants.length > 0 ? totalFleetIskPerHour / participants.length : 0
  const totalEarnings = iskPerParticipant * duration

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Fleet Calculator</h1>
        <p className="text-gray-400">Calculate fleet profits and earnings distribution</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Calculator className="h-5 w-5 text-eve-accent" />
                Fleet Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Fleet Type</label>
                  <Select value={fleetType} onValueChange={setFleetType}>
                    <SelectTrigger className="bg-eve-dark border-eve-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {fleetTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Activity</label>
                  <Select value={activityName} onValueChange={setActivityName}>
                    <SelectTrigger className="bg-eve-dark border-eve-border">
                      <SelectValue placeholder="Select activity" />
                    </SelectTrigger>
                    <SelectContent>
                      {fleetTypes.find(t => t.value === fleetType)?.activities.map((activity) => (
                        <SelectItem key={activity} value={activity}>
                          {activity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-400">Duration (hours)</label>
                  <Select value={duration.toString()} onValueChange={(v) => setDuration(parseInt(v))}>
                    <SelectTrigger className="bg-eve-dark border-eve-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((h) => (
                        <SelectItem key={h} value={h.toString()}>
                          {h} hour{h > 1 ? 's' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-eve-panel border-eve-border">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white flex items-center gap-2">
                <Users className="h-5 w-5 text-eve-accent" />
                Participants ({participants.length})
              </CardTitle>
              <Button 
                onClick={addParticipant} 
                size="sm" 
                className="bg-eve-accent text-black hover:bg-eve-accent/80"
                disabled={characters.length === 0}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Participant
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {participants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No participants added yet. Add characters to calculate fleet profits.
                </div>
              ) : (
                participants.map((participant) => (
                  <div key={participant.id} className="flex items-center gap-4 p-4 rounded-lg border border-eve-border bg-eve-dark/50">
                    <Select 
                      value={participant.characterId.toString()} 
                      onValueChange={(v) => {
                        const char = characters.find(c => c.id === parseInt(v))
                        if (char) {
                          updateParticipant(participant.id, 'characterId', char.id)
                          updateParticipant(participant.id, 'characterName', char.name)
                        }
                      }}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {characters.map((char) => (
                          <SelectItem key={char.id} value={char.id.toString()}>
                            {char.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Ship</label>
                        <Select 
                          value={participant.shipName} 
                          onValueChange={(v) => updateParticipant(participant.id, 'shipName', v)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Hulk">Hulk</SelectItem>
                            <SelectItem value="Mackinaw">Mackinaw</SelectItem>
                            <SelectItem value="Rorqual">Rorqual</SelectItem>
                            <SelectItem value="Porpoise">Porpoise</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">Fit</label>
                        <Select 
                          value={participant.fitName || 'default'} 
                          onValueChange={(v) => {
                            updateParticipant(participant.id, 'fitName', v === 'default' ? undefined : v)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="default">Standard</SelectItem>
                            <SelectItem value="T2">T2 Optimized</SelectItem>
                            <SelectItem value="加成">With Boosts</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-gray-500">ISK/hour</label>
                        <input
                          type="number"
                          value={participant.iskPerHour}
                          onChange={(e) => updateParticipant(participant.id, 'iskPerHour', parseInt(e.target.value) || 0)}
                          className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeParticipant(participant.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-eve-panel border-eve-border sticky top-6">
            <CardHeader>
              <CardTitle className="text-white">Results</CardTitle>
              <CardDescription>Estimated fleet earnings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Fleet Type</span>
                  <Badge variant="eve">{fleetTypes.find(t => t.value === fleetType)?.label}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Activity</span>
                  <span className="text-white text-sm">{activityName || 'Not selected'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Duration</span>
                  <span className="text-white">{duration} hours</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-white">{participants.length}</span>
                </div>
              </div>

              <Separator className="bg-eve-border" />

              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Total Fleet Output</span>
                  </div>
                  <div className="text-3xl font-bold text-eve-accent">
                    {formatISK(totalFleetIskPerHour * duration)}
                  </div>
                  <span className="text-sm text-gray-500">per {duration}h session</span>
                </div>

                <Separator className="bg-eve-border" />

                <div>
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Per Participant</span>
                  </div>
                  <div className="text-2xl font-bold text-green-400">
                    {formatISK(iskPerParticipant * duration)}
                  </div>
                  <span className="text-sm text-gray-500">per person</span>
                </div>
              </div>

              <Button className="w-full bg-eve-accent text-black hover:bg-eve-accent/80">
                Save Session
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
