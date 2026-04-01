'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CharacterActionsProps {
  characterId?: number
  ownerHash?: string
  isMain?: boolean
  onLinked?: () => void
}

export function LinkCharacterButton() {
  const [loading, setLoading] = useState(false)
  
  async function handleLink() {
    setLoading(true)
    await signIn('eveonline', { callbackUrl: '/dashboard/characters' })
  }
  
  return (
    <Button 
      onClick={handleLink} 
      disabled={loading}
      className="bg-eve-accent text-black hover:bg-eve-accent/80"
    >
      <Plus className="mr-2 h-4 w-4" />
      {loading ? 'Redirecting...' : 'Link New Character'}
    </Button>
  )
}

export function RefreshCharacterButton({ characterId }: { characterId: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  async function handleRefresh() {
    setLoading(true)
    try {
      const response = await fetch(`/api/characters/${characterId}`, { method: 'POST' })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Refresh error:', error)
    }
    setLoading(false)
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex-1 border-eve-border"
      onClick={handleRefresh}
      disabled={loading}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      Refresh
    </Button>
  )
}

export function RemoveCharacterButton({ characterId }: { characterId: number }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  async function handleRemove() {
    if (!confirm('Are you sure you want to remove this character?')) return
    
    setLoading(true)
    try {
      const response = await fetch(`/api/characters/${characterId}`, { method: 'DELETE' })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Remove error:', error)
    }
    setLoading(false)
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="border-red-500/50 text-red-400 hover:bg-red-500/10"
      onClick={handleRemove}
      disabled={loading}
    >
      <Trash2 className="mr-2 h-4 w-4" />
      Remove
    </Button>
  )
}
