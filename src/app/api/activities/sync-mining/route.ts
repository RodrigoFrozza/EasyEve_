import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMarketPrices } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'

interface MiningLedgerEntry {
  date: string
  quantity: number
  type_id: number
  corporation_id: number
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')
    
    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }
    
    const activity = await prisma.activity.findUnique({
      where: { id: activityId }
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    if (activity.type !== 'mining') {
      return NextResponse.json({ error: 'Sync only supported for mining activities' }, { status: 400 })
    }

    const participants = activity.participants as any[]
    if (!participants || participants.length === 0) {
      return NextResponse.json({ error: 'No participants to sync' }, { status: 400 })
    }

    console.log(`[SYNC-MINING] --- START for Activity ID: ${activityId} ---`)
    console.log(`[SYNC-MINING] Participants: ${participants.map(p => p.characterName).join(', ')}`)

    const activityData = (activity.data as any) || {}
    const existingLogs = activityData.logs || []
    const logMap = new Map<string, any>()

    console.log(`[SYNC-MINING] Existing logs: ${existingLogs.length}`)

    existingLogs.forEach((log: any) => {
      const key = `${log.characterId}-${log.typeId}-${new Date(log.date).getTime()}`
      logMap.set(key, log)
    })

    let totalFetched = 0
    let totalNew = 0

    for (const participant of participants) {
      const charId = participant.characterId
      const charName = participant.characterName || `Unknown (${charId})`
      
      console.log(`[SYNC-MINING] Processing character: ${charName} (${charId})`)
      
      try {
        const { accessToken } = await getValidAccessToken(charId)
        
        if (!accessToken) {
          console.log(`[SYNC-MINING] ${charName}: No valid access token for character ${charId}`)
          continue
        }

        console.log(`[SYNC-MINING] ${charName}: Token found, fetching from ESI...`)

        const response = await fetch(
          `https://esi.evetech.net/latest/characters/${charId}/mining/`,
          { 
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              'X-User-Agent': 'EasyEve/1.0'
            } 
          }
        )

        console.log(`[SYNC-MINING] ${charName}: ESI Response status: ${response.status}`)

        if (!response.ok) {
          const errorText = await response.text()
          console.log(`[SYNC-MINING] ${charName}: Failed to fetch from ESI (${response.status}): ${errorText}`)
          continue
        }

        const entries: MiningLedgerEntry[] = await response.json()
        
        console.log(`[SYNC-MINING] ${charName}: Fetched ${entries.length} entries from ESI`)
        totalFetched += entries.length

        if (entries.length === 0) {
          console.log(`[SYNC-MINING] ${charName}: No mining records returned (character may not have mined recently)`)
        }

        entries.forEach((entry: MiningLedgerEntry) => {
          console.log(`[SYNC-MINING] ${charName}: Entry - ${entry.date}, qty: ${entry.quantity}, type: ${entry.type_id}`)
          
          const compositeKey = `${charId}-${entry.type_id}-${entry.date}`
          
          if (!logMap.has(compositeKey)) {
            console.log(`[SYNC-MINING]   [NEW] ${entry.quantity}m3 of type ${entry.type_id} for ${charName}`)
            logMap.set(compositeKey, {
              date: entry.date,
              quantity: entry.quantity,
              typeId: entry.type_id,
              characterId: charId,
              characterName: charName
            })
            totalNew++
          } else {
            const existing = logMap.get(compositeKey)
            existing.quantity += entry.quantity
            logMap.set(compositeKey, existing)
          }
        })
      } catch (err) {
        console.error(`[SYNC-MINING] ERROR: Failed to sync for character ${charName} (${charId}):`, err)
      }
    }

    console.log(`[SYNC-MINING] Total fetched from ESI: ${totalFetched}, New records added: ${totalNew}`)

    const allLogs = Array.from(logMap.values())
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    const oreBreakdown: Record<number, { quantity: number; estimatedValue: number }> = {}

    allLogs.forEach((log: any) => {
      if (!oreBreakdown[log.typeId]) {
        oreBreakdown[log.typeId] = { quantity: 0, estimatedValue: 0 }
      }
      oreBreakdown[log.typeId].quantity += log.quantity
    })

    const priceMap = await getMarketPrices()

    Object.keys(oreBreakdown).forEach(typeId => {
      const typeIdNum = parseInt(typeId)
      const price = priceMap[typeIdNum] || 0
      oreBreakdown[typeIdNum].estimatedValue = oreBreakdown[typeIdNum].quantity * price
    })

    const totalQuantity = Object.values(oreBreakdown).reduce((sum, o) => sum + o.quantity, 0)
    const totalEstimatedValue = Object.values(oreBreakdown).reduce((sum, o) => sum + o.estimatedValue, 0)

    const participantBreakdown: Record<number, { quantity: number; estimatedValue: number }> = {}

    allLogs.forEach((log: any) => {
      if (!participantBreakdown[log.characterId]) {
        participantBreakdown[log.characterId] = { quantity: 0, estimatedValue: 0 }
      }
      const price = priceMap[log.typeId] || 0
      participantBreakdown[log.characterId].quantity += log.quantity
      participantBreakdown[log.characterId].estimatedValue += log.quantity * price
    })

    const participantEarnings: Record<number, number> = {}
    Object.keys(participantBreakdown).forEach(charId => {
      participantEarnings[parseInt(charId)] = participantBreakdown[parseInt(charId)].estimatedValue
    })

    const updatedData = {
      ...activityData,
      oreBreakdown,
      totalQuantity,
      totalEstimatedValue,
      participantBreakdown,
      participantEarnings,
      logs: allLogs,
      lastSyncAt: new Date().toISOString()
    }

    console.log(`[SYNC-MINING] --- END SYNC Summary: Total: ${totalQuantity}m3 | Value: ${totalEstimatedValue} ISK | Logs: ${allLogs.length} | Fetched: ${totalFetched} | New: ${totalNew} ---`)

    const updatedActivity = await prisma.activity.update({
      where: { id: activityId },
      data: { data: updatedData }
    })

    return NextResponse.json(updatedActivity)
  } catch (error: any) {
    console.error('Error syncing mining activity:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}