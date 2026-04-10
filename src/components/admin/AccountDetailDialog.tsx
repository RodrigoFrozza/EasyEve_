'use client'
import { useState } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { 
  Loader2, Ban, Unlock, Trash2, Zap, 
  Shield, UserCircle, Wallet, MapPin, Rocket, RefreshCw
} from 'lucide-react'
import { cn, formatISK } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { ACTIVITY_UI_MAPPING } from '@/lib/constants/activity-ui'
import { toast } from 'sonner'

interface Character {
  id: number
  name: string
  isMain: boolean
  location: string | null
  ship: string | null
  walletBalance: number
}

interface AccountData {
  id: string
  accountCode: string | null
  name: string | null
  role: string
  isBlocked: boolean
  subscriptionEnd: string | null
  allowedActivities: string[]
  characters: Character[]
}

interface AccountDetailDialogProps {
  account: AccountData | null
  isOpen: boolean
  onClose: () => void
  onRefresh: () => void
}

export function AccountDetailDialog({ account, isOpen, onClose, onRefresh }: AccountDetailDialogProps) {
  const [saving, setSaving] = useState<string | null>(null)

  if (!account) return null

  const isExpired = account.subscriptionEnd && new Date(account.subscriptionEnd) < new Date()

  const handleToggleActivity = async (activityId: string, currentlyAllowed: boolean) => {
    setSaving(activityId)
    const newAllowed = currentlyAllowed
      ? account.allowedActivities.filter(a => a !== activityId)
      : [...account.allowedActivities, activityId]

    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.id, allowedActivities: newAllowed })
      })

      if (res.ok) {
        toast.success(`Permissões de ${activityId} atualizadas`)
        onRefresh()
      }
    } catch (err) {
      toast.error('Erro ao atualizar permissões')
    } finally {
      setSaving(null)
    }
  }

  const handleBlock = async () => {
    setSaving('blocking')
    try {
      const res = await fetch(`/api/admin/accounts/${account.id}/block`, {
        method: 'PUT',
        body: JSON.stringify({ isBlocked: !account.isBlocked, blockReason: 'Suspensão manual via painel admin' })
      })
      if (res.ok) {
        toast.success(`Conta ${account.isBlocked ? 'desbloqueada' : 'bloqueada'}`)
        onRefresh()
      }
    } catch (err) {
      toast.error('Erro ao modificar status da conta')
    } finally {
      setSaving(null)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`TEM CERTEZA? Esta ação é IRREVERSÍVEL. Todos os dados da conta serão deletados permanentemente.`)) return
    
    setSaving('deleting')
    try {
      const res = await fetch(`/api/admin/accounts?userId=${account.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Conta deletada permanentemente`)
        onRefresh()
        onClose()
      }
    } catch (err) {
      toast.error('Erro ao deletar conta')
    } finally {
      setSaving(null)
    }
  }

  const handleRenew = async () => {
    setSaving('renewing')
    try {
      // Calculate new date: if expired, 30 days from now. If active, 30 days from current end date.
      const currentEnd = account.subscriptionEnd ? new Date(account.subscriptionEnd) : new Date()
      const baseDate = currentEnd > new Date() ? currentEnd : new Date()
      const newEndDate = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      const res = await fetch('/api/admin/accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: account.id, subscriptionEnd: newEndDate.toISOString() })
      })

      if (res.ok) {
        toast.success(`Assinatura renovada até ${newEndDate.toLocaleDateString()}`)
        onRefresh()
      }
    } catch (err) {
      toast.error('Erro ao renovar assinatura')
    } finally {
      setSaving(null)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-eve-panel border-eve-border text-white p-0 overflow-hidden">
        <div className="relative h-32 bg-gradient-to-r from-eve-dark to-eve-accent/20">
            <div className="absolute -bottom-12 left-8">
                <Avatar className="h-24 w-24 border-4 border-eve-panel shadow-2xl">
                    <AvatarImage src={account.characters?.[0] ? `https://images.evetech.net/characters/${account.characters[0].id}/portrait?size=128` : ''} />
                    <AvatarFallback className="bg-eve-dark text-eve-accent text-2xl font-bold">
                        {account.name?.[0] || '?'}
                    </AvatarFallback>
                </Avatar>
            </div>
            {account.isBlocked && (
                <div className="absolute top-4 right-4 bg-red-500/20 border border-red-500/50 text-red-500 px-3 py-1 rounded-full flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                    <Ban className="h-3 w-3" /> Conta Bloqueada
                </div>
            )}
        </div>

        <div className="pt-16 px-8 pb-8 space-y-8">
            <div className="flex items-start justify-between">
                <div>
                   <div className="flex items-center gap-3">
                        <h2 className="text-2xl font-bold tracking-tight">{account.name || 'Sem Nome'}</h2>
                        {account.role === 'master' && (
                            <Badge className="bg-eve-accent text-black font-bold">ADMIN</Badge>
                        )}
                   </div>
                   <p className="text-sm text-gray-500 font-mono mt-1">ID: {account.accountCode || account.id}</p>
                </div>

                <div className="flex gap-2">
                    <Button 
                        variant="outline" 
                        size="sm"
                        className={cn(
                            "h-9 gap-2",
                            account.isBlocked ? "border-green-500/50 text-green-500 hover:bg-green-500/10" : "border-red-500/50 text-red-500 hover:bg-red-500/10"
                        )}
                        onClick={handleBlock}
                        disabled={!!saving}
                    >
                        {saving === 'blocking' ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                            account.isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />
                        )}
                        {account.isBlocked ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                    {account.role !== 'master' && (
                        <Button 
                            variant="destructive" 
                            size="sm"
                            className="h-9 gap-2"
                            onClick={handleDelete}
                            disabled={!!saving}
                        >
                            {saving === 'deleting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            Deletar
                        </Button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        <Zap className="h-3 w-3" /> Assinatura e Módulos
                    </div>
                    
                    <div className="p-4 rounded-xl bg-eve-dark/50 border border-eve-border/50">
                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-eve-border/30">
                            <div className="space-y-1">
                                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Status do Plano</p>
                                <p className={cn("text-xs font-bold", isExpired ? "text-red-400" : "text-green-400")}>
                                    {account.subscriptionEnd ? new Date(account.subscriptionEnd).toLocaleDateString() : 'VITALÍCIO'}
                                    {isExpired && " (EXPIRADO)"}
                                </p>
                            </div>
                            <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-7 text-[10px] gap-1 border-eve-accent/30 text-eve-accent hover:bg-eve-accent/10"
                                onClick={handleRenew}
                                disabled={!!saving}
                            >
                                {saving === 'renewing' ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                                +30 DIAS
                            </Button>
                        </div>

                        <div className="space-y-3">
                            {ACTIVITY_TYPES.map((activity) => {
                                const isAllowed = account.allowedActivities?.includes(activity.id) || false
                                const ui = ACTIVITY_UI_MAPPING[activity.id]
                                const Icon = ui?.icon

                                return (
                                    <div key={activity.id} className="flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                            {Icon && <Icon className={cn("h-4 w-4", isAllowed ? ui.color : "text-gray-600")} />}
                                            <span className={cn("text-xs transition-colors", isAllowed ? "text-white" : "text-gray-600")}>
                                                {activity.label}
                                            </span>
                                        </div>
                                        <Switch 
                                            checked={isAllowed}
                                            disabled={saving === activity.id}
                                            onCheckedChange={() => handleToggleActivity(activity.id, isAllowed)}
                                            className="data-[state=checked]:bg-eve-accent"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="flex items-center gap-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest">
                        <Shield className="h-3 w-3" /> Personagens ({account.characters?.length || 0})
                    </div>
                    
                    <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {account.characters?.map((char) => (
                            <div key={char.id} className="p-3 rounded-lg bg-eve-dark/30 border border-eve-border/30 flex items-center gap-3">
                                <Avatar className="h-10 w-10 border border-eve-border">
                                    <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=64`} />
                                    <AvatarFallback><UserCircle className="h-6 w-6" /></AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <p className="text-xs font-bold text-white truncate">{char.name}</p>
                                        {char.isMain && <Badge className="text-[8px] h-3 px-1 leading-none bg-eve-accent/20 text-eve-accent border-none">MAIN</Badge>}
                                    </div>
                                    <div className="flex flex-wrap gap-3 mt-1 text-[9px] text-gray-500 font-medium uppercase tracking-tighter">
                                        <span className="flex items-center gap-1 text-green-500/80"><Wallet className="h-2 w-2" /> {formatISK(char.walletBalance)}</span>
                                        <span className="flex items-center gap-1"><MapPin className="h-2 w-2" /> {char.location || 'Unknown'}</span>
                                        <span className="flex items-center gap-1"><Rocket className="h-2 w-2" /> {char.ship || 'Pods'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        <DialogFooter className="bg-eve-dark/50 p-4 border-t border-eve-border/50">
            <Button variant="ghost" className="text-gray-400 hover:text-white" onClick={onClose}>
                Fechar
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
