export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RattingData {
  automatedBounties?: number
  automatedEss?: number
  automatedTaxes?: number
  grossBounties?: number
  currentIskPerHour?: number
  logs?: Array<{
    refId: string
    date: string
    amount: number
    type: string
    charName: string
    charId: number
  }>
  participantEarnings?: Record<number, number>
}

async function getStartOfPeriod(period: string): Promise<Date> {
  const now = new Date()
  const utcNow = new Date(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), now.getUTCHours(), now.getUTCMinutes(), now.getUTCSeconds())
  
  switch (period) {
    case 'alltime': {
      const earliestActivity = await prisma.activity.findFirst({
        orderBy: { startTime: 'asc' },
        select: { startTime: true }
      })
      return earliestActivity?.startTime || new Date('2024-01-01T00:00:00Z')
    }
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
    const startDate = await getStartOfPeriod(period)

    console.log(`[Leaderboard] period=${period}, startDate=${startDate.toISOString()}, now=${new Date().toISOString()}`)

    const activities = await prisma.activity.findMany({
      where: {
        type: 'ratting',
        startTime: { gte: startDate }
      },
      include: {
        user: {
          include: {
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
      const activityData = a.data as RattingData | null
      const actBounty = Number(activityData?.automatedBounties || 0)
      const actEss = Number(activityData?.automatedEss || 0)
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
