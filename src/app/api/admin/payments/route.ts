import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyJWT } from '@/lib/auth-jwt'

async function checkAdmin(request: NextRequest) {
  const token = request.cookies.get('session')?.value
  if (!token) return false
  const payload = await verifyJWT(token)
  if (!payload) return false
  
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { role: true }
  })
  
  return user?.role === 'master'
}

export async function GET(request: NextRequest) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const payments = await prisma.payment.findMany({
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
