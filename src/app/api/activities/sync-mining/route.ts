import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMarketPrices } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'

interface MiningLedgerEntry {
  date: string
  quantity: number
  type_id: number
  corporation_id: number
  solar_system_id: number
}

function isValidMiningEntry(entry: any): entry is MiningLedgerEntry {
  return (
    entry &&
    typeof entry.date === 'string' &&
    typeof entry.quantity === 'number' &&
    entry.quantity > 0 &&
    typeof entry.type_id === 'number' &&
    typeof entry.corporation_id === 'number'
  )
}

const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000 // 1 second

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      
      // Don't retry on success or client errors
      if (response.ok || response.status >= 400 && response.status < 500) {
        return response
      }
      
      // Server error - retry
      console.log(`[SYNC-MINING] Retry ${i + 1}/${retries} for ${url} (status ${response.status})`)
    } catch (error) {
      lastError = error as Error
    }
    
    // Wait before retry (exponential backoff)
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)))
    }
  }
  
  throw lastError || new Error('Fetch failed after retries')
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')
    
    // Generate sync ID for log correlation
    const syncId = `sync-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    
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

    const startTimeManual = new Date(activity.startTime)
    const startTime = new Date(startTimeManual.getTime() - (60 * 60 * 1000))
    const endTimeLimit = activity.endTime 
      ? new Date(new Date(activity.endTime).getTime() + 4 * 60 * 60 * 1000) 
      : new Date(startTimeManual.getTime() + 4 * 60 * 60 * 1000)

    console.log(JSON.stringify({
      event: 'sync_mining_start',
      syncId,
      activityId,
      activityStartTime: activity.startTime,
      filterPeriod: { start: startTime.toISOString(), end: endTimeLimit.toISOString() },
      participantCount: participants.length,
      participantNames: participants.map(p => p.characterName)
    }))
    
    const activityData = (activity.data as any) || {}
    const existingLogs = activityData.logs || []
    
    console.log(JSON.stringify({
      event: 'existing_logs_loaded',
      syncId,
      totalLogs: existingLogs.length
    }))
    
    // Start fresh - only process NEW data from ESI for this activity period
    // Don't load old logs to avoid including data from previous activities
    const logMap = new Map<string, any>()
    
    // Also filter existing logs by current activity date to prevent stale data
    const activityDateOnly = startTimeManual.toISOString().split('T')[0]
    const existingFiltered = existingLogs.filter((log: any) => {
      const logDateOnly = log.date?.split('T')[0] || new Date(log.date).toISOString().split('T')[0]
      return logDateOnly >= activityDateOnly
    })
    
    console.log(`[SYNC-MINING] Existing logs in period: ${existingFiltered.length}`)
    
    // Add filtered existing logs to map
    existingFiltered.forEach((log: any) => {
      // Use consistent key: charId + typeId + solarSystemId
      const key = `${log.characterId}-${log.typeId}-${log.solarSystemId || 0}`
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

        let allEntries: MiningLedgerEntry[] = []
        let page = 1
        let totalPages = 1

        do {
          const response = await fetchWithRetry(
            `${ESI_BASE_URL}/characters/${charId}/mining/?page=${page}`,
            { 
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                'X-User-Agent': 'EasyEve/1.0'
              } 
            }
          )

          console.log(`[SYNC-MINING] ${charName}: ESI Response status: ${response.status}, page: ${page}`)

          if (!response.ok) {
            const errorText = await response.text()
            console.log(`[SYNC-MINING] ${charName}: Failed to fetch from ESI (${response.status}): ${errorText}`)
            break
          }

          // Get total pages from header
          const pagesHeader = response.headers.get('x-pages')
          if (pagesHeader) {
            totalPages = parseInt(pagesHeader, 10)
          }

          const entries: MiningLedgerEntry[] = await response.json()
          allEntries = allEntries.concat(entries)
          
          console.log(`[SYNC-MINING] ${charName}: Fetched page ${page}/${totalPages}, ${entries.length} entries`)
          page++

        } while (page <= totalPages)
        
        console.log(`[SYNC-MINING] ${charName}: Fetched ${allEntries.length} total entries from ${totalPages} pages`)
        totalFetched += allEntries.length

        if (allEntries.length === 0) {
          console.log(`[SYNC-MINING] ${charName}: No mining records returned (character may not have mined recently)`)
        }

        allEntries.forEach((entry: any) => {
          // Validate entry structure
          if (!isValidMiningEntry(entry)) {
            console.log(JSON.stringify({
              event: 'invalid_entry_skipped',
              syncId,
              charName,
              entry,
              reason: 'Invalid entry structure'
            }))
            return
          }
          
          const entryDateOnly = entry.date // ESI returns "YYYY-MM-DD"
          const activityDateOnly = startTimeManual.toISOString().split('T')[0]
          
          // Include all entries from the activity date onwards
          if (entryDateOnly >= activityDateOnly) {
            console.log(`[SYNC-MINING] ${charName}: Entry - ${entry.date}, qty: ${entry.quantity}, type: ${entry.type_id}, system: ${entry.solar_system_id}`)
            
            // Key: charId + typeId + solarSystemId to separate entries from different systems
            const compositeKey = `${charId}-${entry.type_id}-${entry.solar_system_id}`
            
            if (!logMap.has(compositeKey)) {
              console.log(`[SYNC-MINING]   [NEW] ${entry.quantity}m3 of type ${entry.type_id} for ${charName}`)
              logMap.set(compositeKey, {
                date: entry.date,
                quantity: entry.quantity,
                typeId: entry.type_id,
                characterId: charId,
                characterName: charName,
                solarSystemId: entry.solar_system_id
              })
              totalNew++
            } else {
              const existing = logMap.get(compositeKey)
              // Mining ledger returns ACCUMULATED daily quantity per type/system
              // Use Math.max to get the latest value (most recent entry for that day)
              existing.quantity = Math.max(existing.quantity, entry.quantity)
              // Update to most recent date
              if (entry.date > existing.date) {
                existing.date = entry.date
              }
              logMap.set(compositeKey, existing)
            }
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

    // Get base prices for ores without market price
    const typeIdsWithoutPrice = Object.keys(oreBreakdown).filter(id => !priceMap[Number(id)])
    const basePrices: Record<number, number> = {}
    
    if (typeIdsWithoutPrice.length > 0) {
      const types = await prisma.eveType.findMany({
        where: { id: { in: typeIdsWithoutPrice.map(Number) } },
        select: { id: true, basePrice: true }
      })
      types.forEach(t => {
        if (t.basePrice) basePrices[t.id] = t.basePrice
      })
    }

    Object.keys(oreBreakdown).forEach(typeId => {
      const typeIdNum = parseInt(typeId)
      // Use market price, fallback to base_price, then 0
      const price = priceMap[typeIdNum] || basePrices[typeIdNum] || 0
      oreBreakdown[typeIdNum].estimatedValue = oreBreakdown[typeIdNum].quantity * price
    })

    const totalQuantity = Object.values(oreBreakdown).reduce((sum, o) => sum + o.quantity, 0)
    const totalEstimatedValue = Object.values(oreBreakdown).reduce((sum, o) => sum + o.estimatedValue, 0)

    const participantBreakdown: Record<number, { quantity: number; estimatedValue: number }> = {}

    allLogs.forEach((log: any) => {
      if (!participantBreakdown[log.characterId]) {
        participantBreakdown[log.characterId] = { quantity: 0, estimatedValue: 0 }
      }
      const typeIdNum = Number(log.typeId)
      const price = priceMap[typeIdNum] || basePrices[typeIdNum] || 0
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