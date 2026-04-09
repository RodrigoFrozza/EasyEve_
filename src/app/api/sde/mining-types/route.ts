import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const miningType = searchParams.get('type') as 'Ore' | 'Ice' | 'Gas' | 'Moon' | null

    if (!miningType) {
      return NextResponse.json({ error: 'Mining type is required' }, { status: 400 })
    }

    const patterns: Record<string, string[]> = {
      'Ore': ['Veldspar', 'Scordite', 'Pyroxeres', 'Plagioclase', 'Omber', 'Kernite', 'Jaspet', 'Hemorphite', 'Hedbergite', 'Gneiss', 'Dark Ochre', 'Crokite', 'Spodumain', 'Bistot', 'Arkonor', 'Mercoxit'],
      'Ice': ['Ice', 'Glacial', 'Clear', 'White Glaze', 'Blue Ice', 'Gelidus', 'Krystallos', 'Pristine'],
      'Gas': ['Mykoserocin', 'Cytoserocin', 'Fullerite'],
      'Moon': ['Cobalt', 'Cadmium', 'Caesium', 'Chromium', 'Dysprosium', 'Hafnium', 'Mercury', 'Neodymium', 'Promethium', 'Thorium', 'Tungsten', 'Vanadium', 'Evaporite', 'Hydrocarbon', 'Silicates', 'Atmospheric']
    }

    const searchPatterns = patterns[miningType]
    if (!searchPatterns) {
      return NextResponse.json({ error: 'Invalid mining type' }, { status: 400 })
    }

    const types = await prisma.eveType.findMany({
      where: {
        published: true,
        group: { categoryId: 25 }
      },
      select: {
        id: true,
        name: true
      },
      orderBy: { name: 'asc' }
    })

    const filtered = types.filter(t =>
      searchPatterns.some(p => t.name.includes(p))
    )

    return NextResponse.json(filtered)
  } catch (error: any) {
    console.error('Error fetching mining types:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}