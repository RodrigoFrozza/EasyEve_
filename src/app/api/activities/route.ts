import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activities = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { startedAt: 'desc' }
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
      name,
      region,
      space,
      miningType,
      oreMined,
      npcFaction,
      siteName,
      siteType,
      mtuContents,
      tier,
      weather,
      shipSize,
      lootBefore,
      lootAfter,
      explorationSiteType,
      difficulty,
      lootCollected,
      dedLevel,
      escalationFaction,
      escalationLoot,
      crabPhase,
      crabBounties,
      pvpType,
      pvpLoot,
      fit,
      participants
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
        type,
        name,
        region,
        space,
        miningType,
        oreMined,
        npcFaction,
        siteName,
        siteType,
        mtuContents,
        tier,
        weather,
        shipSize,
        lootBefore,
        lootAfter,
        explorationSiteType,
        difficulty,
        lootCollected,
        dedLevel,
        escalationFaction,
        escalationLoot,
        crabPhase,
        crabBounties,
        pvpType,
        pvpLoot,
        fit,
        status: 'active',
        participants: participants as any
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error creating activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}