'use client'

import { useState, useEffect } from 'react'

interface SessionUser {
  id: string
  accountCode: string
  characterId: number
  role: string
  allowedActivities: string[]
  characters: Array<{
    id: number
    name: string
    isMain: boolean
  }>
}

interface Session {
  user: SessionUser | null
}

export function useSession() {
  const [session, setSession] = useState<Session>({ user: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/session')
      .then(res => res.json())
      .then(data => {
        setSession(data)
        setLoading(false)
      })
      .catch(() => {
        setSession({ user: null })
        setLoading(false)
      })
  }, [])

  return { data: session, status: loading ? 'loading' : session.user ? 'authenticated' : 'unauthenticated' }
}

export function signOut() {
  fetch('/api/auth/session', { method: 'DELETE' })
    .then(() => {
      window.location.href = '/login'
    })
}

export function signIn() {
  window.location.href = '/api/auth/signin'
}
