'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatISK } from '@/lib/utils'
import { Plus, Play, Square, Zap, Skull, TrendingUp, Clock, DollarSign, Shield } from 'lucide-react'

interface AbyssalSession {
  id: string
  characterId: number
  characterName: string
  startTime: Date
  endTime?: Date
  filamentType: string
  tier: number
  loot: number
  survived: boolean
  status: 'active' | 'completed'
}

const sampleSessions: AbyssalSession[] = [
  { id: '1', characterId: 1, characterName: 'Main Character', startTime: new Date(Date.now() - 1800000), filamentType: 'Exterior Damavik', tier: 2, loot: 35000000, survived: true, status: 'completed' },
  { id: '2', characterId: 2, characterName: 'Alt Character', startTime: new Date(Date.now() - 900000), filamentType: 'Fighting Damavik', tier: 3, loot: 0, survived: false, status: 'active' },
]

const filamentTypes = [
  { name: 'Exterior Damavik', tier: 1, baseLoot: 5000000 },
  { name: 'Exterior Gila', tier: 1, baseLoot: 8000000 },
  { name: 'Exterior Osprey', tier: 1, baseLoot: 10000000 },
  { name: 'Fighting Damavik', tier: 2, baseLoot: 15000000 },
  { name: 'Fighting Gila', tier: 2, baseLoot: 25000000 },
  { name: 'Fighting Osprey', tier: 2, baseLoot: 30000000 },
  { name: 'Deadly Damavik', tier: 3, baseLoot: 40000000 },
  { name: 'Deadly Gila', tier: 3, baseLoot: 60000000 },
  { name: 'Deadly Osprey', tier: 3, baseLoot: 80000000 },
  { name: 'Entrance Damavik', tier: 4, baseLoot: 80000000 },
  { name: 'Entrance Gila', tier: 4, baseLoot: 120000000 },
  { name: 'Entrance Osprey', tier: 4, baseLoot: 150000000 },
  { name: 'Hazardous Damavik', tier: 5, baseLoot: 150000000 },
  { name: 'Hazardous Gila', tier: 5, baseLoot: 250000000 },
  { name: 'Hazardous Osprey', tier: 5, baseLoot: 300000000 },
]

export default function AbyssalPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [sessions, setSessions] = useState<AbyssalSession[]>(sampleSessions)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    filamentType: ''
  })

  const startSession = () => {
    if (!newSession.characterId || !newSession.filamentType) return
    
    const char = characters.find(c => c.id === newSession.characterId)
    const filament = filamentTypes.find(f => f.name === newSession.filamentType)
    
    setSessions([{
      id: crypto.randomUUID(),
      characterId: newSession.characterId,
      characterName: char?.name || 'Unknown',
      startTime: new Date(),
      filamentType: newSession.filamentType,
      tier: filament?.tier || 1,
      loot: 0,
      survived: true,
      status: 'active'
    }, ...sessions])
    
    setIsRecording(true)
    setNewSession({ characterId: characters[0]?.id || 0, filamentType: '' })
  }

  const stopSession = (id: string, survived: boolean) => {
    setSessions(sessions.map(s => {
      if (s.id === id) {
        const filament = filamentTypes.find(f => f.name === s.filamentType)
        const loot = survived ? Math.floor(Math.random() * filament!.baseLoot * 0.5 + filament!.baseLoot * 0.5) : 0
        return { ...s, endTime: new Date(), loot, survived, status: 'completed' as const }
      }
      return s
    }))
    setIsRecording(false)
  }

  const totalLoot = sessions.reduce((sum, s) => sum + s.loot, 0)
  const totalRuns = sessions.filter(s => s.status === 'completed').length
  const survivalRate = totalRuns > 0 
    ? Math.round((sessions.filter(s => s.status === 'completed' && s.survived).length / totalRuns) * 100) 
    : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Abyssal Tracker</h1>
        <p className="text-gray-400">Track your abyssal space runs and loot</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <DollarSign className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Loot</p>
                <p className="text-2xl font-bold text-purple-400">{formatISK(totalLoot)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <TrendingUp className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Runs</p>
                <p className="text-2xl font-bold text-white">{totalRuns}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Shield className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Survival Rate</p>
                <p className="text-2xl font-bold text-green-400">{survivalRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20">
                <Skull className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Deaths</p>
                <p className="text-2xl font-bold text-red-400">
                  {sessions.filter(s => s.status === 'completed' && !s.survived).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Plus className="h-5 w-5 text-eve-accent" />
            Start New Run
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Character</label>
              <Select 
                value={newSession.characterId.toString()} 
                onValueChange={(v) => setNewSession({ ...newSession, characterId: parseInt(v) })}
              >
                <SelectTrigger className="bg-eve-dark border-eve-border">
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
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Filament Type</label>
              <Select value={newSession.filamentType} onValueChange={(v) => setNewSession({ ...newSession, filamentType: v })}>
                <SelectTrigger className="bg-eve-dark border-eve-border">
                  <SelectValue placeholder="Select filament..." />
                </SelectTrigger>
                <SelectContent>
                  {filamentTypes.map((filament) => (
                    <SelectItem key={filament.name} value={filament.name}>
                      {filament.name} (T{filament.tier})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={startSession}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
                disabled={!newSession.characterId || !newSession.filamentType}
              >
                <Play className="mr-2 h-4 w-4" />
                Start Run
              </Button>
              {isRecording && (
                <div className="flex gap-2">
                  <Button 
                    onClick={() => stopSession(sessions.find(s => s.status === 'active')?.id || '', true)}
                    variant="outline"
                    className="border-green-500/50 text-green-400"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Survived
                  </Button>
                  <Button 
                    onClick={() => stopSession(sessions.find(s => s.status === 'active')?.id || '', false)}
                    variant="destructive"
                  >
                    <Skull className="mr-2 h-4 w-4" />
                    Died
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Run History</CardTitle>
          <CardDescription>Your recent abyssal runs</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-eve-border">
                <TableHead className="text-gray-400">Character</TableHead>
                <TableHead className="text-gray-400">Filament</TableHead>
                <TableHead className="text-gray-400">Tier</TableHead>
                <TableHead className="text-gray-400">Loot</TableHead>
                <TableHead className="text-gray-400">Duration</TableHead>
                <TableHead className="text-gray-400">Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} className="border-eve-border">
                  <TableCell className="text-white">{session.characterName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.filamentType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.tier >= 4 ? 'warning' : session.tier >= 3 ? 'default' : 'secondary'}>
                      T{session.tier}
                    </Badge>
                  </TableCell>
                  <TableCell className={session.survived ? 'text-purple-400' : 'text-red-400'}>
                    {formatISK(session.loot)}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {session.endTime 
                      ? `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / 60000)}min`
                      : `${Math.round((Date.now() - session.startTime.getTime()) / 60000)}min (ongoing)`
                    }
                  </TableCell>
                  <TableCell>
                    {session.status === 'active' ? (
                      <Badge variant="warning">In Progress</Badge>
                    ) : session.survived ? (
                      <Badge variant="success" className="flex items-center gap-1 w-fit">
                        <Shield className="h-3 w-3" />
                        Survived
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                        <Skull className="h-3 w-3" />
                        Died
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
