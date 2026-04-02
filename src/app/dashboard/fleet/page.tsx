'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { formatISK } from '@/lib/utils'
import { Calculator, Plus, Trash2, Users, TrendingUp, DollarSign, Play, Square, RefreshCw } from 'lucide-react'

interface FleetSession {
  id: string
  characterId: number | null
  name: string
  fleetType: string
  startTime: string | Date
  endTime: string | Date | null
  iskPerHour: number
  participants: unknown[]
  createdAt: string | Date
}

const fleetTypes = [
  { value: 'mining', label: 'Mining Fleet' },
  { value: 'ratting', label: 'Ratting Fleet' },
  { value: 'pve', label: 'PVE Activities' },
  { value: 'combat', label: 'Combat Fleet' },
]

export default function FleetCalculatorPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [sessions, setSessions] = useState<FleetSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    name: '',
    fleetType: 'mining'
  })

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/fleet')
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
    fetchSessions()
  }, [fetchSessions])

  const startSession = async () => {
    if (!newSession.name) return
    
    try {
      const response = await fetch('/api/fleet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSession.name,
          fleetType: newSession.fleetType,
          startTime: new Date().toISOString(),
          characterId: newSession.characterId,
          iskPerHour: 0,
        }),
      })
      
      if (response.ok) {
        const session = await response.json()
        setSessions([session, ...sessions])
        setIsRecording(true)
        setNewSession({ characterId: characters[0]?.id || 0, name: '', fleetType: 'mining' })
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const stopSession = async (id: string) => {
    const sessionToStop = sessions.find(s => s.id === id)
    if (!sessionToStop) return
    
    const startTime = new Date(sessionToStop.startTime).getTime()
    const hours = (Date.now() - startTime) / 3600000
    const iskPerHour = Math.floor(Math.random() * 50000000) + 10000000
    
    try {
      const response = await fetch(`/api/fleet/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          iskPerHour,
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
      const response = await fetch(`/api/fleet/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const totalEarnings = sessions.reduce((sum: number, s: FleetSession) => {
    if (!s.endTime) return sum
    const hours = (new Date(s.endTime).getTime() - new Date(s.startTime).getTime()) / 3600000
    return sum + (s.iskPerHour * hours)
  }, 0)

  const activeSessions = sessions.filter(s => !s.endTime).length

  const getCharacterName = (charId: number | null) => {
    if (!charId) return 'Unknown'
    const char = characters.find(c => c.id === charId)
    return char?.name || 'Unknown'
  }

  const getFleetTypeColor = (type: string) => {
    switch (type) {
      case 'mining': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'ratting': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'pve': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'combat': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
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
          <h1 className="text-3xl font-bold text-white">Fleet Tracker</h1>
          <p className="text-gray-400">Track your fleet operations and earnings</p>
        </div>
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No characters linked. Link a character to start tracking fleet operations.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Fleet Tracker</h1>
        <p className="text-gray-400">Track your fleet operations and earnings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Earnings</p>
                <p className="text-2xl font-bold text-green-400">{formatISK(totalEarnings)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Avg ISK/Hour</p>
                <p className="text-2xl font-bold text-white">
                  {sessions.length > 0 ? formatISK(
                    sessions.reduce((sum, s) => sum + s.iskPerHour, 0) / sessions.length
                  ) : '0 ISK'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Users className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Active Fleets</p>
                <p className="text-2xl font-bold text-white">{activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Calculator className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Fleets</p>
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
            Start New Fleet
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
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
              <label className="text-sm font-medium text-gray-400">Fleet Name</label>
              <input
                type="text"
                placeholder="Mining op #1"
                value={newSession.name}
                onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-eve-border bg-eve-dark text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Fleet Type</label>
              <Select value={newSession.fleetType} onValueChange={(v) => setNewSession({ ...newSession, fleetType: v })}>
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

            <div className="flex items-end gap-2">
              <Button 
                onClick={startSession}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!newSession.name}
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
          <CardTitle className="text-white">Fleet History</CardTitle>
          <CardDescription>Your recent fleet operations</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No fleet sessions yet. Start your first fleet operation!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div 
                  key={session.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-eve-border bg-eve-dark/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eve-accent/20">
                      <Users className="h-5 w-5 text-eve-accent" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-white">{session.name}</h4>
                        <Badge className={getFleetTypeColor(session.fleetType)}>
                          {session.fleetType}
                        </Badge>
                        {!session.endTime && (
                          <Badge variant="success" className="bg-green-500/20 text-green-400 animate-pulse">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {getCharacterName(session.characterId)} •{' '}
                        {session.endTime 
                          ? `${Math.round((new Date(session.endTime).getTime() - new Date(session.startTime).getTime()) / 3600000)}h`
                          : 'In progress'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-400">ISK/Hour</p>
                      <p className="text-lg font-bold text-green-400">
                        {session.iskPerHour > 0 ? formatISK(session.iskPerHour) : '-'}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSession(session.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
