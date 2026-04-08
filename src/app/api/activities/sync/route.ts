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

    // BROADEN THE WINDOW: Check from 10m before startTime to handle ESI/Server clock diffs
    const startTimeManual = new Date(activity.startTime)
    const startTime = new Date(startTimeManual.getTime() - (10 * 60 * 1000))
    const endTime = activity.endTime ? new Date(activity.endTime) : new Date()

    console.log(`[SYNC] --- START SYNC for Activity ID: ${activityId} ---`)
    console.log(`[SYNC] Window (UTC): ${startTime.toISOString()} to ${endTime.toISOString()}`)

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
          console.log(`[SYNC] ${charName}: Fetched ${journal.length} entries from ESI.`)
          let charBounty = 0
          let charEss = 0
          let charTaxes = 0

          journal.forEach((entry: any) => {
            const entryDate = new Date(entry.date)
            // Filter by date range and reference types
            if (entryDate >= startTime && entryDate <= endTime) {
              const amount = Math.abs(entry.amount || 0)
              
              // EVE Journal Reference Types (mapping to app logic)
              if (entry.ref_type === 'bounty_payout' || entry.ref_type === 'bounty_prizes') {
                console.log(`[SYNC]   [MATCH] Bounty: ${amount} ISK for ${charName} at ${entry.date}`)
                charBounty += amount
                logs.push({ date: entry.date, amount, type: 'bounty', charName, charId })
              } else if (entry.ref_type === 'ess_payout' || entry.ref_type === 'ess_escrow_transfer') {
                console.log(`[SYNC]   [MATCH] ESS: ${amount} ISK for ${charName} at ${entry.date}`)
                charEss += amount
                logs.push({ date: entry.date, amount, type: 'ess', charName, charId })
              } else if (entry.ref_type === 'corporation_tax_payout' || entry.ref_type === 'corporation_tax_payouts') {
                console.log(`[SYNC]   [MATCH] Tax: ${amount} ISK for ${charName} at ${entry.date}`)
                charTaxes += amount
                logs.push({ date: entry.date, amount, type: 'tax', charName, charId })
              }
            }
          })

          participantEarnings[charId] = charBounty + charEss
          totalBounties += charBounty
          totalEss += charEss
          totalTaxes += charTaxes
        }
      } catch (err) {
        console.error(`[SYNC] ERROR: Failed to sync earnings for character ${charName} (${charId}):`, err)
      }
    }

    console.log(`[SYNC] --- END SYNC Summary: Bounty: ${totalBounties} | ESS: ${totalEss} | Tax: ${totalTaxes} | Count: ${logs.length} ---`)

    // Sort logs by date descending
    logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 3. Update activity data with new totals, ensuring we fetch LATEST DB state to merge
    const currentActivity = await prisma.activity.findUnique({ where: { id: activityId } })
    const updatedData = {
      ...(currentActivity?.data as any || {}),
      automatedBounties: totalBounties,
      automatedEss: totalEss,
      automatedTaxes: totalTaxes,
      grossBounties: totalBounties + totalTaxes,
      participantEarnings,
      logs: logs.slice(0, 50),
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
