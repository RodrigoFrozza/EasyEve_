import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth-jwt'

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return false
  const payload = await verifyJWT(token)
  if (!payload) return false
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true }
  })
  
  return user?.role === 'master'
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params
  const body = await request.json()
  const { isBlocked, blockReason } = body

  const updatedUser = await prisma.user.update({
    where: { id },
    data: {
      isBlocked,
      blockedAt: isBlocked ? new Date() : null,
      blockReason: isBlocked ? blockReason : null
    }
  })

  return NextResponse.json(updatedUser)
}
