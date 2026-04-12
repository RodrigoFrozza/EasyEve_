import { NextRequest, NextResponse } from 'next/server'

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
  'esi-characters.read_notifications.v1',
].join(' ')

const HOLDING_SCOPES = [
  'publicData',
  'esi-wallet.read_corporation_wallet.v1',
  'esi-wallet.read_corporation_wallets.v1',
  'esi-corporations.read_corporation_membership.v1',
  'esi-corporations.read_structures.v1',
  'esi-corporations.track_members.v1',
  'esi-corporations.read_divisions.v1',
  'esi-corporations.read_contacts.v1',
  'esi-corporations.read_titles.v1',
  'esi-corporations.read_blueprints.v1',
  'esi-corporations.read_standings.v1',
  'esi-corporations.read_starbases.v1',
  'esi-corporations.read_container_logs.v1',
  'esi-corporations.read_facilities.v1',
  'esi-corporations.read_medals.v1',
  'esi-corporations.read_fw_stats.v1',
  'esi-corporations.read_projects.v1',
  'esi-corporations.read_freelance_jobs.v1',
].join(' ')

function generateState(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let state = ''
  for (let i = 0; i < 32; i++) {
    state += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return state
}

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://easyeve.cloud'
  
  const linkAccountCode = request.nextUrl.searchParams.get('link')
  const callbackUrl = request.nextUrl.searchParams.get('callbackUrl') || '/dashboard'
  const app = request.nextUrl.searchParams.get('app') || 'main'

  let stateStr: string

  if (linkAccountCode) {
    stateStr = JSON.stringify({
      accountCode: linkAccountCode,
      callbackUrl,
      esiApp: app,
    })
  } else {
    stateStr = JSON.stringify({
      nonce: generateState(),
      esiApp: app,
    })
  }

  const clientId = app === 'holding' ? process.env.HOLDING_EVE_CLIENT_ID : process.env.EVE_CLIENT_ID
  const scopes = app === 'holding' ? HOLDING_SCOPES : EVE_SCOPES

  const url = new URL('https://login.eveonline.com/v2/oauth/authorize')
  url.searchParams.set('client_id', clientId!)
  url.searchParams.set('redirect_uri', `${baseUrl}/api/auth/callback/eveonline`)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', scopes)
  url.searchParams.set('state', stateStr)

  return NextResponse.redirect(url.toString())
}
