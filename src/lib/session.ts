import { cookies } from 'next/headers'
import { verifyJWT, type JWTPayload } from './auth-jwt'
import { prisma } from './prisma'

export interface SessionUser {
  id: string
  accountCode: string
  characterId: number
  ownerHash: string
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
    where: { ownerHash: payload.ownerHash },
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

  return {
    user: {
      id: character.user.id,
      accountCode: character.user.accountCode || '',
      characterId: character.id,
      ownerHash: character.ownerHash,
      characters: character.user.characters,
    },
  }
}

export async function getSessionFromToken(token: string): Promise<JWTPayload | null> {
  return verifyJWT(token)
}
