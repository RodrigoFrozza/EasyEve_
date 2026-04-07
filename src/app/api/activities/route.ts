import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const where: any = { userId: user.id }
    if (type) {
      where.type = type.toLowerCase()
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { startTime: 'desc' },
      include: {
        item: true // Include EveType details (ship, etc.)
      }
    })

    return NextResponse.json(activities)
  } catch (error) {
    console.error('Error fetching activities:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      type,
      typeId,
      region,
      space,
      participants,
      characterId,
      ...extraData // Todos os outros campos vão para o JSON 'data'
    } = body

    if (!type) {
      return NextResponse.json({ error: 'Activity type is required' }, { status: 400 })
    }

    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 })
    }

    // Check if any character is already in an active activity
    const characterIds = participants.map((p: { characterId: number }) => p.characterId)
    
    const activeActivities = await prisma.activity.findMany({
      where: {
        userId: user.id,
        status: 'active'
      }
    })

    const activeCharIds = activeActivities.flatMap((a: any) => 
      (a.participants as any[]).map((p: any) => p.characterId)
    )

    const busyChars = characterIds.filter((id: number) => activeCharIds.includes(id))
    if (busyChars.length > 0) {
      return NextResponse.json({ 
        error: `Character(s) ${busyChars.join(', ')} are already in an active activity` 
      }, { status: 400 })
    }

    const activity = await prisma.activity.create({
      data: {
        userId: user.id,
        characterId: characterId || characterIds[0], // Use primary char or first participant
        type,
        typeId,
        region,
        space,
        status: 'active',
        data: extraData as any,
        participants: participants as any
      },
      include: {
        item: true
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}