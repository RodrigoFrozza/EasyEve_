import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { getValidAccessToken } from '@/lib/token-manager'

export const dynamic = 'force-dynamic'

const ESI_BASE = 'https://esi.evetech.net/latest'

/**
 * GET /api/esi/fittings - Get character fittings from ESI
 * Query params:
 *   - characterId: EVE character ID (optional, uses main if not provided)
 */
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    let characterId = searchParams.get('characterId')
    
    // Find character
    const characters = await prisma.character.findMany({
      where: { userId: user.id },
      select: { id: true, name: true, accessToken: true }
    })

    if (!characters || characters.length === 0) {
      return NextResponse.json({ error: 'No characters linked' }, { status: 400 })
    }

    // Use first character if not specified
    if (!characterId) {
      characterId = String(characters[0].id)
    }

    const character = characters.find(c => c.id === parseInt(characterId))
    if (!character) {
      return NextResponse.json({ error: 'Character not found' }, { status: 404 })
    }

    // Get access token
    const tokenResult = await getValidAccessToken(character.id)
    if (!tokenResult.accessToken) {
      return NextResponse.json({ error: 'No valid token for character' }, { status: 401 })
    }
    const token = tokenResult.accessToken

    // Fetch fittings from ESI
    const response = await fetch(
      `${ESI_BASE}/characters/${character.id}/fittings/`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'EasyEve/1.0'
        }
      }
    )

    if (!response.ok) {
      console.error('ESI fittings response:', response.status)
      return NextResponse.json({ error: 'Failed to fetch fittings' }, { status: response.status })
    }

    const fittings = await response.json()

    // Transform to our format
    const transformed = fittings.map((fit: any) => ({
      fitId: fit.fitting_id,
      name: fit.name,
      shipTypeId: fit.ship_type_id,
      shipName: '', // Will be resolved
      description: fit.description || '',
      highSlots: fit.slots?.high || [],
      medSlots: fit.slots?.med || [],
      lowSlots: fit.slots?.low || [],
      rigSlots: fit.slots?.rig || [],
    }))

    // Resolve ship names
    const shipTypeIdList: number[] = []
    for (const f of transformed) {
      if (!shipTypeIdList.includes(f.shipTypeId)) {
        shipTypeIdList.push(f.shipTypeId)
      }
    }
    for (const tid of shipTypeIdList) {
      try {
        const res = await fetch(`${ESI_BASE}/universe/types/${tid}/`)
        if (res.ok) {
          const data = await res.json()
          for (const fit of transformed) {
            if (fit.shipTypeId === tid) {
              fit.shipName = data.name
            }
          }
        }
      } catch (e) {
        // Skip
      }
    }

    return NextResponse.json(transformed)
  } catch (error) {
    console.error('GET /api/esi/fittings error:', error)
    return NextResponse.json({ error: 'Failed to fetch fittings' }, { status: 500 })
  }
}