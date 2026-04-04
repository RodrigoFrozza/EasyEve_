import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessToken, getCharacterInfo, fetchCharacterData } from '@/lib/esi'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const state = searchParams.get('state')
  const code = searchParams.get('code')

  if (state && code) {
    try {
      const stateData = JSON.parse(state)
      if (stateData.accountCode) {
        return handleLinkCallback(request, stateData, code)
      }
    } catch (e) {
      // State não é JSON, deixar NextAuth processar
    }
  }

  const handler = NextAuth(authOptions)
  return handler.GET(request)
}

export async function POST(request: NextRequest) {
  const handler = NextAuth(authOptions)
  return handler.POST(request)
}

async function handleLinkCallback(request: NextRequest, stateData: any, code: string) {
  const accountCode = stateData.accountCode
  const callbackUrl = stateData.callbackUrl || '/dashboard'

  try {
    const tokenData = await getAccessToken(code)
    const characterInfo = await getCharacterInfo(tokenData.access_token)

    const characterId = characterInfo.character_id
    const ownerHash = characterInfo.character_owner_hash
    const characterName = characterInfo.character_name

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

      const url = new URL(callbackUrl, request.url)
      return NextResponse.redirect(url)
    }

    const user = await prisma.user.findUnique({
      where: { accountCode }
    })

    if (!user) {
      const errorUrl = new URL('/login', request.url)
      errorUrl.searchParams.set('error', 'invalid_account')
      return NextResponse.redirect(errorUrl)
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

    const url = new URL(callbackUrl, request.url)
    return NextResponse.redirect(url)

  } catch (error) {
    console.error('[Link Callback] Error:', error)
    const errorUrl = new URL('/login', request.url)
    errorUrl.searchParams.set('error', 'callback_error')
    return NextResponse.redirect(errorUrl)
  }
}
