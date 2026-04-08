import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'

export async function GET() {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ error: 'Unauthorized - Master access required' }, { status: 403 })
    }
    
    const accounts = await prisma.user.findMany({
      select: {
        id: true,
        accountCode: true,
        name: true,
        role: true,
        allowedActivities: true,
        createdAt: true,
        _count: {
          select: {
            characters: true,
            activities: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    const accountsWithCharacters = await Promise.all(
      accounts.map(async (account) => {
        const characters = await prisma.character.findMany({
          where: { userId: account.id },
          select: {
            id: true,
            name: true,
            isMain: true,
            location: true,
            ship: true,
            walletBalance: true,
          },
          orderBy: { isMain: 'desc' }
        })
        return { ...account, characters }
      })
    )
    
    return NextResponse.json({
      accounts: accountsWithCharacters,
      availableActivities: ACTIVITY_TYPES.map(a => a.id)
    })
  } catch (error) {
    console.error('Admin accounts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const currentUser = await getCurrentUser()
    
    if (!currentUser || currentUser.role !== 'master') {
      return NextResponse.json({ error: 'Unauthorized - Master access required' }, { status: 403 })
    }
    
    const body = await request.json()
    const { userId, allowedActivities } = body
    
    if (!userId || !Array.isArray(allowedActivities)) {
      return NextResponse.json({ error: 'Missing userId or allowedActivities' }, { status: 400 })
    }
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: { allowedActivities },
      select: {
        id: true,
        accountCode: true,
        allowedActivities: true,
      }
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin accounts PUT error:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}