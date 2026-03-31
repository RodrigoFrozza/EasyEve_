'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatISK, formatNumber } from '@/lib/utils'
import { Plus, Play, Square, TrendingUp, Pickaxe, Clock, DollarSign } from 'lucide-react'

interface MiningSession {
  id: string
  characterId: number
  characterName: string
  startTime: Date
  endTime?: Date
  systemName: string
  oreType: string
  quantity: number
  estimatedIsk: number
  status: 'active' | 'completed'
}

const sampleSessions: MiningSession[] = [
  { id: '1', characterId: 1, characterName: 'Main Character', startTime: new Date(Date.now() - 7200000), systemName: 'Jita', oreType: 'Veldspar', quantity: 50000, estimatedIsk: 25000000, status: 'completed' },
  { id: '2', characterId: 2, characterName: 'Alt Character', startTime: new Date(Date.now() - 3600000), systemName: 'Jita', oreType: 'Scordite', quantity: 30000, estimatedIsk: 15000000, status: 'active' },
]

const oreTypes = [
  { name: 'Veldspar', basePrice: 500 },
  { name: 'Scordite', basePrice: 500 },
  { name: 'Pyroxeres', basePrice: 1000 },
  { name: 'Plagioclase', basePrice: 1500 },
  { name: 'Omber', basePrice: 3000 },
  { name: 'Kernite', basePrice: 5000 },
  { name: 'Jaspet', basePrice: 8000 },
  { name: 'Hemorphite', basePrice: 12000 },
  { name: 'Hedbergite', basePrice: 15000 },
  { name: 'Gneiss', basePrice: 25000 },
  { name: 'Dark Ochre', basePrice: 40000 },
  { name: 'Crokite', basePrice: 50000 },
  { name: 'Bistot', basePrice: 80000 },
  { name: 'Arkonor', basePrice: 100000 },
  { name: 'Mercoxit', basePrice: 200000 },
]

export default function MiningPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [sessions, setSessions] = useState<MiningSession[]>(sampleSessions)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    systemName: '',
    oreType: ''
  })

  const startSession = () => {
    if (!newSession.characterId || !newSession.systemName || !newSession.oreType) return
    
    const char = characters.find(c => c.id === newSession.characterId)
    const sessionId = crypto.randomUUID()
    
    setSessions([{
      id: sessionId,
      characterId: newSession.characterId,
      characterName: char?.name || 'Unknown',
      startTime: new Date(),
      systemName: newSession.systemName,
      oreType: newSession.oreType,
      quantity: 0,
      estimatedIsk: 0,
      status: 'active'
    }, ...sessions])
    
    setIsRecording(true)
    setNewSession({ characterId: characters[0]?.id || 0, systemName: '', oreType: '' })
  }

  const stopSession = (id: string) => {
    setSessions(sessions.map(s => {
      if (s.id === id) {
        const duration = (new Date().getTime() - s.startTime.getTime()) / 3600000
        const quantity = Math.floor(Math.random() * 50000) + 10000
        const ore = oreTypes.find(o => o.name === s.oreType)
        const estimatedIsk = quantity * (ore?.basePrice || 500)
        return { ...s, endTime: new Date(), quantity, estimatedIsk, status: 'completed' as const }
      }
      return s
    }))
    setIsRecording(false)
  }

  const totalMined = sessions.reduce((sum, s) => sum + s.quantity, 0)
  const totalEarnings = sessions.reduce((sum, s) => sum + s.estimatedIsk, 0)
  const activeSessions = sessions.filter(s => s.status === 'active').length

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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Mined</p>
                <p className="text-2xl font-bold text-white">{formatNumber(totalMined)} m³</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Pickaxe className="h-6 w-6 text-eve-accent" />
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Clock className="h-6 w-6 text-purple-400" />
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
            Start New Session
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
                  {oreTypes.map((ore) => (
                    <SelectItem key={ore.name} value={ore.name}>
                      {ore.name} ({formatISK(ore.basePrice)}/m³)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end gap-2">
              <Button 
                onClick={startSession}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={!newSession.characterId || !newSession.systemName || !newSession.oreType}
              >
                <Play className="mr-2 h-4 w-4" />
                Start
              </Button>
              {isRecording && (
                <Button 
                  onClick={() => stopSession(sessions.find(s => s.status === 'active')?.id || '')}
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
          <CardDescription>Your recent mining activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-eve-border">
                <TableHead className="text-gray-400">Character</TableHead>
                <TableHead className="text-gray-400">System</TableHead>
                <TableHead className="text-gray-400">Ore</TableHead>
                <TableHead className="text-gray-400">Quantity</TableHead>
                <TableHead className="text-gray-400">Est. Value</TableHead>
                <TableHead className="text-gray-400">Duration</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} className="border-eve-border">
                  <TableCell className="text-white">{session.characterName}</TableCell>
                  <TableCell className="text-gray-400">{session.systemName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.oreType}</Badge>
                  </TableCell>
                  <TableCell className="text-white">{formatNumber(session.quantity)} m³</TableCell>
                  <TableCell className="text-green-400">{formatISK(session.estimatedIsk)}</TableCell>
                  <TableCell className="text-gray-400">
                    {session.endTime 
                      ? `${Math.round((session.endTime.getTime() - session.startTime.getTime()) / 3600000)}h`
                      : `${Math.round((Date.now() - session.startTime.getTime()) / 3600000)}h (ongoing)`
                    }
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.status === 'active' ? 'success' : 'secondary'}>
                      {session.status === 'active' ? 'Active' : 'Completed'}
                    </Badge>
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
