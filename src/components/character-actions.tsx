'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Plus, RefreshCw, Trash2, Copy, Check, Star, Shield, List } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-error'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

interface CharacterActionsProps {
  characterId?: number
  ownerHash?: string
  isMain?: boolean
  onLinked?: () => void
}

export function LinkCharacterButton({ accountCode }: { accountCode?: string | null }) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  
  function handleLink() {
    setLoading(true)
    if (accountCode) {
      router.push(`/link-character?accountCode=${accountCode}`)
    } else {
      router.push('/link-character')
    }
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

import { useCharacterData } from '@/lib/hooks/use-esi'

export function RefreshCharacterButton({ characterId }: { characterId: number }) {
  const { refresh, isRefreshing } = useCharacterData(characterId)
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex-1 border-eve-border"
      onClick={() => refresh()}
      disabled={isRefreshing}
    >
      <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
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
      const { success } = await apiClient.request(`/api/characters/${characterId}`, { 
        method: 'DELETE',
        showToast: true 
      })
      
      if (success) {
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
      const { success } = await apiClient.request('/api/characters/set-main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId }),
        showToast: true
      })
      
      if (success) {
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
    const inviteUrl = `${window.location.origin}/link-character?accountCode=${accountCode}`
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

export function ReloginButton({ accountCode }: { accountCode: string }) {
  const router = useRouter()
  
  function handleRelogin() {
    router.push(`/api/auth/signin?link=${accountCode}`)
  }
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      className="border-eve-accent/50 text-eve-accent hover:bg-eve-accent/10"
      onClick={handleRelogin}
    >
      <Shield className="mr-2 h-4 w-4" />
      Re-Authorize
    </Button>
  )
}

export function CharacterScopesDialog({ scopes }: { scopes: string[] }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-eve-border">
          <List className="mr-2 h-4 w-4" />
          Scopes
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] bg-eve-panel border-eve-border text-white">
        <DialogHeader>
          <DialogTitle>Active Scopes</DialogTitle>
          <DialogDescription className="text-gray-400">
            These are the EVE API permissions currently granted to this character. If a feature is not working, you may need to re-authorize.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-4 max-h-[60vh] overflow-y-auto pr-2">
          {(scopes?.length || 0) === 0 ? (
            <p className="text-sm text-gray-500">No active scopes found. Please re-authorize.</p>
          ) : (
            scopes.map((scope, index) => (
              <div key={index} className="flex items-center space-x-2 bg-eve-dark/50 p-2 rounded border border-eve-border/50 text-sm font-mono break-all">
                <Check className="h-4 w-4 text-green-400 shrink-0" />
                <span>{scope}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

