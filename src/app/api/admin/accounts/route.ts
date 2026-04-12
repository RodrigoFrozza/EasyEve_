import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorHandling, validateBody } from '@/lib/api-handler'
import { AdminUpdateAccountSchema } from '@/lib/schemas'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async (req: Request) => {
  await requireAdmin()
  
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
          },
          orderBy: { isMain: 'desc' }
        },
        payments: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            payerCharacterName: true,
            journalId: true
          }
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
})

export const PUT = withErrorHandling(async (request: Request) => {
  await requireAdmin()
  
  const body = await validateBody(request, AdminUpdateAccountSchema)
  const { userId, allowedActivities, subscriptionEnd } = body
  
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
})

export const DELETE = withErrorHandling(async (request: Request) => {
  await requireAdmin()
  
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  
  if (!userId) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Missing userId', 400)
  }
  
  await prisma.user.delete({
    where: { id: userId }
  })
  
  return NextResponse.json({ success: true })
})