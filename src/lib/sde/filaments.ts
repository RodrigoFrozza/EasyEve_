import { prisma } from '@/lib/prisma'

const ESI_BASE_URL = 'https://esi.evetech.net/latest'
const USER_AGENT = 'EasyEve/1.0 (+https://easyeve.cloud; easyeve.project@gmail.com)'

export interface FilamentType {
  id: number
  name: string
  weather: string
  tier: number
  effect: string
  published: boolean
}

const WEATHER_MAP: Record<string, { weather: string, tier: number }> = {
  'Calm': { weather: 'calm', tier: 1 },
  'Agitated': { weather: 'agitated', tier: 2 },
  'Fierce': { weather: 'fierce', tier: 3 },
  'Raging': { weather: 'raging', tier: 4 },
  'Chaotic': { weather: 'chaotic', tier: 5 },
  'Cataclysmic': { weather: 'cataclysmic', tier: 6 },
}

const EFFECT_MAP: Record<string, string> = {
  'Electrical': 'electrical',
  'Dark': 'dark',
  'Exotic': 'exotic',
  'Firestorm': 'firestorm',
  'Gamma': 'gamma',
}

export async function fetchFilamentTypesFromESI(): Promise<FilamentType[]> {
  try {
    const groupResponse = await fetch(
      `${ESI_BASE_URL}/universe/groups/1979/?datasource=tranquility&language=en`,
      { headers: { 'X-User-Agent': USER_AGENT } }
    )
    
    if (!groupResponse.ok) {
      throw new Error(`Failed to fetch filament group: ${groupResponse.status}`)
    }
    
    const groupData = await groupResponse.json()
    const typeIds: number[] = groupData.types || []
    
    const filaments: FilamentType[] = []
    
    for (const typeId of typeIds) {
      try {
        const typeResponse = await fetch(
          `${ESI_BASE_URL}/universe/types/${typeId}/?datasource=tranquility&language=en`,
          { headers: { 'X-User-Agent': USER_AGENT } }
        )
        
        if (!typeResponse.ok) continue
        
        const typeData = await typeResponse.json()
        
        if (!typeData.published || !typeData.name?.includes('Filament')) continue
        
        const fullName = typeData.name
        
        let weather = 'unknown'
        let tier = 1
        let effect = 'unknown'
        
        for (const [weatherKey, config] of Object.entries(WEATHER_MAP)) {
          if (fullName.includes(weatherKey)) {
            weather = config.weather
            tier = config.tier
            break
          }
        }
        
        for (const [effectKey, effectValue] of Object.entries(EFFECT_MAP)) {
          if (fullName.includes(effectKey)) {
            effect = effectValue
            break
          }
        }
        
        filaments.push({
          id: typeId,
          name: fullName,
          weather,
          tier,
          effect,
          published: typeData.published || false,
        })
      } catch (error) {
        console.error(`Failed to fetch type ${typeId}:`, error)
      }
    }
    
    return filaments
  } catch (error) {
    console.error('Failed to fetch filament types from ESI:', error)
    return []
  }
}

export async function syncFilamentTypes(): Promise<void> {
  const filaments = await fetchFilamentTypesFromESI()
  
  for (const filament of filaments) {
    await prisma.filamentType.upsert({
      where: { id: filament.id },
      create: {
        id: filament.id,
        name: filament.name,
        weather: filament.weather,
        tier: filament.tier,
        effect: filament.effect,
        published: filament.published,
      },
      update: {
        name: filament.name,
        weather: filament.weather,
        tier: filament.tier,
        effect: filament.effect,
        published: filament.published,
      },
    })
  }
}

export async function getFilamentTypes(): Promise<FilamentType[]> {
  const cached = await prisma.sdeCache.findUnique({
    where: { key: 'filament_types' },
  })
  
    if (cached && (!cached.expiresAt || cached.expiresAt > new Date())) {
    return (cached.value as unknown) as FilamentType[]
  }
  
  const dbFilaments = await prisma.filamentType.findMany({
    where: { published: true },
    orderBy: { tier: 'asc' },
  })
  
  if (dbFilaments.length > 0) {
    await prisma.sdeCache.upsert({
      where: { key: 'filament_types' },
      create: {
        key: 'filament_types',
        value: dbFilaments as unknown as object,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
      update: {
        value: dbFilaments as unknown as object,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    })
    
    return dbFilaments
  }
  
  const esiFilaments = await fetchFilamentTypesFromESI()
  await syncFilamentTypes()
  
  await prisma.sdeCache.upsert({
    where: { key: 'filament_types' },
    create: {
      key: 'filament_types',
      value: esiFilaments as unknown as object,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    update: {
      value: esiFilaments as unknown as object,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })
  
  return esiFilaments
}

export function getTierLabel(tier: number): string {
  const tiers: Record<number, string> = {
    1: 'Calm',
    2: 'Agitated',
    3: 'Fierce',
    4: 'Raging',
    5: 'Chaotic',
    6: 'Cataclysmic',
  }
  return tiers[tier] || `Tier ${tier}`
}
