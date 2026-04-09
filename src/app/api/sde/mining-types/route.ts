import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ESI_BASE_URL, USER_AGENT } from '@/lib/sde'

interface MarketPrice {
  type_id: number
  average_price: number | null
  adjusted_price: number | null
}

async function getMarketPrices(): Promise<Record<number, { buy: number; sell: number }>> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/markets/prices/`, {
      headers: { 'X-User-Agent': USER_AGENT }
    })
    if (!response.ok) return {}
    
    const data: MarketPrice[] = await response.json()
    
    const priceMap: Record<number, { buy: number; sell: number }> = {}
    data.forEach(item => {
      if (item.average_price) {
        priceMap[item.type_id] = {
          buy: Math.floor(item.average_price * 0.9),
          sell: Math.floor(item.average_price * 1.1)
        }
      }
    })
    return priceMap
  } catch {
    return {}
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const miningType = searchParams.get('type') as 'Ore' | 'Ice' | 'Gas' | 'Moon' | null

    if (!miningType) {
      return NextResponse.json({ error: 'Mining type is required' }, { status: 400 })
    }

    const allTypes: Record<string, { id: number; name: string }[]> = {
      'Ore': [
        { id: 1230, name: 'Veldspar' },
        { id: 17471, name: 'Dense Veldspar' },
        { id: 17472, name: 'Concentrated Veldspar' },
        { id: 1228, name: 'Scordite' },
        { id: 17463, name: 'Condensed Scordite' },
        { id: 17464, name: 'Massive Scordite' },
        { id: 1224, name: 'Pyroxeres' },
        { id: 17459, name: 'Solid Pyroxeres' },
        { id: 17460, name: 'Viscous Pyroxeres' },
        { id: 18, name: 'Plagioclase' },
        { id: 17447, name: 'Azure Plagioclase' },
        { id: 17448, name: 'Rich Plagioclase' },
        { id: 1227, name: 'Omber' },
        { id: 17453, name: 'Silvery Omber' },
        { id: 17454, name: 'Golden Omber' },
        { id: 20, name: 'Kernite' },
        { id: 17452, name: 'Luminous Kernite' },
        { id: 17451, name: 'Fiery Kernite' },
        { id: 1226, name: 'Jaspet' },
        { id: 17449, name: 'Pure Jaspet' },
        { id: 17450, name: 'Pristine Jaspet' },
        { id: 1225, name: 'Hemorphite' },
        { id: 17444, name: 'Vivid Hemorphite' },
        { id: 17445, name: 'Radiant Hemorphite' },
        { id: 1223, name: 'Hedbergite' },
        { id: 17441, name: 'Vitric Hedbergite' },
        { id: 17442, name: 'Glazed Hedbergite' },
        { id: 1229, name: 'Gneiss' },
        { id: 17865, name: 'Iridescent Gneiss' },
        { id: 17866, name: 'Prismatic Gneiss' },
        { id: 1232, name: 'Dark Ochre' },
        { id: 17428, name: 'Onyx Ochre' },
        { id: 17429, name: 'Obsidian Ochre' },
        { id: 1231, name: 'Crokite' },
        { id: 17422, name: 'Sharp Crokite' },
        { id: 17423, name: 'Crystalline Crokite' },
        { id: 1222, name: 'Spodumain' },
        { id: 17417, name: 'Bright Spodumain' },
        { id: 17418, name: 'Gleaming Spodumain' },
        { id: 1210, name: 'Bistot' },
        { id: 17413, name: 'Triclinic Bistot' },
        { id: 17414, name: 'Monoclinic Bistot' },
        { id: 1233, name: 'Arkonor' },
        { id: 17425, name: 'Crimson Arkonor' },
        { id: 17426, name: 'Prime Arkonor' },
        { id: 11396, name: 'Mercoxit' },
        { id: 17869, name: 'Magma Mercoxit' },
        { id: 17870, name: 'Vitreous Mercoxit' }
      ],
      'Ice': [
        { id: 16267, name: 'Blue Ice' },
        { id: 16265, name: 'Clear Icicle' },
        { id: 16263, name: 'Glacial Mass' },
        { id: 16266, name: 'White Glaze' },
        { id: 16268, name: 'Enriched Clear Icicle' },
        { id: 28431, name: 'Gelidus' },
        { id: 28432, name: 'Krystallos' },
        { id: 28433, name: 'Pristine White Glaze' },
        { id: 28434, name: 'Smooth Glacial Mass' },
        { id: 28435, name: 'Thick Blue Ice' }
      ],
      'Gas': [
        { id: 30375, name: 'Mykoserocin' },
        { id: 30376, name: 'Cytoserocin' },
        { id: 17812, name: 'Fullerite-C28' },
        { id: 17813, name: 'Fullerite-C32' },
        { id: 17814, name: 'Fullerite-C50' },
        { id: 17815, name: 'Fullerite-C60' },
        { id: 17816, name: 'Fullerite-C70' },
        { id: 17817, name: 'Fullerite-C72' },
        { id: 17818, name: 'Fullerite-C84' },
        { id: 17819, name: 'Fullerite-C320' },
        { id: 17820, name: 'Fullerite-C540' }
      ],
      'Moon': [
        { id: 16643, name: 'Cadmium' },
        { id: 16644, name: 'Caesium' },
        { id: 16645, name: 'Chromium' },
        { id: 16646, name: 'Cobalt' },
        { id: 16647, name: 'Dysprosium' },
        { id: 16635, name: 'Evaporite Deposits' },
        { id: 16648, name: 'Hafnium' },
        { id: 16633, name: 'Hydrocarbons' },
        { id: 16649, name: 'Mercury' },
        { id: 16650, name: 'Neodymium' },
        { id: 16651, name: 'Promethium' },
        { id: 16636, name: 'Silicates' },
        { id: 16652, name: 'Sodium' },
        { id: 16653, name: 'Thorium' },
        { id: 16654, name: 'Tungsten' },
        { id: 16655, name: 'Vanadium' },
        { id: 16634, name: 'Atmospheric Gases' }
      ]
    }

    const types = allTypes[miningType] || []
    
    const prices = await getMarketPrices()
    
    const result = types.map(t => ({
      ...t,
      buy: prices[t.id]?.buy || 0,
      sell: prices[t.id]?.sell || 0
    }))

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error fetching mining types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}