import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const ESI_BASE = 'https://esi.evetech.net/latest'

const DOGMA_ATTRS = {
  // Ship base
  CPU: 19,
  POWER: 21,
  CAPACITOR: 22,
  CAPACITOR_RECHARGE: 64,
  HI_SLOTS: 47,
  MED_SLOTS: 48,
  LOW_SLOTS: 49,
  RIG_SLOTS: 1137,
  SUBSYSTEM_SLOTS: 1544,
  
  // HP
  SHIELD_CAPACITY: 73,
  ARMOR_HP: 265,
  STRUCTURAL_INTEGRITY: 9,
  
  // Shield Regen
  SHIELD_RECHARGE: 98,
  
  // Resist Shield
  SHIELD_EM_RESIST: 110,
  SHIELD_EXPLOSIVE_RESIST: 111,
  SHIELD_KINETIC_RESIST: 112,
  SHIELD_THERMAL_RESIST: 113,
  
  // Resist Armor
  ARMOR_EM_RESIST: 267,
  ARMOR_EXPLOSIVE_RESIST: 268,
  ARMOR_KINETIC_RESIST: 269,
  ARMOR_THERMAL_RESIST: 270,
  
  // Resist Hull
  HULL_EM_RESIST: 272,
  HULL_EXPLOSIVE_RESIST: 273,
  HULL_KINETIC_RESIST: 274,
  HULL_THERMAL_RESIST: 275,
  
  // Velocidade
  MAX_VELOCITY: 37,
  AGILITY: 70,
  MASS: 4,
  WARP_SPEED: 30,
  
  // Cargas
  DRONE_BAY_CAPACITY: 227,
  CARGO_CAPACITY: 5,
  
  // Weapon
  DAMAGE: 6,
  FIRE_RATE: 47,
  OPTIMAL_RANGE: 54,
  FALLOFF_RANGE: 55,
  TRACKING_SPEED: 63,
  
  // Missile
  MISSILE_DAMAGE: 78,
  MISSILE_VELOCITY: 84,
  MISSILE_RANGE: 213,
  EXPLOSION_RADIUS: 89,
  EXPLOSION_VELOCITY: 90,
  
  // Requisitos módulos
  CPU_NEEDED: 129,
  POWER_NEEDED: 30,
  
  // Tank
  SHIELD_BOOST: 68,
  ARMOR_BOOST: 73,
  HULL_BOOST: 77,
  
  // Cap usage
  CAPACITOR_NEEDED: 100,
  
  // EWAR
  ECCM_SENSOR_STRENGTH: 220,
  SENSOR_DAMPENER_RANGE: 241,
  TRACKING_DISRUPTOR_RANGE: 212,
  WEB_RANGE: 103,
  WEB_SPEED_FACTOR: 127,
}

const MODULE_GROUPS = {
  ENERGY_TURRET: 76,
  PROJECTILE_TURRET: 77,
  HYBRID_TURRET: 78,
  MISSILE_LAUNCHER: 79,
  SHIELD_BOOSTER: 29,
  ECM: 111,
  SENSOR_DAMP: 112,
  TRACKING_DISRUPTOR: 113,
  STASIS_WEB: 65,
  REMOTE_REPAIR: 120,
  NOS: 35,
  NEUTRALIZER: 36,
  AFTERBURNER: 33,
  MICRO_WARP: 34,
  SHIELD_EXTENSION: 32,
  TRACKING_COMPUTER: 81,
  SENSOR_BOOSTER: 82,
  NAVIGATION_COMPUTER: 83,
  ARMOR_PLATING: 28,
  ARMOR_REPAIR: 30,
  HULL_MOD: 27,
  HULL_REPAIR: 31,
  SHIELD_RIG: 153,
  ARMOR_RIG: 154,
  NAVIGATION_RIG: 155,
  SUBSYSTEM: 186,
}

const SLOT_TYPE_MAP: Record<string, string> = {
  [MODULE_GROUPS.ENERGY_TURRET]: 'high',
  [MODULE_GROUPS.PROJECTILE_TURRET]: 'high',
  [MODULE_GROUPS.HYBRID_TURRET]: 'high',
  [MODULE_GROUPS.MISSILE_LAUNCHER]: 'high',
  [MODULE_GROUPS.SHIELD_BOOSTER]: 'high',
  [MODULE_GROUPS.ECM]: 'high',
  [MODULE_GROUPS.SENSOR_DAMP]: 'high',
  [MODULE_GROUPS.TRACKING_DISRUPTOR]: 'high',
  [MODULE_GROUPS.STASIS_WEB]: 'high',
  [MODULE_GROUPS.REMOTE_REPAIR]: 'high',
  [MODULE_GROUPS.NOS]: 'high',
  [MODULE_GROUPS.NEUTRALIZER]: 'high',
  
  [MODULE_GROUPS.AFTERBURNER]: 'med',
  [MODULE_GROUPS.MICRO_WARP]: 'med',
  [MODULE_GROUPS.SHIELD_EXTENSION]: 'med',
  [MODULE_GROUPS.TRACKING_COMPUTER]: 'med',
  [MODULE_GROUPS.SENSOR_BOOSTER]: 'med',
  [MODULE_GROUPS.NAVIGATION_COMPUTER]: 'med',
  
  [MODULE_GROUPS.ARMOR_PLATING]: 'low',
  [MODULE_GROUPS.ARMOR_REPAIR]: 'low',
  [MODULE_GROUPS.HULL_MOD]: 'low',
  [MODULE_GROUPS.HULL_REPAIR]: 'low',
  
  [MODULE_GROUPS.SHIELD_RIG]: 'rig',
  [MODULE_GROUPS.ARMOR_RIG]: 'rig',
  [MODULE_GROUPS.NAVIGATION_RIG]: 'rig',
  
  [MODULE_GROUPS.SUBSYSTEM]: 'subsystem',
}

export const dynamic = 'force-dynamic'

async function getDogmaAttributes(typeId: number): Promise<Record<number, number>> {
  const attrs: Record<number, number> = {}
  try {
    const res = await fetch(`${ESI_BASE}/dogma/attributes/?type_id=${typeId}`)
    if (res.ok) {
      const data = await res.json()
      for (const item of data) {
        attrs[item.attribute_id] = item.value
      }
    }
  } catch (e) {
    console.error(`Failed to get dogma for type ${typeId}:`, e)
  }
  return attrs
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') // 'ships' | 'modules' | 'all'
  const typeId = searchParams.get('typeId')
  const groupId = searchParams.get('groupId')
  const sync = searchParams.get('sync') === 'true'
  
  try {
    if (sync) {
      if (type === 'ships' || type === 'all') {
        await syncShipStats()
      }
      if (type === 'modules' || type === 'all') {
        await syncModuleStats()
      }
      return NextResponse.json({ success: true, message: 'Sync completed' })
    }
    
    if (typeId) {
      const id = parseInt(typeId)
      if (type === 'ships') {
        const shipStats = await prisma.shipStats.findUnique({ where: { typeId: id } })
        return NextResponse.json(shipStats)
      }
      if (type === 'modules') {
        const moduleStats = await prisma.moduleStats.findUnique({ where: { typeId: id } })
        return NextResponse.json(moduleStats)
      }
    }
    
    return NextResponse.json({ 
      message: 'Use /api/dogma?sync=true&type=all to sync',
      shipsCount: await prisma.shipStats.count(),
      modulesCount: await prisma.moduleStats.count()
    })
  } catch (error) {
    console.error('Dogma API error:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

async function syncShipStats() {
  console.log('Starting ship stats sync from ESI...')
  
  // Buscar todos os ship type IDs da API ESI (category 6 = Ships)
  const categoryResponse = await fetch(`${ESI_BASE}/universe/categories/6/`)
  if (!categoryResponse.ok) {
    console.error('Failed to fetch ship category')
    return
  }
  const categoryData = await categoryResponse.json()
  const shipTypeIds = categoryData.types || []
  
  console.log(`Found ${shipTypeIds.length} ship type IDs to sync`)
  
  let synced = 0
  let failed = 0
  
  for (const typeId of shipTypeIds) {
    try {
      // Buscar info básica do ship
      const typeResponse = await fetch(`${ESI_BASE}/universe/types/${typeId}/`)
      if (!typeResponse.ok) continue
      
      const typeData = await typeResponse.json()
      const shipName = typeData.name
      
      // Buscar atributos dogma
      const attrs = await getDogmaAttributes(typeId)
      
      const stats = {
        typeId: typeId,
        name: shipName,
        highSlots: attrs[DOGMA_ATTRS.HI_SLOTS] || 0,
        medSlots: attrs[DOGMA_ATTRS.MED_SLOTS] || 0,
        lowSlots: attrs[DOGMA_ATTRS.LOW_SLOTS] || 0,
        rigSlots: attrs[DOGMA_ATTRS.RIG_SLOTS] || 0,
        cpu: attrs[DOGMA_ATTRS.CPU] || 0,
        powerGrid: attrs[DOGMA_ATTRS.POWER] || 0,
        capacitor: attrs[DOGMA_ATTRS.CAPACITOR] || 0,
        capacitorRecharge: attrs[DOGMA_ATTRS.CAPACITOR_RECHARGE] || 280000,
        shieldCapacity: attrs[DOGMA_ATTRS.SHIELD_CAPACITY] || 0,
        armorHP: attrs[DOGMA_ATTRS.ARMOR_HP] || 0,
        hullHP: attrs[DOGMA_ATTRS.STRUCTURAL_INTEGRITY] || 0,
        
        shieldEmResist: (attrs[DOGMA_ATTRS.SHIELD_EM_RESIST] || 0) / 100,
        shieldExpResist: (attrs[DOGMA_ATTRS.SHIELD_EXPLOSIVE_RESIST] || 0) / 100,
        shieldKinResist: (attrs[DOGMA_ATTRS.SHIELD_KINETIC_RESIST] || 0) / 100,
        shieldThermResist: (attrs[DOGMA_ATTRS.SHIELD_THERMAL_RESIST] || 0) / 100,
        
        armorEmResist: (attrs[DOGMA_ATTRS.ARMOR_EM_RESIST] || 0) / 100,
        armorExpResist: (attrs[DOGMA_ATTRS.ARMOR_EXPLOSIVE_RESIST] || 0) / 100,
        armorKinResist: (attrs[DOGMA_ATTRS.ARMOR_KINETIC_RESIST] || 0) / 100,
        armorThermResist: (attrs[DOGMA_ATTRS.ARMOR_THERMAL_RESIST] || 0) / 100,
        
        hullEmResist: (attrs[DOGMA_ATTRS.HULL_EM_RESIST] || 0) / 100,
        hullExpResist: (attrs[DOGMA_ATTRS.HULL_EXPLOSIVE_RESIST] || 0) / 100,
        hullKinResist: (attrs[DOGMA_ATTRS.HULL_KINETIC_RESIST] || 0) / 100,
        hullThermResist: (attrs[DOGMA_ATTRS.HULL_THERMAL_RESIST] || 0) / 100,
        
        maxVelocity: attrs[DOGMA_ATTRS.MAX_VELOCITY] || 0,
        agility: attrs[DOGMA_ATTRS.AGILITY] || 1,
        mass: attrs[DOGMA_ATTRS.MASS] || 0,
        warpSpeed: attrs[DOGMA_ATTRS.WARP_SPEED] || 0,
        droneBay: attrs[DOGMA_ATTRS.DRONE_BAY_CAPACITY] || 0,
        cargo: attrs[DOGMA_ATTRS.CARGO_CAPACITY] || 0,
      }
      
      await prisma.shipStats.upsert({
        where: { typeId: typeId },
        update: stats,
        create: stats
      })
      
      synced++
      if (synced % 20 === 0) console.log(`Synced ${synced}/${shipTypeIds.length} ships`)
      
      // Rate limiting - small delay between requests
      await new Promise(r => setTimeout(r, 50))
      
    } catch (e) {
      failed++
      console.error(`Failed to sync ship ${typeId}:`, e)
    }
  }
  
  console.log(`Ship stats sync complete: ${synced} synced, ${failed} failed`)
}

async function syncModuleStats() {
  console.log('Starting module stats sync from ESI...')
  
  // Buscar os grupos de módulos que nos interessamos
  const moduleGroupIds = Object.values(MODULE_GROUPS)
  
  let allModuleTypeIds: number[] = []
  
  // Para cada grupo, buscar os tipos
  for (const groupId of moduleGroupIds) {
    try {
      const groupResponse = await fetch(`${ESI_BASE}/universe/groups/${groupId}/`)
      if (groupResponse.ok) {
        const groupData = await groupResponse.json()
        if (groupData.types) {
          allModuleTypeIds.push(...groupData.types)
        }
      }
    } catch (e) {
      console.error(`Failed to fetch group ${groupId}`)
    }
  }
  
  // Remover duplicados
  allModuleTypeIds = Array.from(new Set(allModuleTypeIds))
  
  console.log(`Found ${allModuleTypeIds.length} module type IDs to sync`)
  
  let synced = 0
  let failed = 0
  
  for (const typeId of allModuleTypeIds) {
    try {
      // Buscar info básica do módulo
      const typeResponse = await fetch(`${ESI_BASE}/universe/types/${typeId}/`)
      if (!typeResponse.ok) continue
      
      const typeData = await typeResponse.json()
      const modName = typeData.name
      
      // Buscar atributos dogma
      const attrs = await getDogmaAttributes(typeId)
      
      // Determinar o slot type baseado no groupId
      let slotType: string | null = null
      for (const [gid, slot] of Object.entries(SLOT_TYPE_MAP)) {
        if (Number(gid) === typeData.group_id) {
          slotType = slot
          break
        }
      }
      
      const groupId = typeData.group_id
      const isWeapon = [76, 77, 78, 79].includes(groupId)
      const isMissile = groupId === 79
      const isTank = [29, 30, 31].includes(groupId)
      const isEwar = [111, 112, 113, 65].includes(groupId)
      
      const stats = {
        typeId: typeId,
        name: modName,
        groupId: groupId || null,
        groupName: null,
        slotType,
        cpu: attrs[DOGMA_ATTRS.CPU_NEEDED] || 0,
        powerGrid: attrs[DOGMA_ATTRS.POWER_NEEDED] || 0,
        
        damage: isWeapon ? (attrs[DOGMA_ATTRS.DAMAGE] || 0) : 0,
        fireRate: isWeapon ? (attrs[DOGMA_ATTRS.FIRE_RATE] || 0) : 0,
        optimalRange: isWeapon ? (attrs[DOGMA_ATTRS.OPTIMAL_RANGE] || 0) : 0,
        falloffRange: isWeapon ? (attrs[DOGMA_ATTRS.FALLOFF_RANGE] || 0) : 0,
        trackingSpeed: isWeapon ? (attrs[DOGMA_ATTRS.TRACKING_SPEED] || 0) : 0,
        
        missileDamage: isMissile ? (attrs[DOGMA_ATTRS.MISSILE_DAMAGE] || 0) : 0,
        missileRange: isMissile ? (attrs[DOGMA_ATTRS.MISSILE_RANGE] || 0) : 0,
        missileVelocity: isMissile ? (attrs[DOGMA_ATTRS.MISSILE_VELOCITY] || 0) : 0,
        
        shieldBoost: groupId === 29 ? (attrs[DOGMA_ATTRS.SHIELD_BOOST] || 0) : 0,
        armorRepair: groupId === 30 ? (attrs[DOGMA_ATTRS.ARMOR_BOOST] || 0) : 0,
        hullRepair: groupId === 31 ? (attrs[DOGMA_ATTRS.HULL_BOOST] || 0) : 0,
        
        capacitorNeed: attrs[DOGMA_ATTRS.CAPACITOR_NEEDED] || 0,
        capacitorDrain: 0,
        
        ecmStrength: groupId === 111 ? (attrs[DOGMA_ATTRS.ECCM_SENSOR_STRENGTH] || 0) : 0,
        sensorDampStrength: groupId === 112 ? (attrs[DOGMA_ATTRS.SENSOR_DAMPENER_RANGE] || 0) : 0,
        trackingDisruptStrength: groupId === 113 ? (attrs[DOGMA_ATTRS.TRACKING_DISRUPTOR_RANGE] || 0) : 0,
        webSpeedPenalty: groupId === 65 ? (attrs[DOGMA_ATTRS.WEB_SPEED_FACTOR] || 0) : 0,
        webRangeBonus: groupId === 65 ? (attrs[DOGMA_ATTRS.WEB_RANGE] || 0) : 0,
      }
      
      await prisma.moduleStats.upsert({
        where: { typeId: typeId },
        update: stats,
        create: stats
      })
      
      synced++
      if (synced % 50 === 0) console.log(`Synced ${synced}/${allModuleTypeIds.length} modules`)
      
      // Rate limiting
      await new Promise(r => setTimeout(r, 50))
      
    } catch (e) {
      failed++
      console.error(`Failed to sync module ${typeId}:`, e)
    }
  }
  
  console.log(`Module stats sync complete: ${synced} synced, ${failed} failed`)
}