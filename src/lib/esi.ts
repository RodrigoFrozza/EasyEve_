import {
  getTypeName,
  getSolarSystemName,
  getTypeInfo,
  getSolarSystemInfo,
  getGroupInfo,
  getCategoryInfo,
  getCharacterPortraitUrl,
  getCharacterAvatarUrl,
  getCorporationLogoUrl,
  getAllianceLogoUrl,
  getTypeRenderUrl,
  getTypeIconUrl,
} from './sde'

import { getValidAccessToken } from './token-manager'

export {
  getTypeName,
  getSolarSystemName,
  getTypeInfo,
  getSolarSystemInfo,
  getGroupInfo,
  getCategoryInfo,
  getCharacterPortraitUrl,
  getCharacterAvatarUrl,
  getCorporationLogoUrl,
  getAllianceLogoUrl,
  getTypeRenderUrl,
  getTypeIconUrl,
}

export * from './sde'

const EVE_SSO_BASE_URL = 'https://login.eveonline.com/v2/oauth'
const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const USER_AGENT = 'EasyEve/1.0.0 (https://github.com/RodrigoFrozza/EasyEve_)'

export interface EveCharacter {
  character_id: number
  character_name: string
  expires_on: string
  scopes: string
  token_type: string
  character_owner_hash: string
  intellectual_property: string
}

export interface CharacterInfo {
  character_id: number
  name: string
  corporation_id: number
  corporation_name: string
  alliance_id?: number
  alliance_name?: string
  birthday: string
  gender: string
  race_id: number
  ancestry_id?: number
  bloodline_id: number
  description?: string
  security_status?: number
}

export interface CharacterSkills {
  total_sp: number
  free_sp: number
  skills: Skill[]
  queues: SkillQueueItem[]
}

export interface Skill {
  skill_id: number
  skillpoints_in_skill: number
  trained_skill_level: number
  active_skill_level: number
  skill_type_name?: string
}

export interface SkillQueueItem {
  skill_id: number
  finish_date: string
  level: number
  queue_position: number
  skill_type_name?: string
}

export async function getAccessToken(code: string) {
  const response = await fetch(`${EVE_SSO_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(
        `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
      ).toString('base64')}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to get access token')
  }

  return response.json()
}

export async function getCharacterInfo(accessToken: string): Promise<EveCharacter> {
  console.log('[ESI] Verifying token (JWT decode)...')
  console.log('[ESI] Token prefix:', accessToken.substring(0, 10) + '...')
  
  try {
    // EVE SSO v2 tokens are JWTs - decode the payload directly
    const parts = accessToken.split('.')
    if (parts.length !== 3) {
      throw new Error('Access token is not a valid JWT')
    }

    // Decode the base64url-encoded payload
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64url').toString('utf-8')
    )

    console.log('[ESI] JWT payload sub:', payload.sub)

    // The 'sub' claim format is "CHARACTER:EVE:<character_id>"
    const subParts = (payload.sub as string).split(':')
    const characterId = parseInt(subParts[2], 10)

    if (isNaN(characterId)) {
      throw new Error(`Invalid character ID in JWT sub claim: ${payload.sub}`)
    }

    // The 'name' claim contains the character name
    const characterName = payload.name as string

    console.log('[ESI] Character verified via JWT:', characterName, '(ID:', characterId, ')')

    return {
      character_id: characterId,
      character_name: characterName,
      expires_on: payload.exp ? new Date(payload.exp * 1000).toISOString() : '',
      scopes: (payload.scp as string[] | string)
        ? (Array.isArray(payload.scp) ? payload.scp.join(' ') : payload.scp as string)
        : '',
      token_type: 'Character',
      character_owner_hash: payload.owner as string || '',
      intellectual_property: payload.kid as string || '',
    }
  } catch (error) {
    console.error('[ESI] JWT decode failed:', error)
    throw new Error(`Failed to verify token: ${error instanceof Error ? error.message : String(error)}`)
  }
}

export interface FetchCharacterDataResult {
  name?: string
  total_sp?: number
  wallet?: number
  location?: string
  ship?: string
  shipTypeId?: number
}

export async function fetchCharacterData(characterId: number, accessToken: string): Promise<FetchCharacterDataResult> {
  const [info, location, ship, wallet, skills] = await Promise.all([
    getCharacterPublicInfo(characterId),
    getCharacterLocation(characterId, accessToken),
    getCharacterShip(characterId, accessToken),
    getCharacterWallet(characterId, accessToken),
    getCharacterSkillsSummary(characterId, accessToken),
  ])

  return {
    name: info.name,
    total_sp: skills.total_sp,
    wallet,
    location: location.location,
    ship: ship.ship,
    shipTypeId: ship.shipTypeId,
  }
}

async function getCharacterSkillsSummary(characterId: number, accessToken: string): Promise<{ total_sp?: number }> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/skills/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!response.ok) return {}
    const data = await response.json()
    return { total_sp: data.total_sp }
  } catch {
    return {}
  }
}

async function getCharacterPublicInfo(characterId: number): Promise<Partial<CharacterInfo>> {
  const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/`)
  
  if (!response.ok) {
    throw new Error('Failed to get character info')
  }

  return response.json()
}

async function getCharacterLocation(characterId: number, accessToken: string) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/location/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) return {}

    const data = await response.json()
    
    const solarSystemName = await getSolarSystemName(data.solar_system_id)
    
    return {
      location: solarSystemName,
      station_id: data.station_id,
      structure_id: data.structure_id,
    }
  } catch {
    return {}
  }
}

async function getCharacterShip(characterId: number, accessToken: string) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/ship/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) return {}

    const data = await response.json()
    
    const shipName = await getTypeName(data.ship_type_id)
    
    return {
      ship: shipName,
      shipTypeId: data.ship_type_id,
    }
  } catch {
    return {}
  }
}

async function getCharacterWallet(characterId: number, accessToken: string) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/characters/${characterId}/wallet/`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!response.ok) return 0

    return response.json()
  } catch {
    return 0
  }
}

export async function getCharacterSkills(characterId: number, accessToken: string): Promise<CharacterSkills> {
  const [skillsResponse, queueResponse] = await Promise.all([
    fetch(`${ESI_BASE_URL}/characters/${characterId}/skills/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    fetch(`${ESI_BASE_URL}/characters/${characterId}/skillqueue/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])

  const skills = await skillsResponse.json()
  const queue = await queueResponse.json()

  return {
    total_sp: skills.total_sp,
    free_sp: skills.free_points,
    skills: skills.skills || [],
    queues: queue || [],
  }
}

export async function getCorporationInfo(corpId: number) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/corporations/${corpId}/`)
    if (!response.ok) return { name: `Corp ${corpId}` }
    const data = await response.json()
    return {
      name: data.name,
      ticker: data.ticker,
      alliance_id: data.alliance_id,
    }
  } catch {
    return { name: `Corp ${corpId}` }
  }
}

export async function getAllianceInfo(allianceId: number) {
  try {
    const response = await fetch(`${ESI_BASE_URL}/alliances/${allianceId}/`)
    if (!response.ok) return { name: `Alliance ${allianceId}` }
    const data = await response.json()
    return { name: data.name, ticker: data.ticker }
  } catch {
    return { name: `Alliance ${allianceId}` }
  }
}

export interface MiningLedgerEntry {
  date: string
  quantity: number
  type_id: number
  corporation_id: number
}

export async function getCharacterMiningLedger(
  characterId: number,
  accessToken: string,
  before?: string,
  after?: string
): Promise<MiningLedgerEntry[]> {
  try {
    const params = new URLSearchParams()
    if (before) params.set('before', before)
    if (after) params.set('after', after)

    const url = `${ESI_BASE_URL}/characters/${characterId}/mining/${params.toString() ? '?' + params.toString() : ''}`
    
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!response.ok) return []

    return response.json()
  } catch {
    return []
  }
}

export async function getCategoryGroups(categoryId: number): Promise<number[]> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/categories/${categoryId}/`)
    if (!response.ok) return []
    const data = await response.json()
    return data.groups || []
  } catch {
    return []
  }
}

export async function getGroupTypes(groupId: number): Promise<number[]> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/groups/${groupId}/`)
    if (!response.ok) return []
    const data = await response.json()
    return data.types || []
  } catch {
    return []
  }
}

export interface TypeDetails {
  type_id: number
  name: string
  description: string
  group_id: number
  volume?: number
  capacity?: number
  portion_size?: number
  published: boolean
  market_group_id?: number
  mass?: number
  icon_id?: number
}

export async function getTypeDetails(typeId: number): Promise<TypeDetails | null> {
  try {
    const response = await fetch(`${ESI_BASE_URL}/universe/types/${typeId}/`)
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export interface MarketPrice {
  type_id: number
  average_price?: number
  adjusted_price?: number
}

// Cache for market prices (5 min TTL)
let marketPriceCache: { prices: Record<number, number>; timestamp: number } | null = null
const MARKET_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

export async function getMarketPrices(): Promise<Record<number, number>> {
  const now = Date.now()
  
  // Return cached prices if still valid
  if (marketPriceCache && (now - marketPriceCache.timestamp < MARKET_CACHE_TTL)) {
    return marketPriceCache.prices
  }

  try {
    const response = await fetch(`${ESI_BASE_URL}/markets/prices/`)
    if (!response.ok) {
      // Return stale cache if fetch fails
      return marketPriceCache?.prices || {}
    }
    const data: MarketPrice[] = await response.json()
    
    // Convert to easy lookup map
    // Use average_price if available, otherwise fall back to adjusted_price
    // For rare ores (like Ytirium variants), adjusted_price is more stable
    const priceMap: Record<number, number> = {}
    data.forEach(item => {
      if (item.average_price) {
        priceMap[item.type_id] = item.average_price
      } else if (item.adjusted_price) {
        // Fallback to adjusted_price for items without average_price
        priceMap[item.type_id] = item.adjusted_price
      }
    })
    
    // Update cache
    marketPriceCache = { prices: priceMap, timestamp: now }
    
    return priceMap
  } catch {
    // Return stale cache on error
    return marketPriceCache?.prices || {}
  }
}

// --- Authenticated ESI Helpers ---

export async function fetchWithAuth(endpoint: string, characterId: number): Promise<Response> {
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

export async function getCharacterFits(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/fits/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch fits:', error)
    return []
  }
}

export async function getCharacterAssets(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/assets/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch assets:', error)
    return []
  }
}

export async function getCharacterWalletTransactions(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/wallet/transactions/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch wallet transactions:', error)
    return []
  }
}

export async function getCharacterIndustryJobs(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/industry/jobs/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch industry jobs:', error)
    return []
  }
}

export async function getCharacterContracts(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/contracts/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch contracts:', error)
    return []
  }
}

export async function getCharacterNotifications(characterId: number) {
  try {
    const response = await fetchWithAuth(`/characters/${characterId}/notifications/`, characterId)
    if (!response.ok) return []
    return response.json()
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
}

export async function getCharacterWalletJournal(characterId: number, untilDate?: Date) {
  try {
    const results: any[] = []
    
    // We paginate up to 20 pages (1000 entries) to prevent infinite loops 
    // but ensure we cover activities that might have many transactions.
    for (let page = 1; page <= 20; page++) {
      const response = await fetchWithAuth(`/characters/${characterId}/wallet/journal/?page=${page}`, characterId)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[ESI] Wallet Journal Error (Page ${page}, Char ${characterId}): ${response.status} ${errorText}`)
        break
      }
      
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        results.push(...data)
        
        // If an untilDate is provided, check if the last entry of this page is already older 
        // than our threshold. If so, we can stop fetching pages.
        if (untilDate) {
          const lastEntry = data[data.length - 1]
          if (new Date(lastEntry.date) < untilDate) {
            console.log(`[ESI] Reached untilDate (${untilDate.toISOString()}) at page ${page}. Stopping.`)
            break
          }
        }

        // If we got less than 50, it's the last page in existence
        if (data.length < 50) break
      } else {
        break
      }
    }
    
    return results
  } catch (error) {
    console.error(`[ESI] Exception fetching wallet journal for ${characterId}:`, error)
    return []
  }
}
export async function getCorporationWalletJournal(corporationId: number, characterId: number, division: number = 1) {
  try {
    const results: any[] = []
    
    // We paginate up to 20 pages (1000 entries)
    for (let page = 1; page <= 20; page++) {
      const response = await fetchWithAuth(
        `/corporations/${corporationId}/wallets/${division}/journal/?page=${page}`, 
        characterId
      )
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error(`[ESI] Corp Wallet Journal Error (Page ${page}, Corp ${corporationId}): ${response.status} ${errorText}`)
        break
      }
      
      const data = await response.json()
      if (Array.isArray(data) && data.length > 0) {
        results.push(...data)
        if (data.length < 50) break
      } else {
        break
      }
    }
    
    return results
  } catch (error) {
    console.error(`[ESI] Exception fetching corp wallet journal for corp ${corporationId}:`, error)
    return []
  }
}
