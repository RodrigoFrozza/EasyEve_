import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorHandling, validateBody } from '@/lib/api-handler'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'
import { z } from 'zod'

const PULALEEROY_CORP_ID = 98651213
const LIFETIME_DATE = new Date('2099-12-31T23:59:59Z')

const grantSchema = z.object({
  userId: z.string().min(1, 'User ID é obrigatório')
})

const giveSchema = z.object({
  userId: z.string().min(1, 'User ID é obrigatório'),
  type: z.enum(['LIFETIME', 'DAYS_30', 'PL8R'])
})

export const GET = withErrorHandling(async () => {
  const { error } = await requireAdmin()
  if (error) return error

  const users = await prisma.user.findMany({
    where: {
      subscriptionEnd: { gt: new Date() }
    },
    select: {
      id: true,
      name: true,
      accountCode: true,
      subscriptionEnd: true,
      characters: {
        select: {
          id: true,
          name: true,
          corporationId: true
        }
      }
    },
    orderBy: { subscriptionEnd: 'desc' }
  })

  return users.map(user => ({
    id: user.id,
    name: user.name,
    accountCode: user.accountCode,
    subscriptionEnd: user.subscriptionEnd,
    hasPremium: user.subscriptionEnd && new Date(user.subscriptionEnd) > new Date(),
    isPulaLeeroy: user.characters.some(c => c.corporationId === PULALEEROY_CORP_ID)
  }))
})

export const POST = withErrorHandling(async (request: Request) => {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { userId, type } = body

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      characters: {
        select: {
          id: true,
          name: true,
          corporationId: true
        }
      }
    }
  })

  if (!user) {
    throw new AppError(ErrorCodes.API_NOT_FOUND, 'Usuário não encontrado', 404)
  }

  const isPulaLeeroyMember = user.characters.some(c => c.corporationId === PULALEEROY_CORP_ID)

  let newEnd: Date
  let codeType: string

  if (type === 'LIFETIME') {
    newEnd = LIFETIME_DATE
    codeType = 'LIFETIME'
  } else if (type === 'DAYS_30') {
    newEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    codeType = 'DAYS_30'
  } else if (type === 'PL8R') {
    if (!isPulaLeeroyMember) {
      throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Usuário não é membro da PulaLeeroy', 400)
    }
    newEnd = LIFETIME_DATE
    codeType = 'PL8R'
  } else {
    throw new AppError(ErrorCodes.VALIDATION_FAILED, 'Tipo inválido', 400)
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionEnd: newEnd,
      allowedActivities: ['ratting', 'mining', 'abyssal', 'exploration', 'escalations', 'crab', 'pvp']
    }
  })

  return {
    success: true,
    userId: user.id,
    userName: user.name,
    subscriptionEnd: newEnd,
    type: codeType,
    isPulaLeeroy: isPulaLeeroyMember
  }
})