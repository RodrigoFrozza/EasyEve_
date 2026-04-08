import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

export async function POST() {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    // Transaction to ensure atomic deletion
    await prisma.$transaction([
      prisma.activity.deleteMany({ where: { userId: user.id } }),
      prisma.fit.deleteMany({ where: { userId: user.id } }),
    ])

    return NextResponse.json({ success: true, message: 'All data has been deleted' })
  } catch (error) {
    console.error('Data deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete data' }, { status: 500 })
  }
}
