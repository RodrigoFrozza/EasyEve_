import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ESI_BASE = 'https://esi.evetech.net/latest'

// Cache for prices (5 min)
const priceCache = new Map<number, { price: number; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 min

/**
 * GET /api/market/prices - Get current market prices
 * Query params:
 *   - typeIds: comma-separated list of type IDs
 *   - refresh: force refresh cache
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const typeIdsParam = searchParams.get('typeIds')
    const refresh = searchParams.get('refresh') === 'true'
    const now = Date.now()

    // If no typeIds, return all cached prices
    if (!typeIdsParam) {
      const prices: Record<number, number> = {}
      priceCache.forEach((data, typeId) => {
        if (now - data.timestamp < CACHE_TTL) {
          prices[typeId] = data.price
        }
      })
      return NextResponse.json(prices)
    }

    // Parse typeIds
    const typeIds = typeIdsParam.split(',').map(id => parseInt(id.trim())).filter(id => id > 0)
    if (typeIds.length === 0) {
      return NextResponse.json({ error: 'Invalid typeIds' }, { status: 400 })
    }

    // Fetch prices for requested types
    const prices: Record<number, number> = {}
    const missing: number[] = []

    for (const typeId of typeIds) {
      const cached = priceCache.get(typeId)
      if (cached && !refresh && (now - cached.timestamp < CACHE_TTL)) {
        prices[typeId] = cached.price
      } else {
        missing.push(typeId)
      }
    }

    // Fetch from ESI if needed
    if (missing.length > 0) {
      // ESI returns all prices, we filter
      try {
        const response = await fetch(`${ESI_BASE}/markets/prices/`, {
          headers: { 'User-Agent': 'EasyEve/1.0' }
        })
        if (response.ok) {
          const data = await response.json()
          for (const item of data) {
            const tid = item.type_id
            const price = item.adjusted_price || item.average_price || 0
            if (price > 0) {
              priceCache.set(tid, { price, timestamp: now })
              if (missing.includes(tid)) {
                prices[tid] = price
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch market prices:', error)
      }
    }

    return NextResponse.json(prices)
  } catch (error) {
    console.error('GET /api/market/prices error:', error)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}