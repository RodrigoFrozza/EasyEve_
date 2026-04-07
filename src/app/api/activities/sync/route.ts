import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCharacterWalletJournal } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const activityId = params.id
    
    // 1. Fetch activity and its participants
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (activity.type !== 'ratting') {
      return NextResponse.json({ error: 'Sync only supported for ratting activities' }, { status: 400 })
    }

    const participants = activity.participants as any[]
    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: 'No participants to sync' }, { status: 400 })
    }

    const startTime = new Date(activity.startTime)
    const endTime = activity.endTime ? new Date(activity.endTime) : new Date()

    let totalBounties = 0
    let totalEss = 0
    const participantEarnings: Record<number, number> = {}

    // 2. Loop through participants and fetch their wallet journals
    for (const participant of participants) {
      const charId = participant.characterId
      
      try {
        const journal = await getCharacterWalletJournal(charId)
        
        if (Array.isArray(journal)) {
          let charBounty = 0
          let charEss = 0

          journal.forEach((entry: any) => {
            const entryDate = new Date(entry.date)
            // Filter by date range and reference types
            if (entryDate >= startTime && entryDate <= endTime) {
              if (entry.ref_type === 'bounty_payout') {
                charBounty += entry.amount || 0
              } else if (entry.ref_type === 'ess_payout') {
                charEss += entry.amount || 0
              }
            }
          })

          participantEarnings[charId] = charBounty + charEss
          totalBounties += charBounty
          totalEss += charEss
        }
      } catch (err) {
        console.error(`Failed to sync earnings for character ${charId}:`, err)
      }
    }

    // 3. Update activity data with new totals
    const updatedData = {
      ...(activity.data as any || {}),
      automatedBounties: totalBounties,
      automatedEss: totalEss,
      participantEarnings,
      lastSyncAt: new Date().toISOString()
    }

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: { data: updatedData }
    })

    return NextResponse.json(updatedActivity)
  } catch (error: any) {
    console.error('Error syncing activity earnings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
