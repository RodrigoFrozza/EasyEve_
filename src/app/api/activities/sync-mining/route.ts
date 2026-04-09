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

    let totalFetched = 0
    let totalNew = 0

    // Process results
    for (const result of results) {
      const { entries, charId, charName } = result
      
      totalFetched += entries.length

      // Filter and validate entries
      const validEntries = entries.filter(isValidMiningEntry)
      
      for (const entry of validEntries) {
        if (entry.date < activityDateOnly) continue

        const compositeKey = `${charId}-${entry.type_id}-${entry.solar_system_id}`
        
        if (!logMap.has(compositeKey)) {
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
          existing.quantity = Math.max(existing.quantity, entry.quantity)
          if (entry.date > existing.date) {
            existing.date = entry.date
          }
          logMap.set(compositeKey, existing)
        }
      }
    }

    // Single loop to build all breakdowsn
    const allLogs = Array.from(logMap.values())
    const oreBreakdown: Record<number, { quantity: number; estimatedValue: number }> = {}
    const participantBreakdown: Record<number, { quantity: number; estimatedValue: number }> = {}

    for (const log of allLogs) {
      // Ore breakdown
      if (!oreBreakdown[log.typeId]) {
        oreBreakdown[log.typeId] = { quantity: 0, estimatedValue: 0 }
      }
      oreBreakdown[log.typeId].quantity += log.quantity

      // Participant breakdown
      if (!participantBreakdown[log.characterId]) {
        participantBreakdown[log.characterId] = { quantity: 0, estimatedValue: 0 }
      }
    }

    // Get prices
    const priceMap = await getMarketPrices()
    const typeIdsWithoutPrice = Object.keys(oreBreakdown)
      .filter(id => !priceMap[Number(id)])
      .map(Number)
    
    const basePrices = typeIdsWithoutPrice.length > 0 
      ? await getBasePrices(typeIdsWithoutPrice)
      : {}

    // Calculate values (single pass)
    for (const log of allLogs) {
      const typeIdNum = Number(log.typeId)
      const price = priceMap[typeIdNum] || basePrices[typeIdNum] || 0
      
      oreBreakdown[typeIdNum].estimatedValue += log.quantity * price
      
      participantBreakdown[log.characterId].estimatedValue += log.quantity * price
      participantBreakdown[log.characterId].quantity += log.quantity
    }

    const totalQuantity = Object.values(oreBreakdown).reduce((sum, o) => sum + o.quantity, 0)
    const totalEstimatedValue = Object.values(oreBreakdown).reduce((sum, o) => sum + o.estimatedValue, 0)

    const participantEarnings: Record<number, number> = {}
    Object.keys(participantBreakdown).forEach(charId => {
      participantEarnings[parseInt(charId)] = participantBreakdown[parseInt(charId)].estimatedValue
    })

    // Sort logs by date descending
    allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

    console.log(JSON.stringify({
      event: 'sync_mining_complete',
      syncId,
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
