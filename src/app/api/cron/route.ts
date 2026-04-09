import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withCache } from '@/lib/cache'

/**
 * API Cron Route
 * Securely triggers background tasks.
 * Expects header: x-cron-token: env.CRON_TOKEN
 */

const CRON_SECRET = process.env.CRON_TOKEN

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('x-cron-token')
  
  if (CRON_SECRET && authHeader !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const task = searchParams.get('task')

  try {
    switch (task) {
      case 'sync-prices':
        return await handleSyncPrices()
      case 'clear-cache':
        return await handleClearCache()
      default:
        return NextResponse.json({ 
          error: 'Missing task parameter', 
          available: ['sync-prices', 'clear-cache'] 
        }, { status: 400 })
    }
  } catch (error) {
    console.error(`[CRON] Task ${task} failed:`, error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}

async function handleSyncPrices() {
  const ESI_BASE = 'https://esi.evetech.net/latest'
  
  // Throttle to once per 10 mins
  return withCache('sync-prices-lock', async () => {
    const response = await fetch(`${ESI_BASE}/markets/prices/`, {
      headers: { 'User-Agent': 'EasyEve-Cron/1.0' }
    })
    
    if (!response.ok) throw new Error(`ESI Error: ${response.status}`)
    
    const data = await response.json()
    let updatedCount = 0

    // For EVE SSO specifically, we usually care about specific groups 
    // but here we just update the cache lookup
    const priceMap: Record<number, number> = {}
    for (const item of data) {
      const price = item.adjusted_price || item.average_price || 0
      if (price > 0) {
        priceMap[item.type_id] = price
        updatedCount++
      }
    }

    // Persist to SdeCache for global usage
    await prisma.sdeCache.upsert({
      where: { key: 'market_prices_map' },
      create: {
        key: 'market_prices_map',
        value: priceMap as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
      },
      update: {
        value: priceMap as any,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })

    return NextResponse.json({ 
      success: true, 
      message: `Updated ${updatedCount} prices`,
      timestamp: new Date().toISOString()
    })
  }, 10 * 60 * 1000)
}

async function handleClearCache() {
  await prisma.sdeCache.deleteMany({
    where: {
      expiresAt: { lt: new Date() }
    }
  })
  return NextResponse.json({ success: true, message: 'Expired cache cleared' })
}
