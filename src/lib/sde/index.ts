export * from './filaments'

export const ESI_BASE_URL = 'https://esi.evetech.net/latest'
export const EVE_IMAGES_URL = 'https://images.evetech.net'
export const USER_AGENT = 'EasyEve/1.0 (+https://easyeve.cloud; easyeve.project@gmail.com)'

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
