import { NextResponse } from 'next/server'
import { getCurrentUser } from './api-helpers'

export async function requireAdmin() {
  const user = await getCurrentUser()
  
  if (!user || user.role !== 'master') {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized - Administrator access required' },
        { status: 403 }
      ),
      user: null
    }
  }
  
  return { error: null, user }
}

export async function isAdmin() {
  const user = await getCurrentUser()
  return user?.role === 'master'
}
