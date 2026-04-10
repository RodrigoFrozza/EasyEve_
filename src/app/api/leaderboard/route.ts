import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getStartOfPeriod(period: string): Date {
  const now = new Date()
  const utcNow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds())
  
  switch (period) {
    case 'alltime':
      return new Date('2024-01-01T00:00:00Z')
    case 'daily':
      return new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0, 0))
    case 'weekly':
      const day = utcNow.getUTCDay()
      const diff = day === 0 ? -6 : 1 - day
      const weekStart = new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate() + diff, 0, 0, 0, 0))
      return weekStart
    case 'monthly':
      return new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), 1, 0, 0, 0, 0))
    default:
      return new Date(Date.UTC(utcNow.getUTCFullYear(), utcNow.getUTCMonth(), utcNow.getUTCDate(), 0, 0, 0, 0))
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily'
    const startDate = getStartOfPeriod(period)

    console.log(`[Leaderboard] period=${period}, startDate=${startDate.toISOString()}, now=${new Date().toISOString()}`)

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
