// Dogma Calculator - Sistema de cálculo para fits de EVE Online
// Calcula CPU, PowerGrid, DPS, Tank, EHP, Capacitor

import { prisma } from '@/lib/prisma'

const ESI_BASE_URL = 'https://esi.evetech.net/latest'

// --- Tipos ---

export interface FitModule {
  typeId: number
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
  // Requisitos
  cpu: { used: number; total: number; free: number }
  power: { used: number; total: number; free: number }
  
  // Slots
  highSlots: { used: number; total: number }
  medSlots: { used: number; total: number }
  lowSlots: { used: number; total: number }
  rigSlots: { used: number; total: number }
  
  // Combat Stats
  dps: { total: number; projectile: number; missile: number; drone: number; hybrid: number; laser: number }
  volley: { total: number }
  range: { optimal: number; falloff: number; missileRange: number }
  
  // Tank
  tank: {
    shield: { hp: number; regen: number; resist: { thermal: number; kinetic: number; explosive: number; em: number } }
    armor: { hp: number; resist: { thermal: number; kinetic: number; explosive: number; em: number } }
    hull: { hp: number; resist: { thermal: number; kinetic: number; explosive: number; em: number } }
  }
  ehp: { shield: number; armor: number; hull: number; total: number }
  
  // Capacitor
  capacitor: {
    capacity: number
    rechargeRate: number
    stable: boolean
    usePerSecond: number
    deltaPerSecond: number
  }
  
  // Cargas
  droneBay: { volume: number; maxVolume: number }
  cargo: { volume: number; maxVolume: number }
  
  // Velocidade
  velocity: {
    alignTime: number
    warpSpeed: number
    maxSpeed: number
    mass: number
  }
  
  // Custo estimado
  cost?: number
}

// Ship base attributes (from SDE/ESI)
export interface ShipAttributes {
  typeId: number
  name: string
  
  // Requisitos	base
  cpu: number
  powerGrid: number
  
  // Slots
  highSlots: number
  medSlots: number
  lowSlots: number
  rigSlots: number
  subsystemSlots?: number
  
  // Capacidades base
  capacitorCapacity: number
  capacitorRecharge: number
  
  // HP Base
  shieldCapacity: number
  armorCapacity: number
  hullCapacity: number
  
  // Resistências ship
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
  
  // Velocidade
  maxVelocity: number
  maxSpeed: number
  agility: number
  mass: number
  warpSpeed: number
  alignTime: number
  
  // Cargas
  droneBayCapacity: number
  cargoCapacity: number
  
  // Scan
  scanRange: number
  scanResolving: number
}

// Módulo info (from SDE/ESI)
export interface ModuleAttributes {
  typeId: number
  name: string
  groupId: number
  groupName: string
  
  // Requisitos
  cpu: number
  power: number
  slots: ('high' | 'med' | 'low' | 'rig' | 'subsystem')[]
  
  // Efeitos
  isWeapon?: boolean
  damage?: number
  
  // Tank
  shieldCapacity?: number
  shieldBoostAmount?: number
  shieldBoostDelay?: number
  armorRepairAmount?: number
  armorRepairDelay?: number
  hullRepairAmount?: number
  
  // Electronic Warfare
  ewar?: {
    type: 'web' | 'sensorDamp' | 'trackingDisruptor' | 'ecm' | 'paint' | 'disruptor'
    strength?: number
    range?: number
  }
  
  // Propulsion
  propulsion?: {
    type: 'afterburner' | 'microwarpdrive'
    boost?: number
    speedBonus?: number
  }
  
  // Cargas
  capacity?: number
  volume?: number
  
  // Drones
  isDrone?: boolean
  droneDamage?: number
  droneRange?: number
  droneTracking?: number
  
  //Charges
  isCharge?: boolean
  chargeDamage?: { em: number; thermal: number; kinetic: number; explosive: number }
  chargeRange?: number
  chargeVelocity?: number
}

// --- Dogma Attribute IDs ---
const DOGMA = {
  // Ship base attributes
  CPU: 19,
  POWER: 21,
  CAPACITOR: 22,
  CAPACITOR_RECHARGE: 64,
  
  // Slots
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
  SHIELD_PASSIVE: 109,
  
  // Resistências (Shield)
  SHIELD_EM_RESIST: 110,
  SHIELD_EXPLOSIVE_RESIST: 111,
  SHIELD_KINETIC_RESIST: 112,
  SHIELD_THERMAL_RESIST: 113,
  
  // Resistências (Armor)
  ARMOR_EM_RESIST: 267,
  ARMOR_EXPLOSIVE_RESIST: 268,
  ARMOR_KINETIC_RESIST: 269,
  ARMOR_THERMAL_RESIST: 270,
  
  // Resistências (Hull)
  HULL_EM_RESIST: 272,
  HULL_EXPLOSIVE_RESIST: 273,
  HULL_KINETIC_RESIST: 274,
  HULL_THERMAL_RESIST: 275,
  
  // Velocidade
  MAX_VELOCITY: 37,
  AGILITY: 70,
  MASS: 70, // mass is 70
  MASS_KG: 4, // new mass attr
  WARP_SPEED: 30,
  ALIGN_TIME: 153, // calculated in runtime
  
  // Cargas
  DRONE_BAY_CAPACITY: 227,
  CARGO_CAPACITY: 5,
  
  // Scan
  SCAN_RANGE: 255,
  SCAN_CERTAINTY: 252,
  
  // Weapon attributes
  DAMAGE: 6,
  FIRE_RATE: 47,
  OPTIMAL_RANGE: 54,
  FALLOFF_RANGE: 55,
  TRACKING_SPEED: 63,
  
  // Missile attributes
  MISSILE_DAMAGE: 78,
  MISSILE_VELOCITY: 84,
  MISSILE_RANGE: 86,
  EXPLOSION_RADIUS: 89,
  EXPLOSION_VELOCITY: 90,
  
  // Requisitos de módulos
  CPU_NEEDED: 129,
  POWER_NEEDED: 30,
  
  // Damage multiplier
  DAMAGE_MULTIPLIER: 64,
  TRACKING_SPEED_BONUS: 205,
  OPTIMAL_RANGE_BONUS: 208,
  ROF_BONUS: 210,
  
  // Tank multipliers
  SHIELD_BOOST: 68,
  ARMOR_BOOST: 73,
  HULL_BOOST: 77,
  
  // Capacitor usage
  CAPACITOR_NEEDED: 100,
  CAPACITOR_RECHARGE_RATE: 63,
  
  // Movement
  VELOCITY_BOOST: 1056,
  ACCELERATION_DELAY: 1242,
  
  // Weapon groups
  TURRET: 74,
  LAUNCHER: 78,
}

// Group IDs para categorização
const GROUPS = {
  SHIP: 6,
  
  // Weapons
  ENERGY_TURRET: 76,
  PROJECTILE_TURRET: 77,
  HYBRID_TURRET: 78,
  MISSILE_LAUNCHER: 79,
 射Drones: 18,
  
  // Tank
  SHIELD_BOOSTER: 29,
  ARMOR_REPAIR: 30,
  HULL_REPAIR: 31,
  
  // Electronic Warfare
  ECM: 111,
  SENSOR_DAMP: 112,
  TRACKING_DISRUPTOR: 113,
  STasis_WEB: 65,
  REMOTE_REPAIR: 120,
  
  // Propulsion
  AFTERBURNER: 33,
  MICRO_WARP: 34,
  
  // NOS/Neut
  NOS: 35,
  NEUT: 36,
  
  // Core
  SHIELD_EXTENSION: 32,
  ARMOR_PLATING: 28,
  HULL_MOD: 27,
  // Rigs
  SHIELD_RIG: 153,
  ARMOR_RIG: 154,
  NAVIGATION_RIG: 155,
  
  // Subsystems
  STARSHIP_SUBSYSTEM: 186,
  
  // Drones
  COMBAT_DRONE: 18,
  LOGISTICS_DRONE: 19,
  MINING_DRONE: 172,
  SALVAGE_DRONE: 374,
}

// --- API Functions ---

export async function getShipAttributes(typeId: number): Promise<ShipAttributes | null> {
  try {
    // Get from ESI
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`)
    if (!response.ok) return null
    
    const typeData = await response.json()
    
    // Get dogma attributes
    const [cpu, power, capacitor, hp] = await Promise.all([
      getDogmaAttribute(typeId, DOGMA.CPU),
      getDogmaAttribute(typeId, DOGMA.POWER),
      getDogmaAttribute(typeId, DOGMA.CAPACITOR),
      getDogmaAttribute(typeId, DOGMA.SHIELD_CAPACITY),
    ])
    
    return {
      typeId,
      name: typeData.name,
      cpu: cpu ?? 0,
      powerGrid: power ?? 0,
      highSlots: typeData.hi_slot || 0,
      medSlots: typeData.med_slot || 0,
      lowSlots: typeData.low_slot || 0,
      rigSlots: typeData.rig_slot || 0,
      subsystemSlots: typeData.subystem_slot || 0,
      capacitorCapacity: capacitor ?? 0,
      shieldCapacity: hp ?? 0,
      armorCapacity: typeData.armorHP ?? 0,
      hullCapacity: typeData.structuralHP ?? 0,
      maxVelocity: typeData.maxSpeed ?? 0,
      maxSpeed: typeData.maxSpeed ?? 0,
      agility: typeData.agility ?? 1,
      mass: typeData.mass ?? 0,
      warpSpeed: typeData.warpSpeed ?? 0,
      droneBayCapacity: typeData.droneCapacity ?? 0,
      cargoCapacity: typeData.cargoCapacity ?? 0,
      // Defaulta
      capacitorRecharge: 0,
      shieldEmResist: 0,
      shieldExplosiveResist: 0,
      shieldKineticResist: 0,
      shieldThermalResist: 0,
      armorEmResist: 0,
      armorExplosiveResist: 0,
      armorKineticResist: 0,
      armorThermalResist: 0,
      hullEmResist: 0,
      hullExplosiveResist: 0,
      hullKineticResist: 0,
      hullThermalResist: 0,
      alignTime: 0,
      scanRange: 0,
      scanResolving: 0,
    }
  } catch (error) {
    console.error('Error fetching ship attributes:', error)
    return null
  }
}

export async function getDogmaAttribute(typeId: number, attributeId: number): Promise<number | null> {
  try {
    // Try cache or ESI
    const cached = dogmaAttributeCache.get(`${typeId}:${attributeId}`)
    if (cached !== undefined) return cached
    
    const response = await fetch(`${ESI_BASE_URL}/dogma/attributes/${attributeId}/`)
    if (!response.ok) return null
    
    const data = await response.json()
    
    // Find attribute for this type
    const attr = data.find((a: any) => a.type_id === typeId)
    if (attr) return attr.attribute_value
  } catch (error) {
    return null
  }
  return null
}

// Simple cache for dogma attributes
const dogmaAttributeCache = new Map<string, number>()

export function cacheDogmaAttribute(typeId: number, attributeId: number, value: number) {
  dogmaAttributeCache.set(`${typeId}:${attributeId}`, value)
}

// --- Calculator ---

export function calculateFitStats(
  ship: ShipAttributes,
  slots: FitSlot,
  charges?: { [typeId: number]: number }
): FitStats {
  // Inicializar stats base
  const stats: FitStats = {
    cpu: { used: 0, total: ship.cpu, free: ship.cpu },
    power: { used: 0, total: ship.powerGrid, free: ship.powerGrid },
    highSlots: { used: slots.high.length, total: ship.highSlots },
    medSlots: { used: slots.med.length, total: ship.medSlots },
    lowSlots: { used: slots.low.length, total: ship.lowSlots },
    rigSlots: { used: slots.rig.length, total: ship.rigSlots },
    dps: { total: 0, projectile: 0, missile: 0, drone: 0, hybrid: 0, laser: 0 },
    volley: { total: 0 },
    range: { optimal: 0, falloff: 0, missileRange: 0 },
    tank: {
      shield: { hp: ship.shieldCapacity, regen: 0, resist: { em: 0, explosive: 0, kinetic: 0, thermal: 0 } },
      armor: { hp: ship.armorCapacity, resist: { em: 0, explosive: 0, kinetic: 0, thermal: 0 } },
      hull: { hp: ship.hullCapacity, resist: { em: 0, explosive: 0, kinetic: 0, thermal: 0 } }
    },
    ehp: { shield: 0, armor: 0, hull: 0, total: 0 },
    capacitor: {
      capacity: ship.capacitorCapacity,
      rechargeRate: ship.capacitorRecharge,
      stable: true,
      usePerSecond: 0,
      deltaPerSecond: 0
    },
    droneBay: { volume: 0, maxVolume: ship.droneBayCapacity },
    cargo: { volume: 0, maxVolume: ship.cargoCapacity },
    velocity: {
      alignTime: ship.alignTime,
      warpSpeed: ship.warpSpeed,
      maxSpeed: ship.maxSpeed,
      mass: ship.mass
    },
    cost: 0
  }
  
  // Calcular cada slot
  let moduleIndex = 0
  for (const slotType of ['high', 'med', 'low', 'rig'] as const) {
    const modules = slots[slotType]
    for (const mod of modules) {
      if (mod.offline) continue
      
      const modCpu = MODULE_REQUIREMENTS[mod.typeId]?.cpu || 0
      const modPower = MODULE_REQUIREMENTS[mod.typeId]?.power || 0
      
      stats.cpu.used += modCpu
      stats.power.used += modPower
      
      // Adicionar DPS se for weapon
      const weaponDps = WEAPON_DPS[mod.typeId]
      if (weaponDps) {
        stats.dps.total += weaponDps.dps
        stats.dps[weaponDps.type] += weaponDps.dps
        stats.volley.total += weaponDps.volley
        stats.range.optimal = Math.max(stats.range.optimal, weaponDps.optimal)
        stats.range.falloff = Math.max(stats.range.falloff, weaponDps.falloff)
      }
      
      // Adicionar tank se for shield/armor/hull booster
      const tankBonus = TANK_MODULES[mod.typeId]
      if (tankBonus) {
        if (tankBonus.type === 'shield') {
          stats.tank.shield.regen += tankBonus.amount
        }
      }
      
      // Capacitor usage
      const capUse = MODULE_CAP_USAGE[mod.typeId]
      if (capUse) {
        stats.capacitor.usePerSecond += capUse
      }
      
      // Custo do módulo
      const modCost = MODULE_COSTS[mod.typeId]
      if (modCost) {
        stats.cost = (stats.cost || 0) + modCost
      }
    }
  }
  
  // Calcular drone DPS
  for (const drone of (slots as any).drone || []) {
    const droneDps = DRONE_DPS[drone.typeId]
    if (droneDps) {
      const qty = drone.quantity || 1
      stats.dps.total += droneDps.dps * qty
      stats.dps.drone += droneDps.dps * qty
    }
  }
  
  // Free stats
  stats.cpu.free = stats.cpu.total - stats.cpu.used
  stats.power.free = stats.power.total - stats.power.used
  
  // Verificar cap stability
  const capDelta = stats.capacitor.rechargeRate * 0.25 - stats.capacitor.usePerSecond
  stats.capacitor.stable = capDelta >= 0
  stats.capacitor.deltaPerSecond = capDelta
  
  // Calcular EHP
  const shieldResists = {
    em: 1 - (stats.tank.shield.resist.em / 100),
    thermal: 1 - (stats.tank.shield.resist.thermal / 100),
    kinetic: 1 - (stats.tank.shield.resist.kinetic / 100),
    explosive: 1 - (stats.tank.shield.resist.explosive / 100)
  }
  
  stats.ehp.shield = stats.tank.shield.hp / shieldResists.em
  stats.ehp.armor = stats.tank.armor.hp / (1 - stats.tank.armor.resist.em / 100)
  stats.ehp.hull = stats.tank.hull.hp / (1 - stats.tank.hull.resist.em / 100)
  stats.ehp.total = stats.ehp.shield + stats.ehp.armor + stats.ehp.hull
  
  // Verificar overflow de slots
  stats.highSlots.used = slots.high.length
  stats.medSlots.used = slots.med.length
  stats.lowSlots.used = slots.low.length
  stats.rigSlots.used = slots.rig.length
  
  return stats
}

// --- Módulo Requirements (cached data from SDE) ---

const MODULE_REQUIREMENTS: { [typeId: number]: { cpu: number; power: number } } = {}
const WEAPON_DPS: { [typeId: number]: { dps: number; volley: number; optimal: number; falloff: number; type: keyof FitStats['dps'] } } = {}
const TANK_MODULES: { [typeId: number]: { type: 'shield' | 'armor' | 'hull'; amount: number } } = {}
const MODULE_CAP_USAGE: { [typeId: number]: number } = {}
const MODULE_COSTS: { [typeId: number]: number } = {}
const DRONE_DPS: { [typeId: number]: { dps: number; tracking: number } } = {}

export async function loadModuleData() {
  try {
    // Carregar módulos do banco
    const modules = await prisma.eveType.findMany({
      where: {
        published: true,
        group: { categoryId: 7 } // Category 7 = Modules
      },
      select: {
        id: true,
        name: true,
        groupId: true,
        basePrice: true
      },
      take: 5000
    })
    
    console.log(`Carregados ${modules.length} módulos para fitting...`)
    
    // Aquí processaríamos os datos do SDE que temos syncados
    // Por enquanto, carregamos do ESI conforme necessário
    
  } catch (error) {
    console.error('Error loading module data:', error)
  }
}

// --- Helper para parsing de EFT ---

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
  
  // Primeira linha: [Ship Name, Fit Name]
  const firstLine = lines[0].replace(/[\[\]]/g, '').split(',')
  result.shipName = firstLine[0].trim()
  result.fitName = firstLine[1]?.trim() || 'Unnamed Fit'
  
  let currentSlot = 'high'
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue
    
    // Detectar mudança de section por linhas vazias
    if (line.startsWith('[')) continue
    
    // Pares de slot
    if (line.toLowerCase().includes('rig ')) {
      currentSlot = 'rig'
      continue
    }
    if (line.toLowerCase().includes('med ') || line.toLowerCase().includes('mid ')) {
      currentSlot = 'med'
      continue
    }
    if (line.toLowerCase().includes('low ')) {
      currentSlot = 'low'
      continue
    }
    
    // Parse [Empty slot]
    if (line.toLowerCase().includes('empty')) continue
    
    // Parse módulo (pode ter /offline suffix)
    const offline = line.endsWith('/offline')
    const modName = line.replace('/offline', '').trim()
    
    // Adicionar à lista (nome será resolvido para typeId depois)
    result[currentSlot].push({
      typeId: 0, // será resolvido
      name: modName,
      offline
    })
  }
  
  return result
}

export function fitToEftFormat(
  shipName: string,
  fitName: string,
  slots: FitSlot,
  charges?: { [typeId: number]: number }
): string {
  const lines: string[] = []
  
  // Header
  lines.push(`[${shipName}, ${fitName}]`)
  
  // High slots
  for (const mod of slots.high) {
    lines.push(mod.offline ? `${mod.typeId}/offline` : `${mod.typeId}`)
  }
  
  lines.push('') // Empty line
  
  // Med slots
  for (const mod of slots.med) {
    lines.push(mod.offline ? `${mod.typeId}/offline` : `${mod.typeId}`)
  }
  
  lines.push('')
  
  // Low slots
  for (const mod of slots.low) {
    lines.push(mod.offline ? `${mod.typeId}/offline` : `${mod.typeId}`)
  }
  
  lines.push('')
  
  // Rigs
  for (const mod of slots.rig) {
    lines.push(mod.typeId.toString())
  }
  
  lines.push('')
  
  // Drones (se houver)
  if (slots.drone && slots.drone.length > 0) {
    for (const drone of slots.drone) {
      lines.push(`${drone.typeId} x${drone.quantity || 1}`)
    }
  }
  
  return lines.join('\n')
}

// --- Cálculo de ALIGN TIME ---

export function calculateAlignTime(
  shipMass: number,
  agility: number,
  speedBonus: number = 0
): number {
  // alignTime = mass * agility * 2 / (1000000 * (1 + speedBonus/100))
  // Simplificado: mass * agility / 500000 segundos
  if (shipMass <= 0 || agility <= 0) return 0
  return (shipMass * agility) / 500000
}

// --- Export ---

export default {
  getShipAttributes,
  calculateFitStats,
  parseEftFormat,
  fitToEftFormat,
  calculateAlignTime,
  loadModuleData
}