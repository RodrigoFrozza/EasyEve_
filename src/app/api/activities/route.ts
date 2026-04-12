export const dynamic = 'force-dynamic'

import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { isPremium } from '@/lib/utils'
import { withErrorHandling, validateBody } from '@/lib/api-handler'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'
import { z } from 'zod'

const createActivitySchema = z.object({
  type: z.string().min(1, 'Activity type is required'),
  participants: z.array(z.object({
    characterId: z.number()
  })).min(1, 'At least one participant is required'),
  typeId: z.number().optional(),
  region: z.string().optional(),
  space: z.string().optional(),
  characterId: z.number().optional(),
}).passthrough()

export const GET = withErrorHandling(async (request: Request) => {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AppError(ErrorCodes.API_UNAUTHORIZED, 'Unauthorized', 401)
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')
  
  const where: any = { userId: user.id }
  if (type) {
    where.type = type.toLowerCase()
  }

  const activities = await prisma.activity.findMany({
    where,
    orderBy: { startTime: 'desc' },
    include: {
      item: true
    }
  })

  return activities
})

export const POST = withErrorHandling(async (request: Request) => {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AppError(ErrorCodes.API_UNAUTHORIZED, 'Unauthorized', 401)
  }

  const body = await validateBody(request, createActivitySchema)
  const {
    type,
    typeId,
    region,
    space,
    participants,
    characterId,
    ...extraData
  } = body

  // Check characters engaged in active activities
  const characterIds = participants.map((p: any) => p.characterId)
  
  const activeActivities = await prisma.activity.findMany({
    where: {
      userId: user.id,
      status: 'active'
    }
  })

  // Premium limits verification
  const hasPremium = isPremium(user.subscriptionEnd)
  if (!hasPremium) {
    if (participants.length > 1) {
      throw new AppError(ErrorCodes.API_FORBIDDEN, 'O plano gratuito é limitado a 1 personagem por atividade. Faça upgrade para Premium para rastrear frotas!', 403)
    }
    
    if (activeActivities.length > 0) {
      throw new AppError(ErrorCodes.API_FORBIDDEN, 'O plano gratuito é limitado a 1 atividade simultânea. Faça upgrade para Premium para rastrear múltiplas atividades!', 403)
    }
  }

  // Check if any character matches currently active ones
  const activeCharIds = activeActivities.flatMap((a: any) => 
    (a.participants as any[]).map((p: any) => p.characterId)
  )

  const busyChars = characterIds.filter((id: number) => activeCharIds.includes(id))
  if (busyChars.length > 0) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, `Personagem(ns) ${busyChars.join(', ')} já estão em uma atividade ativa`, 400)
  }

  const activity = await prisma.activity.create({
    data: {
      userId: user.id,
      characterId: characterId || characterIds[0],
      type,
      typeId,
      region,
      space,
      status: 'active',
      startTime: new Date().toISOString(),
      data: extraData as any,
      participants: participants as any
    },
    include: {
      item: true
    }
  })

  // Trigger initial mining sync
  if (type === 'mining') {
    try {
      const host = request.headers.get('host')
      const protocol = host?.includes('localhost') ? 'http' : 'https'
      const syncUrl = `${protocol}://${host}/api/activities/sync-mining?id=${activity.id}&mode=initial`
      
      console.log(`[ACTIVITY] Triggering initial mining sync: ${syncUrl}`)
      // Fire and forget or await? Original code awaited.
      await fetch(syncUrl, { method: 'POST' })
    } catch (e) {
      console.error('[ACTIVITY] Initial mining sync trigger failed:', e)
    }
  }

  return activity
})