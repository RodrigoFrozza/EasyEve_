import { prisma } from '@/lib/prisma'

export * from './filaments'

export const ESI_BASE_URL = 'https://esi.evetech.net/latest'
export const EVE_IMAGES_URL = 'https://images.evetech.net'
export const USER_AGENT = 'EasyEve/1.0.0 (https://github.com/RodrigoFrozza/EasyEve_)'

// --- Visual Helpers ---

export function getCharacterPortraitUrl(characterId: number, size: 'tiny' | 'small' | 'medium' | 'large' | 'huge' = 'medium'): string {
  return `${EVE_IMAGES_URL}/characters/${characterId}/portrait?size=${size}`
}

export function getCharacterAvatarUrl(characterId: number): string {
  return `${EVE_IMAGES_URL}/characters/${characterId}/portrait`
}

export function getCorporationLogoUrl(corpId: number, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): string {
  return `${EVE_IMAGES_URL}/corporations/${corpId}/logo?size=${size}`
}

export function getAllianceLogoUrl(allianceId: number, size: 'tiny' | 'small' | 'medium' | 'large' = 'medium'): string {
  return `${EVE_IMAGES_URL}/alliances/${allianceId}/logo?size=${size}`
}

export function getTypeRenderUrl(typeId: number, size: number = 128): string {
  return `${EVE_IMAGES_URL}/types/${typeId}/render?size=${size}`
}

export function getTypeIconUrl(typeId: number, size: number = 64): string {
  return `${EVE_IMAGES_URL}/types/${typeId}/icon?size=${size}`
}

// --- Types & Interfaces ---

export interface TypeInfo {
  id: number
  name: string
  group_id?: number
  group_name?: string
  category_id?: number
  category_name?: string
  volume?: number
  packaged_volume?: number
  mass?: number
  description?: string
  published?: boolean
}

export interface SystemInfo {
  system_id: number
  name: string
  security_class?: string
  security_status?: number
  constellation_id?: number
  region_id?: number
}

export interface GroupInfo {
  id: number
  name: string
  category_id?: number
}

export interface CategoryInfo {
  id: number
  name: string
  published?: boolean
}

// --- SDE Lookup Functions ---

const systemCache = new Map<number, string>()
const systemInfoCache = new Map<number, SystemInfo>()

/**
 * Get item name by typeId, prioritized from local database.
 */
export async function getTypeName(typeId: number): Promise<string> {
  try {
    const item = await prisma.eveType.findUnique({
      where: { id: typeId },
      select: { name: true }
    })
    if (item) return item.name

    // Fallback to ESI
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`)
    if (response.ok) {
      const data = await response.json()
      return data.name || `Type ${typeId}`
    }
  } catch (error) {
    console.error(`Error fetching type name for ${typeId}:`, error)
  }
  return `Type ${typeId}`
}

/**
 * Get comprehensive type information.
 */
export async function getTypeInfo(typeId: number): Promise<TypeInfo | null> {
  try {
    const item = await prisma.eveType.findUnique({
      where: { id: typeId },
      include: { 
        group: {
          include: { category: true }
        }
      }
    })

    if (item) {
      return {
        id: item.id,
        name: item.name,
        group_id: item.groupId,
        group_name: item.group?.name,
        category_id: item.group?.categoryId,
        category_name: item.group?.category?.name,
        volume: item.volume ?? undefined,
        description: item.description ?? undefined,
        published: item.published
      }
    }

    // Fallback to ESI
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`)
    if (response.ok) {
      const data = await response.json()
      return {
        id: typeId,
        name: data.name,
        group_id: data.group_id,
        volume: data.volume,
        description: data.description,
        published: data.published
      }
    }
  } catch (error) {
    console.error(`Error fetching type info for ${typeId}:`, error)
  }
  return null
}

/**
 * Get solar system name, currently using ESI + local cache.
 */
export async function getSolarSystemName(systemId: number): Promise<string> {
  if (systemCache.has(systemId)) {
    return systemCache.get(systemId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/systems/${systemId}/`)
    if (response.ok) {
      const data = await response.json()
      const name = data.name || `System ${systemId}`
      systemCache.set(systemId, name)
      return name
    }
  } catch (error) {
    console.error(`Error fetching system name for ${systemId}:`, error)
  }
  return `System ${systemId}`
}

/**
 * Get comprehensive solar system information.
 */
export async function getSolarSystemInfo(systemId: number): Promise<SystemInfo | null> {
  if (systemInfoCache.has(systemId)) {
    return systemInfoCache.get(systemId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/systems/${systemId}/`)
    if (response.ok) {
      const data = await response.json()
      const info: SystemInfo = {
        system_id: systemId,
        name: data.name,
        security_class: data.security_class,
        security_status: data.security_status,
        constellation_id: data.constellation_id,
        region_id: data.region_id
      }
      systemInfoCache.set(systemId, info)
      return info
    }
  } catch (error) {
    console.error(`Error fetching system info for ${systemId}:`, error)
  }
  return null
}

/**
 * Get group information.
 */
export async function getGroupInfo(groupId: number): Promise<GroupInfo | null> {
  try {
    const group = await prisma.eveGroup.findUnique({
      where: { id: groupId }
    })
    if (group) {
      return {
        id: group.id,
        name: group.name,
        category_id: group.categoryId
      }
    }
    
    // Fallback ESI would require group endpoint (skipping for brevity as most should be synced)
  } catch (error) {
    console.error(`Error fetching group info for ${groupId}:`, error)
  }
  return null
}

/**
 * Get category information.
 */
export async function getCategoryInfo(categoryId: number): Promise<CategoryInfo | null> {
  try {
    const category = await prisma.eveCategory.findUnique({
      where: { id: categoryId }
    })
    if (category) {
      return {
        id: category.id,
        name: category.name
      }
    }
  } catch (error) {
    console.error(`Error fetching category info for ${categoryId}:`, error)
  }
  return null
}

// Mining type categories from ESI
const MINING_CATEGORIES: Record<string, number> = {
  'Ore': 25,      // Asteroid category
  'Ice': 25,      // Same category (filtered by group)
  'Gas': 25,       // Same category (filtered by group)
  'Moon': 25,      // Same category (filtered by group)
}

// Mining type groups from ESI
const MINING_GROUPS: Record<string, number[]> = {
  'Ore': [455, 456, 457, 458, 459, 460, 461, 462, 463, 464, 466, 467, 468, 469, 470, 471, 472, 473, 474, 475, 476, 477, 478, 479, 480, 481, 482, 483, 484, 485, 486, 487, 488, 489, 490, 491, 492, 493, 494, 495, 496, 497, 498, 499, 500, 501, 502, 503, 504, 505, 506, 507, 508, 509],
}

/**
 * Get mining types from the database based on mining category.
 * 'Ore' - All asteroid ores (base + variants)
 * 'Ice' - Ice products
 * 'Gas' - Gas cloud materials  
 * 'Moon' - Moon mining materials
 */
export async function getMiningTypes(miningType: 'Ore' | 'Ice' | 'Gas' | 'Moon'): Promise<{ id: number; name: string }[]> {
  try {
    // Filter by group name patterns in category 25
    const ORenamees = {
      'Ore': ['Veldspar', 'Scordite', 'Pyroxeres', 'Plagioclase', 'Omber', 'Kernite', 'Jaspet', 'Hemorphite', 'Hedbergite', 'Gneiss', 'Dark Ochre', 'Crokite', 'Spodumain', 'Bistot', 'Arkonor', 'Mercoxit'],
      'Ice': ['Ice', 'Glacial', 'Clear', 'White Glaze', 'Blue Ice', 'Gelidus', 'Krystallos', 'Pristine'],
      'Gas': ['Mykoserocin', 'Cytoserocin', 'Fullerite'],
      'Moon': ['Cobalt', 'Cadmium', 'Caesium', 'Chromium', 'Dysprosium', 'Hafnium', 'Mercury', 'Neodymium', 'Promethium', 'Thorium', 'Tungsten', 'Vanadium', 'Evaporite', 'Hydrocarbon', 'Silicates', 'Atmospheric']
    }
    
    const patterns = ORenamees[miningType]
    if (!patterns) return []
    
    // Get all types in category 25 (Asteroid) and filter by name
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
    
    // Filter types that match the patterns
    const filtered = types.filter(t => 
      patterns.some(p => t.name.includes(p))
    )
    
    return filtered
  } catch (error) {
    console.error(`Error fetching mining types for ${miningType}:`, error)
    return []
  }
}
