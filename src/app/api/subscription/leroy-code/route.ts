import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/api-helpers'
import { withErrorHandling } from '@/lib/api-handler'
import { AppError } from '@/lib/app-error'
import { ErrorCodes } from '@/lib/error-codes'

export const dynamic = 'force-dynamic'

const PULALEEROY_CORP_ID = 98651213

function generateUniqueCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = 'PL8R-'
  const randomValues = new Uint32Array(4)
  global.crypto.getRandomValues(randomValues)
  for (let i = 0; i < 4; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export const POST = withErrorHandling(async () => {
  const user = await getCurrentUser()
  
  if (!user) {
    throw new AppError(ErrorCodes.API_UNAUTHORIZED, 'Não autorizado', 401)
  }

  // Check if user has any character from PulaLeeroy corporation
  const userCharacters = await prisma.character.findMany({
    where: { userId: user.id }
  })

  const isPulaLeeroyMember = userCharacters.some(char => char.corporationId === PULALEEROY_CORP_ID)

  if (!isPulaLeeroyMember) {
    throw new AppError(ErrorCodes.API_FORBIDDEN, 'Código exclusiva para membros da PulaLeeroy', 403)
  }

  // Check if user already has a PulaLeeroy code that hasn't been used
  const existingCode = await prisma.activationCode.findFirst({
    where: {
      code: { startsWith: 'PL8R-' },
      usedById: user.id,
      isUsed: false
    }
  })

  if (existingCode) {
    return {
      code: existingCode.code
    }
  }

  // Generate new unique code
  let newCode: string
  let attempts = 0
  const maxAttempts = 10

  do {
    newCode = generateUniqueCode()
    const existing = await prisma.activationCode.findUnique({
      where: { code: newCode }
    })
    if (!existing) break
    attempts++
  } while (attempts < maxAttempts)

  // Create the code in database
  const createdCode = await prisma.activationCode.create({
    data: {
      code: newCode,
      type: 'PL8R',
      usedById: user.id
    }
  })

  return {
    code: createdCode.code
  }
})