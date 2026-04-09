// Ship base attributes for fitting calculations
// Data sourced from database (SDE) with ESI fallback

import { prisma } from '../prisma'

export interface ShipBaseStats {
  typeId: number
  name: string
  cpu: number
  powerGrid: number
  highSlots: number
  medSlots: number
  lowSlots: number
  rigSlots: number
  subsystemSlots?: number
  capacitor: number
  capacitorRecharge: number
  shieldCapacity: number
  armorHP: number
  hullHP: number
  shieldEmResist: number
  shieldExplosiveResist: number
  shieldKineticResist: number
  shieldThermalResist: number
  armorEmResist: number
  armorExplosiveResist: number
  armorKineticResist: number
  armorThermalResist: number
  hullEmResist: number
  hullExplosiveResist: number
  hullKineticResist: number
  hullThermalResist: number
  maxVelocity: number
  agility: number
  mass: number
  warpSpeed: number
  droneBay: number
  cargo: number
  scanRange: number
  scanStrength: number
}

const ESI_BASE = 'https://esi.evetech.net/latest'

const SHIP_DOGMA_ATTRS = {
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

// Default ship stats as fallback (used if ESI fails)
const DEFAULT_CPU = 400
const DEFAULT_PG = 400
const DEFAULT_HIGH = 5
const DEFAULT_MED = 5
const DEFAULT_LOW = 5
const DEFAULT_RIG = 3
const DEFAULT_SHIELD = 1000
const DEFAULT_ARMOR = 2000
const DEFAULT_HULL = 1000
const DEFAULT_CAP = 300
const DEFAULT_VEL = 150
const DEFAULT_DRONE = 50
const DEFAULT_CARGO = 300

export async function getShipStats(shipName: string): Promise<ShipBaseStats | null> {
  try {
    // First try to get from database
    const shipType = await prisma.eveType.findFirst({
      where: { name: shipName, published: true },
      include: { group: true }
    })
    
    if (shipType) {
      // Get additional stats from ESI
      const attrs = await getShipDogmaAttributes(shipType.id)
      return {
        typeId: shipType.id,
        name: shipType.name,
        cpu: attrs.cpu || DEFAULT_CPU,
        powerGrid: attrs.power || DEFAULT_PG,
        highSlots: attrs.high || DEFAULT_HIGH,
        medSlots: attrs.med || DEFAULT_MED,
        lowSlots: attrs.low || DEFAULT_LOW,
        rigSlots: attrs.rig || DEFAULT_RIG,
        capacitor: attrs.capacitor || DEFAULT_CAP,
        capacitorRecharge: 280000,
        shieldCapacity: attrs.shield || DEFAULT_SHIELD,
        armorHP: attrs.armor || DEFAULT_ARMOR,
        hullHP: attrs.hull || DEFAULT_HULL,
        shieldEmResist: 0,
        shieldExplosiveResist: 0.2,
        shieldKineticResist: 0.5,
        shieldThermalResist: 0.2,
        armorEmResist: 0.5,
        armorExplosiveResist: 0.7,
        armorKineticResist: 0.625,
        armorThermalResist: 0.8125,
        hullEmResist: 0.33,
        hullExplosiveResist: 0.5,
        hullKineticResist: 0.375,
        hullThermalResist: 0.125,
        maxVelocity: attrs.velocity || DEFAULT_VEL,
        agility: 3.0,
        mass: 10000000,
        warpSpeed: 3,
        droneBay: attrs.drone || DEFAULT_DRONE,
        cargo: attrs.cargo || DEFAULT_CARGO,
        scanRange: 0,
        scanStrength: 0
      }
    }
  } catch (error) {
    console.error('Error fetching ship from DB:', error)
  }
  
  // Fallback to ESI
  return getShipFromESI(shipName)
}

export async function getShipFromESI(shipName: string): Promise<ShipBaseStats | null> {
  try {
    const searchRes = await fetch(`${ESI_BASE}/search/?categories=ship&search=${encodeURIComponent(shipName)}&strict=true`)
    if (!searchRes.ok) return null
    
    const searchData = await searchRes.json()
    if (!searchData.ship || !searchData.ship[0]) return null
    
    const typeId = searchData.ship[0]
    const typeRes = await fetch(`${ESI_BASE}/universe/types/${typeId}/`)
    if (!typeRes.ok) return null
    
    const typeData = await typeRes.json()
    const attrs = await getShipDogmaAttributes(typeId)
    
    return {
      typeId,
      name: typeData.name,
      cpu: attrs.cpu || DEFAULT_CPU,
      powerGrid: attrs.power || DEFAULT_PG,
      highSlots: typeData.hi_slot || DEFAULT_HIGH,
      medSlots: typeData.med_slot || DEFAULT_MED,
      lowSlots: typeData.low_slot || DEFAULT_LOW,
      rigSlots: typeData.rig_slot || DEFAULT_RIG,
      capacitor: attrs.capacitor || DEFAULT_CAP,
      capacitorRecharge: 280000,
      shieldCapacity: attrs.shield || DEFAULT_SHIELD,
      armorHP: typeData.armorHP || DEFAULT_ARMOR,
      hullHP: typeData.structuralHP || DEFAULT_HULL,
      shieldEmResist: 0,
      shieldExplosiveResist: 0.2,
      shieldKineticResist: 0.5,
      shieldThermalResist: 0.2,
      armorEmResist: 0.5,
      armorExplosiveResist: 0.7,
      armorKineticResist: 0.625,
      armorThermalResist: 0.8125,
      hullEmResist: 0.33,
      hullExplosiveResist: 0.5,
      hullKineticResist: 0.375,
      hullThermalResist: 0.125,
      maxVelocity: typeData.maxSpeed || DEFAULT_VEL,
      agility: typeData.agility || 3.0,
      mass: typeData.mass || 10000000,
      warpSpeed: typeData.warpSpeed || 3,
      droneBay: typeData.droneCapacity || DEFAULT_DRONE,
      cargo: typeData.cargoCapacity || DEFAULT_CARGO,
      scanRange: 0,
      scanStrength: 0
    }
  } catch (error) {
    console.error('Error fetching ship from ESI:', error)
    return null
  }
}

async function getShipDogmaAttributes(typeId: number): Promise<Record<string, number>> {
  const attrs: Record<string, number> = {}
  
  try {
    const res = await fetch(`${ESI_BASE}/dogma/attributes/?type_id=${typeId}`)
    if (!res.ok) return attrs
    
    const data = await res.json()
    for (const item of data) {
      const attrId = item.attribute_id
      const value = item.value
      
      if (attrId === SHIP_DOGMA_ATTRS.CPU) attrs.cpu = value
      else if (attrId === SHIP_DOGMA_ATTRS.POWER) attrs.power = value
      else if (attrId === SHIP_DOGMA_ATTRS.HI_SLOTS) attrs.high = value
      else if (attrId === SHIP_DOGMA_ATTRS.MED_SLOTS) attrs.med = value
      else if (attrId === SHIP_DOGMA_ATTRS.LOW_SLOTS) attrs.low = value
      else if (attrId === SHIP_DOGMA_ATTRS.RIG_SLOTS) attrs.rig = value
      else if (attrId === SHIP_DOGMA_ATTRS.SHIELD_CAPACITY) attrs.shield = value
      else if (attrId === SHIP_DOGMA_ATTRS.ARMOR_HP) attrs.armor = value
      else if (attrId === SHIP_DOGMA_ATTRS.HULL_HP) attrs.hull = value
      else if (attrId === SHIP_DOGMA_ATTRS.CAPACITOR) attrs.capacitor = value
      else if (attrId === SHIP_DOGMA_ATTRS.MAX_VELOCITY) attrs.velocity = value
      else if (attrId === SHIP_DOGMA_ATTRS.DRONE_BAY) attrs.drone = value
      else if (attrId === SHIP_DOGMA_ATTRS.CARGO) attrs.cargo = value
    }
  } catch (error) {
    // Ignore errors, return what's available
  }
  
  return attrs
}

export async function getAllShipNames(): Promise<string[]> {
  try {
    const ships = await prisma.eveType.findMany({
      where: {
        published: true,
        group: { categoryId: 6 } // Ship category
      },
      select: { name: true },
      orderBy: { name: 'asc' },
      take: 500
    })
    return ships.map(s => s.name)
  } catch {
    return []
  }
}

export async function getShipByTypeId(typeId: number): Promise<ShipBaseStats | null> {
  try {
    const shipType = await prisma.eveType.findUnique({
      where: { id: typeId }
    })
    
    if (shipType) {
      const attrs = await getShipDogmaAttributes(typeId)
      return {
        typeId,
        name: shipType.name,
        cpu: attrs.cpu || DEFAULT_CPU,
        powerGrid: attrs.power || DEFAULT_PG,
        highSlots: attrs.high || DEFAULT_HIGH,
        medSlots: attrs.med || DEFAULT_MED,
        lowSlots: attrs.low || DEFAULT_LOW,
        rigSlots: attrs.rig || DEFAULT_RIG,
        capacitor: attrs.capacitor || DEFAULT_CAP,
        capacitorRecharge: 280000,
        shieldCapacity: attrs.shield || DEFAULT_SHIELD,
        armorHP: attrs.armor || DEFAULT_ARMOR,
        hullHP: attrs.hull || DEFAULT_HULL,
        shieldEmResist: 0,
        shieldExplosiveResist: 0.2,
        shieldKineticResist: 0.5,
        shieldThermalResist: 0.2,
        armorEmResist: 0.5,
        armorExplosiveResist: 0.7,
        armorKineticResist: 0.625,
        armorThermalResist: 0.8125,
        hullEmResist: 0.33,
        hullExplosiveResist: 0.5,
        hullKineticResist: 0.375,
        hullThermalResist: 0.125,
        maxVelocity: attrs.velocity || DEFAULT_VEL,
        agility: 3.0,
        mass: 10000000,
        warpSpeed: 3,
        droneBay: attrs.drone || DEFAULT_DRONE,
        cargo: attrs.cargo || DEFAULT_CARGO,
        scanRange: 0,
        scanStrength: 0
      }
    }
  } catch (error) {
    console.error('Error getting ship by typeId:', error)
  }
  
  return null
}