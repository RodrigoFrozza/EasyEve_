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
import { Plus, Play, Square, TrendingUp, Pickaxe, Clock, DollarSign, RefreshCw, Trash2 } from 'lucide-react'

interface MiningSession {
  id: string
  characterId: number | null
  startTime: string | Date
  endTime: string | Date | null
  systemId: number | null
  systemName: string | null
  oreType: string | null
  quantity: number
  estimatedIsk: number
  createdAt: string | Date
}

const ORE_TYPES = [
  { id: 'veldspar', name: 'Veldspar' },
  { id: 'scordite', name: 'Scordite' },
  { id: 'pyroxeres', name: 'Pyroxeres' },
  { id: 'plagioclase', name: 'Plagioclase' },
  { id: 'omber', name: 'Omber' },
  { id: 'kernite', name: 'Kernite' },
  { id: 'jaspet', name: 'Jaspet' },
  { id: 'hemorphite', name: 'Hemorphite' },
  { id: 'hedbergite', name: 'Hedbergite' },
  { id: 'gneiss', name: 'Gneiss' },
  { id: 'dark_ochre', name: 'Dark Ochre' },
  { id: 'crokite', name: 'Crokite' },
  { id: 'bistot', name: 'Bistot' },
  { id: 'arkonor', name: 'Arkonor' },
  { id: 'mercoxit', name: 'Mercoxit' },
]

export default function MiningPage() {
  const { data: session } = useSession()
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  const [sessions, setSessions] = useState<MiningSession[]>([])
  const [loading, setLoading] = useState(true)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    systemName: '',
    oreType: '',
    quantity: 0
  })

  const fetchSessions = useCallback(async () => {
    try {
      const response = await fetch('/api/mining')
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
    if (!newSession.characterId || !newSession.oreType) return
    
    try {
      const response = await fetch('/api/mining', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: new Date().toISOString(),
          oreType: newSession.oreType,
          systemName: newSession.systemName,
          quantity: newSession.quantity,
          estimatedIsk: 0,
          characterId: newSession.characterId,
        }),
      })
      
      if (response.ok) {
        const session = await response.json()
        setSessions([session, ...sessions])
        setIsRecording(true)
        setNewSession({ characterId: characters[0]?.id || 0, systemName: '', oreType: '', quantity: 0 })
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const stopSession = async (id: string) => {
    const sessionToStop = sessions.find(s => s.id === id)
    if (!sessionToStop) return
    
    try {
      const response = await fetch(`/api/mining/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endTime: new Date().toISOString(),
          quantity: sessionToStop.quantity,
          estimatedIsk: sessionToStop.estimatedIsk,
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

  const totalQuantity = sessions.reduce((sum: number, s: MiningSession) => sum + s.quantity, 0)
  const totalIsk = sessions.reduce((sum: number, s: MiningSession) => sum + s.estimatedIsk, 0)
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
          <h1 className="text-3xl font-bold text-white">Mining Tracker</h1>
          <p className="text-gray-400">Track your mining sessions and earnings</p>
        </div>
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="py-12 text-center">
            <Pickaxe className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No characters linked. Link a character to start tracking mining data.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Mining Tracker</h1>
        <p className="text-gray-400">Track your mining sessions and earnings</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                <DollarSign className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Estimated Value</p>
                <p className="text-2xl font-bold text-green-400">{formatISK(totalIsk)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Pickaxe className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Mined</p>
                <p className="text-2xl font-bold text-white">{formatNumber(totalQuantity)} m³</p>
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
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
              <label className="text-sm font-medium text-gray-400">System</label>
              <Input
                placeholder="Jita"
                value={newSession.systemName}
                onChange={(e) => setNewSession({ ...newSession, systemName: e.target.value })}
                className="bg-eve-dark border-eve-border"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Ore Type</label>
              <Select value={newSession.oreType} onValueChange={(v) => setNewSession({ ...newSession, oreType: v })}>
                <SelectTrigger className="bg-eve-dark border-eve-border">
                  <SelectValue placeholder="Select ore..." />
                </SelectTrigger>
                <SelectContent>
                  {ORE_TYPES.map((ore) => (
                    <SelectItem key={ore.id} value={ore.name}>
                      {ore.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Quantity (m³)</label>
              <Input
                type="number"
                placeholder="0"
                value={newSession.quantity || ''}
                onChange={(e) => setNewSession({ ...newSession, quantity: parseInt(e.target.value) || 0 })}
                className="bg-eve-dark border-eve-border"
              />
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={startSession}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                disabled={!newSession.characterId || !newSession.oreType}
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
          <CardDescription>Your recent mining sessions</CardDescription>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <div className="text-center py-8">
              <Pickaxe className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No mining sessions yet. Start your first session above!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-eve-border">
                  <TableHead className="text-gray-400">Character</TableHead>
                  <TableHead className="text-gray-400">System</TableHead>
                  <TableHead className="text-gray-400">Ore</TableHead>
                  <TableHead className="text-gray-400">Quantity</TableHead>
                  <TableHead className="text-gray-400">Est. Value</TableHead>
                  <TableHead className="text-gray-400"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow key={session.id} className="border-eve-border">
                    <TableCell className="text-white">{getCharacterName(session.characterId)}</TableCell>
                    <TableCell className="text-gray-400">{session.systemName || '-'}</TableCell>
                    <TableCell className="text-gray-400">{session.oreType || 'Unknown'}</TableCell>
                    <TableCell className="text-amber-400">{formatNumber(session.quantity)} m³</TableCell>
                    <TableCell className="text-green-400">{formatISK(session.estimatedIsk)}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {}}
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
