import { NextAuthOptions } from 'next-auth'
import { prisma } from './prisma'
import { getCharacterInfo, getAccessToken, getCharacterPortraitUrl, getCharacterAvatarUrl, fetchCharacterData, getCorporationInfo, getAllianceInfo } from './esi'

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: 'eveonline',
      name: 'EVE Online',
      type: 'oauth',
      clientId: process.env.EVE_CLIENT_ID,
      clientSecret: process.env.EVE_CLIENT_SECRET,
      authorization: {
        url: 'https://login.eveonline.com/v2/oauth/authorize',
        params: {
          scope: 'publicData esi-calendar.read_calendar_events.v1 esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-mail.read_mail.v1 esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1 esi-wallet.read_character_wallet.v1 esi-clones.read_clones.v1 esi-characters.read_contacts.v1 esi-killmails.read_killmails.v1 esi-corporations.read_corporation_membership.v1 esi-assets.read_assets.v1 esi-fleets.read_fleet.v1 esi-ui.open_window.v1 esi-ui.write_waypoint.v1 esi-characters.write_contacts.v1 esi-fittings.read_fittings.v1 esi-fittings.write_fittings.v1 esi-markets.structure_markets.v1 esi-corporations.read_structures.v1 esi-characters.read_loyalty.v1 esi-characters.read_medals.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-characters.read_corporation_roles.v1 esi-location.read_online.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-characters.read_fatigue.v1 esi-killmails.read_corporation_killmails.v1 esi-corporations.track_members.v1 esi-wallet.read_corporation_wallets.v1 esi-characters.read_notifications.v1 esi-corporations.read_divisions.v1 esi-corporations.read_contacts.v1 esi-assets.read_corporation_assets.v1 esi-corporations.read_titles.v1 esi-corporations.read_blueprints.v1 esi-contracts.read_corporation_contracts.v1 esi-corporations.read_standings.v1 esi-corporations.read_starbases.v1 esi-industry.read_corporation_jobs.v1 esi-markets.read_corporation_orders.v1 esi-corporations.read_container_logs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1 esi-corporations.read_facilities.v1 esi-corporations.read_medals.v1 esi-characters.read_title.v1 esi-alliances.read_contacts.v1 esi-characters.read_fw_stats.v1 esi-corporations.read_fw_stats.v1',
          response_type: 'code',
        },
      },
      token: {
        url: 'https://login.eveonline.com/v2/oauth/token',
        async request({ provider, params, checks }) {
          const response = await fetch('https://login.eveonline.com/v2/oauth/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Authorization': `Basic ${Buffer.from(
                `${process.env.EVE_CLIENT_ID}:${process.env.EVE_CLIENT_SECRET}`
              ).toString('base64')}`,
            },
            body: new URLSearchParams({
              grant_type: 'authorization_code',
              code: params.code!,
            }),
          })
          
          const tokens = await response.json()
          return { tokens }
        },
      },
      userinfo: {
        url: 'https://esi.evetech.net/latest/verify',
        async request({ tokens }) {
          const response = await fetch('https://esi.evetech.net/latest/verify', {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          })
          
          const eveData = await response.json()
          
          const corpInfo = await getCorporationInfo(eveData.CharacterID)
          const allianceInfo = eveData.AllianceID 
            ? await getAllianceInfo(eveData.AllianceID) 
            : null
          
          const portraitUrl = getCharacterAvatarUrl(eveData.CharacterID)
          
          return {
            id: String(eveData.CharacterID),
            name: eveData.CharacterName,
            email: undefined,
            image: portraitUrl,
            characterId: eveData.CharacterID,
            characterOwnerHash: eveData.CharacterOwnerHash,
            corporationId: eveData.CorporationID,
            corporationName: corpInfo.name || `Corp ${eveData.CorporationID}`,
            allianceId: eveData.AllianceID,
            allianceName: allianceInfo?.name || undefined,
            tokenExpiry: eveData.ExpiresOn,
          }
        },
      },
      profile(profile) {
        return {
          id: String(profile.characterId),
          name: profile.name,
          email: profile.email,
          image: profile.image,
          characterId: profile.characterId,
          characterOwnerHash: profile.characterOwnerHash,
          corporationId: profile.corporationId,
          corporationName: profile.corporationName,
          allianceId: profile.allianceId,
          allianceName: profile.allianceName,
        }
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'eveonline' && profile) {
        try {
          const charProfile = profile as any
          
          let dbUser = await prisma.user.findUnique({
            where: { eveSubject: charProfile.characterOwnerHash },
          })

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                eveSubject: charProfile.characterOwnerHash,
                name: charProfile.name,
              },
            })
          }

          const existingChar = await prisma.character.findUnique({
            where: { ownerHash: charProfile.characterOwnerHash },
          })

          if (!existingChar) {
            const charData = await fetchCharacterData(charProfile.characterId, account.access_token!)
            const charDataAny = charData as { total_sp?: number; wallet?: number; location?: string; ship?: string; shipTypeId?: number }
            
            await prisma.character.create({
              data: {
                id: charProfile.characterId,
                name: charProfile.name,
                ownerHash: charProfile.characterOwnerHash,
                userId: dbUser.id,
                totalSp: charDataAny.total_sp || 0,
                walletBalance: charDataAny.wallet || 0,
                location: charDataAny.location,
                ship: charDataAny.ship,
                shipTypeId: charDataAny.shipTypeId,
              },
            })
          } else if (existingChar.userId !== dbUser.id) {
            await prisma.character.update({
              where: { id: existingChar.id },
              data: { userId: dbUser.id },
            })
          }

          return true
        } catch (error) {
          console.error('SignIn error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, profile }) {
      if (account && profile) {
        const charProfile = profile as any
        token.characterId = charProfile.characterId
        token.characterOwnerHash = charProfile.characterOwnerHash
        token.accessToken = account.access_token
        token.userId = charProfile.userId
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.characterId = token.characterId as number
        session.user.characterOwnerHash = token.characterOwnerHash as string
        session.user.accessToken = token.accessToken as string
      }
      
      if (token.characterOwnerHash) {
        const user = await prisma.user.findFirst({
          where: {
            characters: {
              some: {
                ownerHash: token.characterOwnerHash as string,
              },
            },
          },
          include: {
            characters: true,
          },
        })
        
        if (user) {
          session.user.id = user.id
          const PrismaChar = { id: 0, name: '', totalSp: 0, walletBalance: 0, location: null as string | null, ship: null as string | null }
          session.user.characters = user.characters.map((c: typeof PrismaChar) => ({
            id: c.id,
            name: c.name,
            totalSp: c.totalSp,
            walletBalance: c.walletBalance,
            location: c.location,
            ship: c.ship,
          }))
        }
      }
      
      return session
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
}
