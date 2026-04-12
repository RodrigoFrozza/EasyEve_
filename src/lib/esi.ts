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

import axios, { AxiosInstance } from 'axios'
import { getValidAccessToken } from './token-manager'
import { 
  EsiCharacter, 
  EveCharacter,
  TypeDetails,
  CharacterPublicInfo, 
  CharacterSkills, 
  CharacterLocationSchema,
  CharacterShipSchema,
  WalletJournalSchema,
  EsiCharacterSchema
} from '../types/esi'

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
} from './sde'

export * from './sde'

const EVE_SSO_BASE_URL = 'https://login.eveonline.com/v2/oauth'
const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const USER_AGENT = 'EasyEve/1.0.0 (https://github.com/RodrigoFrozza/EasyEve_)'

// --- Cache Implementation ---
const cache = new Map<string, { data: any; expires: number }>()

function getCachedData<T>(key: string): T | null {
  const item = cache.get(key)
  if (!item) return null
  if (Date.now() > item.expires) {
    cache.delete(key)
    return null
  }
  return item.data as T
}

function setCachedData(key: string, data: any, ttlMs: number = 3600000): void {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

// --- Axios Client ---
const esiClient: AxiosInstance = axios.create({
  baseURL: ESI_BASE_URL,
  headers: {
    'User-Agent': USER_AGENT,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
})

// Request Interceptor for retries or logging could be added here
esiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardized error logging
    console.error(`[ESI Error] ${error.config?.method?.toUpperCase()} ${error.config?.url}:`, error.response?.status, error.response?.data)
    return Promise.reject(error)
  }
)

export type { EveCharacter as EveCharacterLegacy } from '../types/esi'

export async function getAccessToken(code: string) {
  const response = await axios.post(`${EVE_SSO_BASE_URL}/token`, 
    new URLSearchParams({
      grant_type: 'authorization_code',
      code,
    }),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
        ).toString('base64')}`,
      },
    }
  )

  return response.data
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

    const charData = {
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

    return EsiCharacterSchema.parse(charData)
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
  corporationId?: number
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
    corporationId: info.corporation_id,
  }
}

async function getCharacterSkillsSummary(characterId: number, accessToken: string): Promise<{ total_sp?: number }> {
  const cacheKey = `skills-summary-${characterId}`
  const cached = getCachedData<{ total_sp?: number }>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/characters/${characterId}/skills/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const result = { total_sp: response.data.total_sp }
    setCachedData(cacheKey, result, 600000) // 10 minutes cache
    return result
  } catch {
    return {}
  }
}

async function getCharacterPublicInfo(characterId: number): Promise<Partial<CharacterPublicInfo>> {
  const cacheKey = `char-public-${characterId}`
  const cached = getCachedData<Partial<CharacterPublicInfo>>(cacheKey)
  if (cached) return cached

  const response = await esiClient.get(`/characters/${characterId}/`)
  const result = response.data
  setCachedData(cacheKey, result, 3600000) // 1 hour cache for public info
  return result
}

async function getCharacterLocation(characterId: number, accessToken: string) {
  try {
    const response = await esiClient.get(`/characters/${characterId}/location/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = response.data
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
    const response = await esiClient.get(`/characters/${characterId}/ship/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    const data = response.data
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
    const response = await esiClient.get(`/characters/${characterId}/wallet/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    return response.data
  } catch {
    return 0
  }
}

export async function getCharacterSkills(characterId: number, accessToken: string): Promise<CharacterSkills> {
  const [skillsResponse, queueResponse] = await Promise.all([
    esiClient.get(`/characters/${characterId}/skills/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
    esiClient.get(`/characters/${characterId}/skillqueue/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  ])

  const skills = skillsResponse.data
  const queue = queueResponse.data

  return {
    total_sp: skills.total_sp,
    free_sp: skills.free_points,
    skills: skills.skills || [],
    queues: queue || [],
  }
}

export async function getCorporationInfo(corpId: number) {
  const cacheKey = `corp-info-${corpId}`
  const cached = getCachedData<{ name: string; ticker?: string; alliance_id?: number }>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/corporations/${corpId}/`)
    const data = response.data
    const result = {
      name: data.name,
      ticker: data.ticker,
      alliance_id: data.alliance_id,
    }
    setCachedData(cacheKey, result, 86400000) // 24 hours cache for static corp info
    return result
  } catch {
    return { name: `Corp ${corpId}` }
  }
}

export async function getAllianceInfo(allianceId: number) {
  const cacheKey = `alliance-info-${allianceId}`
  const cached = getCachedData<{ name: string; ticker: string }>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/alliances/${allianceId}/`)
    const data = response.data
    const result = { name: data.name, ticker: data.ticker }
    setCachedData(cacheKey, result, 86400000) // 24 hours cache
    return result
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
    const params: Record<string, string> = {}
    if (before) params.before = before
    if (after) params.after = after

    const response = await esiClient.get(`/characters/${characterId}/mining/`, {
      params,
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    return response.data
  } catch {
    return []
  }
}

export async function getCategoryGroups(categoryId: number): Promise<number[]> {
  const cacheKey = `cat-groups-${categoryId}`
  const cached = getCachedData<number[]>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/universe/categories/${categoryId}/`)
    const result = response.data.groups || []
    setCachedData(cacheKey, result, 86400000)
    return result
  } catch {
    return []
  }
}

export async function getGroupTypes(groupId: number): Promise<number[]> {
  const cacheKey = `group-types-${groupId}`
  const cached = getCachedData<number[]>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/universe/groups/${groupId}/`)
    const result = response.data.types || []
    setCachedData(cacheKey, result, 86400000)
    return result
  } catch {
    return []
  }
}

export async function getTypeDetails(typeId: number): Promise<TypeDetails | null> {
  const cacheKey = `type-details-${typeId}`
  const cached = getCachedData<TypeDetails>(cacheKey)
  if (cached) return cached

  try {
    const response = await esiClient.get(`/universe/types/${typeId}/`)
    const result = response.data
    setCachedData(cacheKey, result, 86400000)
    return result
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
  
  if (marketPriceCache && (now - marketPriceCache.timestamp < MARKET_CACHE_TTL)) {
    return marketPriceCache.prices
  }

  try {
    const response = await esiClient.get('/markets/prices/')
    const data: MarketPrice[] = response.data
    
    const priceMap: Record<number, number> = {}
    data.forEach(item => {
      if (item.average_price) {
        priceMap[item.type_id] = item.average_price
      } else if (item.adjusted_price) {
        priceMap[item.type_id] = item.adjusted_price
      }
    })
    
    marketPriceCache = { prices: priceMap, timestamp: now }
    return priceMap
  } catch {
    return marketPriceCache?.prices || {}
  }
}

// --- Authenticated ESI Helpers ---

export async function fetchWithAuth(endpoint: string, characterId: number): Promise<any> {
  const { accessToken } = await getValidAccessToken(characterId)
  
  if (!accessToken) {
    throw new Error('No valid access token available')
  }
  
  const response = await esiClient.get(endpoint, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'X-User-Agent': USER_AGENT,
    },
  })
  
  return response.data
}

export async function getCharacterFits(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/fits/`, characterId)
  } catch (error) {
    console.error('Failed to fetch fits:', error)
    return []
  }
}

export async function getCharacterAssets(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/assets/`, characterId)
  } catch (error) {
    console.error('Failed to fetch assets:', error)
    return []
  }
}

export async function getCharacterWalletTransactions(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/wallet/transactions/`, characterId)
  } catch (error) {
    console.error('Failed to fetch wallet transactions:', error)
    return []
  }
}

export async function getCharacterIndustryJobs(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/industry/jobs/`, characterId)
  } catch (error) {
    console.error('Failed to fetch industry jobs:', error)
    return []
  }
}

export async function getCharacterContracts(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/contracts/`, characterId)
  } catch (error) {
    console.error('Failed to fetch contracts:', error)
    return []
  }
}

export async function getCharacterNotifications(characterId: number) {
  try {
    return await fetchWithAuth(`/characters/${characterId}/notifications/`, characterId)
  } catch (error) {
    console.error('Failed to fetch notifications:', error)
    return []
  }
}

export async function getCharacterWalletJournal(characterId: number, untilDate?: Date) {
  try {
    const results: any[] = []
    const { accessToken } = await getValidAccessToken(characterId)
    
    if (!accessToken) throw new Error('No valid token')

    for (let page = 1; page <= 20; page++) {
      const response = await esiClient.get(`/characters/${characterId}/wallet/journal/`, {
        params: { page },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      
      const data = response.data
      if (Array.isArray(data) && data.length > 0) {
        results.push(...data)
        
        if (untilDate) {
          const lastEntry = data[data.length - 1]
          if (new Date(lastEntry.date) < untilDate) break
        }

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
    const { accessToken } = await getValidAccessToken(characterId)
    
    if (!accessToken) throw new Error('No valid token')

    for (let page = 1; page <= 20; page++) {
      const response = await esiClient.get(`/corporations/${corporationId}/wallets/${division}/journal/`, {
        params: { page },
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      
      const data = response.data
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
