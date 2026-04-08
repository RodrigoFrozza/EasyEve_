import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-helpers'

export async function GET() {
  try {
    const { user, error } = await requireAuth()
    if (error) return error

    // Fetch all user related data
    const activities = await prisma.activity.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    const fits = await prisma.fit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    const exportData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        name: user.name,
      },
      data: {
        activities,
        fits
      }
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename=easyeve-data-${user.id}-${new Date().getTime()}.json`,
      },
    })
  } catch (error) {
    console.error('Data export error:', error)
    return NextResponse.json({ error: 'Failed to export data' }, { status: 500 })
  }
}
