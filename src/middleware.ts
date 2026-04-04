import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyJWT } from '@/lib/auth-jwt'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  const publicRoutes = [
    '/login',
    '/api/auth/signin',
    '/api/auth/callback',
    '/api/auth/session',
    '/',
  ]
  
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }
  
  const protectedRoutes = ['/dashboard', '/link-character']
  
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const token = request.cookies.get('session')?.value
    
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    const payload = await verifyJWT(token)
    
    if (!payload) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.delete('session')
      return response
    }
    
    return NextResponse.next()
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/link-character/:path*'],
}
