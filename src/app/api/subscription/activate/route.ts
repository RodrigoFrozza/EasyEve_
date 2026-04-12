import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/api-helpers'
import { withErrorHandling, validateBody } from '@/lib/api-handler'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const PULALEEROY_CORP_ID = 98651213

const activateSchema = z.object({
  code: z.string().min(1, 'Código é obrigatório')
})

export const POST = withErrorHandling(async (request: Request) => {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AppError(ErrorCodes.API_UNAUTHORIZED, 'Não autorizado', 401)
  }

  const { code } = await validateBody(request, activateSchema)

  const activationCode = await prisma.activationCode.findUnique({
    where: { code: code.toUpperCase() },
  })

  if (!activationCode) {
    throw new AppError(ErrorCodes.API_NOT_FOUND, 'Código inválido ou inexistente', 404)
  }

  if (activationCode.isUsed) {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Este código já foi utilizado', 400)
  }

  // Check if user has any character from PulaLeeroy corporation
  const userCharacters = await prisma.character.findMany({
    where: { userId: user.id }
  })

  const isPulaLeeroyMember = userCharacters.some(char => char.corporationId === PULALEEROY_CORP_ID)

  // Handle PL8R special codes (PulaLeeroy lifetime codes)
  if (activationCode.type === 'PL8R') {
    const newEnd = new Date('2099-12-31T23:59:59Z')
    
    await prisma.$transaction([
      prisma.activationCode.update({
        where: { id: activationCode.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedById: user.id
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionEnd: newEnd
        }
      })
    ])

    return {
      success: true,
      subscriptionEnd: newEnd,
      type: 'LIFETIME',
      isPulaLeeroy: isPulaLeeroyMember
    }
  }

  // Determine new subscription end date
  let newEnd: Date
  const currentEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : new Date()
  const baseDate = currentEnd > new Date() ? currentEnd : new Date()

  if (activationCode.type === 'LIFETIME') {
    newEnd = new Date('2099-12-31T23:59:59Z')
  } else if (activationCode.type === 'DAYS_30') {
    newEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
  } else {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Tipo de código de ativação desconhecido', 400)
  }

  // Atomic transaction: mark code as used and update user
  await prisma.$transaction([
    prisma.activationCode.update({
      where: { id: activationCode.id },
      data: {
        isUsed: true,
        usedAt: new Date(),
        usedById: user.id
      }
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionEnd: newEnd
      }
    })
  ])

  return {
    success: true,
    subscriptionEnd: newEnd,
    type: activationCode.type,
    isPulaLeeroy: isPulaLeeroyMember
  }
})

