import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// Module groups by slot type
const MODULE_GROUPS = {
  // High slot weapons
  ENERGY_TURRET: 76,
  PROJECTILE_TURRET: 77,
  HYBRID_TURRET: 78,
  MISSILE_LAUNCHER: 79,
  
  // High slot utilities
  SHIELD_BOOSTER: 29,
  ECM: 111,
  SENSOR_DAMP: 112,
  TRACKING_DISRUPTOR: 113,
  STASIS_WEB: 65,
  REMOTE_REPAIR: 120,
  NOS: 35,
  NEUTRALIZER: 36,
  
  // Medium slot
  AFTERBURNER: 33,
  MICRO_WARP: 34,
  SHIELD_EXTENSION: 32,
  TRACKING_COMPUTER: 81,
  SENSOR_BOOSTER: 82,
  NAVIGATION_COMPUTER: 83,
  
  // Low slot
  ARMOR_PLATING: 28,
  ARMOR_REPAIR: 30,
  HULL_MOD: 27,
  HULL_REPAIR: 31,
  DIamnond_BATTERY: 115,
  
  // Rigs
  SHIELD_RIG: 153,
  ARMOR_RIG: 154,
  NAVIGATION_RIG: 155,
  
  // Subsystems
  SUBSYSTEM: 186,
}

/**
 * GET /api/modules - List available modules
 * Query params:
 *   - slot: high, med, low, rig, subsystem
 *   - group: specific group ID
 *   - search: search by name
 *   - page: page number
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const slot = searchParams.get('slot')
    const group = searchParams.get('group')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = (page - 1) * limit

    // Determine group IDs based on slot
    let groupIds: number[] | undefined
    
    if (slot === 'high') {
      groupIds = [
        76, 77, 78, 79, // Weapons
        29, 111, 112, 113, 65, 120, 35, 36, // Utilities
      ]
    } else if (slot === 'med') {
      groupIds = [33, 34, 32, 81, 82, 83]
    } else if (slot === 'low') {
      groupIds = [28, 30, 27, 31, 115]
    } else if (slot === 'rig') {
      groupIds = [153, 154, 155]
    } else if (slot === 'subsystem') {
      groupIds = [186]
    }

    // Build where clause
    const where: any = {
      published: true,
      group: { categoryId: 7 } // Category 7 = Modules
    }

    if (groupIds && !group) {
      where.groupId = { in: groupIds }
    } else if (group) {
      where.groupId = parseInt(group)
    }

    if (search) {
      where.name = { contains: search, mode: 'insensitive' }
    }

    const [modules, total] = await Promise.all([
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

    // Get groups for modules
    const moduleGroupIdList: number[] = []
    for (const m of modules) {
      if (!moduleGroupIdList.includes(m.groupId)) moduleGroupIdList.push(m.groupId)
    }
    const groups = await prisma.eveGroup.findMany({
      where: { id: { in: moduleGroupIdList } },
      select: { id: true, name: true }
    })
    const groupMap = new Map(groups.map(g => [g.id, g.name]))

    // Fetch missing group names from ESI
    const missingGroups = moduleGroupIdList.filter(id => !groupMap.has(id))
    if (missingGroups.length > 0) {
      for (const gid of missingGroups) {
        try {
          const res = await fetch(`https://esi.evetech.net/latest/universe/groups/${gid}/`)
          if (res.ok) {
            const data = await res.json()
            groupMap.set(gid, data.name || `Group ${gid}`)
          }
        } catch (e) {
          groupMap.set(gid, `Group ${gid}`)
        }
      }
    }

    const modulesWithGroups = modules.map(mod => ({
      ...mod,
      groupName: groupMap.get(mod.groupId) || `Group ${mod.groupId}`
    }))

    return NextResponse.json({
      modules: modulesWithGroups,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('GET /api/modules error:', error)
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }
}