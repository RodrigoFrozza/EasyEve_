import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')

  const payments = await prisma.payment.findMany({
    where: search ? {
      OR: [
        { payerCharacterName: { contains: search, mode: 'insensitive' } },
        { user: { accountCode: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } }
      ]
    } : {},
    orderBy: [
      { status: 'asc' }, // pending before approved
      { createdAt: 'desc' }
    ],
    include: {
      user: {
        select: {
          name: true,
          accountCode: true
        }
      }
    }
  })

  return NextResponse.json(payments)
}
