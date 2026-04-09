import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { error } = await requireAdmin()
    if (error) return error
    
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
  } catch (error) {
    console.error('Admin stats GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}
