export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { fetchCharacterData } from '@/lib/esi'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { characterId, accessToken, characterOwnerHash } = body
    
    if (!characterId || !accessToken || !characterOwnerHash) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const existingChar = await prisma.character.findUnique({
      where: { id: characterId }
    })
    
    if (existingChar && existingChar.userId !== user.id) {
      return NextResponse.json({ error: 'Character already linked to another account' }, { status: 409 })
    }
    
    const charData = await fetchCharacterData(characterId, accessToken)
    
    const character = await prisma.character.upsert({
      where: { id: characterId },
      create: {
        id: characterId,
        name: charData.name || `Character ${characterId}`,
        ownerHash: characterOwnerHash,
        accessToken: accessToken,
        userId: user.id,
        totalSp: charData.total_sp || 0,
        walletBalance: charData.wallet || 0,
        location: charData.location,
        ship: charData.ship,
        shipTypeId: charData.shipTypeId,
        lastFetchedAt: new Date()
      },
      update: {
        accessToken: accessToken,
        userId: user.id,
        totalSp: charData.total_sp || 0,
        walletBalance: charData.wallet || 0,
        location: charData.location,
        ship: charData.ship,
        shipTypeId: charData.shipTypeId,
        lastFetchedAt: new Date()
      }
    })
    
    return NextResponse.json(character)
  } catch (error) {
    console.error('Link character error:', error)
    return NextResponse.json({ error: 'Failed to link character' }, { status: 500 })
  }
}
