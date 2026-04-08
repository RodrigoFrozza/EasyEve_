'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Loader2, Users, Shield, Lock, Unlock, Gem, Crosshair, Zap, Compass, ShieldCheck, AlertTriangle, Target } from 'lucide-react'
import { useSession } from '@/lib/session-client'
import { cn, formatISK } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'

interface AccountData {
  id: string
  accountCode: string | null
  name: string | null
  role: string
  allowedActivities: string[]
  createdAt: string
  characters: Array<{
    id: number
    name: string
    isMain: boolean
    location: string | null
    ship: string | null
    walletBalance: number
  }>
  _count: {
    characters: number
    activities: number
  }
}

export default function AdminPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground animate-pulse">Carregando admin...</p>
      </div>
    }>
      <AdminContent />
    </Suspense>
  )
}

function AdminContent() {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/dashboard')
      return
    }
    if (sessionStatus === 'authenticated' && session?.user?.role !== 'master') {
      router.push('/dashboard')
      return
    }
    if (sessionStatus === 'authenticated') {
      fetchAccounts()
    }
  }, [session, sessionStatus])

  const fetchAccounts = async () => {
    try {
      const res = await fetch('/api/admin/accounts', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setAccounts(data.accounts || [])
      }
    } catch (err) {
      console.error('Failed to fetch accounts:', err)
    } finally {
      setLoading(false)
    }
  }

  const toggleActivity = async (accountId: string, activityId: string, currentlyAllowed: boolean) => {
    const account = accounts.find(a => a.id === accountId)
    if (!account) return

    setSaving(accountId + activityId)
    const newAllowed = currentlyAllowed
      ? account.allowedActivities.filter(a => a !== activityId)
      : [...account.allowedActivities, activityId]

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: accountId, allowedActivities: newAllowed })
      })

      if (res.ok) {
        setAccounts(accounts.map(a =>
          a.id === accountId ? { ...a, allowedActivities: newAllowed } : a
        ))
      }
    } catch (err) {
      console.error('Failed to update permissions:', err)
    } finally {
      setSaving(null)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground animate-pulse">Carregando...</p>
      </div>
    )
  }

  if (sessionStatus === 'unauthenticated' || session?.user?.role !== 'master') {
    return null
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-eve-accent" />
            <h1 className="text-3xl font-bold text-white">Admin Panel</h1>
          </div>
          <p className="text-gray-400 mt-1">Gerencie contas e permissões de atividades</p>
        </div>
        <Badge variant="outline" className="bg-eve-accent/20 text-eve-accent border-eve-accent">
          <Shield className="h-3 w-3 mr-1" />
          Master
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-eve-accent/20">
                <Users className="h-6 w-6 text-eve-accent" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Accounts</p>
                <p className="text-2xl font-bold text-white">{accounts.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/20">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Total Characters</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.reduce((sum, a) => sum + a._count.characters, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-eve-panel border-eve-border">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-purple-500/20">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-gray-400">Masters</p>
                <p className="text-2xl font-bold text-white">
                  {accounts.filter(a => a.role === 'master').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Accounts</h2>
        
        {accounts.length === 0 ? (
          <Card className="bg-eve-panel border-eve-border">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-gray-600 mb-4" />
              <p className="text-gray-400">Nenhuma conta encontrada</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onToggleActivity={toggleActivity}
                saving={saving}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function AccountCard({
  account,
  onToggleActivity,
  saving
}: {
  account: AccountData
  onToggleActivity: (accountId: string, activityId: string, currentlyAllowed: boolean) => void
  saving: string | null
}) {
  const typeInfo = ACTIVITY_TYPES.find(t => t.id === account.allowedActivities[0])
  const Icon = typeInfo?.icon || Crosshair

  return (
    <Card className={cn(
      "bg-eve-panel border-eve-border",
      account.role === 'master' && "ring-2 ring-eve-accent"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={account.characters[0] ? `https://images.evetech.net/characters/${account.characters[0].id}/portrait?size=64` : ''} />
              <AvatarFallback>
                {account.name?.[0] || account.accountCode?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg text-white">
                {account.name || account.accountCode || 'Sem nome'}
              </CardTitle>
              <p className="text-xs text-gray-500 font-mono">{account.accountCode}</p>
            </div>
          </div>
          
          {account.role === 'master' && (
            <Badge variant="eve" className="bg-eve-accent/20 text-eve-accent">
              <Shield className="h-3 w-3 mr-1" />
              Master
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-gray-500" />
            <span className="text-gray-400">Characters:</span>
            <span className="text-white font-medium">{account._count.characters}</span>
          </div>
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500" />
            <span className="text-gray-400">Activities:</span>
            <span className="text-white font-medium">{account._count.activities}</span>
          </div>
        </div>

        {account.characters.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Characters</p>
            <div className="space-y-1">
              {account.characters.map((char) => (
                <div key={char.id} className="flex items-center justify-between text-sm p-2 rounded bg-eve-dark/50">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=32`} />
                      <AvatarFallback className="text-xs">{char.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-white">{char.name}</span>
                    {char.isMain && <Badge variant="outline" className="text-[10px] h-5">Main</Badge>}
                  </div>
                  <span className="text-green-400 text-xs">{formatISK(char.walletBalance)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {account.role !== 'master' && (
          <div className="space-y-2 pt-2 border-t border-eve-border">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Activities Permitidas</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((activity) => {
                const isAllowed = account.allowedActivities.includes(activity.id)
                const isSaving = saving === account.id + activity.id
                
                return (
                  <div key={activity.id} className="flex items-center justify-between p-2 rounded bg-eve-dark/50">
                    <div className="flex items-center gap-2">
                      {isAllowed ? (
                        <Unlock className="h-4 w-4 text-green-400" />
                      ) : (
                        <Lock className="h-4 w-4 text-gray-500" />
                      )}
                      <span className={cn("text-sm", isAllowed ? "text-white" : "text-gray-500")}>
                        {activity.label}
                      </span>
                    </div>
                    <Switch
                      checked={isAllowed}
                      disabled={isSaving}
                      onCheckedChange={() => onToggleActivity(account.id, activity.id, isAllowed)}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}