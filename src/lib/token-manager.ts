import { prisma } from './prisma'

const EVE_SSO_URL = 'https://login.eveonline.com/v2/oauth/token'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export async function refreshAccessToken(refreshToken: string, esiApp: string = 'main'): Promise<TokenResponse | null> {
  const clientId = esiApp === 'holding' ? process.env.HOLDING_EVE_CLIENT_ID : process.env.EVE_CLIENT_ID
  const clientSecret = esiApp === 'holding' ? process.env.HOLDING_EVE_CLIENT_SECRET : process.env.EVE_CLIENT_SECRET

  try {
    const response = await fetch(EVE_SSO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${clientId}:${clientSecret}`
        ).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    })

    if (!response.ok) {
      console.error('Token refresh failed:', await response.text())
      return null
    }

    return response.json()
  } catch (error) {
    console.error('Token refresh error:', error)
    return null
  }
}

// Map to track ongoing refresh promises to prevent concurrent redundant refreshes
const refreshPromises = new Map<number, Promise<{ accessToken: string | null; characterId: number }>>()

export async function getValidAccessToken(characterId: number): Promise<{ accessToken: string | null; characterId: number }> {
  // Check if there is already an ongoing refresh for this character
  if (refreshPromises.has(characterId)) {
    return refreshPromises.get(characterId)!
  }

  const performRefresh = async () => {
    try {
      const character = await prisma.character.findUnique({
        where: { id: characterId },
        select: {
          id: true,
          accessToken: true,
          refreshToken: true,
          tokenExpiresAt: true,
          esiApp: true,
        },
      })

      if (!character || !character.accessToken || !character.refreshToken) {
        return { accessToken: null, characterId }
      }

      const now = new Date()
      const expiresAt = character.tokenExpiresAt

      // If token is still valid (more than 5 mins remaining), return it
      if (expiresAt && expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
        return { accessToken: character.accessToken, characterId }
      }

      console.log(`[TokenManager] Refreshing token for character ${characterId} (App: ${character.esiApp})...`)
      const newTokens = await refreshAccessToken(character.refreshToken, character.esiApp)
      
      if (!newTokens) {
        return { accessToken: null, characterId }
      }

      const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

      await prisma.character.update({
        where: { id: characterId },
        data: {
          accessToken: newTokens.access_token,
          refreshToken: newTokens.refresh_token,
          tokenExpiresAt: newExpiresAt,
        },
      })

      return { accessToken: newTokens.access_token, characterId }
    } finally {
      // Always clear the promise from the map when done
      refreshPromises.delete(characterId)
    }
  }

  const promise = performRefresh()
  refreshPromises.set(characterId, promise)
  return promise
}

export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() <= Date.now()
}

export function isTokenExpiringSoon(expiresAt: Date | null, minutesThreshold: number = 5): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() <= Date.now() + minutesThreshold * 60 * 1000
}
