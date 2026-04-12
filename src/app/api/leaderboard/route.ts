import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withErrorHandling } from '@/lib/api-handler'

export const dynamic = 'force-dynamic'

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

interface MiningData {
  miningValue?: number
  totalEstimatedValue?: number
  totalQuantity?: number
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

export const GET = withErrorHandling(async (request: Request) => {
  const { searchParams } = new URL(request.url)
  const period = searchParams.get('period') || 'daily'
  const type = searchParams.get('type') || 'ratting'
  const startDate = await getStartOfPeriod(period)

  console.log(`[Leaderboard] type=${type}, period=${period}, startDate=${startDate.toISOString()}`)

  const activities = await prisma.activity.findMany({
    where: {
      type: type,
      startTime: { gte: startDate },
      user: {
        subscriptionEnd: { gte: new Date() }
      }
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

  const grouped: Record<string, { 
    userId: string; 
    total: number; 
    label1?: number; // bounty or quantity
    label2?: number; // ess or volume
    characterName: string; 
    characterId: number 
  }> = {}

  for (const a of activities) {
    if (!a.user) continue
    const userId = a.user.id
    const mainChar = a.user.characters[0]
    
    if (!grouped[userId]) {
      grouped[userId] = {
        userId,
        total: 0,
        label1: 0,
        label2: 0,
        characterName: mainChar?.name || 'Unknown Capsuleer',
        characterId: mainChar?.id || 0
      }
    }

    if (type === 'ratting') {
      const activityData = a.data as RattingData | null
      const actBounty = Number(activityData?.automatedBounties || 0)
      const actEss = Number(activityData?.automatedEss || 0)
      grouped[userId].label1! += actBounty
      grouped[userId].label2! += actEss
      grouped[userId].total += actBounty + actEss
    } else if (type === 'mining') {
      const activityData = a.data as MiningData | null
      const actValue = Number(activityData?.miningValue || activityData?.totalEstimatedValue || 0)
      const actQuantity = Number(activityData?.totalQuantity || 0)
      grouped[userId].total += actValue
      grouped[userId].label1! += actQuantity // total volume mined
    }
  }

  const result = Object.values(grouped)
    .sort((a, b) => b.total - a.total)
    .slice(0, 20)

  return NextResponse.json(result)
})
