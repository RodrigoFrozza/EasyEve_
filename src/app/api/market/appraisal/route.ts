import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple In-memory cache for market prices (Jita 4-4 Sell)
// Key: item_name (lowercase), Value: { price: number, expires: number }
const priceCache: Record<string, { price: number, expires: number }> = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const JITA_REGION_ID = 10000002
const JITA_44_STATION_ID = 60003760

export async function POST(req: Request) {
  try {
    const { items: rawItems } = await req.json() as { items: string[] }
    if (!rawItems || !Array.isArray(rawItems)) {
      return NextResponse.json({ prices: {} })
    }

    const items = rawItems.filter(i => i && i.length > 2).map(i => i.trim())
    const results: Record<string, number> = {}
    const now = Date.now()
    const missingItems: string[] = []

    // 1. Check Cache first
    items.forEach(name => {
      const lowerName = name.toLowerCase()
      if (priceCache[lowerName] && priceCache[lowerName].expires > now) {
        results[lowerName] = priceCache[lowerName].price
      } else {
        missingItems.push(name)
      }
    })

    if (missingItems.length === 0) {
      console.log(`[Appraisal] ALL ${items.length} items served from cache.`)
      return NextResponse.json({ prices: results })
    }

    // 2. Fetch missing from ESI
    console.log(`[Appraisal] Fetching ${missingItems.length} items from ESI (${items.length - missingItems.length} from cache)...`)
    const idRes = await fetch(`${ESI_BASE_URL}/universe/ids/?datasource=tranquility&language=en`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(missingItems)
    })

    if (!idRes.ok) throw new Error('ESI ID Resolution failed')

    const idData = await idRes.json()
    const inventoryItems = idData.inventory_types || []
    
    // Process items in parallel batches
    await Promise.all(inventoryItems.map(async (item: any) => {
      try {
        const orderRes = await fetch(`${ESI_BASE_URL}/markets/${JITA_REGION_ID}/orders/?datasource=tranquility&order_type=sell&type_id=${item.id}`)
        if (orderRes.ok) {
          const orders = await orderRes.json()
          const stationOrders = orders.filter((o: any) => o.location_id === JITA_44_STATION_ID)
          
          if (stationOrders.length > 0) {
            const minPrice = Math.min(...stationOrders.map((o: any) => o.price))
            const lowerName = item.name.toLowerCase()
            results[lowerName] = minPrice
            
            // Save to Cache
            priceCache[lowerName] = {
              price: minPrice,
              expires: now + CACHE_TTL
            }
          }
        }
      } catch (err) {
        console.error(`Failed fetching price for ${item.name}:`, err)
      }
    }))

    return NextResponse.json({ prices: results })
  } catch (error: any) {
    console.error('[Appraisal] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
