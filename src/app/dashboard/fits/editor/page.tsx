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
import { 
  Plus, Search, Ship, Trash2, Edit, RefreshCw, 
  Zap, Battery, Shield, Cross, Target,
  ArrowRight, Save, Download, Upload, Maximize2
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTypeIconUrl, getTypeRenderUrl } from '@/lib/sde'
import { getShipStats, getAllShipNames } from '@/lib/sde/ships'

interface ModuleData {
  typeId: number
  name: string
  groupId: number
  groupName: string
  basePrice?: number
}

interface ShipData {
  typeId: number
  name: string
  groupName: string
  basePrice?: number
}

interface FitModule {
  typeId: number
  name: string
  chargeTypeId?: number
  offline?: boolean
}

interface FitState {
  high: FitModule[]
  med: FitModule[]
  low: FitModule[]
  rig: FitModule[]
  drone: FitModule[]
  cargo: FitModule[]
}

interface FitStats {
  cpu: { used: number; total: number; free: number }
  power: { used: number; total: number; free: number }
  dps: { total: number }
  volley: number
  tank: number
  ehp: number
  capStable: boolean
}

const SLOT_COLORS = {
  high: 'border-red-500/50 bg-red-500/10',
  med: 'border-yellow-500/50 bg-yellow-500/10',
  low: 'border-blue-500/50 bg-blue-500/10',
  rig: 'border-purple-500/50 bg-purple-500/10',
}

const SLOT_LABELS = {
  high: 'High Slots',
  med: 'Medium Slots',
  low: 'Low Slots',
  rig: 'Rig Slots',
}

function SlotPill({ slot, count, color }: { slot: keyof typeof SLOT_COLORS, count: number, color: string }) {
  return (
    <div className={`px-2 py-1 rounded text-xs font-medium ${color} border`}>
      {SLOT_LABELS[slot]}: {count}
    </div>
  )
}

export default function FitEditorPage() {
  const { data: session } = useSession()
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  // Ship selection
  const [ships, setShips] = useState<ShipData[]>([])
  const [selectedShip, setSelectedShip] = useState<ShipData | null>(null)
  const [shipSearch, setShipSearch] = useState('')
  const [loadingShips, setLoadingShips] = useState(true)
  
  // Module selection
  const [modules, setModules] = useState<ModuleData[]>([])
  const [moduleSearch, setModuleSearch] = useState('')
  const [loadingModules, setLoadingModules] = useState(false)
  const [activeSlot, setActiveSlot] = useState<keyof FitState>('high')
  
  // Fit state
  const [fitName, setFitName] = useState('')
  const [fit, setFit] = useState<FitState>({
    high: [],
    med: [],
    low: [],
    rig: [],
    drone: [],
    cargo: []
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Stats calculados
  const [stats, setStats] = useState<FitStats | null>(null)
  
  // Fetch ships
  const fetchShips = useCallback(async () => {
    setLoadingShips(true)
    try {
      const params = new URLSearchParams()
      if (shipSearch) params.set('search', shipSearch)
      params.set('limit', '100')
      
      const response = await fetch(`/api/ships?${params}`)
      if (response.ok) {
        const data = await response.json()
        setShips(data.ships || [])
      }
    } catch (error) {
      console.error('Failed to fetch ships:', error)
    } finally {
      setLoadingShips(false)
    }
  }, [shipSearch])
  
  useEffect(() => {
    if (characters.length > 0) {
      fetchShips()
    }
  }, [characters.length, fetchShips])
  
  // Fetch modules quando muda slot
  const fetchModules = useCallback(async (slot: string) => {
    setLoadingModules(true)
    try {
      const params = new URLSearchParams()
      params.set('slot', slot)
      params.set('limit', '100')
      if (moduleSearch) params.set('search', moduleSearch)
      
      const response = await fetch(`/api/modules?${params}`)
      if (response.ok) {
        const data = await response.json()
        setModules(data.modules || [])
      }
    } catch (error) {
      console.error('Failed to fetch modules:', error)
    } finally {
      setLoadingModules(false)
    }
  }, [moduleSearch])
  
  // Add module to fit
  const addModule = (module_: ModuleData) => {
    const currentCount = fit[activeSlot].length
    const maxSlots = getMaxSlots(activeSlot)
    
    if (currentCount >= maxSlots) {
      return // Slot cheio
    }
    
    setFit(prev => ({
      ...prev,
      [activeSlot]: [...prev[activeSlot], {
        typeId: module_.typeId,
        name: module_.name
      }]
    }))
  }
  
  // Remove module from fit
  const removeModule = (slot: keyof FitState, index: number) => {
    setFit(prev => ({
      ...prev,
      [slot]: prev[slot].filter((_, i) => i !== index)
    }))
  }
  
  // Toggle offline
  const toggleOffline = (slot: keyof FitState, index: number) => {
    setFit(prev => ({
      ...prev,
      [slot]: prev[slot].map((m, i) => 
        i === index ? { ...m, offline: !m.offline } : m
      )
    }))
  }
  
  // Calcular stats
  const calculateStats = useCallback(async () => {
    if (!selectedShip) return
    
    // Buscar dados reais do ship (do banco ou ESI)
    const shipData = await getShipStats(selectedShip.name)
    const cpuTotal = shipData?.cpu || getCpuTotal(selectedShip.name)
    const powerTotal = shipData?.powerGrid || getPowerTotal(selectedShip.name)
    
    let cpuUsed = 0
    let powerUsed = 0
    let dps = 0
    
    for (const mod of fit.high) {
      if (!mod.offline) {
        cpuUsed += getModuleCpu(mod.name)
        powerUsed += getModulePower(mod.name)
        dps += getModuleDps(mod.name)
      }
    }
    for (const mod of fit.med) {
      if (!mod.offline) {
        cpuUsed += getModuleCpu(mod.name)
        powerUsed += getModulePower(mod.name)
      }
    }
    for (const mod of fit.low) {
      if (!mod.offline) {
        cpuUsed += getModuleCpu(mod.name)
        powerUsed += getModulePower(mod.name)
      }
    }
    for (const mod of fit.rig) {
      if (!mod.offline) {
        powerUsed += getModulePower(mod.name)
      }
    }
    
    // Calcular EHP e tank com dados reais
    const shieldHP = shipData?.shieldCapacity || 1000
    const armorHP = shipData?.armorHP || 2000
    const hullHP = shipData?.hullHP || 1000
    const tank = dps > 0 ? Math.min(dps, shieldHP * 0.25 + armorHP * 0.1 + hullHP * 0.05) : 0
    const ehp = shieldHP + armorHP * 2 + hullHP * 4
    
    setStats({
      cpu: { used: cpuUsed, total: cpuTotal, free: cpuTotal - cpuUsed },
      power: { used: powerUsed, total: powerTotal, free: powerTotal - powerUsed },
      dps: { total: dps },
      volley: dps * 2,
      tank: tank,
      ehp: ehp,
      capStable: true
    })
  }, [selectedShip, fit])
  
  useEffect(() => {
    calculateStats()
  }, [calculateStats])
  
  // Save fit
  const saveFit = async () => {
    if (!selectedShip || !fitName) return
    
    setSaving(true)
    try {
      const response = await fetch('/api/fits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: fitName,
          shipTypeId: selectedShip.typeId,
          shipName: selectedShip.name,
          modules: [...fit.high, ...fit.med, ...fit.low, ...fit.rig]
        })
      })
      
      if (response.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Failed to save fit:', error)
    } finally {
      setSaving(false)
    }
  }
  
  // Export EFT
  const exportEft = () => {
    if (!selectedShip || !fitName) return
    
    let eft = `[${selectedShip.name}, ${fitName}]\n\n`
    
    for (const mod of fit.high) {
      eft += `${mod.name}${mod.offline ? ' /offline' : ''}\n`
    }
    eft += '\n'
    
    for (const mod of fit.med) {
      eft += `${mod.name}${mod.offline ? ' /offline' : ''}\n`
    }
    eft += '\n'
    
    for (const mod of fit.low) {
      eft += `${mod.name}${mod.offline ? ' /offline' : ''}\n`
    }
    eft += '\n'
    
    for (const mod of fit.rig) {
      eft += `${mod.name}\n`
    }
    
    navigator.clipboard.writeText(eft)
  }
  
  // Import EFT
  const importEft = async () => {
    try {
      const text = await navigator.clipboard.readText()
      const lines = text.trim().split('\n')
      
      if (!lines[0].startsWith('[')) {
        alert('Invalid EFT format')
        return
      }
      
      // Parse header
      const header = lines[0].replace(/[\[\]]/g, '').split(',')
      const shipName = header[0].trim()
      const name = header[1]?.trim() || 'Imported Fit'
      
      // Find ship
      const ship = ships.find(s => s.name.toLowerCase() === shipName.toLowerCase())
      if (!ship) {
        alert(`Ship not found: ${shipName}`)
        return
      }
      setSelectedShip(ship)
      setFitName(name)
      
      // Parse slots
      let currentSlot: keyof FitState = 'high'
      const newFit: FitState = { high: [], med: [], low: [], rig: [], drone: [], cargo: [] }
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue
        
        if (line.toLowerCase().includes('rig ')) {
          currentSlot = 'rig'
          continue
        }
        if (line.toLowerCase().includes('med ') || line.toLowerCase().includes('mid ')) {
          currentSlot = 'med'
          continue
        }
        if (line.toLowerCase().includes('low ')) {
          currentSlot = 'low'
          continue
        }
        
        const offline = line.endsWith('/offline')
        const modName = line.replace('/offline', '').trim()
        
        newFit[currentSlot].push({
          typeId: 0, // seria resolvido
          name: modName,
          offline
        })
      }
      
      setFit(newFit)
    } catch (error) {
      console.error('Failed to import EFT:', error)
    }
  }
  
  if (!selectedShip) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Fit Editor</h1>
            <p className="text-gray-400">Select a ship to start building your fit</p>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search ships..."
            value={shipSearch}
            onChange={(e) => setShipSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchShips()}
            className="pl-10 bg-eve-panel border-eve-border"
          />
        </div>
        
        {loadingShips ? (
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-eve-accent" />
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {ships.map((ship) => (
              <Card 
                key={ship.typeId}
                className="bg-eve-panel border-eve-border hover:border-eve-accent/50 cursor-pointer transition-colors"
                onClick={() => setSelectedShip(ship)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={getTypeIconUrl(ship.typeId, 64)} />
                    <AvatarFallback>
                      <Ship className="h-6 w-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-white font-medium">{ship.name}</p>
                    <p className="text-xs text-gray-400">{ship.groupName}</p>
                    {ship.basePrice && (
                      <p className="text-xs text-green-400">{formatISK(ship.basePrice)}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }
  
  // Editor view
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setSelectedShip(null)}>
            <ArrowRight className="h-4 w-4 rotate-180 mr-2" />
            Back
          </Button>
          <Avatar className="h-12 w-12">
            <AvatarImage src={getTypeIconUrl(selectedShip.typeId, 64)} />
            <AvatarFallback>
              <Ship className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
          <div>
            <Input
              value={fitName}
              onChange={(e) => setFitName(e.target.value)}
              placeholder="Fit name"
              className="bg-transparent border-none text-xl font-bold text-white focus:outline-none"
            />
            <p className="text-sm text-gray-400">{selectedShip.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={importEft} className="border-eve-border">
            <Upload className="h-4 w-4 mr-2" />
            Import EFT
          </Button>
          <Button variant="outline" onClick={exportEft} className="border-eve-border">
            <Download className="h-4 w-4 mr-2" />
            Export EFT
          </Button>
          <Button 
            onClick={saveFit} 
            disabled={!fitName || saving}
            className="bg-eve-accent text-black hover:bg-eve-accent/80"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </Button>
        </div>
      </div>
      
      {/* Stats */}
      {stats && (
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              <div className={`text-center ${stats.cpu.free < 0 ? 'text-red-400' : 'text-white'}`}>
                <Zap className="h-4 w-4 mx-auto mb-1 text-yellow-400" />
                <div className="text-lg font-bold">{stats.cpu.used}/{stats.cpu.total}</div>
                <div className="text-xs text-gray-400">CPU</div>
              </div>
              <div className={`text-center ${stats.power.free < 0 ? 'text-red-400' : 'text-white'}`}>
                <Battery className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <div className="text-lg font-bold">{stats.power.used}/{stats.power.total}</div>
                <div className="text-xs text-gray-400">Power</div>
              </div>
              <div className="text-center">
                <Target className="h-4 w-4 mx-auto mb-1 text-red-400" />
                <div className="text-lg font-bold text-white">{stats.dps.total}</div>
                <div className="text-xs text-gray-400">DPS</div>
              </div>
              <div className="text-center">
                <Maximize2 className="h-4 w-4 mx-auto mb-1 text-green-400" />
                <div className="text-lg font-bold text-white">{stats.volley}</div>
                <div className="text-xs text-gray-400">Volley</div>
              </div>
              <div className="text-center">
                <Shield className="h-4 w-4 mx-auto mb-1 text-blue-400" />
                <div className="text-lg font-bold text-white">{stats.tank}</div>
                <div className="text-xs text-gray-400">Tank/s</div>
              </div>
              <div className="text-center">
                <Cross className="h-4 w-4 mx-auto mb-1 text-orange-400" />
                <div className="text-lg font-bold text-white">{stats.ehp}</div>
                <div className="text-xs text-gray-400">EHP</div>
              </div>
              <div className="col-span-2 text-center">
                <Shield className={`h-4 w-4 mx-auto mb-1 ${stats.capStable ? 'text-green-400' : 'text-red-400'}`} />
                <div className={`text-lg font-bold ${stats.capStable ? 'text-green-400' : 'text-red-400'}`}>
                  {stats.capStable ? 'Stable' : 'Unstable'}
                </div>
                <div className="text-xs text-gray-400">Capacitor</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Main Editor */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Slots */}
        <div className="lg:col-span-2 space-y-4">
          <Tabs value={activeSlot} onValueChange={(v) => {
            setActiveSlot(v as keyof FitState)
            fetchModules(v)
          }}>
            <TabsList className="bg-eve-panel border border-eve-border">
              <TabsTrigger value="high">High ({fit.high.length})</TabsTrigger>
              <TabsTrigger value="med">Med ({fit.med.length})</TabsTrigger>
              <TabsTrigger value="low">Low ({fit.low.length})</TabsTrigger>
              <TabsTrigger value="rig">Rig ({fit.rig.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="high" className="mt-4">
              <SlotEditor 
                slot="high" 
                modules={fit.high} 
                onRemove={(i) => removeModule('high', i)}
                onToggle={(i) => toggleOffline('high', i)}
                color={SLOT_COLORS.high}
              />
            </TabsContent>
            <TabsContent value="med" className="mt-4">
              <SlotEditor 
                slot="med" 
                modules={fit.med} 
                onRemove={(i) => removeModule('med', i)}
                onToggle={(i) => toggleOffline('med', i)}
                color={SLOT_COLORS.med}
              />
            </TabsContent>
            <TabsContent value="low" className="mt-4">
              <SlotEditor 
                slot="low" 
                modules={fit.low} 
                onRemove={(i) => removeModule('low', i)}
                onToggle={(i) => toggleOffline('low', i)}
                color={SLOT_COLORS.low}
              />
            </TabsContent>
            <TabsContent value="rig" className="mt-4">
              <SlotEditor 
                slot="rig" 
                modules={fit.rig} 
                onRemove={(i) => removeModule('rig', i)}
                onToggle={(i) => toggleOffline('rig', i)}
                color={SLOT_COLORS.rig}
              />
            </TabsContent>
          </Tabs>
        </div>
        
        {/* Module Picker */}
        <div>
          <Card className="bg-eve-panel border-eve-border sticky top-4">
            <CardHeader>
              <CardTitle className="text-white text-lg">Add Module</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search modules..."
                  value={moduleSearch}
                  onChange={(e) => setModuleSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchModules(activeSlot)}
                  className="pl-10 bg-eve-dark border-eve-border"
                />
              </div>
              
              <div className="h-96 overflow-y-auto space-y-1">
                  {loadingModules ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-eve-accent" />
                    </div>
                  ) : (
                    modules.map((mod) => (
                      <div
                        key={mod.typeId}
                        onClick={() => addModule(mod)}
                        className="flex items-center justify-between p-2 rounded hover:bg-eve-accent/10 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={getTypeIconUrl(mod.typeId, 32)} />
                          </Avatar>
                          <span className="text-sm text-white">{mod.name}</span>
                        </div>
                        {mod.basePrice && (
                          <span className="text-xs text-green-400">{formatISK(mod.basePrice)}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SlotEditor({ 
  slot, 
  modules, 
  onRemove, 
  onToggle,
  color 
}: { 
  slot: string
  modules: FitModule[]
  onRemove: (index: number) => void
  onToggle: (index: number) => void
  color: string
}) {
  const maxSlots = getMaxSlots(slot as keyof FitState)
  
  return (
    <Card className="bg-eve-panel border-eve-border">
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {/* Filled slots */}
          {modules.map((mod, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 px-3 py-2 rounded ${mod.offline ? 'opacity-50' : ''} ${color}`}
            >
              <span className="text-sm text-white">{mod.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onToggle(i)}
                className="h-6 w-6 p-0 hover:bg-transparent"
              >
                <Zap className={`h-3 w-3 ${mod.offline ? 'text-gray-500' : 'text-green-400'}`} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onRemove(i)}
                className="h-6 w-6 p-0 hover:bg-red-500/20"
              >
                <Trash2 className="h-3 w-3 text-red-400" />
              </Button>
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: Math.max(0, maxSlots - modules.length) }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center gap-2 px-3 py-2 rounded border border-dashed border-gray-700 text-gray-500"
            >
              <span className="text-sm">Empty {SLOT_LABELS[slot as keyof typeof SLOT_LABELS]}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Helpers
function getMaxSlots(slot: keyof FitState): number {
  const defaults = { high: 8, med: 8, low: 8, rig: 3, drone: 0, cargo: 0 }
  return defaults[slot] || 0
}

function getCpuTotal(shipName: string): number {
  const cpuMap: Record<string, number> = {
    'Hulk': 385,
    'Mackinaw': 385,
    'Skiff': 385,
    'Covetor': 390,
    'Retriever': 270,
    'Procurer': 270,
    'Rorqual': 750,
    'Porpoise': 425,
  }
  return cpuMap[shipName] || 400
}

function getPowerTotal(shipName: string): number {
  const powerMap: Record<string, number> = {
    'Hulk': 387,
    'Mackinaw': 387,
    'Skiff': 387,
    'Covetor': 390,
    'Retriever': 300,
    'Procurer': 300,
    'Rorqual': 12500,
    'Porpoise': 500,
  }
  return powerMap[shipName] || 400
}

function getModuleCpu(moduleName: string): number {
  const cpuMap: Record<string, number> = {
    'Mining Laser I': 5,
    'Mining Laser II': 8,
    'Modulated Strip Miner I': 12,
    'Modulated Strip Miner II': 16,
    'Deep Core Mining Laser I': 18,
    'Deep Core Mining Laser II': 22,
    'Ice Mining Laser I': 6,
    'Ice Mining Laser II': 10,
  }
  for (const [name, cpu] of Object.entries(cpuMap)) {
    if (moduleName.includes(name)) return cpu
  }
  return 5
}

function getModulePower(moduleName: string): number {
  const powerMap: Record<string, number> = {
    'Mining Laser I': 6,
    'Mining Laser II': 9,
    'Modulated Strip Miner I': 18,
    'Modulated Strip Miner II': 22,
    'Deep Core Mining Laser I': 23,
    'Deep Core Mining Laser II': 27,
    'Ice Mining Laser I': 7,
    'Ice Mining Laser II': 11,
  }
  for (const [name, power] of Object.entries(powerMap)) {
    if (moduleName.includes(name)) return power
  }
  return 5
}

function getModuleDps(moduleName: string): number {
  const dpsMap: Record<string, number> = {
    'Modulated Strip Miner I': 120,
    'Modulated Strip Miner II': 180,
    'Deep Core Mining Laser I': 150,
    'Deep Core Mining Laser II': 220,
  }
  for (const [name, dps] of Object.entries(dpsMap)) {
    if (moduleName.includes(name)) return dps
  }
  return 0
}