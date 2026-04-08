'use client'

import { useState, useEffect } from 'react'
import { formatISK } from '@/lib/utils'

export function MiningValuableOres() {
  const [ores, setOres] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sde/ores')
      .then(res => res.json())
      .then(data => {
        setOres(data.slice(0, 10))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-zinc-800 rounded w-1/3"></div>
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-3 bg-zinc-900 rounded w-full"></div>
          ))}
        </div>
      </div>
    )
  }

  if (ores.length === 0) {
    return <p className="text-zinc-500 text-xs italic">Nenhum minério disponível para consulta.</p>
  }

  return (
    <div className="bg-zinc-950/50 rounded-lg p-4 border border-zinc-800">
      <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-3">Top 10 Minérios (Jita Market)</p>
      <div className="space-y-2">
        {ores.map((ore, index) => (
          <div key={ore.id || ore.name} className="flex justify-between items-center text-[11px] group">
            <span className="text-zinc-400 group-hover:text-zinc-100 transition-colors">
              <span className="text-zinc-600 mr-2">{index + 1}.</span>
              {ore.name}
            </span>
            <span className="text-zinc-200 font-mono font-bold">
              {formatISK(ore.valuePerUnit || 0)}/un
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
