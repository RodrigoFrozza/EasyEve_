import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = params

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'rejected' }
    })

    return NextResponse.json(payment)
  } catch (err) {
    return NextResponse.json({ error: 'Failed to reject payment' }, { status: 500 })
  }
}
