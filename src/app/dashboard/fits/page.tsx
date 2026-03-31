'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatISK } from '@/lib/utils'
import { Plus, Search, Ship, Trash2, Edit, Copy, TrendingUp, Clock } from 'lucide-react'

interface Fit {
  id: string
  name: string
  shipTypeId: number
  shipName: string
  estimatedDps?: number
  estimatedTank?: number
  estimatedCost?: number
  createdAt: Date
}

const sampleFits: Fit[] = [
  { id: '1', name: 'Mining Hulk T2', shipTypeId: 17476, shipName: 'Hulk', estimatedDps: 0, estimatedTank: 0, estimatedCost: 500000000, createdAt: new Date() },
  { id: '2', name: 'Ganking Catalyst', shipTypeId: 606, shipName: 'Catalyst', estimatedDps: 450, estimatedTank: 500, estimatedCost: 15000000, createdAt: new Date() },
  { id: '3', name: 'Mission Vargur', shipTypeId: 29242, shipName: 'Vargur', estimatedDps: 800, estimatedTank: 2000, estimatedCost: 2000000000, createdAt: new Date() },
]

const shipTypes = [
  { id: 17476, name: 'Hulk' },
  { id: 17478, name: 'Mackinaw' },
  { id: 17552, name: 'Rorqual' },
  { id: 28850, name: 'Porpoise' },
  { id: 606, name: 'Catalyst' },
  { id: 29344, name: 'Thrasher' },
  { id: 29242, name: 'Vargur' },
  { id: 47253, name: 'Praxis' },
]

export default function FitsPage() {
  const { data: session } = useSession()
  const characters = session?.user?.characters || []
  
  const [fits, setFits] = useState<Fit[]>(sampleFits)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFit, setNewFit] = useState({ name: '', shipName: '', estimatedCost: 0 })

  const filteredFits = fits.filter(fit => 
    fit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fit.shipName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const createFit = () => {
    if (!newFit.name || !newFit.shipName) return
    
    const ship = shipTypes.find(s => s.name === newFit.shipName)
    setFits([...fits, {
      id: crypto.randomUUID(),
      name: newFit.name,
      shipTypeId: ship?.id || 0,
      shipName: newFit.shipName,
      estimatedCost: newFit.estimatedCost,
      createdAt: new Date()
    }])
    setNewFit({ name: '', shipName: '', estimatedCost: 0 })
    setShowCreateModal(false)
  }

  const deleteFit = (id: string) => {
    setFits(fits.filter(f => f.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fit Manager</h1>
          <p className="text-gray-400">Create and manage your ship fits</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-eve-accent text-black hover:bg-eve-accent/80"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Fit
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search fits..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-eve-panel border-eve-border"
          />
        </div>
        <Badge variant="outline" className="border-eve-border">
          {fits.length} fits
        </Badge>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-eve-panel border border-eve-border">
          <TabsTrigger value="all">All Fits</TabsTrigger>
          <TabsTrigger value="mining">Mining</TabsTrigger>
          <TabsTrigger value="combat">Combat</TabsTrigger>
          <TabsTrigger value="industrial">Industrial</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFits.map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="mining" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFits.filter(f => ['Hulk', 'Mackinaw', 'Rorqual', 'Porpoise'].includes(f.shipName)).map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="combat" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFits.filter(f => !['Hulk', 'Mackinaw', 'Rorqual', 'Porpoise'].includes(f.shipName)).map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="industrial" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredFits.filter(f => f.shipName === 'Praxis').map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md bg-eve-panel border-eve-border">
            <CardHeader>
              <CardTitle className="text-white">Create New Fit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Fit Name</label>
                <Input
                  placeholder="My Awesome Fit"
                  value={newFit.name}
                  onChange={(e) => setNewFit({ ...newFit, name: e.target.value })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Ship Type</label>
                <select
                  value={newFit.shipName}
                  onChange={(e) => setNewFit({ ...newFit, shipName: e.target.value })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-eve-dark text-sm"
                >
                  <option value="">Select ship...</option>
                  {shipTypes.map((ship) => (
                    <option key={ship.id} value={ship.name}>{ship.name}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-400">Estimated Cost (ISK)</label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newFit.estimatedCost || ''}
                  onChange={(e) => setNewFit({ ...newFit, estimatedCost: parseInt(e.target.value) || 0 })}
                  className="bg-eve-dark border-eve-border"
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 border-eve-border"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={createFit}
                  className="flex-1 bg-eve-accent text-black hover:bg-eve-accent/80"
                >
                  Create
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

function FitCard({ fit, onDelete }: { fit: Fit, onDelete: () => void }) {
  return (
    <Card className="bg-eve-panel border-eve-border hover:border-eve-accent/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-eve-accent/20">
              <Ship className="h-5 w-5 text-eve-accent" />
            </div>
            <div>
              <CardTitle className="text-sm text-white">{fit.name}</CardTitle>
              <p className="text-xs text-gray-400">{fit.shipName}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {fit.estimatedDps && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-red-400" />
              <span className="text-gray-400">DPS:</span>
              <span className="text-white">{fit.estimatedDps}</span>
            </div>
          )}
          {fit.estimatedTank && (
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400">Tank:</span>
              <span className="text-white">{fit.estimatedTank}</span>
            </div>
          )}
          {fit.estimatedCost && (
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-gray-400">Cost:</span>
              <span className="text-green-400">{formatISK(fit.estimatedCost)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 border-eve-border">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button variant="outline" size="sm" className="border-eve-border">
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onDelete}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
