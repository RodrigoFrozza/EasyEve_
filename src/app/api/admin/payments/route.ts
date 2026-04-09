import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const { searchParams } = new URL(req.url)
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '50')
  const skip = (page - 1) * limit

  const where = search ? {
    OR: [
      { payerCharacterName: { contains: search, mode: 'insensitive' } },
      { user: { accountCode: { contains: search, mode: 'insensitive' } } },
      { user: { name: { contains: search, mode: 'insensitive' } } }
    ]
  } : {}

  const [items, total] = await Promise.all([
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
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
    }),
    prisma.payment.count({ where })
  ])

  return NextResponse.json({
    items,
    pagination: {
      total,
      page,
      limit,
      hasMore: total > skip + items.length
    }
  })
}
