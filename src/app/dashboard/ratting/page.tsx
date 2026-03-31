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
import { Plus, Play, Square, TrendingUp, Swords, Clock, DollarSign, Target } from 'lucide-react'

interface RattingSession {
  id: string
  characterId: number
  characterName: string
  startTime: Date
  endTime?: Date
  siteType: string
  sitesCompleted: number
  bounty: number
  status: 'active' | 'completed'
}

const sampleSessions: RattingSession[] = [
  { id: '1', characterId: 1, characterName: 'Main Character', startTime: new Date(Date.now() - 3600000), siteType: 'Anomaly (Tier 3)', sitesCompleted: 5, bounty: 50000000, status: 'completed' },
  { id: '2', characterId: 2, characterName: 'Alt Character', startTime: new Date(Date.now() - 1800000), siteType: 'DED Complex', sitesCompleted: 2, bounty: 25000000, status: 'active' },
]

const siteTypes = [
  'Anomaly (Tier 1)',
  'Anomaly (Tier 2)',
  'Anomaly (Tier 3)',
  'Anomaly (Tier 4)',
  'Anomaly (Tier 5)',
  'DED Complex (Easy)',
  'DED Complex (Medium)',
  'DED Complex (Hard)',
  'Faction Warfare Plex',
  'COSMOS Mission',
  'Epic Arc Mission',
]

export default function RattingPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [sessions, setSessions] = useState<RattingSession[]>(sampleSessions)
  const [isRecording, setIsRecording] = useState(false)
  const [newSession, setNewSession] = useState({
    characterId: characters[0]?.id || 0,
    siteType: ''
  })

  const startSession = () => {
    if (!newSession.characterId || !newSession.siteType) return
    
    const char = characters.find(c => c.id === newSession.characterId)
    
    setSessions([{
      id: crypto.randomUUID(),
      characterId: newSession.characterId,
      characterName: char?.name || 'Unknown',
      startTime: new Date(),
      siteType: newSession.siteType,
      sitesCompleted: 0,
      bounty: 0,
      status: 'active'
    }, ...sessions])
    
    setIsRecording(true)
    setNewSession({ characterId: characters[0]?.id || 0, siteType: '' })
  }

  const stopSession = (id: string) => {
    setSessions(sessions.map(s => {
      if (s.id === id) {
        const sitesCompleted = Math.floor(Math.random() * 10) + 1
        const bounty = sitesCompleted * (Math.random() * 10000000 + 5000000)
        return { ...s, endTime: new Date(), sitesCompleted, bounty, status: 'completed' as const }
      }
      return s
    }))
    setIsRecording(false)
  }

  const totalBounty = sessions.reduce((sum, s) => sum + s.bounty, 0)
  const totalSites = sessions.reduce((sum, s) => sum + s.sitesCompleted, 0)
  const activeSessions = sessions.filter(s => s.status === 'active').length

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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-red-500/20">
                <Target className="h-6 w-6 text-red-400" />
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
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Swords className="h-6 w-6 text-eve-accent" />
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
                <p className="text-sm text-gray-400">Avg ISK/hour</p>
                <p className="text-2xl font-bold text-white">
                  {sessions.length > 0 ? formatISK(totalBounty / sessions.length) : '0 ISK'}
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
            Start New Session
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
              <label className="text-sm font-medium text-gray-400">Site Type</label>
              <Select value={newSession.siteType} onValueChange={(v) => setNewSession({ ...newSession, siteType: v })}>
                <SelectTrigger className="bg-eve-dark border-eve-border">
                  <SelectValue placeholder="Select site type..." />
                </SelectTrigger>
                <SelectContent>
                  {siteTypes.map((site) => (
                    <SelectItem key={site} value={site}>
                      {site}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
          <CardDescription>Your recent ratting activities</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-eve-border">
                <TableHead className="text-gray-400">Character</TableHead>
                <TableHead className="text-gray-400">Site Type</TableHead>
                <TableHead className="text-gray-400">Sites</TableHead>
                <TableHead className="text-gray-400">Bounty</TableHead>
                <TableHead className="text-gray-400">Duration</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id} className="border-eve-border">
                  <TableCell className="text-white">{session.characterName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{session.siteType}</Badge>
                  </TableCell>
                  <TableCell className="text-white">{session.sitesCompleted}</TableCell>
                  <TableCell className="text-green-400">{formatISK(session.bounty)}</TableCell>
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
