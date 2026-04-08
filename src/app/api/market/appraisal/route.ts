import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const JITA_REGION_ID = 10000002
const JITA_44_STATION_ID = 60003760

export async function POST(request: Request) {
  try {
    const { items } = await request.json() // Recebe array de nomes ["Tritanium", "Angel Tag"...]

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ prices: {} })
    }

    // PASSO 1: ESI - Traduzir Nomes para IDs
    const idRes = await fetch(`${ESI_BASE_URL}/universe/ids/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(items)
    })
    
    if (!idRes.ok) throw new Error('ESI IDs resolution failed')
    const idData = await idRes.json()
    const inventoryItems = idData.inventory_types || []
    
    if (inventoryItems.length === 0) return NextResponse.json({ prices: {} })

    const priceMap: Record<string, number> = {}

    // PASSO 2: ESI - Buscar ordens de mercado para cada ID traduzido
    // Para manter a performance, processamos em paralelo
    await Promise.all(inventoryItems.map(async (item: any) => {
      try {
        const orderRes = await fetch(
          `${ESI_BASE_URL}/markets/${JITA_REGION_ID}/orders/?datasource=tranquility&order_type=sell&type_id=${item.id}`
        )
        
        if (!orderRes.ok) return

        const orders = await orderRes.json()
        
        // Filtrar pela Estação ID (Jita 4-4) ou pegar a menor do Region se preferir
        const jitaOrders = orders.filter((o: any) => o.location_id === JITA_44_STATION_ID)
        
        if (jitaOrders.length > 0) {
          // Menor preço de venda em Jita 4-4
          const minPrice = Math.min(...jitaOrders.map((o: any) => o.price))
          priceMap[item.name.toLowerCase()] = minPrice
        } else if (orders.length > 0) {
          // Fallback para o menor preço da região caso não possua em Jita 4-4
          const minPrice = Math.min(...orders.map((o: any) => o.price))
          priceMap[item.name.toLowerCase()] = minPrice
        }
      } catch (err) {
        console.error(`Failed to fetch orders for ${item.name}:`, err)
      }
    }))

    return NextResponse.json({ prices: priceMap })
  } catch (error: any) {
    console.error('ESI Appraisal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
