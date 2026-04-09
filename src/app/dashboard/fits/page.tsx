'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSession } from '@/lib/session-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { formatISK } from '@/lib/utils'
import { Plus, Search, Ship, Trash2, Edit, RefreshCw, Download } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTypeIconUrl } from '@/lib/sde'

interface Fit {
  id: string
  name: string
  shipTypeId: number
  shipName: string
  dps: number | null
  tank: number | null
  cost: number | null
  modules: unknown[]
  createdAt: string | Date
}

const CATEGORY_KEYWORDS = {
  mining: ['hulk', 'mackinaw', 'rorqual', 'porpoise', 'skiff', 'retriever', 'procurer', 'covetor', 'hulk', 'venture', 'prospect', 'exhumer', ' barghest', 'whale'],
  industrial: ['iteron', 'badger', 'tayra', 'nereus', 'hoarder', 'mammoth', 'wreathe', 'kryos', 'epithal', 'miasmos', 'praxis', 'occator', 'mastodon', 'impel', 'viator', 'bock一个好', 'sigil'],
  combat: []
}

function categorizeShip(shipName: string): 'mining' | 'combat' | 'industrial' {
  const lower = shipName.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => lower.includes(k))) {
      return category as 'mining' | 'industrial'
    }
  }
  return 'combat'
}

export default function FitsPage() {
  const { data: session } = useSession()
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  const [fits, setFits] = useState<Fit[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFit, setNewFit] = useState({ name: '', shipName: '', cost: 0 })
  const [importing, setImporting] = useState(false)

  const importFromESI = async () => {
    setImporting(true)
    try {
      const response = await fetch('/api/esi/fittings')
      if (response.ok) {
        const esiFits = await response.json()
        // Save each fit to database
        for (const esiFit of esiFits) {
          await fetch('/api/fits', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: esiFit.name,
              shipTypeId: esiFit.shipTypeId,
              shipName: esiFit.shipName,
              highSlots: esiFit.highSlots || [],
              medSlots: esiFit.medSlots || [],
              lowSlots: esiFit.lowSlots || [],
              rigSlots: esiFit.rigSlots || [],
              source: 'esi'
            })
          })
        }
        // Refresh fits list
        await fetchFits()
      }
    } catch (error) {
      console.error('Failed to import fits:', error)
    } finally {
      setImporting(false)
    }
  }

  const fetchFits = useCallback(async () => {
    try {
      const response = await fetch('/api/fits')
      if (response.ok) {
        const data = await response.json()
        setFits(data)
      }
    } catch (error) {
      console.error('Failed to fetch fits:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (characters.length > 0) {
      fetchFits()
    } else {
      setLoading(false)
    }
  }, [characters, fetchFits])

  const createFit = async () => {
    if (!newFit.name || !newFit.shipName) return
    
    try {
      const response = await fetch('/api/fits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFit.name,
          shipTypeId: 0,
          shipName: newFit.shipName,
          cost: newFit.cost,
        }),
      })
      
      if (response.ok) {
        const fit = await response.json()
        setFits([fit, ...fits])
        setNewFit({ name: '', shipName: '', cost: 0 })
        setShowCreateModal(false)
      }
    } catch (error) {
      console.error('Failed to create fit:', error)
    }
  }

  const deleteFit = async (id: string) => {
    try {
      const response = await fetch(`/api/fits/${id}`, {
        method: 'DELETE',
      })
      
      if (response.ok) {
        setFits(fits.filter(f => f.id !== id))
      }
    } catch (error) {
      console.error('Failed to delete fit:', error)
    }
  }

  const filteredFits = fits.filter(fit => 
    fit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    fit.shipName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const miningFits = filteredFits.filter(f => categorizeShip(f.shipName) === 'mining')
  const industrialFits = filteredFits.filter(f => categorizeShip(f.shipName) === 'industrial')
  const combatFits = filteredFits.filter(f => categorizeShip(f.shipName) === 'combat')

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-eve-accent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Fit Manager</h1>
          <p className="text-gray-400">Create and manage your ship fits</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={importFromESI}
            disabled={importing}
            className="border-eve-border"
          >
            <Download className="mr-2 h-4 w-4" />
            {importing ? 'Importing...' : 'Import from EVE'}
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-eve-accent text-black hover:bg-eve-accent/80"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Fit
          </Button>
        </div>
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
          <TabsTrigger value="all">All Fits ({filteredFits.length})</TabsTrigger>
          <TabsTrigger value="mining">Mining ({miningFits.length})</TabsTrigger>
          <TabsTrigger value="combat">Combat ({combatFits.length})</TabsTrigger>
          <TabsTrigger value="industrial">Industrial ({industrialFits.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="mt-6">
          {filteredFits.length === 0 ? (
            <Card className="bg-eve-panel border-eve-border">
              <CardContent className="py-12 text-center">
                <Ship className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">No fits yet. Create your first fit!</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredFits.map((fit) => (
                <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mining" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {miningFits.map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="combat" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {combatFits.map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="industrial" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {industrialFits.map((fit) => (
              <FitCard key={fit.id} fit={fit} onDelete={() => deleteFit(fit.id)} />
            ))}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="bg-eve-panel border-eve-border">
          <DialogHeader>
            <DialogTitle className="text-white">Create New Fit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <label className="text-sm font-medium text-gray-400">Ship Name</label>
              <Input
                placeholder="Hulk, Dominix, Tempest..."
                value={newFit.shipName}
                onChange={(e) => setNewFit({ ...newFit, shipName: e.target.value })}
                className="bg-eve-dark border-eve-border"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-400">Estimated Cost (ISK)</label>
              <Input
                type="number"
                placeholder="0"
                value={newFit.cost || ''}
                onChange={(e) => setNewFit({ ...newFit, cost: parseInt(e.target.value) || 0 })}
                className="bg-eve-dark border-eve-border"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowCreateModal(false)}
              className="border-eve-border"
            >
              Cancel
            </Button>
            <Button 
              onClick={createFit}
              className="bg-eve-accent text-black hover:bg-eve-accent/80"
              disabled={!newFit.name || !newFit.shipName}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function FitCard({ fit, onDelete }: { fit: Fit, onDelete: () => void }) {
  return (
    <Card className="bg-eve-panel border-eve-border hover:border-eve-accent/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={fit.shipTypeId > 0 ? getTypeIconUrl(fit.shipTypeId, 64) : undefined} />
              <AvatarFallback>
                <Ship className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-sm text-white">{fit.name}</CardTitle>
              <p className="text-xs text-gray-400">{fit.shipName}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2 text-sm">
          {fit.dps && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">DPS:</span>
              <span className="text-white">{fit.dps}</span>
            </div>
          )}
          {fit.tank && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">Tank:</span>
              <span className="text-white">{fit.tank}</span>
            </div>
          )}
          {fit.cost && (
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-gray-400">Cost:</span>
              <span className="text-green-400">{formatISK(fit.cost)}</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1 border-eve-border">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
