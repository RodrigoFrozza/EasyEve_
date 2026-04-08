import { cookies } from 'next/headers'
import { verifyJWT, type JWTPayload } from './auth-jwt'
import { prisma } from './prisma'

export interface SessionUser {
  id: string
  accountCode: string
  characterId: number
  ownerHash: string
  role: string
  allowedActivities: string[]
  isBlocked: boolean
  blockReason: string | null
  subscriptionEnd: Date | null
  characters: Array<{
    id: number
    name: string
    isMain: boolean
  }>
}

export interface Session {
  user: SessionUser
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value

  if (!token) return null

  const payload = await verifyJWT(token)
  if (!payload) return null

  const character = await prisma.character.findUnique({
    where: { id: payload.characterId }, // Use characterId for more precise lookup
    include: {
      user: {
        include: {
          characters: {
            select: { id: true, name: true, isMain: true },
          },
        },
      },
    },
  })

  if (!character) return null

  const user = character.user

  // Check if user is blocked
  if (user.isBlocked) {
    console.log(`[Session] User ${user.id} is blocked: ${user.blockReason}`)
    return null
  }

  // Check and handle subscription expiration in real-time
  if (user.subscriptionEnd && new Date() > user.subscriptionEnd) {
    // If expired and not already reset
    if (user.allowedActivities.length > 0) {
      console.log(`[Session] User ${user.id} subscription expired. Removing all access.`)
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          allowedActivities: [],
          isBlocked: true,
          blockReason: 'Assinatura expirada. Por favor, regularize seu pagamento.'
        }
      })
      return null // Consider blocked
    }
  }

  return {
    user: {
      id: user.id,
      accountCode: user.accountCode || '',
      characterId: character.id,
      ownerHash: character.ownerHash,
      role: user.role || 'user',
      allowedActivities: user.allowedActivities,
      isBlocked: user.isBlocked,
      blockReason: user.blockReason,
      subscriptionEnd: user.subscriptionEnd,
      characters: user.characters,
    },
  }
}

export async function getSessionFromToken(token: string): Promise<JWTPayload | null> {
  return verifyJWT(token)
}
