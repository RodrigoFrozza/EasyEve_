'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatSP, formatISK } from '@/lib/utils'
import { MapPin, Ship, Zap, Wallet } from 'lucide-react'
import { RefreshCharacterButton, RemoveCharacterButton, SetMainButton, CharacterScopesDialog, ReloginButton } from '@/components/character-actions'
import { TimeAgo } from '@/components/time-ago'
import { useCharacterData } from '@/lib/hooks/use-esi'

interface CharacterData {
  id: number
  name: string
  totalSp: number
  walletBalance: number
  location: string | null
  ship: string | null
  lastFetchedAt: Date | null
  isMain: boolean
  scopes: string[]
}

export function CharacterCard({ 
  character: initialData, 
  accountCode, 
  detailed = false 
}: { 
  character: CharacterData, 
  accountCode: string, 
  detailed?: boolean 
}) {
  // Use the hook to sync state if a background refresh happens
  const { data: character } = useCharacterData(initialData.id)
  
  // Fallback to initialData from server if query hasn't run yet or is loading
  const char = character || initialData

  return (
    <Card className={`bg-eve-panel border-eve-border ${char.isMain ? 'ring-2 ring-eve-accent' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=128`} />
              <AvatarFallback>{char.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">{char.name}</CardTitle>
                {char.isMain && <Badge variant="eve">Main</Badge>}
              </div>
              <p className="text-sm text-gray-400">ID: {char.id}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-eve-accent" />
            <span className="text-gray-400">SP:</span>
            <span className="font-medium text-white">{formatSP(char.totalSp)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-green-400" />
            <span className="text-gray-400">ISK:</span>
            <span className="font-medium text-green-400">{formatISK(char.walletBalance)}</span>
          </div>
          {char.location && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400">Location:</span>
              <span className="font-medium text-white">{char.location}</span>
            </div>
          )}
          {char.ship && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Ship className="h-4 w-4 text-purple-400" />
              <span className="text-gray-400">Ship:</span>
              <span className="font-medium text-white">{char.ship}</span>
            </div>
          )}
        </div>

        {detailed && (
          <div className="pt-4 border-t border-eve-border">
            <p className="text-xs text-gray-500">
              Last updated: <TimeAgo date={char.lastFetchedAt} />
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-2">
          <SetMainButton characterId={char.id} isMain={char.isMain} />
          <RefreshCharacterButton characterId={char.id} />
          <CharacterScopesDialog scopes={char.scopes} />
          <ReloginButton accountCode={accountCode} />
          {!char.isMain && (
            <RemoveCharacterButton characterId={char.id} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
