import 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      name?: string | null
      email?: string | null
      image?: string | null
      characterId?: number
      characterOwnerHash?: string
      accessToken?: string
      accountCode?: string | null
      isMain?: boolean
      characters: Array<{
        id: number
        name: string
        totalSp: number
        walletBalance: number
        location: string | null
        ship: string | null
        isMain: boolean
      }>
    }
  }

  interface User {
    id: string
    characterId?: number
    characterOwnerHash?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    characterId?: number
    characterOwnerHash?: string
    characterName?: string
    accessToken?: string
  }
}
