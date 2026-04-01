import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function getSession() {
  return await getServerSession(authOptions)
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user?.characterOwnerHash) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  
  const user = await prisma.user.findFirst({
    where: {
      characters: {
        some: {
          ownerHash: session.user.characterOwnerHash
        }
      }
    },
    include: {
      characters: true
    }
  })
  
  if (!user) {
    return { error: NextResponse.json({ error: 'User not found' }, { status: 404 }) }
  }
  
  return { session, user }
}

export async function getCurrentUser() {
  const session = await getSession()
  
  if (!session?.user?.characterOwnerHash) {
    return null
  }
  
  return await prisma.user.findFirst({
    where: {
      characters: {
        some: {
          ownerHash: session.user.characterOwnerHash
        }
      }
    },
    include: {
      characters: true
    }
  })
}
