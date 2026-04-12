import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { withErrorHandling } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

export const GET = withErrorHandling(async () => {
  await requireAdmin()
  
  const now = new Date()
  
  const [
    totalAccounts,
    activeSubscriptions,
    pendingPayments,
    totalCharacters
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        subscriptionEnd: { gt: now }
      }
    }),
    prisma.payment.aggregate({
      where: { status: 'pending' },
      _sum: { amount: true }
    }),
    prisma.character.count()
  ])
  
  return NextResponse.json({
    totalAccounts,
    activeSubscriptions,
    pendingIsk: pendingPayments._sum.amount || 0,
    totalCharacters
  })
})
