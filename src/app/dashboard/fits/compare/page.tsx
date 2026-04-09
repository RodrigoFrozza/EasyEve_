'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from '@/lib/session-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatISK } from '@/lib/utils'
import { 
  Plus, Search, Ship, Trash2, RefreshCw, 
  Zap, Battery, Shield, Cross, Target,
  ArrowRight, ArrowLeftRight, Maximize2, TrendingUp
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTypeIconUrl } from '@/lib/sde'

interface Fit {
  id: string
  name: string
  shipTypeId: number
  shipName: string
  dps: number | null
  tank: number | null
  ehp: number | null
  cost: number | null
  cpuUsed: number | null
  cpuTotal: number | null
  pgUsed: number | null
  pgTotal: number | null
  capStable: boolean | null
  createdAt: string | Date
}

interface StatColumn {
  key: string
  label: string
  icon: any
  getValue: (fit: Fit) => number | string
  isNumber?: boolean
  isString?: boolean
  format?: (v: number) => string
}

export default function FitComparePage() {
  const { data: session } = useSession()
  const characters = useMemo(() => session?.user?.characters || [], [session])
  
  const [fits, setFits] = useState<Fit[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFits, setSelectedFits] = useState<Fit[]>([])
  
  // Fetch fits
  useEffect(() => {
    if (characters.length > 0) {
      fetch('/api/fits')
        .then(res => res.json())
        .then(data => {
          setFits(data)
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [characters.length])
  
  const toggleFitSelection = (fit: Fit) => {
    if (selectedFits.find(f => f.id === fit.id)) {
      setSelectedFits(selectedFits.filter(f => f.id !== fit.id))
    } else if (selectedFits.length < 3) {
      setSelectedFits([...selectedFits, fit])
    }
  }
  
  const statColumns = [
    { key: 'dps', label: 'DPS', icon: Target, getValue: (f: Fit) => f.dps || 0, isNumber: true },
    { key: 'tank', label: 'Tank/s', icon: Shield, getValue: (f: Fit) => f.tank || 0, isNumber: true },
    { key: 'ehp', label: 'EHP', icon: Cross, getValue: (f: Fit) => f.ehp || 0, isNumber: true },
    { key: 'cost', label: 'Cost', icon: TrendingUp, getValue: (f: Fit) => f.cost || 0, format: formatISK, isNumber: true },
    { key: 'cpu', label: 'CPU', icon: Zap, getValue: (f: Fit) => `${f.cpuUsed || 0}/${f.cpuTotal || 0}`, isString: true },
    { key: 'power', label: 'Power', icon: Battery, getValue: (f: Fit) => `${f.pgUsed || 0}/${f.pgTotal || 0}`, isString: true },
    { key: 'cap', label: 'Cap', icon: Battery, getValue: (f: Fit) => f.capStable ? 'Stable' : 'Unstable', isString: true },
  ]
  
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
          <h1 className="text-3xl font-bold text-white">Fit Comparison</h1>
          <p className="text-gray-400">Compare up to 3 fits side by side</p>
        </div>
        {selectedFits.length > 0 && (
          <Button variant="outline" onClick={() => setSelectedFits([])} className="border-eve-border">
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Selection
          </Button>
        )}
      </div>
      
      {/* Selection Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {fits.map((fit) => {
          const isSelected = selectedFits.find(f => f.id === fit.id)
          return (
            <Card 
              key={fit.id}
              className={`bg-eve-panel border-eve-border cursor-pointer transition-colors ${
                isSelected ? 'border-eve-accent' : 'hover:border-eve-accent/50'
              }`}
              onClick={() => toggleFitSelection(fit)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={fit.shipTypeId > 0 ? getTypeIconUrl(fit.shipTypeId, 64) : undefined} />
                    <AvatarFallback>
                      <Ship className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-white font-medium">{fit.name}</p>
                    <p className="text-xs text-gray-400">{fit.shipName}</p>
                  </div>
                  <div className={`h-6 w-6 rounded-full border-2 ${
                    isSelected ? 'bg-eve-accent border-eve-accent' : 'border-gray-600'
                  }`}>
                    {isSelected && (
                      <div className="flex items-center justify-center h-full text-black text-xs font-bold">
                        {selectedFits.findIndex(f => f.id === fit.id) + 1}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      
      {/* Comparison Table */}
      {selectedFits.length > 1 && (
        <Card className="bg-eve-panel border-eve-border">
          <CardHeader>
            <CardTitle className="text-white">Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-eve-border">
                    <th className="text-left p-3 text-gray-400 font-medium">Stat</th>
                    {selectedFits.map((fit, idx) => (
                      <th key={fit.id} className="text-left p-3 text-eve-accent font-medium">
                        #{idx + 1} {fit.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {statColumns.map((col) => {
                    const numericValues: number[] = selectedFits.map(fit => {
                      const v = col.getValue(fit)
                      if (typeof v === 'number') return v
                      if (col.isNumber) return parseFloat(String(v)) || 0
                      return 0
                    })
                    const maxValue = Math.max(...numericValues)
                    
                    return (
                      <tr key={col.key} className="border-b border-eve-border">
                        <td className="p-3 text-gray-400 flex items-center gap-2">
                          <col.icon className="h-4 w-4" />
                          {col.label}
                        </td>
                        {selectedFits.map((fit) => {
                          const value = col.getValue(fit)
                          const isMax = value === maxValue && maxValue > 0
                          return (
                            <td key={fit.id} className={`p-3 ${isMax ? 'text-green-400 font-bold' : 'text-white'}`}>
                              {col.format ? col.format(value as number) : value}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
      
      {fits.length === 0 && (
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="py-12 text-center">
            <Ship className="h-12 w-12 mx-auto mb-4 text-gray-500" />
            <p className="text-gray-400">No fits yet. Create your first fit to compare!</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}