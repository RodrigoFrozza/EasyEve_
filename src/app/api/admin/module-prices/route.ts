export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const prices = await prisma.modulePrice.findMany({
    orderBy: { module: 'asc' }
  })
  
  return NextResponse.json(prices)
}

export async function POST(request: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await request.json()
  const { module, price, isActive } = body

  if (!module) {
    return NextResponse.json({ error: 'Module name required' }, { status: 400 })
  }
  
  if (typeof price !== 'number' || price < 0) {
    return NextResponse.json({ error: 'Price must be a positive number' }, { status: 400 })
  }
  
  if (typeof isActive !== 'boolean') {
    return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
  }

  const newPrice = await prisma.modulePrice.upsert({
    where: { module },
    update: { price, isActive },
    create: { module, price, isActive }
  })

  return NextResponse.json(newPrice)
}
