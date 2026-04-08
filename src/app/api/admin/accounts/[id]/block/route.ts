import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

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
