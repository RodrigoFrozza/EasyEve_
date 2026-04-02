'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatISK } from '@/lib/utils'
import { Plus, Play, Square, Zap, Skull, Clock, DollarSign, Shield, RefreshCw, Trash2 } from 'lucide-react'

interface AbyssalSession {
  id: string
  characterId: number | null
  startTime: string | Date
  endTime: string | Date | null
  filamentType: string | null
  tier: number
  loot: number
  iskPerMinute: number
  survived: boolean
  createdAt: string | Date
}

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
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  const [sessions, setSessions] = useState<AbyssalSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    filamentType: ''
  })

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/abyssal')
      if (response.ok) {
        const data = await response.json()
        setSessions(data)
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (characters.length > 0) {
      fetchSessions()
    } else {
      setLoading(false)
    }
  }, [characters, fetchSessions])

  const startSession = async () => {
    if (!newSession.characterId || !newSession.filamentType) return
    
    const filament = filamentTypes.find(f => f.name === newSession.filamentType)
    
    try {
      const response = await fetch('/api/abyssal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
          filamentType: newSession.filamentType,
          tier: filament?.tier || 1,
          characterId: newSession.characterId,
          loot: 0,
          survived: true,
        }),
      })
      
      if (response.ok) {
        const session = await response.json()
        setSessions([session, ...sessions])
        setIsRecording(true)
        setNewSession({ characterId: characters[0]?.id || 0, filamentType: '' })
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const stopSession = async (id: string) => {
    const sessionToStop = sessions.find(s => s.id === id)
    if (!sessionToStop) return
    
    const filament = filamentTypes.find(f => f.name === sessionToStop.filamentType)
    const survived = Math.random() > 0.2
    const loot = survived ? Math.floor((filament?.baseLoot || 5000000) * (0.5 + Math.random())) : 0
    const duration = 20
    const iskPerMinute = loot / duration
    
    try {
      const response = await fetch(`/api/abyssal/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          loot,
          iskPerMinute,
          survived,
        }),
      })
      
      if (response.ok) {
        const updated = await response.json()
        setSessions(sessions.map(s => s.id === id ? updated : s))
        setIsRecording(false)
      }
    } catch (error) {
      console.error('Failed to stop session:', error)
    }
  }

  const deleteSession = async (id: string) => {
    try {
      const response = await fetch(`/api/abyssal/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const totalLoot = sessions.reduce((sum: number, s: AbyssalSession) => sum + s.loot, 0)
  const survivalRate = sessions.length > 0 
    ? Math.round((sessions.filter(s => s.survived).length / sessions.length) * 100) 
    : 0
  const activeSessions = sessions.filter(s => !s.endTime).length

  const getCharacterName = (charId: number | null) => {
    if (!charId) return 'Unknown'
    const char = characters.find(c => c.id === charId)
    return char?.name || 'Unknown'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-eve-accent" />
      </div>
    )
  }

  if (characters.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Abyssal Tracker</h1>
          <p className="text-gray-400">Track your abyssal loot and survival rates</p>
        </div>
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="py-12 text-center">
            <Zap className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No characters linked. Link a character to start tracking abyssal data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Abyssal Tracker</h1>
        <p className="text-gray-400">Track your abyssal loot and survival rates</p>
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
                <p className="text-2xl font-bold text-green-400">{formatISK(totalLoot)}</p>
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
                <p className="text-2xl font-bold text-white">{survivalRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Zap className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-white">{activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <Clock className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Sessions Today</p>
                <p className="text-2xl font-bold text-white">{sessions.length}</p>
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
                      T{filament.tier} {filament.name}
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
                Start
              </Button>
              {isRecording && (
                <Button 
                  onClick={() => stopSession(sessions.find(s => !s.endTime)?.id || '')}
                  variant="destructive"
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Run History</CardTitle>
          <CardDescription>Your recent abyssal activities</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No abyssal runs yet. Start your first run above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-eve-border">
                  <TableHead className="text-gray-400">Character</TableHead>
                  <TableHead className="text-gray-400">Filament</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Loot</TableHead>
                  <TableHead className="text-gray-400">ISK/min</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-eve-border">
                    <TableCell className="text-white">{getCharacterName(session.characterId)}</TableCell>
                    <TableCell className="text-gray-400">{session.filamentType || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">T{session.tier}</Badge>
                    </TableCell>
                    <TableCell className={session.survived ? 'text-green-400' : 'text-red-400'}>
                      {formatISK(session.loot)}
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {session.iskPerMinute > 0 ? formatISK(session.iskPerMinute) : '-'}
                    </TableCell>
                    <TableCell>
                      {session.survived ? (
                        <Badge variant="success" className="bg-green-500/20 text-green-400">Survived</Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-500/20 text-red-400">Died</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteSession(session.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
