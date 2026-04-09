'use client'

import { useState, useEffect } from 'react'
import { formatISK } from '@/lib/utils'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { MINING_TYPES } from '@/lib/constants/activity-data'

interface MiningValuableOresProps {
  initialType?: string
}

export function MiningValuableOres({ initialType }: MiningValuableOresProps) {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<any[]>([])
  const [miningType, setMiningType] = useState<string>(initialType || 'Ore')

  useEffect(() => {
    if (initialType) setMiningType(initialType)
  }, [initialType])

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sde/mining-types?type=${miningType}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setItems(data.sort((a, b) => (b.sell || 0) - (a.sell || 0)))
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [miningType])

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'Ore': 'Minérios',
      'Ice': 'Gelos',
      'Gas': 'Gases',
      'Moon': 'Moon'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
          Melhores {getTypeLabel(miningType)} (Jita)
        </Label>
        <Select value={miningType} onValueChange={setMiningType}>
          <SelectTrigger className="h-6 w-24 text-[10px] bg-zinc-900 border-zinc-700">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MINING_TYPES.map(type => (
              <SelectItem key={type} value={type} className="text-[10px]">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-6 bg-zinc-900 rounded w-full"></div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-zinc-500 text-xs italic">Nenhum item disponível.</p>
      ) : (
        <div className="bg-zinc-950/50 rounded-lg border border-zinc-800 overflow-hidden">
          <table className="w-full text-[10px]">
            <thead className="bg-zinc-900/50 text-zinc-500 uppercase">
              <tr>
                <th className="text-left px-2 py-1.5 font-medium">Item</th>
                <th className="text-right px-2 py-1.5 font-medium">Buy</th>
                <th className="text-right px-2 py-1.5 font-medium">Sell</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 15).map((item, index) => (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-zinc-900/20' : ''}>
                  <td className="px-2 py-1.5">
                    <span className="text-zinc-400">
                      <span className="text-zinc-600 mr-1.5">{index + 1}.</span>
                      {item.name}
                    </span>
                  </td>
                  <td className="text-right px-2 py-1.5">
                    <span className="text-green-400 font-mono">
                      {item.buy > 0 ? formatISK(item.buy) : '-'}
                    </span>
                  </td>
                  <td className="text-right px-2 py-1.5">
                    <span className="text-cyan-400 font-mono">
                      {item.sell > 0 ? formatISK(item.sell) : '-'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-[10px] font-bold text-zinc-500 uppercase tracking-widest ${className || ''}`}>
      {children}
    </label>
  )
}