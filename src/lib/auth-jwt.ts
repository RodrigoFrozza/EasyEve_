import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = () => new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'fallback-secret-change-in-production')

export interface JWTPayload {
  userId: string
  characterId: number
  ownerHash: string
  iat?: number
  exp?: number
}

export async function createJWT(
  userId: string,
  characterId: number,
  ownerHash: string
): Promise<string> {
  return new SignJWT({
    userId,
    characterId,
    ownerHash,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET())
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET())
    return {
      userId: payload.userId as string,
      characterId: payload.characterId as number,
      ownerHash: payload.ownerHash as string,
      iat: payload.iat,
      exp: payload.exp,
    }
  } catch {
    return null
  }
}

export function createSessionCookie(token: string): string {
  return `session=${token}; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Lax; ` +
    `Path=/; ` +
    `Max-Age=${8 * 60 * 60}`
}

export function clearSessionCookie(): string {
  return `session=; ` +
    `HttpOnly; ` +
    `Secure; ` +
    `SameSite=Lax; ` +
    `Path=/; ` +
    `Max-Age=0`
}
