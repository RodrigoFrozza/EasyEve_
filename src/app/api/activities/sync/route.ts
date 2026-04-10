import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCharacterWalletJournal } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'
import { ESI_REF_TYPES } from '@/lib/constants/activity-data'

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
    
    // 1. Fetch activity and its participants (latest state)
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

    // WINDOW LOGIC: 
    // - Start: 1h before activity start (captures pre-run ticks or ESI delay)
    // - End: Now or 4h after endTime (captures delayed ESS payouts)
    const startTimeManual = new Date(activity.startTime)
    const startTime = new Date(startTimeManual.getTime() - (60 * 60 * 1000))
    // ESS payouts can be delayed by up to 3 hours. We look 4h ahead of endTime if set.
    const endTimeLimit = activity.endTime ? new Date(new Date(activity.endTime).getTime() + 4 * 60 * 60 * 1000) : new Date()

    console.log(`[SYNC] --- START INCREMENTAL SYNC for Activity ID: ${activityId} ---`)
    console.log(`[SYNC] Window (UTC): ${startTime.toISOString()} to ${endTimeLimit.toISOString()}`)

    // 2. Load existing history to prevent duplicates
    const activityData = (activity.data as any) || {}
    const existingLogs = activityData.logs || []
    const logMap = new Map<string, any>()
    
    // Index existing logs by composite key to prevent duplicates
    // KEY INCLUDES: charId + refId + type + timestamp (more robust)
    existingLogs.forEach((log: any) => {
      const key = `${log.charId}-${log.refId}-${log.type}-${new Date(log.date).getTime()}`
      logMap.set(key, log)
    })

    // 2. Loop through participants and fetch their wallet journals
    for (const participant of participants) {
      const charId = participant.characterId
      const charName = participant.characterName || `Citizen ${charId}`
      
      try {
        const journal = await getCharacterWalletJournal(charId, endTimeLimit)
        
        if (Array.isArray(journal)) {
          console.log(`[SYNC] ${charName}: Fetched ${journal.length} entries from ESI.`)

          journal.forEach((entry: any) => {
            const entryDate = new Date(entry.date)
            const refType = (entry.ref_type || '').toLowerCase()
            const refId = entry.id?.toString()
            
            // Filter by date range (from startTime-1h to endTimeLimit)
            if (entryDate >= startTime && entryDate <= endTimeLimit) {
              const amount = Math.abs(entry.amount || 0)
              let type: 'bounty' | 'ess' | 'tax' | null = null

              if (ESI_REF_TYPES.BOUNTY.some(t => refType === t || refType.includes(t))) {
                type = 'bounty'
              } else if (ESI_REF_TYPES.ESS.some(t => refType === t || refType.includes(t))) {
                type = 'ess'
              } else if (ESI_REF_TYPES.TAX.some(t => refType === t || refType.includes(t))) {
                type = 'tax'
              }

              if (type && refId) {
                // Use composite key with timestamp to prevent duplicates
                const entryTimestamp = new Date(entry.date).getTime()
                const compositeKey = `${charId}-${refId}-${type}-${entryTimestamp}`
                
                // Check if we already have this transaction for this specific character
                if (!logMap.has(compositeKey)) {
                   console.log(`[SYNC]   [NEW] ${type.toUpperCase()}: ${amount.toLocaleString()} ISK for ${charName}`)
                   logMap.set(compositeKey, { 
                     refId, 
                     date: entry.date, 
                     amount, 
                     type, 
                     charName, 
                     charId 
                   })
                }
              }
            }
          })
        }
      } catch (err) {
        console.error(`[SYNC] ERROR: Failed to sync earnings for character ${charName} (${charId}):`, err)
      }
    }

    // 3. Recalculate everything from the aggregated unique logs
    const allLogs = Array.from(logMap.values())
    
    let totalBounties = 0
    let totalEss = 0
    let totalTaxes = 0
    const participantEarnings: Record<number, number> = {}

    allLogs.forEach(log => {
      if (log.type === 'bounty') totalBounties += log.amount
      else if (log.type === 'ess') totalEss += log.amount
      else if (log.type === 'tax') totalTaxes += log.amount

      if (!participantEarnings[log.charId]) participantEarnings[log.charId] = 0
      participantEarnings[log.charId] += log.amount
    })

    // Sort logs by date descending
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // 4. Update activity data
    const additionalBounties = activityData.additionalBounties || 0
    
    // Calculate Combat Performance Trend
    const startTimeMs = new Date(activity.startTime).getTime()
    const hoursElapsed = (Date.now() - startTimeMs) / 3600000
    
    // Logic matches frontend calculateNetProfit
    const currentTotalIsk = (totalBounties + additionalBounties + totalEss + (activityData.estimatedLootValue || 0) + (activityData.estimatedSalvageValue || 0)) - totalTaxes
    const currentIskPerHour = currentTotalIsk / Math.max(0.1, hoursElapsed)
    
    const previousIskPerHour = activityData.currentIskPerHour || 0
    let iskTrend = 'stable'
    
    if (previousIskPerHour > 0) {
      const diff = currentIskPerHour - previousIskPerHour
      const threshold = previousIskPerHour * 0.05 // 5% threshold for combat (volatile ticks)
      if (diff > threshold) iskTrend = 'up'
      else if (diff < -threshold) iskTrend = 'down'
    }

    const updatedData = {
      ...activityData,
      automatedBounties: totalBounties,
      automatedEss: totalEss,
      automatedTaxes: totalTaxes,
      grossBounties: totalBounties + totalEss + additionalBounties,
      participantEarnings,
      logs: allLogs,
      currentIskPerHour,
      iskTrend,
      lastSyncAt: new Date().toISOString()
    }

    console.log(`[SYNC] --- END SYNC Summary: Bounty: ${totalBounties} | ESS: ${totalEss} | Tax: ${totalTaxes} | Total Logs: ${allLogs.length} ---`)

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
