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
  const body = await request.json()
  const { allowedActivities = [], months = 1 } = body

  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch payment with a lock (simulated by finding it inside tx)
      const payment = await tx.payment.findUnique({
        where: { id },
        include: { user: true }
      })

      if (!payment) throw new Error('Payment not found')
      if (payment.status === 'approved') throw new Error('Payment already approved')

      // 2. Calculate new subscription end
      const currentEnd = payment.user.subscriptionEnd && new Date(payment.user.subscriptionEnd) > new Date()
        ? new Date(payment.user.subscriptionEnd)
        : new Date()
      
      const newEnd = new Date(currentEnd)
      newEnd.setDate(newEnd.getDate() + (30 * months))

      // 3. Update User
      const updatedUser = await tx.user.update({
        where: { id: payment.userId },
        data: {
          subscriptionEnd: newEnd,
          allowedActivities: Array.from(new Set([...payment.user.allowedActivities, ...allowedActivities])),
          isBlocked: false,
          blockReason: null
        }
      })

      // 4. Update Payment
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          modules: allowedActivities,
          monthsPaid: months
        }
      })

      return { user: updatedUser, payment: updatedPayment }
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to approve payment' }, { status: 400 })
  }
}
