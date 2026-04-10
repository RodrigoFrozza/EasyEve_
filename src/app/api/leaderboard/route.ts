import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { startOfDay, startOfWeek, startOfMonth } from 'date-fns'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily'

    const now = new Date()
    let startDate: Date

    switch (period) {
      case 'alltime':
        startDate = new Date('2024-01-01')
        break
      case 'daily':
        startDate = startOfDay(now)
        break
      case 'weekly':
        startDate = startOfWeek(now, { weekStartsOn: 1 })
        break
      case 'monthly':
        startDate = startOfMonth(now)
        break
      default:
        startDate = startOfDay(now)
    }

    const activities = await prisma.activity.findMany({
      where: {
        type: 'ratting',
        startTime: { gte: startDate }
      },
      select: {
        id: true,
        data: true,
        user: {
          select: {
            id: true,
            characters: {
              where: { isMain: true },
              select: { id: true, name: true }
            }
          }
        }
      }
    })

    const grouped: Record<string, { userId: string; bounty: number; ess: number; total: number; characterName: string; characterId: number }> = {}

    for (const a of activities) {
      const userId = a.user.id
      const mainChar = a.user.characters[0]
      if (!grouped[userId]) {
        grouped[userId] = {
          userId,
          bounty: 0,
          ess: 0,
          total: 0,
          characterName: mainChar?.name || 'Unknown Capsuleer',
          characterId: mainChar?.id || 0
        }
      }
      const actBounty = Number((a.data as any)?.automatedBounties || 0)
      const actEss = Number((a.data as any)?.automatedEss || 0)
      grouped[userId].bounty += actBounty
      grouped[userId].ess += actEss
      grouped[userId].total += actBounty + actEss
    }

    const result = Object.values(grouped)
      .sort((a, b) => b.total - a.total)
      .slice(0, 20)

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching leaderboard:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
