'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Trash2, Copy, Check, Star } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CharacterActionsProps {
  characterId?: number
  ownerHash?: string
  isMain?: boolean
  onLinked?: () => void
}

export function LinkCharacterButton({ accountCode }: { accountCode?: string | null }) {
  const [loading, setLoading] = useState(false)
  
  async function handleLink() {
    setLoading(true)
    const callbackUrl = accountCode 
      ? `/link-character?accountCode=${accountCode}`
      : '/dashboard/characters'
    await signIn('eveonline', { callbackUrl })
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

export function SetMainButton({ characterId, isMain }: { characterId: number, isMain: boolean }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  async function handleSetMain() {
    if (isMain) return
    setLoading(true)
    try {
      const response = await fetch('/api/characters/set-main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId })
      })
      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Set main error:', error)
    }
    setLoading(false)
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="border-eve-accent/50 text-eve-accent hover:bg-eve-accent/10"
      onClick={handleSetMain}
      disabled={loading || isMain}
    >
      <Star className="mr-2 h-4 w-4" />
      {isMain ? 'Main' : 'Set as Main'}
    </Button>
  )
}

export function CopyInviteLink({ accountCode }: { accountCode: string }) {
  const [copied, setCopied] = useState(false)
  
  async function handleCopy() {
    const inviteUrl = `${window.location.origin}/api/auth/signin/eveonline?accountCode=${accountCode}`
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="border-eve-border"
      onClick={handleCopy}
    >
      {copied ? <Check className="mr-2 h-4 w-4 text-green-400" /> : <Copy className="mr-2 h-4 w-4" />}
      {copied ? 'Copied!' : 'Copy Invite Link'}
    </Button>
  )
}
