import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await request.json()
    if (!code) {
      return NextResponse.json({ error: 'Missing code' }, { status: 400 })
    }

    const activationCode = await prisma.activationCode.findUnique({
      where: { code: code.toUpperCase() },
    })

    if (!activationCode) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 404 })
    }

    if (activationCode.isUsed) {
      return NextResponse.json({ error: 'Código já utilizado' }, { status: 400 })
    }

    // Determine new subscription end date
    let newEnd: Date
    const currentEnd = user.subscriptionEnd ? new Date(user.subscriptionEnd) : new Date()
    const baseDate = currentEnd > new Date() ? currentEnd : new Date()

    if (activationCode.type === 'LIFETIME') {
      newEnd = new Date('2099-12-31T23:59:59Z')
    } else if (activationCode.type === 'DAYS_30') {
      newEnd = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)
    } else {
      return NextResponse.json({ error: 'Tipo de código desconhecido' }, { status: 400 })
    }

    // Atomic transaction: mark code as used and update user
    await prisma.$transaction([
      prisma.activationCode.update({
        where: { id: activationCode.id },
        data: {
          isUsed: true,
          usedAt: new Date(),
          usedById: user.id
        }
      }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          subscriptionEnd: newEnd
        }
      })
    ])

    return NextResponse.json({
      success: true,
      subscriptionEnd: newEnd,
      type: activationCode.type
    })
  } catch (error) {
    console.error('Subscription activate POST error:', error)
    return NextResponse.json({ error: 'Erro ao ativar código' }, { status: 500 })
  }
}
