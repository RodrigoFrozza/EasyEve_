import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const ESI_BASE = 'https://esi.evetech.net/latest'

// Ship categories for filtering
const SHIP_CATEGORIES = {
  FRIGATE: 5,
  DESTROYER: 6,
  CRUISER: 7,
  BATTLECRUISER: 8,
  BATTLESHIP: 9,
  CAPITAL: 23,
  INDUSTRIAL: 24,
  MINING: 28,
  TRANSPORT: 26,
}

/**
 * GET /api/ships - List available ships
 * Query params:
 *   - category: ship category filter
 *   - group: ship group filter
 *   - search: search by name
 *   - page: page number
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const group = searchParams.get('group')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    // Build where clause
    const where: any = {
      published: true,
      group: { categoryId: 6 } // Category 6 = Ships
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    if (group) {
      where.groupId = parseInt(group)
    }

    const [ships, total] = await Promise.all([
      prisma.eveType.findMany({
        where,
        select: {
          id: true,
          name: true,
          groupId: true,
          volume: true,
          basePrice: true,
          iconId: true
        },
        orderBy: { name: 'asc' },
        take: limit,
        skip: offset
      }),
      prisma.eveType.count({ where })
    ])

    // Get groups for ships
    const groupIdList: number[] = []
    for (const s of ships) {
      if (!groupIdList.includes(s.groupId)) groupIdList.push(s.groupId)
    }
    const groups = await prisma.eveGroup.findMany({
      where: { id: { in: groupIdList } },
      select: { id: true, name: true }
    })
    const groupMap = new Map(groups.map(g => [g.id, g.name]))

    const shipsWithGroups = ships.map(ship => ({
      ...ship,
      groupName: groupMap.get(ship.groupId) || `Group ${ship.groupId}`
    }))

    // Fetch missing group names from ESI
    const missingGroups = groupIdList.filter(id => !groupMap.has(id))
    if (missingGroups.length > 0) {
      for (const gid of missingGroups) {
        try {
          const res = await fetch(`${ESI_BASE}/universe/groups/${gid}/`)
          if (res.ok) {
            const data = await res.json()
            groupMap.set(gid, data.name || `Group ${gid}`)
          }
        } catch (e) {
          groupMap.set(gid, `Group ${gid}`)
        }
      }
    }

    return NextResponse.json({
      ships: shipsWithGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('GET /api/ships error:', error)
    return NextResponse.json({ error: 'Failed to fetch ships' }, { status: 500 })
  }
}