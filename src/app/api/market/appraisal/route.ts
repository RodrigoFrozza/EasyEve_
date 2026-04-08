import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Simple In-memory cache for market prices (Jita 4-4 Sell)
// Key: item_name (lowercase), Value: { price: number, expires: number }

export async function POST(req: Request) {
  try {
    const { items: rawItems } = await req.json() as { items: string[] }
    if (!rawItems || !Array.isArray(rawItems)) {
      return NextResponse.json({ prices: {} })
    }

    const { getMarketAppraisal } = await import('@/lib/market')
    const prices = await getMarketAppraisal(rawItems)
    return NextResponse.json({ prices })
  } catch (error: any) {
    console.error('[Appraisal] Fatal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
