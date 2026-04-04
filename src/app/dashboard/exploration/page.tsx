'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from '@/lib/session-client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatISK } from '@/lib/utils'
import { Plus, Search, Compass, MapPin, Clock, Gem, Eye, RefreshCw, Trash2 } from 'lucide-react'

interface ExplorationSignature {
  id: string
  characterId: number | null
  systemId: number | null
  systemName: string | null
  type: string | null
  name: string | null
  status: string
  notes: string | null
  createdAt: string | Date
  updatedAt: string | Date
}

const signatureTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'data', label: 'Data Sites' },
  { value: 'relic', label: 'Relic Sites' },
  { value: 'combat', label: 'Combat Sites' },
  { value: 'ore', label: 'Ore Anomalies' },
  { value: 'gas', label: 'Gas Sites' },
]

const typeColors: Record<string, string> = {
  data: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  relic: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  combat: 'bg-red-500/20 text-red-400 border-red-500/30',
  ore: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  gas: 'bg-green-500/20 text-green-400 border-green-500/30',
}

export default function ExplorationPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [signatures, setSignatures] = useState<ExplorationSignature[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSignature, setNewSignature] = useState({
    systemName: '',
    type: 'data',
    name: '',
    notes: ''
  })

  const fetchSignatures = useCallback(async () => {
    try {
      const response = await fetch('/api/exploration')
      if (response.ok) {
        const data = await response.json()
        setSignatures(data)
      }
    } catch (error) {
      console.error('Failed to fetch signatures:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSignatures()
  }, [fetchSignatures])

  const addSignature = async () => {
    if (!newSignature.systemName || !newSignature.name) return
    
    try {
      const response = await fetch('/api/exploration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newSignature.name,
          type: newSignature.type,
          status: 'new',
          systemName: newSignature.systemName,
          notes: newSignature.notes,
        }),
      })
      
      if (response.ok) {
        const sig = await response.json()
        setSignatures([sig, ...signatures])
        setNewSignature({ systemName: '', type: 'data', name: '', notes: '' })
        setShowAddModal(false)
      }
    } catch (error) {
      console.error('Failed to add signature:', error)
    }
  }

  const updateSignature = async (id: string, status: string) => {
    try {
      const response = await fetch(`/api/exploration/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      
      if (response.ok) {
        const updated = await response.json()
        setSignatures(signatures.map(s => s.id === id ? updated : s))
      }
    } catch (error) {
      console.error('Failed to update signature:', error)
    }
  }

  const deleteSignature = async (id: string) => {
    try {
      const response = await fetch(`/api/exploration/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setSignatures(signatures.filter(s => s.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete signature:', error)
    }
  }

  const filteredSignatures = signatures.filter(sig => {
    const matchesSearch = (sig.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (sig.systemName || '').toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || sig.type === filterType
    return matchesSearch && matchesType
  })

  const stats = {
    total: signatures.length,
    new: signatures.filter(s => s.status === 'new').length,
    scanned: signatures.filter(s => s.status === 'scanned').length,
    completed: signatures.filter(s => s.status === 'completed').length,
  }

  const getTypeIcon = (type: string | null) => {
    switch (type) {
      case 'data': return <Eye className="h-4 w-4" />
      case 'relic': return <Gem className="h-4 w-4" />
      case 'combat': return <Compass className="h-4 w-4" />
      default: return <MapPin className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-eve-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Exploration Tracker</h1>
        <p className="text-gray-400">Track your exploration signatures and data/relic sites</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <MapPin className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Signatures</p>
                <p className="text-2xl font-bold text-white">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Compass className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">New Sites</p>
                <p className="text-2xl font-bold text-white">{stats.new}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/20">
                <Eye className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Scanned</p>
                <p className="text-2xl font-bold text-white">{stats.scanned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Gem className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-white">{stats.completed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search signatures..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-eve-panel border-eve-border"
            />
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-40 bg-eve-panel border-eve-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {signatureTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-eve-accent text-black hover:bg-eve-accent/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Signature
        </Button>
      </div>

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Signature Book</CardTitle>
          <CardDescription>Your exploration signatures and sites</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredSignatures.length === 0 ? (
            <div className="text-center py-8">
              <Compass className="h-12 w-12 mx-auto mb-4 text-gray-500" />
              <p className="text-gray-400">No signatures yet. Add your first signature!</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-eve-border">
                  <TableHead className="text-gray-400">Name</TableHead>
                  <TableHead className="text-gray-400">System</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Notes</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSignatures.map((sig) => (
                  <TableRow key={sig.id} className="border-eve-border">
                    <TableCell className="text-white font-mono">{sig.name || 'Unknown'}</TableCell>
                    <TableCell className="text-gray-400">{sig.systemName || 'Unknown'}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[sig.type || 'data'] || 'bg-gray-500/20 text-gray-400'}>
                        {getTypeIcon(sig.type)}
                        <span className="ml-1 capitalize">{sig.type || 'Unknown'}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline"
                        className={
                          sig.status === 'completed' ? 'border-green-500/30 text-green-400' :
                          sig.status === 'scanned' ? 'border-amber-500/30 text-amber-400' :
                          'border-gray-500/30 text-gray-400'
                        }
                      >
                        {sig.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-400 max-w-xs truncate">
                      {sig.notes || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {sig.status === 'new' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSignature(sig.id, 'scanned')}
                            className="text-amber-400 hover:text-amber-300"
                          >
                            Scan
                          </Button>
                        )}
                        {sig.status === 'scanned' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateSignature(sig.id, 'completed')}
                            className="text-green-400 hover:text-green-300"
                          >
                            Complete
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSignature(sig.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white">Add Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Signature Name</label>
                <Input
                  placeholder="DAT-0123"
                  value={newSignature.name}
                  onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">System</label>
                <Input
                  placeholder="Jita"
                  value={newSignature.systemName}
                  onChange={(e) => setNewSignature({ ...newSignature, systemName: e.target.value })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Type</label>
                <Select value={newSignature.type} onValueChange={(v) => setNewSignature({ ...newSignature, type: v })}>
                  <SelectTrigger className="bg-eve-dark border-eve-border">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="data">Data Site</SelectItem>
                    <SelectItem value="relic">Relic Site</SelectItem>
                    <SelectItem value="combat">Combat Site</SelectItem>
                    <SelectItem value="ore">Ore Anomaly</SelectItem>
                    <SelectItem value="gas">Gas Site</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Notes</label>
                <Input
                  placeholder="Optional notes..."
                  value={newSignature.notes}
                  onChange={(e) => setNewSignature({ ...newSignature, notes: e.target.value })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 border-eve-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={addSignature}
                  className="flex-1 bg-eve-accent text-black hover:bg-eve-accent/80"
                >
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
