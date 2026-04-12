import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { isPremium } from '@/lib/utils'
import { withErrorHandling, validateBody } from '@/lib/api-handler'
import { CreateFittingSchema } from '@/lib/schemas'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async () => {
  const user = await getCurrentUser()
  if (!user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
  }

  if (!isPremium(user.subscriptionEnd)) {
    throw new AppError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Fit Management is a Premium feature.', 403)
  }
  
  const fits = await prisma.fit.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' }
  })
  
  return NextResponse.json(fits || [])
})

export const POST = withErrorHandling(async (request: Request) => {
  const user = await getCurrentUser()
  if (!user) {
    throw new AppError(ErrorCodes.UNAUTHORIZED, 'Unauthorized', 401)
  }

  if (!isPremium(user.subscriptionEnd)) {
    throw new AppError(ErrorCodes.INSUFFICIENT_PERMISSIONS, 'Fit Management is a Premium feature.', 403)
  }
  
  const body = await validateBody(request, CreateFittingSchema)
  
  const fit = await prisma.fit.create({
    data: {
      name: body.name,
      shipTypeId: body.shipTypeId,
      shipName: body.shipName,
      modules: body.modules || [],
      dps: body.dps,
      tank: body.tank,
      cost: body.cost,
      userId: user.id
    }
  })
  
  return NextResponse.json(fit)
})