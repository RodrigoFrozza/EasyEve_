/**
 * Sync SDE - Sincroniza dados do EVE Online (SDE)
 * Executar: npx ts-node scripts/sync-sde.ts
 * 
 * O que faz:
 * 1. ShipStats - Busca stats de todas as ships (CPU, Power, Slots, HP)
 * 2. ModuleStats - Busca stats de todos os módulos
 * 3. EveType - Atualiza tipos com preços
 */

import { PrismaClient } from '@prisma/client'
import { getGroupTypes, getTypeDetails, getMarketPrices, getCategoryGroups } from '../src/lib/esi'

const prisma = new PrismaClient()

const ESI_BASE = 'https://esi.evetech.net/latest'

// Dogma attribute IDs
const DOGMA = {
  CPU: 19,
  POWER: 21,
  CAPACITOR: 22,
  CAPACITOR_RECHARGE: 64,
  HI_SLOTS: 47,
  MED_SLOTS: 48,
  LOW_SLOTS: 49,
  RIG_SLOTS: 1137,
  SHIELD_CAPACITY: 73,
  ARMOR_HP: 265,
  HULL_HP: 9,
  MAX_VELOCITY: 37,
  AGILITY: 70,
  MASS: 4,
  WARP_SPEED: 30,
  DRONE_BAY: 227,
  CARGO: 5,
}

// Module group IDs por slot type
const SLOT_GROUPS = {
  high: [76, 77, 78, 79, 29, 111, 112, 113, 65, 120, 35, 36], // Weapons + Utilities
  med: [33, 34, 32, 81, 82, 83], // Propulsion + EWAR
  low: [28, 30, 27, 31, 115], // Armor + Hull
  rig: [153, 154, 155], // Rigs
  subsystem: [186],
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function getDogmaAttributes(typeId: number): Promise<Record<number, number>> {
  const attrs: Record<number, number> = {}
  try {
    const res = await fetch(`${ESI_BASE}/dogma/attributes/?type_id=${typeId}`)
    if (!res.ok) return attrs
    const data = await res.json()
    for (const item of data) {
      attrs[item.attribute_id] = item.value
    }
  } catch (e) {
    // Ignore
  }
  return attrs
}

async function getTypeBasicInfo(typeId: number): Promise<any> {
  try {
    const res = await fetch(`${ESI_BASE}/universe/types/${typeId}/`)
    if (!res.ok) return null
    return await res.json()
  } catch (e) {
    return null
  }
}

async function getGroupInfo(groupId: number): Promise<string | null> {
  try {
    const res = await fetch(`${ESI_BASE}/universe/groups/${groupId}/`)
    if (!res.ok) return null
    const data = await res.json()
    return data.name || null
  } catch (e) {
    return null
  }
}

async function syncShipStats() {
  console.log('\n📦 Sincronizando ShipStats...')
  
  // Get all ships from database
  const ships = await prisma.eveType.findMany({
    where: {
      published: true,
      group: { categoryId: 6 } // Ship category
    },
    select: { id: true, name: true }
  })
  
  console.log(`   Encontradas ${ships.length} ships no banco`)
  
  let processed = 0
  let errors = 0
  
  for (const ship of ships) {
    try {
      // Get basic type info
      const typeInfo = await getTypeBasicInfo(ship.id)
      if (!typeInfo) {
        errors++
        continue
      }
      
      // Get dogma attributes
      const attrs = await getDogmaAttributes(ship.id)
      
      // Build stats object
      const stats = {
        typeId: ship.id,
        name: ship.name,
        highSlots: Math.round(attrs[DOGMA.HI_SLOTS] || typeInfo.hi_slot || 0),
        medSlots: Math.round(attrs[DOGMA.MED_SLOTS] || typeInfo.med_slot || 0),
        lowSlots: Math.round(attrs[DOGMA.LOW_SLOTS] || typeInfo.low_slot || 0),
        rigSlots: Math.round(attrs[DOGMA.RIG_SLOTS] || typeInfo.rig_slot || 0),
        cpu: attrs[DOGMA.CPU] || 0,
        powerGrid: attrs[DOGMA.POWER] || 0,
        capacitor: attrs[DOGMA.CAPACITOR] || 0,
        shieldCapacity: attrs[DOGMA.SHIELD_CAPACITY] || 0,
        armorHP: attrs[DOGMA.ARMOR_HP] || typeInfo.armorHP || 0,
        hullHP: attrs[DOGMA.HULL_HP] || typeInfo.structuralHP || 0,
        maxVelocity: attrs[DOGMA.MAX_VELOCITY] || typeInfo.maxSpeed || 0,
        agility: attrs[DOGMA.AGILITY] || typeInfo.agility || 0,
        warpSpeed: attrs[DOGMA.WARP_SPEED] || typeInfo.warpSpeed || 0,
        droneBay: attrs[DOGMA.DRONE_BAY] || typeInfo.droneCapacity || 0,
        cargo: attrs[DOGMA.CARGO] || typeInfo.cargoCapacity || 0,
        syncedAt: new Date()
      }
      
      // Upsert to database
      await prisma.shipStats.upsert({
        where: { typeId: ship.id },
        update: stats,
        create: stats
      })
      
      processed++
      
      // Log progress every 50 ships
      if (processed % 50 === 0) {
        console.log(`   Progresso: ${processed}/${ships.length}`)
      }
      
      // Rate limiting - be nice to ESI
      await sleep(100)
      
    } catch (error) {
      errors++
      console.error(`   Erro na ship ${ship.name}:`, error)
    }
  }
  
  console.log(`   ✓ ShipStats: ${processed} atualizadas, ${errors} erros`)
}

async function syncModuleStats() {
  console.log('\n📦 Sincronizando ModuleStats...')
  
  // Get all modules from database
  const modules = await prisma.eveType.findMany({
    where: {
      published: true,
      group: { categoryId: 7 } // Module category
    },
    select: { id: true, name: true, groupId: true }
  })
  
  console.log(`   Encontrados ${modules.length} módulos no banco`)
  
  let processed = 0
  let errors = 0
  
  for (const mod of modules) {
    try {
      // Get dogma attributes
      const attrs = await getDogmaAttributes(mod.id)
      
      // Determine slot type based on group
      let slotType: string | null = null
      for (const [type, groups] of Object.entries(SLOT_GROUPS)) {
        if (groups.includes(mod.groupId)) {
          slotType = type
          break
        }
      }
      
      // Get group name
      const groupName = await getGroupInfo(mod.groupId)
      
      // Build stats object
      const stats = {
        typeId: mod.id,
        name: mod.name,
        groupId: mod.groupId,
        groupName: groupName,
        cpu: attrs[DOGMA.CPU] || 0,
        powerGrid: attrs[DOGMA.POWER] || 0,
        slotType,
        effects: {},
        syncedAt: new Date()
      }
      
      // Upsert to database
      await prisma.moduleStats.upsert({
        where: { typeId: mod.id },
        update: stats,
        create: stats
      })
      
      processed++
      
      // Log progress every 100 modules
      if (processed % 100 === 0) {
        console.log(`   Progresso: ${processed}/${modules.length}`)
      }
      
      // Rate limiting
      await sleep(50)
      
    } catch (error) {
      errors++
    }
  }
  
  console.log(`   ✓ ModuleStats: ${processed} atualizados, ${errors} erros`)
}

async function syncEveTypes() {
  console.log('\n📦 Sincronizando EveTypes (preços)...')
  
  const prices = await getMarketPrices()
  console.log(`   Encontrados ${Object.keys(prices).length} preços`)
  
  // Get all types from database
  const types = await prisma.eveType.findMany({
    where: { published: true },
    select: { id: true, basePrice: true }
  })
  
  let updated = 0
  for (const type of types) {
    const price = prices[type.id]
    if (price && price !== type.basePrice) {
      await prisma.eveType.update({
        where: { id: type.id },
        data: { basePrice: price }
      })
      updated++
    }
  }
  
  console.log(`   ✓ ${updated} preços atualizados`)
}

async function main() {
  console.log('🚀 Iniciando Sync SDE EasyEve...')
  console.log(`   Início: ${new Date().toISOString()}`)
  
  const startTime = Date.now()
  
  try {
    // 1. Sync ShipStats
    await syncShipStats()
    
    // 2. Sync ModuleStats
    await syncModuleStats()
    
    // 3. Sync EveTypes (prices)
    await syncEveTypes()
    
    const duration = Math.round((Date.now() - startTime) / 1000)
    console.log(`\n✅ Sync SDE concluído em ${duration}s`)
    
  } catch (error) {
    console.error('\n❌ Erro no sync:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()