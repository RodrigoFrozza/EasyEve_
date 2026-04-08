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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!await checkAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = params

  try {
    const payment = await prisma.payment.update({
      where: { id },
      data: { status: 'rejected' }
    })

    return NextResponse.json(payment)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to reject payment' }, { status: 500 })
  }
}
