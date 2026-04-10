// Dogma Calculator - Sistema de cálculo para fits de EVE Online
// Versão 2.0 - Usa dados do banco (ShipStats, ModuleStats) com fallback ESI

import { prisma } from '@/lib/prisma'

// Extended types with all database fields
interface ShipStatsDb {
  typeId: number
  name: string
  highSlots: number
  medSlots: number
  lowSlots: number
  rigSlots: number
  cpu: number
  powerGrid: number
  capacitor: number
  capacitorRecharge: number
  shieldCapacity: number
  armorHP: number
  hullHP: number
  shieldEmResist: number
  shieldExpResist: number
  shieldKinResist: number
  shieldThermResist: number
  armorEmResist: number
  armorExpResist: number
  armorKinResist: number
  armorThermResist: number
  hullEmResist: number
  hullExpResist: number
  hullKinResist: number
  hullThermResist: number
  maxVelocity: number
  agility: number
  mass: number
  warpSpeed: number
  droneBay: number
  cargo: number
  syncedAt: Date
  updatedAt: Date
}

interface ModuleStatsDb {
  typeId: number
  name: string
  groupId: number | null
  groupName: string | null
  slotType: string | null
  cpu: number
  powerGrid: number
  damage: number
  fireRate: number
  optimalRange: number
  falloffRange: number
  trackingSpeed: number
  missileDamage: number
  missileRange: number
  missileVelocity: number
  shieldBoost: number
  armorRepair: number
  hullRepair: number
  capacitorNeed: number
  capacitorDrain: number
  ecmStrength: number
  sensorDampStrength: number
  trackingDisruptStrength: number
  webSpeedPenalty: number
  webRangeBonus: number
  syncedAt: Date
  updatedAt: Date
}

// --- Tipos ---

export interface FitModule {
  typeId: number
  name?: string
  chargeTypeId?: number
  offline?: boolean
  quantity?: number
}

export interface FitSlot {
  high: FitModule[]
  med: FitModule[]
  low: FitModule[]
  rig: FitModule[]
  subsystem?: FitModule[]
  drone?: FitModule[]
  cargo?: FitModule[]
}

export interface FitStats {
  cpu: { used: number; total: number; free: number; overflow: boolean }
  power: { used: number; total: number; free: number; overflow: boolean }
  
  slots: {
    high: { used: number; total: number; overflow: boolean }
    med: { used: number; total: number; overflow: boolean }
    low: { used: number; total: number; overflow: boolean }
    rig: { used: number; total: number; overflow: boolean }
  }
  
  dps: { 
    total: number
    turret: number
    missile: number
    drone: number
  }
  volley: { total: number }
  range: { optimal: number; falloff: number }
  
  tank: {
    shield: { hp: number; regen: number; maxRegen: number }
    armor: { hp: number; repair: number }
    hull: { hp: number; repair: number }
  }
  ehp: { shield: number; armor: number; hull: number; total: number }
  
  capacitor: {
    capacity: number
    rechargeRate: number
    stable: boolean
    usePerSecond: number
    deltaPerSecond: number
    timeToEmpty: number
  }
  
  // Internal tracking for calculations
  _capacitorUsePerSecond?: number
  
  droneBay: { volume: number; maxVolume: number }
  cargo: { volume: number; maxVolume: number }
  
  velocity: {
    alignTime: number
    warpSpeed: number
    maxSpeed: number
  }
  
  cost: number
}

export interface ShipBaseStats {
  typeId: number
  name: string
  highSlots: number
  medSlots: number
  lowSlots: number
  rigSlots: number
  cpu: number
  powerGrid: number
  capacitor: number
  capacitorRecharge: number
  shieldCapacity: number
  armorHP: number
  hullHP: number
  shieldEmResist: number
  shieldExpResist: number
  shieldKinResist: number
  shieldThermResist: number
  armorEmResist: number
  armorExpResist: number
  armorKinResist: number
  armorThermResist: number
  hullEmResist: number
  hullExpResist: number
  hullKinResist: number
  hullThermResist: number
  maxVelocity: number
  agility: number
  mass: number
  warpSpeed: number
  droneBay: number
  cargo: number
}

export interface ModuleBaseStats {
  typeId: number
  name: string
  groupId: number | null
  groupName: string | null
  slotType: string | null
  cpu: number
  powerGrid: number
  damage: number
  fireRate: number
  optimalRange: number
  falloffRange: number
  trackingSpeed: number
  missileDamage: number
  missileRange: number
  missileVelocity: number
  shieldBoost: number
  armorRepair: number
  hullRepair: number
  capacitorNeed: number
  capacitorDrain: number
  ecmStrength: number
  sensorDampStrength: number
  trackingDisruptStrength: number
  webSpeedPenalty: number
  webRangeBonus: number
}

// --- Cache ---

const shipStatsCache = new Map<number, ShipBaseStats>()
const moduleStatsCache = new Map<number, ModuleBaseStats>()

// --- API Functions ---
/**
 * Fetches base ship statistics from the database with caching.
 * @param typeId The ESI type_id for the ship
 */
export async function getShipStats(typeId: number): Promise<ShipBaseStats | null> {
  if (shipStatsCache.has(typeId)) {
    return shipStatsCache.get(typeId)!
  }
  
  try {
    const stats = await prisma.shipStats.findUnique({ where: { typeId } }) as ShipStatsDb | null
    if (stats) {
      const fullStats: ShipBaseStats = {
        typeId: stats.typeId,
        name: stats.name,
        highSlots: stats.highSlots || 0,
        medSlots: stats.medSlots || 0,
        lowSlots: stats.lowSlots || 0,
        rigSlots: stats.rigSlots || 0,
        cpu: stats.cpu || 0,
        powerGrid: stats.powerGrid || 0,
        capacitor: stats.capacitor || 0,
        capacitorRecharge: stats.capacitorRecharge || 280000,
        shieldCapacity: stats.shieldCapacity || 0,
        armorHP: stats.armorHP || 0,
        hullHP: stats.hullHP || 0,
        shieldEmResist: stats.shieldEmResist || 0,
        shieldExpResist: stats.shieldExpResist || 0,
        shieldKinResist: stats.shieldKinResist || 0,
        shieldThermResist: stats.shieldThermResist || 0,
        armorEmResist: stats.armorEmResist || 0,
        armorExpResist: stats.armorExpResist || 0,
        armorKinResist: stats.armorKinResist || 0,
        armorThermResist: stats.armorThermResist || 0,
        hullEmResist: stats.hullEmResist || 0,
        hullExpResist: stats.hullExpResist || 0,
        hullKinResist: stats.hullKinResist || 0,
        hullThermResist: stats.hullThermResist || 0,
        maxVelocity: stats.maxVelocity || 0,
        agility: stats.agility || 1,
        mass: stats.mass || 0,
        warpSpeed: stats.warpSpeed || 0,
        droneBay: stats.droneBay || 0,
        cargo: stats.cargo || 0,
      }
      shipStatsCache.set(typeId, fullStats)
      return fullStats
    }
  } catch (e) {
    console.error('Error fetching ship stats:', e)
  }
  
  return null
}

/**
 * Searches for ship stats by name (case-insensitive).
 */
export async function getShipByName(name: string): Promise<ShipBaseStats | null> {
  try {
    const stats = await prisma.shipStats.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } }
    })
    if (stats) {
      const fullStats: ShipBaseStats = {
        typeId: stats.typeId,
        name: stats.name,
        highSlots: stats.highSlots || 0,
        medSlots: stats.medSlots || 0,
        lowSlots: stats.lowSlots || 0,
        rigSlots: stats.rigSlots || 0,
        cpu: stats.cpu || 0,
        powerGrid: stats.powerGrid || 0,
        capacitor: stats.capacitor || 0,
        capacitorRecharge: stats.capacitorRecharge || 280000,
        shieldCapacity: stats.shieldCapacity || 0,
        armorHP: stats.armorHP || 0,
        hullHP: stats.hullHP || 0,
        shieldEmResist: stats.shieldEmResist || 0,
        shieldExpResist: stats.shieldExpResist || 0,
        shieldKinResist: stats.shieldKinResist || 0,
        shieldThermResist: stats.shieldThermResist || 0,
        armorEmResist: stats.armorEmResist || 0,
        armorExpResist: stats.armorExpResist || 0,
        armorKinResist: stats.armorKinResist || 0,
        armorThermResist: stats.armorThermResist || 0,
        hullEmResist: stats.hullEmResist || 0,
        hullExpResist: stats.hullExpResist || 0,
        hullKinResist: stats.hullKinResist || 0,
        hullThermResist: stats.hullThermResist || 0,
        maxVelocity: stats.maxVelocity || 0,
        agility: stats.agility || 1,
        mass: stats.mass || 0,
        warpSpeed: stats.warpSpeed || 0,
        droneBay: stats.droneBay || 0,
        cargo: stats.cargo || 0,
      }
      shipStatsCache.set(stats.typeId, fullStats)
      return fullStats
    }
  } catch (e) {
    console.error('Error fetching ship by name:', e)
  }
  
  return null
}

/**
 * Fetches base module statistics from the database with caching.
 */
export async function getModuleStats(typeId: number): Promise<ModuleBaseStats | null> {
  if (moduleStatsCache.has(typeId)) {
    return moduleStatsCache.get(typeId)!
  }
  
  try {
    const stats = await prisma.moduleStats.findUnique({ where: { typeId } })
    if (stats) {
      moduleStatsCache.set(typeId, stats)
      return stats
    }
  } catch (e) {
    console.error('Error fetching module stats:', e)
  }
  
  return null
}

/**
 * Searches for module stats by name partial match (case-insensitive).
 */
export async function getModuleByName(name: string): Promise<ModuleBaseStats | null> {
  try {
    const stats = await prisma.moduleStats.findFirst({
      where: { name: { contains: name, mode: 'insensitive' } }
    })
    if (stats) {
      moduleStatsCache.set(stats.typeId, stats)
      return stats
    }
  } catch (e) {
    console.error('Error fetching module by name:', e)
  }
  
  return null
}

/**
 * Performs full fit calculations (CPU, Power, Tank, DPS, Capacitor).
 * 
 * Capacitor Logic: Uses a simplified delta/s approach based on Peak Recharge.
 * Peak Recharge occurs at ~25% capacitor level and provides 2.5x the average recharge rate.
 * 
 * Tank Logic: Calculates passive shield regen and active repair cycles.
 * 
 * @param ship Base ship statistics
 * @param slots Currently fitted modules
 */
export async function calculateFitStats(
  ship: ShipBaseStats,
  slots: FitSlot
): Promise<FitStats> {
  const stats: FitStats = {
    cpu: { used: 0, total: ship.cpu, free: ship.cpu, overflow: false },
    power: { used: 0, total: ship.powerGrid, free: ship.powerGrid, overflow: false },
    slots: {
      high: { used: 0, total: ship.highSlots, overflow: false },
      med: { used: 0, total: ship.medSlots, overflow: false },
      low: { used: 0, total: ship.lowSlots, overflow: false },
      rig: { used: 0, total: ship.rigSlots, overflow: false }
    },
    dps: { total: 0, turret: 0, missile: 0, drone: 0 },
    volley: { total: 0 },
    range: { optimal: 0, falloff: 0 },
    tank: {
      shield: { hp: ship.shieldCapacity, regen: 0, maxRegen: 0 },
      armor: { hp: ship.armorHP, repair: 0 },
      hull: { hp: ship.hullHP, repair: 0 }
    },
    ehp: { shield: 0, armor: 0, hull: 0, total: 0 },
    capacitor: {
      capacity: ship.capacitor,
      rechargeRate: ship.capacitorRecharge,
      stable: true,
      usePerSecond: 0,
      deltaPerSecond: 0,
      timeToEmpty: Infinity
    },
    droneBay: { volume: 0, maxVolume: ship.droneBay },
    cargo: { volume: 0, maxVolume: ship.cargo },
    velocity: {
      alignTime: 0,
      warpSpeed: ship.warpSpeed,
      maxSpeed: ship.maxVelocity
    },
    cost: 0
  }
  
  // Calculate slot usage
  stats.slots.high.used = slots.high.filter(m => !m.offline).length
  stats.slots.med.used = slots.med.filter(m => !m.offline).length
  stats.slots.low.used = slots.low.filter(m => !m.offline).length
  stats.slots.rig.used = slots.rig.filter(m => !m.offline).length
  
  // Check slot overflow
  stats.slots.high.overflow = stats.slots.high.used > stats.slots.high.total
  stats.slots.med.overflow = stats.slots.med.used > stats.slots.med.total
  stats.slots.low.overflow = stats.slots.low.used > stats.slots.low.total
  stats.slots.rig.overflow = stats.slots.rig.used > stats.slots.rig.total
  
  // Process each slot
  await processSlot(slots.high, 'high', stats)
  await processSlot(slots.med, 'med', stats)
  await processSlot(slots.low, 'low', stats)
  await processSlot(slots.rig, 'rig', stats)
  
  // Calculate drones
  if (slots.drone) {
    for (const drone of slots.drone) {
      const droneDps = getDroneDps(drone.typeId)
      const qty = drone.quantity || 1
      stats.dps.drone += droneDps.dps * qty
    }
  }
  
  stats.dps.total = stats.dps.turret + stats.dps.missile + stats.dps.drone
  
  // Calculate CPU/Power overflow
  stats.cpu.overflow = stats.cpu.used > stats.cpu.total
  stats.power.overflow = stats.power.used > stats.power.total
  
  // Calculate free resources
  stats.cpu.free = Math.max(0, stats.cpu.total - stats.cpu.used)
  stats.power.free = Math.max(0, stats.power.total - stats.power.used)
  
  // Calculate capacitor stability
  const capUse = (stats as any)._capacitorUsePerSecond || 0
  if (capUse > 0) {
    // EVE Capacitor Math: Peak recharge is at 25% cap.
    // Max recharge rate = (10 * Capacitor Capacity / Recharge Time) * (sqrt(VC/CC) - (VC/CC))
    // Simplification for UI: use 2.5x the nominal rate at peak.
    const capDelta = (ship.capacitorRecharge / 1000) * 0.25 - capUse
    stats.capacitor.deltaPerSecond = capDelta
    stats.capacitor.stable = capDelta >= 0
    stats.capacitor.usePerSecond = capUse
    
    if (!stats.capacitor.stable && capUse > 0) {
      stats.capacitor.timeToEmpty = ship.capacitor / capUse
    }
  }
  
  // Calculate EHP
  calculateEHP(stats, ship)
  
  // Calculate align time: align = (mass * agility / 500,000) * ln(2)
  if (ship.mass > 0 && ship.agility > 0) {
    stats.velocity.alignTime = (ship.mass * ship.agility / 500000) * Math.log(2)
  }
  
  return stats
}

async function processSlot(
  modules: FitModule[],
  slotType: string,
  stats: FitStats
) {
  for (const mod of modules) {
    if (mod.offline) continue
    
    const modStats = await getModuleStats(mod.typeId)
    
    if (!modStats) {
      // Fallback: use basic estimates for unknown modules
      stats.cpu.used += 5
      stats.power.used += 5
      continue
    }
    
    // Requirements
    stats.cpu.used += modStats.cpu
    stats.power.used += modStats.powerGrid
    
    // Weapon DPS
    if (modStats.damage > 0 && modStats.fireRate > 0) {
      const dps = modStats.damage / modStats.fireRate
      stats.dps.turret += dps
      stats.volley.total += modStats.damage
      stats.range.optimal = Math.max(stats.range.optimal, modStats.optimalRange)
      stats.range.falloff = Math.max(stats.range.falloff, modStats.falloffRange)
    }
    
    // Missile DPS
    if (modStats.missileDamage > 0 && modStats.fireRate > 0) {
      const dps = modStats.missileDamage / modStats.fireRate
      stats.dps.missile += dps
      stats.volley.total += modStats.missileDamage
    }
    
    // Tank (Shield Boosters)
    if (modStats.shieldBoost > 0) {
      stats.tank.shield.maxRegen += modStats.shieldBoost
      stats.tank.shield.regen = modStats.shieldBoost
    }
    
    // Tank (Armor Repairers)
    if (modStats.armorRepair > 0) {
      stats.tank.armor.repair += modStats.armorRepair
    }
    
    // Tank (Hull Repairers)
    if (modStats.hullRepair > 0) {
      stats.tank.hull.repair += modStats.hullRepair
    }
    
    // Capacitor usage
    if (modStats.capacitorNeed > 0) {
      // Track total activation cost per second
      (stats as any)._capacitorUsePerSecond = ((stats as any)._capacitorUsePerSecond || 0) + (modStats.capacitorNeed / (modStats.fireRate || 1))
    }
  }
}

/**
 * Calculates Effective Hit Points (EHP) by applying resistance multipliers to raw HP.
 * EHP = HP / (1 - Resistance)
 */
function calculateEHP(stats: FitStats, ship: ShipBaseStats) {
  const shieldMult = 1 / (1 - Math.max(
    ship.shieldEmResist,
    ship.shieldExpResist,
    ship.shieldKinResist,
    ship.shieldThermResist
  ))
  
  const armorMult = 1 / (1 - Math.max(
    ship.armorEmResist,
    ship.armorExpResist,
    ship.armorKinResist,
    ship.armorThermResist
  ))
  
  const hullMult = 1 / (1 - Math.max(
    ship.hullEmResist,
    ship.hullExpResist,
    ship.hullKinResist,
    ship.hullThermResist
  ))
  
  stats.ehp.shield = stats.tank.shield.hp * shieldMult
  stats.ehp.armor = stats.tank.armor.hp * armorMult
  stats.ehp.hull = stats.tank.hull.hp * hullMult
  stats.ehp.total = stats.ehp.shield + stats.ehp.armor + stats.ehp.hull
}

/**
 * Simple lookup table for baseline drone DPS.
 * @param typeId ESI type_id of the drone
 */
function getDroneDps(typeId: number): { dps: number; tracking: number } {
  return { dps: DRONE_DPS[typeId] || 10, tracking: 1 }
}

/**
 * Parses EFT (Eve Fitting Tool) formatted text into a structured slot object.
 * EFT format: [Ship Title, Fit Name] followed by modules per slot.
 */
export function parseEftFormat(eftText: string): Partial<FitSlot> & { shipName: string; fitName: string } {
  const lines = eftText.trim().split('\n')
  const result: any = {
    shipName: '',
    fitName: '',
    high: [],
    med: [],
    low: [],
    rig: []
  }
  
  if (lines.length === 0) return result
  
  // Parse header: [Ship Name, Fit Name]
  const firstLine = lines[0].replace(/[\[\]]/g, '')
  const headerParts = firstLine.split(',')
  result.shipName = headerParts[0]?.trim() || ''
  result.fitName = headerParts[1]?.trim() || 'Unnamed Fit'
  
  let currentSlot: keyof FitSlot = 'high'
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Skip section headers
    if (line.startsWith('[')) continue
    
    // Detect slot type based on content hints
    const lowerLine = line.toLowerCase()
    if (lowerLine.includes('rig ')) {
      currentSlot = 'rig'
      continue
    }
    if (lowerLine.includes('mid ') || lowerLine.includes('med ')) {
      currentSlot = 'med'
      continue
    }
    if (lowerLine.includes('low ')) {
      currentSlot = 'low'
      continue
    }
    
    // Skip empty slots
    if (lowerLine.includes('empty')) continue
    
    // Parse module (may have /offline)
    const offline = line.endsWith('/offline')
    const modName = line.replace('/offline', '').trim()
    
    result[currentSlot].push({
      typeId: 0,
      name: modName,
      offline
    })
  }
  
  return result
}

/**
 * Converts a structured fit back into the standard EFT format string.
 */
export function fitToEftFormat(
  shipName: string,
  fitName: string,
  slots: FitSlot
): string {
  const lines: string[] = []
  
  // Header
  lines.push(`[${shipName}, ${fitName}]`)
  lines.push('')
  
  // High slots
  for (const mod of slots.high) {
    lines.push(mod.offline ? `${mod.name || mod.typeId} /offline` : (mod.name || mod.typeId))
  }
  lines.push('')
  
  // Med slots
  for (const mod of slots.med) {
    lines.push(mod.offline ? `${mod.name || mod.typeId} /offline` : (mod.name || mod.typeId))
  }
  lines.push('')
  
  // Low slots
  for (const mod of slots.low) {
    lines.push(mod.offline ? `${mod.name || mod.typeId} /offline` : (mod.name || mod.typeId))
  }
  lines.push('')
  
  // Rigs
  for (const mod of slots.rig) {
    lines.push(mod.name || mod.typeId)
  }
  lines.push('')
  
  // Drones
  if (slots.drone && slots.drone.length > 0) {
    for (const drone of slots.drone) {
      lines.push(`${drone.name || drone.typeId} x${drone.quantity || 1}`)
    }
  }
  
  return lines.join('\n')
}

// Export singleton interface
export default {
  getShipStats,
  getShipByName,
  getModuleStats,
  getModuleByName,
  calculateFitStats,
  parseEftFormat,
  fitToEftFormat
}

}