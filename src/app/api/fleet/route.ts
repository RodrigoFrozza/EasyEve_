import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const sessions = await prisma.fleetSession.findMany({
      where: { userId: user.id },
      orderBy: { startTime: 'desc' }
    })
    
    return NextResponse.json(sessions)
  } catch (error) {
    console.error('GET fleet sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch fleet sessions' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { name, fleetType, startTime, endTime, iskPerHour, participants, characterId } = body
    
    if (!name || !fleetType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const session = await prisma.fleetSession.create({
      data: {
        name,
        fleetType,
        startTime: new Date(startTime),
        endTime: endTime ? new Date(endTime) : null,
        iskPerHour: iskPerHour || 0,
        participants: participants || [],
        characterId,
        userId: user.id
      }
    })
    
    return NextResponse.json(session)
  } catch (error) {
    console.error('POST fleet session error:', error)
    return NextResponse.json({ error: 'Failed to create fleet session' }, { status: 500 })
  }
}
