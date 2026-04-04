import { NextRequest, NextResponse } from 'next/server'
import { parseState, handleLoginFlow, handleLinkFlow } from '@/lib/oauth-handlers'
import { createJWT, createSessionCookie } from '@/lib/auth-jwt'

export async function GET(request: NextRequest) {
  const baseUrl = process.env.NEXTAUTH_URL || 'https://easyeve.cloud'
  const searchParams = request.nextUrl.searchParams

  const code = searchParams.get('code')
  const stateParam = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    console.error('[OAuth Callback] Error from ESI:', error)
    const errorMessages: Record<string, string> = {
      access_denied: 'Login cancelled',
      invalid_request: 'Invalid request',
      temporarily_unavailable: 'ESI temporarily unavailable',
    }
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(errorMessages[error] || error)}`, baseUrl)
    )
  }

  if (!code) {
    console.error('[OAuth Callback] No code provided')
    return NextResponse.redirect(new URL('/login?error=no_code', baseUrl))
  }

  const state = parseState(stateParam)

  try {
    let result: { userId: string; characterId: number; ownerHash: string; redirectUrl: string }

    if (state?.accountCode) {
      const linkResult = await handleLinkFlow(code, state.accountCode, baseUrl)
      
      if ('error' in linkResult) {
        return NextResponse.redirect(new URL(linkResult.redirectUrl, baseUrl))
      }
      
      result = linkResult
    } else {
      result = await handleLoginFlow(code, baseUrl)
    }

    const jwt = await createJWT(result.userId, result.characterId, result.ownerHash)
    const cookie = createSessionCookie(jwt)

    return NextResponse.redirect(
      new URL(result.redirectUrl, baseUrl),
      {
        headers: {
          'Set-Cookie': cookie,
        },
      }
    )

  } catch (err) {
    console.error('[OAuth Callback] Error:', err)
    return NextResponse.redirect(new URL('/login?error=callback_error', baseUrl))
  }
}
