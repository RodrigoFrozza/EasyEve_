import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { fetchCharacterData } from '@/lib/esi'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const characters = await prisma.character.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(characters)
  } catch (error) {
    console.error('GET characters error:', error)
    return NextResponse.json({ error: 'Failed to fetch characters' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { characterId, accessToken } = body
    
    if (!characterId || !accessToken) {
      return NextResponse.json({ error: 'Missing characterId or accessToken' }, { status: 400 })
    }
    
    const existingChar = await prisma.character.findUnique({
      where: { id: characterId }
    })
    
    if (existingChar && existingChar.userId !== user.id) {
      return NextResponse.json({ error: 'Character already linked to another account' }, { status: 409 })
    }
    
    const charData = await fetchCharacterData(characterId, accessToken)
    const charDataAny = charData as { total_sp?: number; wallet?: number; location?: string; ship?: string; shipTypeId?: number }
    
    const character = await prisma.character.upsert({
      where: { id: characterId },
      create: {
        id: characterId,
        name: charDataAny.name || `Character ${characterId}`,
        ownerHash: charDataAny.ownerHash || '',
        accessToken: accessToken,
        userId: user.id,
        totalSp: charDataAny.total_sp || 0,
        walletBalance: charDataAny.wallet || 0,
        location: charDataAny.location,
        ship: charDataAny.ship,
        shipTypeId: charDataAny.shipTypeId,
        lastFetchedAt: new Date()
      },
      update: {
        accessToken: accessToken,
        totalSp: charDataAny.total_sp || 0,
        walletBalance: charDataAny.wallet || 0,
        location: charDataAny.location,
        ship: charDataAny.ship,
        shipTypeId: charDataAny.shipTypeId,
        lastFetchedAt: new Date()
      }
    })
    
    return NextResponse.json(character)
  } catch (error) {
    console.error('POST character error:', error)
    return NextResponse.json({ error: 'Failed to link character' }, { status: 500 })
  }
}
