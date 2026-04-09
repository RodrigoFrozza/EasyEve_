'use client'

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { formatISK, formatNumber } from '@/lib/utils'
import { Clock, TrendingUp } from 'lucide-react'

interface Participant {
  characterId: number
  characterName: string
}

interface FleetSectionProps {
  participants: Participant[]
  participantEarnings?: Record<number, number>
  isMining?: boolean
}

export function FleetSection({ participants, participantEarnings = {}, isMining = false }: FleetSectionProps) {
  return (
    <div className="space-y-2">
      {participants.map((p) => (
        <div 
          key={p.characterId} 
          className="flex items-center gap-3 p-2.5 bg-zinc-950/40 border border-zinc-900/50 rounded-lg backdrop-blur-sm group/p"
        >
          <Avatar className="h-10 w-10 border border-zinc-800 group-hover/p:border-blue-500/50 transition-colors">
            <AvatarImage src={`https://images.evetech.net/characters/${p.characterId}/portrait?size=64`} />
            <AvatarFallback className="bg-zinc-900 text-[10px] tracking-tighter">
              {p.characterName?.slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate tracking-tight">
              {p.characterName}
            </p>
            <p className="text-[10px] text-zinc-600 truncate uppercase font-bold tracking-widest">
              {participantEarnings[p.characterId] 
                ? (isMining 
                  ? formatNumber(participantEarnings[p.characterId]) + ' m³'
                  : formatISK(participantEarnings[p.characterId]))
                : 'No data'}
            </p>
          </div>
          <div className="h-2 w-2 rounded-full bg-blue-500/50 animate-pulse" />
        </div>
      ))}
    </div>
  )
}