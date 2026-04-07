import { prisma } from '@/lib/prisma'

export * from './filaments'

export const ESI_BASE_URL = 'https://esi.evetech.net/latest'
export const EVE_IMAGES_URL = 'https://images.evetech.net'
export const USER_AGENT = 'EasyEve/1.0 (+https://easyeve.cloud; easyeve.project@gmail.com)'

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
        name: category.name,
        published: category.published
      }
    }
  } catch (error) {
    console.error(`Error fetching category info for ${categoryId}:`, error)
  }
  return null
}
