import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const ores = await prisma.oreType.findMany({
      where: { published: true },
      orderBy: { basePrice: 'desc' },
      take: 20,
    })

    const formatted = ores.map(ore => ({
      name: ore.name,
      valuePerUnit: ore.basePrice || 0,
      groupName: ore.groupName,
      volume: ore.volume,
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Failed to fetch valuable ores:', error)
    return NextResponse.json({ error: 'Failed to fetch ores' }, { status: 500 })
  }
}