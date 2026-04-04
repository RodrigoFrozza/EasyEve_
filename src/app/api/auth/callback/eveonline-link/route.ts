import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessToken, getCharacterInfo, fetchCharacterData } from '@/lib/esi'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('[Link Callback] OAuth error:', error)
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error)}`, request.url))
  }

  if (!code) {
    console.error('[Link Callback] No code provided')
    return NextResponse.redirect(new URL('/login?error=no_code', request.url))
  }

  try {
    const tokenData = await getAccessToken(code)
    const characterInfo = await getCharacterInfo(tokenData.access_token)

    const characterId = characterInfo.character_id
    const ownerHash = characterInfo.character_owner_hash
    const characterName = characterInfo.character_name

    let accountCode: string | null = null
    let callbackUrl = '/dashboard'

    if (state) {
      try {
        const stateData = JSON.parse(state)
        accountCode = stateData.accountCode || null
        callbackUrl = stateData.callbackUrl || '/dashboard'
      } catch (e) {
        console.error('[Link Callback] Failed to parse state:', e)
      }
    }

    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId },
      include: { user: true }
    })

    if (existingCharacter) {
      const tokenExpiresAt = tokenData.expires_on 
        ? new Date(tokenData.expires_on) 
        : new Date(Date.now() + 20 * 60 * 1000)

      await prisma.character.update({
        where: { id: characterId },
        data: {
          accessToken: tokenData.access_token,
          refreshToken: tokenData.refresh_token,
          tokenExpiresAt,
          name: characterName,
        },
      })

      return NextResponse.redirect(new URL(callbackUrl, request.url))
    }

    let user = null

    if (accountCode) {
      user = await prisma.user.findUnique({
        where: { accountCode }
      })
    }

    if (!user) {
      return NextResponse.redirect(new URL(`/login?error=invalid_account`, request.url))
    }

    const charData = await fetchCharacterData(characterId, tokenData.access_token)

    const tokenExpiresAt = tokenData.expires_on 
      ? new Date(tokenData.expires_on) 
      : new Date(Date.now() + 20 * 60 * 1000)

    await prisma.character.create({
      data: {
        id: characterId,
        name: characterName,
        ownerHash,
        userId: user.id,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || '',
        tokenExpiresAt,
        totalSp: charData.total_sp || 0,
        walletBalance: charData.wallet || 0,
        location: charData.location,
        ship: charData.ship,
        shipTypeId: charData.shipTypeId,
        isMain: false,
      },
    })

    return NextResponse.redirect(new URL(callbackUrl, request.url))

  } catch (error) {
    console.error('[Link Callback] Error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }
}
