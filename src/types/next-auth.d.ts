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
      characters?: {
        id: number
        name: string
        totalSp: number
        walletBalance: number
        location?: string | null
        ship?: string | null
      }[]
    }
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    characterId?: number
    characterOwnerHash?: string
    accessToken?: string
    userId?: string
  }
}
