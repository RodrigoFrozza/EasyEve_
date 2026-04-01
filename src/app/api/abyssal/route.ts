import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await prisma.abyssalSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'desc' }
    })
    
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('GET abyssal sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch abyssal sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { startTime, endTime, filamentType, tier, loot, iskPerMinute, survived, characterId } = body
    
    const session = await prisma.abyssalSession.create({
      data: {
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        filamentType,
        tier: tier || 1,
        loot: loot || 0,
        iskPerMinute: iskPerMinute || 0,
        survived: survived !== undefined ? survived : true,
        characterId,
        userId: user.id
      }
    })
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('POST abyssal session error:', error)
    return NextResponse.json({ error: 'Failed to create abyssal session' }, { status: 500 })
  }
}
