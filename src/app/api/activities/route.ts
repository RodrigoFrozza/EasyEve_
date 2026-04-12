export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { isPremium } from '@/lib/utils'

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
  } catch (error: any) {
    console.error('Error fetching activities:', error)
    // Detailed logging for debugging
    if (error && typeof error === 'object') {
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      })
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message || 'Unknown error' 
    }, { status: 500 })
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

    const hasPremium = isPremium(user.subscriptionEnd)

    // CHECK PREMIUM LIMITS
    if (!hasPremium) {
      // Limit 1 character per activity
      if (participants.length > 1) {
        return NextResponse.json({ 
          error: 'Free plan is limited to 1 character per activity. Upgrade to Premium for fleet tracking!' 
        }, { status: 403 })
      }
      
      // Limit 1 concurrent activity
      if (activeActivities.length > 0) {
        return NextResponse.json({ 
          error: 'Free plan is limited to 1 concurrent activity. Upgrade to Premium for multi-activity tracking!' 
        }, { status: 403 })
      }
    }

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
        startTime: new Date().toISOString(), // Forced UTC for ESI compatibility
        data: extraData as any,
        participants: participants as any
      },
      include: {
        item: true
      }
    })

    // Trigger initial mining sync to capture baselines if needed
    if (type === 'mining') {
      try {
        const host = request.headers.get('host')
        const protocol = host?.includes('localhost') ? 'http' : 'https'
        const syncUrl = `${protocol}://${host}/api/activities/sync-mining?id=${activity.id}&mode=initial`
        
        console.log(`[ACTIVITY] Triggering initial mining sync: ${syncUrl}`)
        // We await to ensure the baseline is set before the frontend starts its auto-sync loop
        await fetch(syncUrl, { method: 'POST' })
      } catch (e) {
        console.error('[ACTIVITY] Initial mining sync trigger failed:', e)
      }
    }

    return NextResponse.json(activity)
  } catch (error: any) {
    console.error('Error creating activity:', error)
    if (error && typeof error === 'object') {
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        meta: error.meta,
        stack: error.stack
      })
    }
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message || 'Unknown error' 
    }, { status: 500 })
  }
}