import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getMarketPrices } from '@/lib/esi'
import { getValidAccessToken } from '@/lib/token-manager'
import { ESI_BASE_URL, USER_AGENT } from '@/lib/sde'

const JITA_REGION_ID = 10000002

interface MarketOrder {
  price: number
  volume_remain: number
  type_id: number
}

// Cache for Jita prices (5 min TTL)
let jitaPriceCache: { prices: Record<number, number>; timestamp: number } | null = null
const JITA_PRICE_CACHE_TTL = 5 * 60 * 1000

async function getJitaSellPrices(typeIds: number[]): Promise<Record<number, number>> {
  const now = Date.now()
  
  // Return cached if valid and covers all needed
  if (jitaPriceCache && (now - jitaPriceCache.timestamp < JITA_PRICE_CACHE_TTL)) {
    return jitaPriceCache.prices
  }
  
  const priceMap: Record<number, number> = {}
  
  // Fetch prices in parallel with concurrency limit
  const BATCH_SIZE = 10
  for (let i = 0; i < typeIds.length; i += BATCH_SIZE) {
    const batch = typeIds.slice(i, i + BATCH_SIZE)
    await Promise.all(batch.map(async (typeId) => {
      try {
        const response = await fetch(
          `${ESI_BASE_URL}/markets/${JITA_REGION_ID}/orders/?type_id=${typeId}&order_type=sell`,
          { headers: { 'X-User-Agent': USER_AGENT } }
        )
        
        if (!response.ok) return
        
        const orders: MarketOrder[] = await response.json()
        const validOrders = orders.filter(o => o.volume_remain > 0)
        
        if (validOrders.length > 0) {
          const bestPrice = Math.min(...validOrders.map(o => o.price))
          priceMap[typeId] = bestPrice
        }
      } catch (e) {
        console.error(`Error fetching Jita price for type ${typeId}:`, e)
      }
    }))
  }
  
  jitaPriceCache = { prices: priceMap, timestamp: now }
  return priceMap
}

interface MiningLedgerEntry {
  date: string
  quantity: number
  type_id: number
  solar_system_id: number
}

function isValidMiningEntry(entry: any): entry is MiningLedgerEntry {
  return (
    entry &&
    typeof entry.date === 'string' &&
    typeof entry.quantity === 'number' &&
    entry.quantity > 0 &&
    typeof entry.type_id === 'number' &&
    typeof entry.solar_system_id === 'number'
  )
}

const MAX_RETRIES = 3
const RETRY_DELAY = 1000
const MAX_CONCURRENT_PAGES = 5

// Cache for base prices (15 min TTL)
let basePriceCache: { prices: Record<number, number>; timestamp: number } | null = null
const BASE_PRICE_CACHE_TTL = 15 * 60 * 1000

async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  let lastError: Error | null = null
  
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, options)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response
      }
      console.log(`[SYNC-MINING] Retry ${i + 1}/${retries} for ${url} (status ${response.status})`)
    } catch (error) {
      lastError = error as Error
    }
    
    if (i < retries - 1) {
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)))
    }
  }
  
  throw lastError || new Error('Fetch failed after retries')
}

async function getBasePrices(typeIds: number[]): Promise<Record<number, number>> {
  const now = Date.now()
  const neededIds = typeIds.filter(id => !basePriceCache?.prices?.[id])
  
  // Return cached if valid and covers all needed
  if (basePriceCache && 
      (now - basePriceCache.timestamp < BASE_PRICE_CACHE_TTL) && 
      neededIds.length === 0) {
    return basePriceCache.prices
  }
  
  // Fetch from DB for missing IDs
  if (neededIds.length > 0) {
    const types = await prisma.eveType.findMany({
      where: { id: { in: neededIds } },
      select: { id: true, basePrice: true }
    })
    
    const newPrices: Record<number, number> = {}
    types.forEach(t => {
      if (t.basePrice) newPrices[t.id] = t.basePrice
    })
    
    // Merge with existing cache
    if (!basePriceCache) {
      basePriceCache = { prices: {}, timestamp: now }
    }
    Object.assign(basePriceCache.prices, newPrices)
    basePriceCache.timestamp = now
  }
  
  return basePriceCache?.prices || {}
}

async function fetchMiningLedgerForCharacter(
  charId: number, 
  charName: string, 
  activityDateOnly: string,
  startTimeManual: Date
): Promise<{ entries: MiningLedgerEntry[], charId: number, charName: string }> {
  const { accessToken } = await getValidAccessToken(charId)
  
  if (!accessToken) {
    console.log(JSON.stringify({
      event: 'no_token',
      charId,
      charName
    }))
    return { entries: [], charId, charName }
  }

  try {
    // First request to get total pages
    const firstResponse = await fetchWithRetry(
      `${ESI_BASE_URL}/characters/${charId}/mining/?page=1`,
      { 
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'X-User-Agent': 'EasyEve/1.0'
        } 
      }
    )

    if (!firstResponse.ok) {
      const errorText = await firstResponse.text()
      console.log(JSON.stringify({
        event: 'fetch_error',
        charId,
        charName,
        status: firstResponse.status,
        error: errorText
      }))
      return { entries: [], charId, charName }
    }

    const pagesHeader = firstResponse.headers.get('x-pages')
    const totalPages = pagesHeader ? parseInt(pagesHeader, 10) : 1
    
    // Fetch all pages in parallel (with concurrency limit)
    const allEntries: MiningLedgerEntry[] = []
    
    if (totalPages === 1) {
      const entries = await firstResponse.json()
      allEntries.push(...entries)
    } else {
      // Process in batches to avoid overwhelming ESI
      for (let batchStart = 1; batchStart <= totalPages; batchStart += MAX_CONCURRENT_PAGES) {
        const batchEnd = Math.min(batchStart + MAX_CONCURRENT_PAGES - 1, totalPages)
        const pagePromises: Promise<Response>[] = []
        
        for (let page = batchStart; page <= batchEnd; page++) {
          pagePromises.push(
            fetchWithRetry(
              `${ESI_BASE_URL}/characters/${charId}/mining/?page=${page}`,
              { 
                headers: { 
                  Authorization: `Bearer ${accessToken}`,
                  'X-User-Agent': 'EasyEve/1.0'
                } 
              }
            )
          )
        }
        
        const responses = await Promise.all(pagePromises)
        const jsons = await Promise.all(responses.map(r => r.json()))
        jsons.forEach(entries => allEntries.push(...entries))
      }
    }

    console.log(JSON.stringify({
      event: 'fetched_entries',
      charId,
      charName,
      totalEntries: allEntries.length,
      totalPages
    }))

    return { entries: allEntries, charId, charName }
  } catch (err) {
    console.error(JSON.stringify({
      event: 'fetch_exception',
      charId,
      charName,
      error: String(err)
    }))
    return { entries: [], charId, charName }
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const activityId = searchParams.get('id')
    const mode = searchParams.get('mode') // 'initial' or 'regular'
    
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
    const activityDateOnly = startTimeManual.toISOString().split('T')[0]

    console.log(JSON.stringify({
      event: 'sync_mining_start',
      syncId,
      mode: mode || 'regular',
      activityId,
      activityStartTime: activity.startTime,
      participantCount: participants.length,
      participantNames: participants.map(p => p.characterName)
    }))
    
    const activityData = (activity.data as any) || {}
    const existingLogs = activityData.logs || []
    
    // Build logMap from existing logs
    const logMap = new Map<string, any>()
    const existingFiltered = existingLogs.filter((log: any) => {
      const logDateOnly = log.date?.split('T')[0] || new Date(log.date).toISOString().split('T')[0]
      return logDateOnly >= activityDateOnly
    })
    
    existingFiltered.forEach((log: any) => {
      const key = `${log.characterId}-${log.typeId}-${log.solarSystemId || 0}`
      logMap.set(key, log)
    })

    console.log(JSON.stringify({
      event: 'existing_logs_loaded',
      syncId,
      totalLogs: existingFiltered.length
    }))

    // PARALLEL: Fetch mining ledger for ALL participants simultaneously
    const fetchPromises = participants.map(p => 
      fetchMiningLedgerForCharacter(p.characterId, p.characterName, activityDateOnly, startTimeManual)
    )
    
    const results = await Promise.all(fetchPromises)

    // --- MODE: INITIAL SNAPSHOT ---
    if (mode === 'initial') {
      const baselines: Record<string, number> = {}
      let totalEntriesFetched = 0
      
      for (const result of results) {
        const { entries, charId } = result
        totalEntriesFetched += entries.length
        
        const validEntries = entries.filter(isValidMiningEntry)
        for (const entry of validEntries) {
          // Only baseline for the day the activity started
          if (entry.date === activityDateOnly) {
            const compositeKey = `${charId}-${entry.type_id}-${entry.solar_system_id}`
            // Store the quantity found at the start of the session
            baselines[compositeKey] = entry.quantity
          }
        }
      }

      console.log(JSON.stringify({
        event: 'mining_baseline_captured',
        syncId,
        activityId,
        totalEntriesFetched,
        baselineCount: Object.keys(baselines).length
      }))

      const updatedActivity = await prisma.activity.update({
        where: { id: activityId },
        data: { 
          data: { 
            ...activityData, 
            baselines,
            hasInitialBaseline: true,
            lastSyncAt: new Date().toISOString()
          } 
        }
      })

      return NextResponse.json(updatedActivity)
    }

    // --- MODE: REGULAR SYNC ---
    let totalFetched = 0
    let totalNew = 0
    const baselines = activityData.baselines || {}

    // Process results
    for (const result of results) {
      const { entries, charId, charName } = result
      
      totalFetched += entries.length

      // Filter and validate entries
      const validEntries = entries.filter(isValidMiningEntry)
      
      for (const entry of validEntries) {
        if (entry.date < activityDateOnly) continue

        const compositeKey = `${charId}-${entry.type_id}-${entry.solar_system_id}`
        
        // Calculate Effective Quantity (Subtract baseline if it exists and it's the same day)
        let effectiveQuantity = entry.quantity
        if (entry.date === activityDateOnly) {
          const baselineQty = baselines[compositeKey] || 0
          effectiveQuantity = Math.max(0, entry.quantity - baselineQty)
        }
        
        if (!logMap.has(compositeKey)) {
          logMap.set(compositeKey, {
            date: entry.date,
            quantity: effectiveQuantity,
            typeId: entry.type_id,
            characterId: charId,
            characterName: charName,
            solarSystemId: entry.solar_system_id
          })
          totalNew++
        } else {
          const existing = logMap.get(compositeKey)
          existing.quantity = Math.max(existing.quantity, effectiveQuantity)
          if (entry.date > existing.date) {
            existing.date = entry.date
          }
          logMap.set(compositeKey, existing)
        }
      }
    }
    // Initialize breakdowns and collect logs
    const allLogs = Array.from(logMap.values())
    const oreBreakdown: Record<number, any> = {}
    const participantBreakdown: Record<number, any> = {}

    // Initialize breakdowns correctly
    allLogs.forEach(log => {
      if (!oreBreakdown[log.typeId]) {
        oreBreakdown[log.typeId] = { typeId: log.typeId, quantity: 0, estimatedValue: 0, volumeValue: 0 }
      }
      oreBreakdown[log.typeId].quantity += log.quantity
      
      if (!participantBreakdown[log.characterId]) {
        participantBreakdown[log.characterId] = { characterId: log.characterId, characterName: log.characterName, quantity: 0, estimatedValue: 0, volumeValue: 0 }
      }
    })

    // Get Prices and Ore Metadata (Name/Volume) from SDE
    const typeIdsList = Object.keys(oreBreakdown).map(Number)
    
    // Resolve Names and Volumes from SDE (EveType table)
    const sdeMetadata = await prisma.eveType.findMany({
      where: { id: { in: typeIdsList } },
      select: { id: true, name: true, volume: true, basePrice: true }
    })
    
    const metaMap: Record<number, { name: string; volume: number; basePrice: number }> = {}
    sdeMetadata.forEach(m => {
      metaMap[m.id] = { 
        name: m.name, 
        volume: m.volume || 0,
        basePrice: m.basePrice || 0
      }
    })

    const jitaPrices = await getJitaSellPrices(typeIdsList)
    const marketPrices = await getMarketPrices()
    
    // Calculate values and save metadata in each log
    for (const log of allLogs) {
      const typeIdNum = Number(log.typeId)
      const meta = metaMap[typeIdNum]
      
      // Update Name
      log.oreName = meta?.name || 'Unknown Ore'
      
      // Calculate Volume (m3)
      const unitVolume = meta?.volume || 1 // Fallback to 1 if unknown, though 0 might be safer
      log.volumeValue = log.quantity * unitVolume
      
      // Priority: Jita sell > market average > base price > 0
      const price = jitaPrices[typeIdNum] || marketPrices[typeIdNum] || meta?.basePrice || 0
      const estimatedValue = log.quantity * price
      
      // Save info in log
      log.estimatedValue = estimatedValue
      
      // Accumulate in breakdowns
      oreBreakdown[typeIdNum].estimatedValue += estimatedValue
      oreBreakdown[typeIdNum].volumeValue = (oreBreakdown[typeIdNum].volumeValue || 0) + log.volumeValue
      
      participantBreakdown[log.characterId].estimatedValue += estimatedValue
      participantBreakdown[log.characterId].quantity += log.quantity
      participantBreakdown[log.characterId].volumeValue = (participantBreakdown[log.characterId].volumeValue || 0) + log.volumeValue
    }

    const totalQuantity = Object.values(oreBreakdown).reduce((sum, o: any) => sum + (o.volumeValue || 0), 0)
    const totalEstimatedValue = Object.values(oreBreakdown).reduce((sum, o) => sum + o.estimatedValue, 0)

    const participantEarnings: Record<number, number> = {}
    Object.keys(participantBreakdown).forEach(charId => {
      participantEarnings[parseInt(charId)] = participantBreakdown[parseInt(charId)].estimatedValue
    })

    // Sort logs by date descending
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    // Calculate Yield Trend
    const startTimeMs = new Date(activity.startTime).getTime()
    const hoursElapsed = (Date.now() - startTimeMs) / 3600000
    const currentM3PerHour = totalQuantity / Math.max(0.1, hoursElapsed)
    
    const previousM3PerHour = activityData.currentM3PerHour || 0
    let m3Trend = 'stable'
    
    if (previousM3PerHour > 0) {
      const diff = currentM3PerHour - previousM3PerHour
      const threshold = previousM3PerHour * 0.02 // 2% change threshold to avoid jitter
      if (diff > threshold) m3Trend = 'up'
      else if (diff < -threshold) m3Trend = 'down'
    }

    const updatedData = {
      ...activityData,
      oreBreakdown,
      totalQuantity,
      totalEstimatedValue,
      participantBreakdown,
      participantEarnings,
      logs: allLogs,
      currentM3PerHour,
      m3Trend,
      lastSyncAt: new Date().toISOString()
    }

    console.log(JSON.stringify({
      event: 'sync_mining_complete',
      syncId,
      mode: 'regular',
      totalQuantity,
      totalEstimatedValue,
      logsCount: allLogs.length,
      totalFetched,
      totalNew
    }))

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
