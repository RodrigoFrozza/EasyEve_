import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCharacterWalletJournal } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }
    
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
    let totalTaxes = 0
    const participantEarnings: Record<number, number> = {}
    const logs: any[] = []

    // 2. Loop through participants and fetch their wallet journals
    for (const participant of participants) {
      const charId = participant.characterId
      const charName = participant.characterName
      
      try {
        const journal = await getCharacterWalletJournal(charId)
        
        if (Array.isArray(journal)) {
          let charBounty = 0
          let charEss = 0
          let charTaxes = 0

          journal.forEach((entry: any) => {
            const entryDate = new Date(entry.date)
            // Filter by date range and reference types
            if (entryDate >= startTime && entryDate <= endTime) {
              const amount = entry.amount || 0
              if (entry.ref_type === 'bounty_payout') {
                charBounty += amount
                logs.push({ date: entry.date, amount, type: 'bounty', charName })
              } else if (entry.ref_type === 'ess_payout') {
                charEss += amount
                logs.push({ date: entry.date, amount, type: 'ess', charName })
              } else if (entry.ref_type === 'corporation_tax_payout') {
                const taxAmount = Math.abs(amount)
                charTaxes += taxAmount
                logs.push({ date: entry.date, amount: taxAmount, type: 'tax', charName })
              }
            }
          })

          participantEarnings[charId] = charBounty + charEss
          totalBounties += charBounty
          totalEss += charEss
          totalTaxes += charTaxes
        }
      } catch (err) {
        console.error(`Failed to sync earnings for character ${charId}:`, err)
      }
    }

    // Sort logs by date descending
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 3. Update activity data with new totals
    const updatedData = {
      ...(activity.data as any || {}),
      automatedBounties: totalBounties,
      automatedEss: totalEss,
      automatedTaxes: totalTaxes,
      grossBounties: totalBounties + totalTaxes, // Reconstruct gross before tax
      participantEarnings,
      logs: logs.slice(0, 50), // Keep a reasonable amount of history
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
