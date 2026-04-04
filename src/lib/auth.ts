import { NextAuthOptions } from 'next-auth'
import { prisma } from './prisma'
import { fetchCharacterData } from './esi'
import { generateAccountCode } from './account-code'

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
          scope: 'publicData esi-calendar.respond_calendar_events.v1 esi-calendar.read_calendar_events.v1 esi-location.read_location.v1 esi-location.read_ship_type.v1 esi-mail.organize_mail.v1 esi-mail.read_mail.v1 esi-mail.send_mail.v1 esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1 esi-wallet.read_character_wallet.v1 esi-wallet.read_corporation_wallet.v1 esi-search.search_structures.v1 esi-clones.read_clones.v1 esi-characters.read_contacts.v1 esi-universe.read_structures.v1 esi-killmails.read_killmails.v1 esi-corporations.read_corporation_membership.v1 esi-assets.read_assets.v1 esi-planets.manage_planets.v1 esi-fleets.read_fleet.v1 esi-fleets.write_fleet.v1 esi-ui.open_window.v1 esi-ui.write_waypoint.v1 esi-characters.write_contacts.v1 esi-fittings.read_fittings.v1 esi-fittings.write_fittings.v1 esi-markets.structure_markets.v1 esi-corporations.read_structures.v1 esi-characters.read_loyalty.v1 esi-characters.read_chat_channels.v1 esi-characters.read_medals.v1 esi-characters.read_standings.v1 esi-characters.read_agents_research.v1 esi-industry.read_character_jobs.v1 esi-markets.read_character_orders.v1 esi-characters.read_blueprints.v1 esi-characters.read_corporation_roles.v1 esi-location.read_online.v1 esi-contracts.read_character_contracts.v1 esi-clones.read_implants.v1 esi-characters.read_fatigue.v1 esi-killmails.read_corporation_killmails.v1 esi-corporations.track_members.v1 esi-wallet.read_corporation_wallets.v1 esi-characters.read_notifications.v1 esi-corporations.read_divisions.v1 esi-corporations.read_contacts.v1 esi-assets.read_corporation_assets.v1 esi-corporations.read_titles.v1 esi-corporations.read_blueprints.v1 esi-contracts.read_corporation_contracts.v1 esi-contracts.read_corporation_contracts.v1 esi-corporations.read_standings.v1 esi-corporations.read_starbases.v1 esi-industry.read_corporation_jobs.v1 esi-markets.read_corporation_orders.v1 esi-corporations.read_container_logs.v1 esi-industry.read_character_mining.v1 esi-industry.read_corporation_mining.v1 esi-planets.read_customs_offices.v1 esi-corporations.read_facilities.v1 esi-corporations.read_medals.v1 esi-characters.read_titles.v1 esi-alliances.read_contacts.v1 esi-characters.read_fw_stats.v1 esi-corporations.read_fw_stats.v1',
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
              redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/callback/eveonline`,
            }),
          })
          
          const text = await response.text()
          
          if (!response.ok) {
            throw new Error(`Token request failed: ${text}`)
          }
          
          const tokens = JSON.parse(text)
          return { tokens }
        },
      },
      userinfo: {
        async request({ tokens }) {
          if (!tokens.access_token) {
            throw new Error('No access token')
          }
          try {
            const payload = JSON.parse(Buffer.from(tokens.access_token.split('.')[1], 'base64').toString())
            const subParts = payload.sub?.split(':') || []
            const characterId = parseInt(subParts[subParts.length - 1]) || 0
            const ownerHash = payload.owner || ''
            
            return {
              id: String(characterId),
              characterId,
              characterOwnerHash: ownerHash,
              name: payload.name || '',
              corporationId: 0,
              allianceId: 0,
            }
          } catch (e) {
            console.error('userinfo decode error:', e)
            throw e
          }
        },
      },
      profile(profile) {
        const p = profile as any
        return {
          id: String(p.id || p.characterId),
          name: p.name,
          characterId: p.characterId,
          characterOwnerHash: p.characterOwnerHash,
        }
      },
    },
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'eveonline' && profile) {
        const charProfile = profile as any
        try {
          const tokenExpiresAt = account.expires_at 
            ? new Date(account.expires_at * 1000)
            : new Date(Date.now() + 20 * 60 * 1000)

          const existingCharacter = await prisma.character.findUnique({
            where: { id: charProfile.characterId },
            include: { user: true }
          })

          if (existingCharacter) {
            await prisma.character.update({
              where: { id: existingCharacter.id },
              data: {
                accessToken: account.access_token || existingCharacter.accessToken,
                refreshToken: (account as any).refresh_token || existingCharacter.refreshToken,
                tokenExpiresAt: tokenExpiresAt,
                name: charProfile.name || existingCharacter.name,
              },
            })
            return true
          }

          let dbUser = null
          
          if (account.state) {
            try {
              const state = JSON.parse(account.state as string)
              if (state.accountCode) {
                dbUser = await prisma.user.findUnique({
                  where: { accountCode: state.accountCode },
                })
              }
            } catch (e) {
              console.error('Failed to parse account state:', e)
            }
          }

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                accountCode: generateAccountCode(),
                name: charProfile.name || 'EVE User',
              },
            })
          }

          const isFirstCharacter = await prisma.character.count({
            where: { userId: dbUser.id }
          }) === 0

          const charData = await fetchCharacterData(charProfile.characterId, account.access_token!)
          
          await prisma.character.create({
            data: {
              id: charProfile.characterId,
              name: charProfile.name || 'Unknown',
              ownerHash: charProfile.characterOwnerHash,
              userId: dbUser.id,
              accessToken: account.access_token || '',
              refreshToken: (account as any).refresh_token || '',
              tokenExpiresAt: tokenExpiresAt,
              totalSp: charData.total_sp || 0,
              walletBalance: charData.wallet || 0,
              location: charData.location,
              ship: charData.ship,
              shipTypeId: charData.shipTypeId,
              isMain: isFirstCharacter,
            },
          })

          return true
        } catch (error) {
          console.error('SignIn error:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, profile }) {
      if (account && account.access_token) {
        try {
          if (profile) {
            const p = profile as any
            token.characterId = p.characterId
            token.characterOwnerHash = p.characterOwnerHash
            token.characterName = p.name
          } else {
            const payload = JSON.parse(Buffer.from(account.access_token.split('.')[1], 'base64').toString())
            const subParts = payload.sub?.split(':') || []
            token.characterId = parseInt(subParts[subParts.length - 1]) || 0
            token.characterOwnerHash = payload.owner || ''
            token.characterName = payload.name || ''
          }
          token.accessToken = account.access_token
        } catch (e) {
          console.error('JWT decode error:', e)
        }
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
        const character = await prisma.character.findUnique({
          where: { ownerHash: token.characterOwnerHash as string },
          include: {
            user: {
              include: {
                characters: true,
              },
            },
          },
        })
        
        if (character) {
          session.user.id = character.user.id
          session.user.accountCode = character.user.accountCode
          session.user.isMain = character.isMain
          session.user.characters = character.user.characters.map((c) => ({
            id: c.id,
            name: c.name,
            totalSp: c.totalSp,
            walletBalance: c.walletBalance,
            location: c.location,
            ship: c.ship,
            isMain: c.isMain,
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
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    callbackUrl: {
      name: `next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        secure: true,
      },
    },
  },
}
