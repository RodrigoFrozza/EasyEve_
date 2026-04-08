import { NextResponse } from 'next/server'

// Simple In-memory cache for market prices (Jita 4-4 Sell)
const priceCache: Map<string, { price: number, expires: number }> = new Map()
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const JITA_REGION_ID = 10000002
const JITA_44_STATION_ID = 60003760

function chunkArray<T>(array: T[], size: number): T[][] {
  const result = []
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size))
  }
  return result
}

export async function getMarketAppraisal(itemNames: string[]): Promise<Record<string, number>> {
  if (!itemNames || itemNames.length === 0) return {}

  const items = Array.from(new Set(itemNames.filter(i => i && i.length > 1).map(i => i.trim().toLowerCase())))
  const results: Record<string, number> = {}
  const now = Date.now()
  const missingItems: string[] = []

  // 1. Check Cache
  items.forEach(name => {
    const cached = priceCache.get(name)
    if (cached && cached.expires > now) {
      results[name] = cached.price
    } else {
      missingItems.push(name)
    }
  })

  if (missingItems.length === 0) return results

  // 2. Resolve IDs
  const missingItemChunks = chunkArray(missingItems, 500)
  let inventoryItems: any[] = []

  for (const chunk of missingItemChunks) {
    try {
      const idRes = await fetch(`${ESI_BASE_URL}/universe/ids/?datasource=tranquility&language=en`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chunk)
      })
      if (idRes.ok) {
        const idData = await idRes.json()
        if (idData.inventory_types) {
          inventoryItems = [...inventoryItems, ...idData.inventory_types]
        }
      }
    } catch (e) { console.error('ESI ID Resolution Error:', e) }
  }

  if (inventoryItems.length === 0) return results

  // 3. Fetch Prices with Concurrency Control
  const CONCURRENCY_LIMIT = 20 // Higher limit on server if needed
  const itemChunks = chunkArray(inventoryItems, CONCURRENCY_LIMIT)

  for (const chunk of itemChunks) {
    await Promise.all(chunk.map(async (item: any) => {
      try {
        const lowerName = item.name.toLowerCase()
        const cached = priceCache.get(lowerName)
        if (cached && cached.expires > now) {
          results[lowerName] = cached.price
          return
        }

        const orderRes = await fetch(`${ESI_BASE_URL}/markets/${JITA_REGION_ID}/orders/?datasource=tranquility&order_type=sell&type_id=${item.id}`)
        
        if (orderRes.ok) {
          const orders = await orderRes.json()
          const stationOrders = orders.filter((o: any) => o.location_id === JITA_44_STATION_ID)
          
          if (stationOrders.length > 0) {
            const minPrice = Math.min(...stationOrders.map((o: any) => o.price))
            results[lowerName] = minPrice
            priceCache.set(lowerName, { price: minPrice, expires: now + CACHE_TTL })
          } else {
            // Global price fallback
            const priceRes = await fetch(`${ESI_BASE_URL}/markets/prices/`)
            if (priceRes.ok) {
              const globalPrices = await priceRes.json()
              const globalItem = globalPrices.find((p: any) => p.type_id === item.id)
              if (globalItem) {
                const fallback = globalItem.average_price || globalItem.adjusted_price || 0
                results[lowerName] = fallback
                priceCache.set(lowerName, { price: fallback, expires: now + CACHE_TTL })
              }
            }
          }
        }
      } catch (err) {
        console.error(`Appraisal error for ${item.name}:`, err)
      }
    }))
  }

  return results
}
