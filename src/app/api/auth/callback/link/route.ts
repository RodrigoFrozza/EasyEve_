import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAccessToken, getCharacterInfo, fetchCharacterData } from '@/lib/esi'

const EVE_SCOPES = [
  'publicData',
  'esi-location.read_location.v1',
  'esi-location.read_ship_type.v1',
  'esi-skills.read_skills.v1',
  'esi-skills.read_skillqueue.v1',
  'esi-wallet.read_character_wallet.v1',
  'esi-clones.read_clones.v1',
  'esi-characters.read_contacts.v1',
  'esi-fleets.read_fleet.v1',
  'esi-fleets.write_fleet.v1',
  'esi-characters.write_contacts.v1',
  'esi-fittings.read_fittings.v1',
  'esi-fittings.write_fittings.v1',
  'esi-location.read_online.v1',
  'esi-contracts.read_character_contracts.v1',
  'esi-clones.read_implants.v1',
  'esi-industry.read_character_mining.v1',
  'esi-industry.read_corporation_mining.v1',
].join(' ')

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

  if (!accountCode) {
    console.error('[Link Callback] No accountCode in state')
    return NextResponse.redirect(new URL('/login?error=invalid_state', request.url))
  }

  try {
    const tokenData = await getAccessToken(code)
    const characterInfo = await getCharacterInfo(tokenData.access_token)

    const characterId = characterInfo.character_id
    const ownerHash = characterInfo.character_owner_hash
    const characterName = characterInfo.character_name

    const user = await prisma.user.findUnique({
      where: { accountCode }
    })

    if (!user) {
      console.error('[Link Callback] User not found for accountCode:', accountCode)
      return NextResponse.redirect(new URL('/login?error=invalid_account', request.url))
    }

    const existingCharacter = await prisma.character.findUnique({
      where: { id: characterId }
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

      const url = new URL(callbackUrl, process.env.NEXTAUTH_URL || 'https://easyeve.cloud')
      return NextResponse.redirect(url)
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

    const url = new URL(callbackUrl, process.env.NEXTAUTH_URL || 'https://easyeve.cloud')
    return NextResponse.redirect(url)

  } catch (error) {
    console.error('[Link Callback] Error:', error)
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url))
  }
}
