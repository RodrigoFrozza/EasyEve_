import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin-auth'
import { crypto } from 'crypto'

export const dynamic = 'force-dynamic'

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // No confusing chars like I, 1, 0, O
  let result = ''
  const randomValues = new Uint32Array(length)
  global.crypto.getRandomValues(randomValues)
  for (let i = 0; i < length; i++) {
    result += chars[randomValues[i] % chars.length]
  }
  return result
}

export async function GET() {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const codes = await prisma.activationCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        usedBy: {
          select: {
            name: true,
            accountCode: true,
          }
        }
      }
    })

    return NextResponse.json(codes)
  } catch (error) {
    console.error('Admin codes GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch codes' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { error } = await requireAdmin()
    if (error) return error

    const body = await request.json()
    const { type, count = 1 } = body // type: "DAYS_30" or "LIFETIME"

  if (!['DAYS_30', 'LIFETIME', 'PL8R'].includes(type)) {
    return NextResponse.json({ error: 'Invalid code type' }, { status: 400 })
  }

    const codes = []
    for (let i = 0; i < count; i++) {
      const code = generateRandomCode()
      codes.push({
        code,
        type,
      })
    }

    const created = await Promise.all(
      codes.map(c => prisma.activationCode.create({ data: c }))
    )

    return NextResponse.json(created)
  } catch (error) {
    console.error('Admin codes POST error:', error)
    return NextResponse.json({ error: 'Failed to generate codes' }, { status: 500 })
  }
}
