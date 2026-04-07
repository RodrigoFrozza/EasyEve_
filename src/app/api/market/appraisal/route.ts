import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { items } = await request.json() // Array de nomes de itens

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items list' }, { status: 400 })
    }

    // 1. Encontrar os IDs dos itens no banco SDE local
    const itemRecords = await prisma.eveType.findMany({
      where: {
        name: { in: items, mode: 'insensitive' }
      },
      select: {
        id: true,
        name: true
      }
    })

    if (itemRecords.length === 0) {
      return NextResponse.json({ prices: {} })
    }

    const typeIds = itemRecords.map(item => item.id)
    
    // 2. Buscar preços em Jita (Region 10000002) usando Fuzzwork API (mais rápido para múltiplos IDs)
    // Documentação: https://market.fuzzwork.co.uk/aggregates/
    const fuzzworkUrl = `https://market.fuzzwork.co.uk/aggregates/?region=10000002&types=${typeIds.join(',')}`
    const priceRes = await fetch(fuzzworkUrl)
    const priceData = await priceRes.json()

    // 3. Mapear nome -> preço (usando Sell Weighted Average ou Min Sell)
    const priceMap: Record<string, number> = {}
    
    itemRecords.forEach(record => {
      const marketInfo = priceData[record.id]
      if (marketInfo && marketInfo.sell) {
        // Usamos o preço de venda (sell) mínimo ou médio
        priceMap[record.name.toLowerCase()] = parseFloat(marketInfo.sell.min) || 0
      }
    })

    return NextResponse.json({ prices: priceMap })
  } catch (error: any) {
    console.error('Appraisal Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
