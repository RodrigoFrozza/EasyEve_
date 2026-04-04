'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from '@/lib/session-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatISK, formatNumber } from '@/lib/utils'
import { Plus, Play, Square, TrendingUp, Crosshair, Clock, DollarSign, RefreshCw, Trash2 } from 'lucide-react'

interface RattingSession {
  id: string
  characterId: number | null
  startTime: string | Date
  endTime: string | Date | null
  siteType: string | null
  bounty: number
  sitesCompleted: number
  createdAt: string | Date
}

const SITE_TYPES = [
  { id: 'anomaly_t1', name: 'Anomaly (T1)', category: 'Anomaly' },
  { id: 'anomaly_t2', name: 'Anomaly (T2)', category: 'Anomaly' },
  { id: 'anomaly_t3', name: 'Anomaly (T3)', category: 'Anomaly' },
  { id: 'anomaly_t4', name: 'Anomaly (T4)', category: 'Anomaly' },
  { id: 'ded_4_10', name: 'DED Complex 4/10', category: 'DED' },
  { id: 'ded_6_10', name: 'DED Complex 6/10', category: 'DED' },
  { id: 'ded_8_10', name: 'DED Complex 8/10', category: 'DED' },
  { id: 'ded_10_10', name: 'DED Complex 10/10', category: 'DED' },
  { id: 'faction_warfare', name: 'Faction Warfare', category: 'PVP' },
  { id: 'incursion', name: 'Incursion', category: 'Group' },
  { id: 'triglavian', name: 'Triglavian Sites', category: 'Anomaly' },
  { id: 'drifter', name: 'Drifter Sites', category: 'Anomaly' },
]

export default function RattingPage() {
  const { data: session } = useSession()
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  const [sessions, setSessions] = useState<RattingSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    siteType: '',
    bounty: 0,
    sitesCompleted: 1
  })

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/ratting')
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
    if (!newSession.characterId || !newSession.siteType) return
    
    try {
      const response = await fetch('/api/ratting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
          siteType: newSession.siteType,
          bounty: newSession.bounty,
          sitesCompleted: newSession.sitesCompleted,
          characterId: newSession.characterId,
        }),
      })
      
      if (response.ok) {
        const session = await response.json()
        setSessions([session, ...sessions])
        setIsRecording(true)
        setNewSession({ characterId: characters[0]?.id || 0, siteType: '', bounty: 0, sitesCompleted: 1 })
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const stopSession = async (id: string) => {
    const sessionToStop = sessions.find(s => s.id === id)
    if (!sessionToStop) return
    
    try {
      const response = await fetch(`/api/ratting/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          bounty: sessionToStop.bounty,
          sitesCompleted: sessionToStop.sitesCompleted,
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
      const response = await fetch(`/api/ratting/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setSessions(sessions.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  const totalBounty = sessions.reduce((sum: number, s: RattingSession) => sum + s.bounty, 0)
  const totalSites = sessions.reduce((sum: number, s: RattingSession) => sum + s.sitesCompleted, 0)
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
          <h1 className="text-3xl font-bold text-white">Ratting Tracker</h1>
          <p className="text-gray-400">Track your PVE ratting activities and bounties</p>
        </div>
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="py-12 text-center">
            <Crosshair className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No characters linked. Link a character to start tracking ratting data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Ratting Tracker</h1>
        <p className="text-gray-400">Track your PVE ratting activities and bounties</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Bounty</p>
                <p className="text-2xl font-bold text-green-400">{formatISK(totalBounty)}</p>
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
                <p className="text-sm text-gray-400">Sites Completed</p>
                <p className="text-2xl font-bold text-white">{totalSites}</p>
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
                <p className="text-sm text-gray-400">Active Sessions</p>
                <p className="text-2xl font-bold text-white">{activeSessions}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Crosshair className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Sessions</p>
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
            Start New Session
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
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
              <label className="text-sm font-medium text-gray-400">Site Type</label>
              <Select value={newSession.siteType} onValueChange={(v) => setNewSession({ ...newSession, siteType: v })}>
                <SelectTrigger className="bg-eve-dark border-eve-border">
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  {SITE_TYPES.map((site) => (
                    <SelectItem key={site.id} value={site.name}>
                      {site.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Bounty (ISK)</label>
              <Input
                type="number"
                placeholder="0"
                value={newSession.bounty || ''}
                onChange={(e) => setNewSession({ ...newSession, bounty: parseInt(e.target.value) || 0 })}
                className="bg-eve-dark border-eve-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Sites</label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={newSession.sitesCompleted}
                onChange={(e) => setNewSession({ ...newSession, sitesCompleted: parseInt(e.target.value) || 1 })}
                className="bg-eve-dark border-eve-border"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={startSession}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!newSession.characterId || !newSession.siteType}
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
          <CardTitle className="text-white">Session History</CardTitle>
          <CardDescription>Your recent ratting sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Crosshair className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No ratting sessions yet. Start your first session above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-eve-border">
                  <TableHead className="text-gray-400">Character</TableHead>
                  <TableHead className="text-gray-400">Site Type</TableHead>
                  <TableHead className="text-gray-400">Sites</TableHead>
                  <TableHead className="text-gray-400">Bounty</TableHead>
                  <TableHead className="text-gray-400">Avg/Site</TableHead>
                  <TableHead className="text-gray-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-eve-border">
                    <TableCell className="text-white">{getCharacterName(session.characterId)}</TableCell>
                    <TableCell className="text-gray-400">{session.siteType || 'Unknown'}</TableCell>
                    <TableCell className="text-gray-400">{session.sitesCompleted}</TableCell>
                    <TableCell className="text-green-400">{formatISK(session.bounty)}</TableCell>
                    <TableCell className="text-gray-400">
                      {session.sitesCompleted > 0 ? formatISK(session.bounty / session.sitesCompleted) : '-'}
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
