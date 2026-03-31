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
import { Plus, Search, Compass, MapPin, Clock, Treasure, Eye, Filter } from 'lucide-react'

interface Signature {
  id: string
  systemName: string
  type: 'data' | 'relic' | 'combat' | 'ore' | 'gas'
  name: string
  class?: string
  status: 'new' | 'scanned' | 'completed' | 'expired'
  value?: number
  createdAt: Date
  completedAt?: Date
}

const sampleSignatures: Signature[] = [
  { id: '1', systemName: 'Jita', type: 'data', name: 'DAT-0123', class: 'C3', status: 'completed', value: 5000000, createdAt: new Date(Date.now() - 3600000) },
  { id: '2', systemName: 'Jita', type: 'relic', name: 'REL-0456', class: 'C4', status: 'scanned', createdAt: new Date(Date.now() - 1800000) },
  { id: '3', systemName: 'Amarr', type: 'data', name: 'DAT-0789', class: 'C2', status: 'new', createdAt: new Date(Date.now() - 900000) },
  { id: '4', systemName: 'Dodixie', type: 'combat', name: 'COM-1011', status: 'new', createdAt: new Date(Date.now() - 600000) },
]

const signatureTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'data', label: 'Data Sites' },
  { value: 'relic', label: 'Relic Sites' },
  { value: 'combat', label: 'Combat Sites' },
  { value: 'ore', label: 'Ore Anomalies' },
  { value: 'gas', label: 'Gas Sites' },
]

export default function ExplorationPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [signatures, setSignatures] = useState<Signature[]>(sampleSignatures)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newSignature, setNewSignature] = useState({
    systemName: '',
    type: 'data' as const,
    name: '',
    class: ''
  })

  const filteredSignatures = signatures.filter(sig => {
    const matchesSearch = sig.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sig.systemName.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesType = filterType === 'all' || sig.type === filterType
    return matchesSearch && matchesType
  })

  const totalValue = signatures.filter(s => s.status === 'completed').reduce((sum, s) => sum + (s.value || 0), 0)
  const sitesScanned = signatures.filter(s => s.status === 'scanned' || s.status === 'completed').length

  const addSignature = () => {
    if (!newSignature.systemName || !newSignature.name) return
    
    setSignatures([{
      id: crypto.randomUUID(),
      ...newSignature,
      status: 'new',
      createdAt: new Date()
    }, ...signatures])
    
    setNewSignature({ systemName: '', type: 'data', name: '', class: '' })
    setShowAddModal(false)
  }

  const updateStatus = (id: string, status: Signature['status']) => {
    setSignatures(signatures.map(s => {
      if (s.id === id) {
        return { 
          ...s, 
          status, 
          completedAt: status === 'completed' ? new Date() : undefined,
          value: status === 'completed' ? Math.floor(Math.random() * 10000000 + 1000000) : s.value
        }
      }
      return s
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Exploration</h1>
          <p className="text-gray-400">Track your exploration sites and findings</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-eve-accent text-black hover:bg-eve-accent/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Signature
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Compass className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Sites Found</p>
                <p className="text-2xl font-bold text-white">{signatures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/20">
                <Eye className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Sites Scanned</p>
                <p className="text-2xl font-bold text-white">{sitesScanned}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Treasure className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Value</p>
                <p className="text-2xl font-bold text-green-400">{formatISK(totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-500/20">
                <Filter className="h-6 w-6 text-yellow-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Success Rate</p>
                <p className="text-2xl font-bold text-white">
                  {sitesScanned > 0 ? Math.round((signatures.filter(s => s.status === 'completed').length / sitesScanned) * 100) : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center gap-4">
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

      <Card className="bg-eve-panel border-eve-border">
        <CardHeader>
          <CardTitle className="text-white">Signature History</CardTitle>
          <CardDescription>Your exploration sites and loot</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-eve-border">
                <TableHead className="text-gray-400">System</TableHead>
                <TableHead className="text-gray-400">Name</TableHead>
                <TableHead className="text-gray-400">Type</TableHead>
                <TableHead className="text-gray-400">Class</TableHead>
                <TableHead className="text-gray-400">Value</TableHead>
                <TableHead className="text-gray-400">Found</TableHead>
                <TableHead className="text-gray-400">Status</TableHead>
                <TableHead className="text-gray-400">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSignatures.map((sig) => (
                <TableRow key={sig.id} className="border-eve-border">
                  <TableCell className="text-white">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-gray-500" />
                      {sig.systemName}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-eve-accent">{sig.name}</TableCell>
                  <TableCell>
                    <Badge variant={
                      sig.type === 'data' ? 'secondary' : 
                      sig.type === 'relic' ? 'eve' : 
                      sig.type === 'combat' ? 'destructive' : 
                      'outline'
                    }>
                      {sig.type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-400">{sig.class || '-'}</TableCell>
                  <TableCell className={sig.value ? 'text-green-400' : 'text-gray-500'}>
                    {sig.value ? formatISK(sig.value) : '-'}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {new Date(sig.createdAt).toLocaleTimeString()}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      sig.status === 'completed' ? 'success' :
                      sig.status === 'scanned' ? 'default' :
                      sig.status === 'expired' ? 'destructive' :
                      'secondary'
                    }>
                      {sig.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sig.status === 'new' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(sig.id, 'scanned')}>
                        <Eye className="mr-2 h-4 w-4" />
                        Scan
                      </Button>
                    )}
                    {sig.status === 'scanned' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(sig.id, 'completed')}>
                        <Treasure className="mr-2 h-4 w-4" />
                        Loot
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white">Add New Signature</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Select value={newSignature.type} onValueChange={(v: any) => setNewSignature({ ...newSignature, type: v })}>
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
                <label className="text-sm font-medium text-gray-400">Signature Name</label>
                <Input
                  placeholder="DAT-1234"
                  value={newSignature.name}
                  onChange={(e) => setNewSignature({ ...newSignature, name: e.target.value })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Class (optional)</label>
                <Input
                  placeholder="C3"
                  value={newSignature.class}
                  onChange={(e) => setNewSignature({ ...newSignature, class: e.target.value })}
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
