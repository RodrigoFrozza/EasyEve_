import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    
    const accounts = await prisma.user.findMany({
      include: {
        characters: {
          select: {
            id: true,
            name: true,
            isMain: true,
            location: true,
            ship: true,
            walletBalance: true,
          },
          orderBy: { isMain: 'desc' }
        },
        _count: {
          select: {
            characters: true,
            activities: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json({
      accounts: accounts,
      availableActivities: ACTIVITY_TYPES.map(a => a.id)
    })
  } catch (error) {
    console.error('Admin accounts GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    
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