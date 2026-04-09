import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: Request) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const [accounts, total] = await Promise.all([
      prisma.user.findMany({
        skip,
        take: limit,
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
      }),
      prisma.user.count()
    ])
    
    return NextResponse.json({
      accounts: accounts,
      total,
      hasMore: total > skip + accounts.length,
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
    const { userId, allowedActivities, subscriptionEnd } = body
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    
    const updateData: any = {}
    if (allowedActivities) updateData.allowedActivities = allowedActivities
    if (subscriptionEnd) updateData.subscriptionEnd = new Date(subscriptionEnd)
    
    const updated = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        accountCode: true,
        allowedActivities: true,
        subscriptionEnd: true,
      }
    })
    
    return NextResponse.json(updated)
  } catch (error) {
    console.error('Admin accounts PUT error:', error)
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }
    
    // Prevent master from deleting themselves via this simple UI
    // (Optional security layer)
    
    await prisma.user.delete({
      where: { id: userId }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin accounts DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 })
  }
}