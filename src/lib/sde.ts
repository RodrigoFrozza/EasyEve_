const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const EVE_REF_URL = 'https://ref-data.everef.net'
const EVE_IMAGES_URL = 'https://images.evetech.net'
const USER_AGENT = 'EasyEve/1.0 (+https://easyeve.cloud; easyeve.project@gmail.com)'

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

interface TypeInfo {
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
  race_id?: number
  published?: boolean
}

interface SystemInfo {
  system_id: number
  name: string
  security_class?: string
  security_status?: number
  constellation_id?: number
  region_id?: number
}

interface GroupInfo {
  id: number
  name: string
  category_id?: number
  category_name?: string
}

interface CategoryInfo {
  id: number
  name: string
  published?: boolean
}

const typeCache = new Map<number, string>()
const typeInfoCache = new Map<number, TypeInfo>()
const systemCache = new Map<number, string>()
const systemInfoCache = new Map<number, SystemInfo>()
const groupCache = new Map<number, GroupInfo>()
const categoryCache = new Map<number, CategoryInfo>()

const CACHE_DURATION = 24 * 60 * 60 * 1000
const cacheTimestamps = {
  types: 0,
  systems: 0,
}

export async function getTypeName(typeId: number): Promise<string> {
  if (typeCache.has(typeId)) {
    return typeCache.get(typeId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/?datasource=tranquility&language=en`)
    if (response.ok) {
      const data = await response.json()
      const name = data.name || `Type ${typeId}`
      typeCache.set(typeId, name)
      return name
    }
  } catch {
    console.error(`Failed to fetch type name for ${typeId}`)
  }
  
  return `Type ${typeId}`
}

export async function getTypeInfo(typeId: number): Promise<TypeInfo | null> {
  if (typeInfoCache.has(typeId)) {
    return typeInfoCache.get(typeId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/?datasource=tranquility&language=en`)
    if (response.ok) {
      const data = await response.json()
      const info: TypeInfo = {
        id: typeId,
        name: data.name || `Type ${typeId}`,
        group_id: data.group_id,
        volume: data.volume,
        packaged_volume: data.packaged_volume,
        mass: data.mass,
        description: data.description,
        published: data.published,
      }
      typeInfoCache.set(typeId, info)
      return info
    }
  } catch {
    console.error(`Failed to fetch type info for ${typeId}`)
  }
  
  return null
}

export async function getSolarSystemName(systemId: number): Promise<string> {
  if (systemCache.has(systemId)) {
    return systemCache.get(systemId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/systems/${systemId}/?datasource=tranquility&language=en`)
    if (response.ok) {
      const data = await response.json()
      const name = data.name || `System ${systemId}`
      systemCache.set(systemId, name)
      return name
    }
  } catch {
    console.error(`Failed to fetch system name for ${systemId}`)
  }
  
  return `System ${systemId}`
}

export async function getSolarSystemInfo(systemId: number): Promise<SystemInfo | null> {
  if (systemInfoCache.has(systemId)) {
    return systemInfoCache.get(systemId)!
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/systems/${systemId}/?datasource=tranquility&language=en`)
    if (response.ok) {
      const data = await response.json()
      const info: SystemInfo = {
        system_id: systemId,
        name: data.name || `System ${systemId}`,
        security_class: data.security_class,
        security_status: data.security_status,
        constellation_id: data.constellation_id,
        region_id: data.region_id,
      }
      systemInfoCache.set(systemId, info)
      return info
    }
  } catch {
    console.error(`Failed to fetch system info for ${systemId}`)
  }
  
  return null
}

export async function getGroupInfo(groupId: number): Promise<GroupInfo | null> {
  if (groupCache.has(groupId)) {
    return groupCache.get(groupId)!
  }

  try {
    const response = await fetch(`${EVE_REF_URL}/groups/${groupId}`)
    if (response.ok) {
      const data = await response.json()
      const info: GroupInfo = {
        id: groupId,
        name: data.name,
        category_id: data.category_id,
      }
      groupCache.set(groupId, info)
      return info
    }
  } catch {
    console.error(`Failed to fetch group info for ${groupId}`)
  }
  
  return null
}

export async function getCategoryInfo(categoryId: number): Promise<CategoryInfo | null> {
  if (categoryCache.has(categoryId)) {
    return categoryCache.get(categoryId)!
  }

  try {
    const response = await fetch(`${EVE_REF_URL}/categories/${categoryId}`)
    if (response.ok) {
      const data = await response.json()
      const info: CategoryInfo = {
        id: categoryId,
        name: data.name,
        published: data.published,
      }
      categoryCache.set(categoryId, info)
      return info
    }
  } catch {
    console.error(`Failed to fetch category info for ${categoryId}`)
  }
  
  return null
}

export function clearAllCaches() {
  typeCache.clear()
  typeInfoCache.clear()
  systemCache.clear()
  systemInfoCache.clear()
  groupCache.clear()
  categoryCache.clear()
  cacheTimestamps.types = 0
  cacheTimestamps.systems = 0
}

export function getCacheStats() {
  return {
    typeCacheSize: typeCache.size,
    typeInfoCacheSize: typeInfoCache.size,
    systemCacheSize: systemCache.size,
    systemInfoCacheSize: systemInfoCache.size,
    groupCacheSize: groupCache.size,
    categoryCacheSize: categoryCache.size,
  }
}

export async function fetchWithAuth(endpoint: string, characterId: number): Promise<Response> {
  const { getValidAccessToken } = await import('./token-manager')
  const { accessToken } = await getValidAccessToken(characterId)
  
  if (!accessToken) {
    throw new Error('No valid access token available')
  }
  
  return fetch(`${ESI_BASE_URL}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-User-Agent': USER_AGENT,
    },
  })
}

export async function getCharacterMiningLedger(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/mining/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch mining ledger:', error)
    return []
  }
}

export async function getCharacterFits(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/fits/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch fits:', error)
    return []
  }
}

export async function getCharacterAssets(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/assets/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch assets:', error)
    return []
  }
}

export async function getCharacterWalletTransactions(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/wallet/transactions/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch wallet transactions:', error)
    return []
  }
}

export async function getCharacterIndustryJobs(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/industry/jobs/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch industry jobs:', error)
    return []
  }
}

export async function getCharacterContracts(characterId: number, character: number) {
  try {
    const response = await fetchWithAuth(`/characters/${character}/contracts/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch contracts:', error)
    return []
  }
}
