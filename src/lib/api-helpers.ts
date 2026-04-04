import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function getCurrentSession() {
  return await getSession()
}

export async function requireAuth() {
  const session = await getSession()
  
  if (!session?.user?.ownerHash) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  
  const user = await prisma.user.findFirst({
    where: {
      characters: {
        some: {
          ownerHash: session.user.ownerHash
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
  
  if (!session?.user?.ownerHash) {
    return null
  }
  
  return await prisma.user.findFirst({
    where: {
      characters: {
        some: {
          ownerHash: session.user.ownerHash
        }
      }
    },
    include: {
      characters: true
    }
  })
}
