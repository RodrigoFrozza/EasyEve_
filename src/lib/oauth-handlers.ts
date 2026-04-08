import { prisma } from './prisma'
import { generateAccountCode } from './account-code'
import { getCharacterInfo, fetchCharacterData } from './esi'

const EVE_SSO_BASE_URL = 'https://login.eveonline.com/v2/oauth'

export interface OAuthState {
  accountCode?: string
}

export function parseState(state: string | null): OAuthState | null {
  if (!state) return null
  
  try {
    return JSON.parse(state)
  } catch {
    return null
  }
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const callbackUrl = `${process.env.NEXTAUTH_URL}/api/auth/callback/eveonline`
  
  const credentials = Buffer.from(
    `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
  ).toString('base64')
  
  console.log('[OAuth] Exchanging code for token...')
  console.log('[OAuth] Callback URL:', callbackUrl)
  
  const response = await fetch(`${EVE_SSO_BASE_URL}/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    console.error('[OAuth] Token exchange failed:', response.status, text)
    throw new Error(`Token exchange failed: ${text}`)
  }

  const data = await response.json()
  console.log('[OAuth] Token received, access_token length:', data.access_token?.length)
  return data
}

export async function handleLoginFlow(code: string, baseUrl: string): Promise<{
  userId: string
  characterId: number
  ownerHash: string
  redirectUrl: string
}> {
  const tokenData = await exchangeCodeForToken(code)
  const charInfo = await getCharacterInfo(tokenData.access_token)
  
  const characterId = charInfo.character_id
  const ownerHash = charInfo.character_owner_hash
  const characterName = charInfo.character_name

  const existingChar = await prisma.character.findUnique({
    where: { id: characterId },
    include: { user: true }
  })

  let userId: string

  if (existingChar) {
    await prisma.character.update({
      where: { id: characterId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        name: characterName,
      },
    })
    userId = existingChar.userId
  } else {
    const accountCode = generateAccountCode()
    const user = await prisma.user.create({
      data: {
        accountCode,
        name: characterName,
        role: 'user',
        allowedActivities: ['ratting'],
      },
    })

    const charData = await fetchCharacterData(characterId, tokenData.access_token)

    await prisma.character.create({
      data: {
        id: characterId,
        name: characterName,
        ownerHash,
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        totalSp: charData.total_sp || 0,
        walletBalance: charData.wallet || 0,
        location: charData.location,
        ship: charData.ship,
        shipTypeId: charData.shipTypeId,
        isMain: true,
      },
    })
    userId = user.id
  }

  return {
    userId,
    characterId,
    ownerHash,
    redirectUrl: '/dashboard',
  }
}

export async function handleLinkFlow(
  code: string,
  accountCode: string,
  baseUrl: string
): Promise<{
  userId: string
  characterId: number
  ownerHash: string
  redirectUrl: string
} | { error: string; redirectUrl: string }> {
  const user = await prisma.user.findUnique({
    where: { accountCode },
  })

  if (!user) {
    return {
      error: 'invalid_account',
      redirectUrl: '/login?error=invalid_account',
    }
  }

  const tokenData = await exchangeCodeForToken(code)
  const charInfo = await getCharacterInfo(tokenData.access_token)

  const characterId = charInfo.character_id
  const ownerHash = charInfo.character_owner_hash
  const characterName = charInfo.character_name

  const existingChar = await prisma.character.findUnique({
    where: { id: characterId },
    include: { user: { include: { _count: { select: { characters: true } } } } },
  })

  if (existingChar && existingChar.userId !== user.id) {
    // If the character is under a "ghost" user (only 1 character, created by wrong login flow),
    // migrate it to the correct user and clean up the orphan user
    const otherUser = existingChar.user
    if (otherUser._count.characters === 1) {
      console.log(`[OAuth Link] Migrating character ${characterId} from orphan user ${otherUser.id} to user ${user.id}`)
      await prisma.character.update({
        where: { id: characterId },
        data: { userId: user.id, isMain: false },
      })
      await prisma.user.delete({ where: { id: otherUser.id } })
    } else {
      return {
        error: 'character_taken',
        redirectUrl: '/dashboard?error=character_taken',
      }
    }
  }

  if (existingChar) {
    await prisma.character.update({
      where: { id: characterId },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        name: characterName,
      },
    })
  } else {
    const charData = await fetchCharacterData(characterId, tokenData.access_token)

    await prisma.character.create({
      data: {
        id: characterId,
        name: characterName,
        ownerHash,
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        tokenExpiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
        totalSp: charData.total_sp || 0,
        walletBalance: charData.wallet || 0,
        location: charData.location,
        ship: charData.ship,
        shipTypeId: charData.shipTypeId,
        isMain: false,
      },
    })
  }

  return {
    userId: user.id,
    characterId,
    ownerHash,
    redirectUrl: '/dashboard/characters',
  }
}
