import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { formatSP, formatISK, timeAgo } from '@/lib/utils'
import { MapPin, Ship, Zap, Wallet, Plus } from 'lucide-react'
import { LinkCharacterButton, RefreshCharacterButton, RemoveCharacterButton } from '@/components/character-actions'

interface CharacterData {
  id: number
  name: string
  totalSp: number
  walletBalance: number
  location: string | null
  ship: string | null
  lastFetchedAt: Date | null
}

interface PrismaCharacter {
  id: number
  name: string
  totalSp: number
  walletBalance: number
  location: string | null
  ship: string | null
  lastFetchedAt: Date | null
}

export default async function CharactersPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      characters: {
        orderBy: { totalSp: 'desc' }
      }
    }
  })

  const characters: CharacterData[] = (user?.characters || []).map((c: PrismaCharacter) => ({
    id: c.id,
    name: c.name,
    totalSp: c.totalSp,
    walletBalance: c.walletBalance,
    location: c.location,
    ship: c.ship,
    lastFetchedAt: c.lastFetchedAt,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Characters</h1>
          <p className="text-gray-400">Manage your linked EVE Online characters</p>
        </div>
        <LinkCharacterButton />
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList className="bg-eve-panel border border-eve-border">
          <TabsTrigger value="all">All ({characters.length})</TabsTrigger>
          <TabsTrigger value="main">Main Character</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {characters.map((char) => (
              <CharacterCard key={char.id} character={char} isMain={char.id === characters[0]?.id} />
            ))}
          </div>
        </TabsContent>
        
        <TabsContent value="main" className="mt-6">
          {characters[0] && (
            <div className="max-w-md">
              <CharacterCard character={characters[0]} isMain={true} detailed />
            </div>
          )}
        </TabsContent>
      </Tabs>

      {characters.length === 0 && (
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-eve-accent/20 mb-4">
              <Plus className="h-8 w-8 text-eve-accent" />
            </div>
            <h3 className="text-lg font-medium text-white mb-2">No Characters Linked</h3>
            <p className="text-gray-400 text-center mb-4">
              Link your EVE Online characters to start tracking your progress.
            </p>
            <LinkCharacterButton />
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function CharacterCard({ character, isMain, detailed = false }: { character: CharacterData, isMain: boolean, detailed?: boolean }) {
  return (
    <Card className={`bg-eve-panel border-eve-border ${isMain ? 'ring-2 ring-eve-accent' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={`https://images.evetech.net/characters/${character.id}/portrait?size=128`} />
              <AvatarFallback>{character.name[0]}</AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white">{character.name}</CardTitle>
                {isMain && <Badge variant="eve">Main</Badge>}
              </div>
              <p className="text-sm text-gray-400">ID: {character.id}</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="h-4 w-4 text-eve-accent" />
            <span className="text-gray-400">SP:</span>
            <span className="font-medium text-white">{formatSP(character.totalSp)}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Wallet className="h-4 w-4 text-green-400" />
            <span className="text-gray-400">ISK:</span>
            <span className="font-medium text-green-400">{formatISK(character.walletBalance)}</span>
          </div>
          {character.location && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <MapPin className="h-4 w-4 text-blue-400" />
              <span className="text-gray-400">Location:</span>
              <span className="font-medium text-white">{character.location}</span>
            </div>
          )}
          {character.ship && (
            <div className="flex items-center gap-2 text-sm col-span-2">
              <Ship className="h-4 w-4 text-purple-400" />
              <span className="text-gray-400">Ship:</span>
              <span className="font-medium text-white">{character.ship}</span>
            </div>
          )}
        </div>

        {detailed && (
          <div className="pt-4 border-t border-eve-border">
            <p className="text-xs text-gray-500">
              Last updated: {character.lastFetchedAt ? timeAgo(character.lastFetchedAt) : 'Never'}
            </p>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <RefreshCharacterButton characterId={character.id} />
          {!isMain && (
            <RemoveCharacterButton characterId={character.id} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
