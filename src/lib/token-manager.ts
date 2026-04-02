import { prisma } from './prisma'

const EVE_SSO_URL = 'https://login.eveonline.com/v2/oauth/token'

interface TokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token: string
}

export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
  try {
    const response = await fetch(EVE_SSO_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
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

export async function getValidAccessToken(characterId: number): Promise<{ accessToken: string | null; characterId: number }> {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
    select: {
      id: true,
      accessToken: true,
      refreshToken: true,
      tokenExpiresAt: true,
    },
  })

  if (!character) {
    return { accessToken: null, characterId }
  }

  if (!character.accessToken || !character.refreshToken) {
    return { accessToken: null, characterId }
  }

  const now = new Date()
  const expiresAt = character.tokenExpiresAt

  if (expiresAt && expiresAt.getTime() > now.getTime() + 5 * 60 * 1000) {
    return { accessToken: character.accessToken, characterId }
  }

  const newTokens = await refreshAccessToken(character.refreshToken)
  
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
}

export function isTokenExpired(expiresAt: Date | null): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() <= Date.now()
}

export function isTokenExpiringSoon(expiresAt: Date | null, minutesThreshold: number = 5): boolean {
  if (!expiresAt) return true
  return expiresAt.getTime() <= Date.now() + minutesThreshold * 60 * 1000
}
