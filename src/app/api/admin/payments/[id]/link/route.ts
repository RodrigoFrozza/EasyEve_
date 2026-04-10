export const dynamic = 'force-dynamic'

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
  const { userId } = await request.json()

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
  }

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: { userId }
    })
    return NextResponse.json(payment)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to link payment' }, { status: 500 })
  }
}
