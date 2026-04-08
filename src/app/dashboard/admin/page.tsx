'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Loader2, Users, Shield, Lock, Unlock, Gem, Crosshair, 
  Zap, Compass, ShieldCheck, AlertTriangle, Target,
  DollarSign, Wallet, History, Settings2, Ban, UserCheck, CheckCircle2, XCircle, Search, RefreshCw, Trash2
} from 'lucide-react'
import { useSession } from '@/lib/session-client'
import { cn, formatISK } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AccountData {
  id: string
  accountCode: string | null
  name: string | null
  role: string
  isBlocked: boolean
  blockReason: string | null
  subscriptionEnd: string | null
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

interface ModulePrice {
  id: string
  module: string
  price: number
  isActive: boolean
}

interface PaymentRecord {
  id: string
  amount: number
  payerCharacterName: string | null
  status: 'pending' | 'approved' | 'rejected'
  createdAt: string
  journalId: string | null
  userId: string
  user?: {
    name: string
    accountCode: string
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
  const [prices, setPrices] = useState<ModulePrice[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('accounts')

  // State for Payment Approval Dialog
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>(['ratting'])
  const [isSyncing, setIsSyncing] = useState(false)

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
      fetchAllData()
    }
  }, [session, sessionStatus])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [accRes, priceRes, payRes] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/module-prices'),
        fetch('/api/admin/payments')
      ])
      
      if (accRes.ok) {
        const accData = await accRes.json()
        setAccounts(accData.accounts || [])
      }
      if (priceRes.ok) setPrices(await priceRes.json())
      if (payRes.ok) setPayments(await payRes.json())
    } catch (err) {
      console.error('Failed to fetch admin data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncWallet = async () => {
    setIsSyncing(true)
    try {
      const res = await fetch('/api/admin/payments/sync', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        toast.success(`Sincronização concluída! ${data.newPaymentsCount} novos pagamentos encontrados.`)
        fetchAllData()
      } else {
        const error = await res.json()
        toast.error(`Erro: ${error.error}`)
      }
    } catch (err) {
      toast.error('Falha na comunicação com a API de Sync')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleApprovePayment = async (paymentId: string) => {
    setSelectedPaymentId(paymentId)
    setIsApproveDialogOpen(true)
  }

  const confirmApprovePayment = async () => {
    if (!selectedPaymentId) return
    
    setIsSyncing(true)
    try {
      const res = await fetch(`/api/admin/payments/${selectedPaymentId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ allowedActivities: selectedModules, months: 1 })
      })
      
      if (!res.ok) throw new Error('Failed to approve payment')
      
      toast.success('Payment approved!')
      setIsApproveDialogOpen(false)
      fetchAllData()
    } catch (error) {
      console.error('Approve error:', error)
      toast.error('Error approving payment')
    } finally {
      setIsSyncing(false)
    }
  }

  const toggleModule = (moduleId: string) => {
    setSelectedModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(m => m !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleLinkPayment = async (paymentId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (res.ok) {
        toast.success('Pagamento vinculado com sucesso!')
        fetchAllData()
      }
    } catch (err) {
      toast.error('Erro ao vincular pagamento')
    }
  }

  if (loading && sessionStatus !== 'unauthenticated') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <p className="text-muted-foreground animate-pulse">Carregando dados do servidor...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-eve-accent" />
            <h1 className="text-3xl font-bold text-white tracking-tight">Painel Administrativo</h1>
          </div>
          <p className="text-gray-400 mt-1">Gestão de acessos, assinaturas e conciliação financeira</p>
        </div>
        <Badge variant="outline" className="bg-eve-accent/20 text-eve-accent border-eve-accent px-3 py-1">
          <Shield className="h-3 w-3 mr-2" />
          Role: Master
        </Badge>
      </div>

      <Tabs defaultValue="accounts" className="space-y-4" onValueChange={setActiveTab}>
        <TabsList className="bg-eve-panel border-eve-border p-1 gap-1">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black">
            <Users className="h-4 w-4 mr-2" /> Contas
          </TabsTrigger>
          <TabsTrigger value="prices" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black">
            <DollarSign className="h-4 w-4 mr-2" /> Preços
          </TabsTrigger>
          <TabsTrigger value="financial" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black">
            <Wallet className="h-4 w-4 mr-2" /> Financeiro
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onRefresh={fetchAllData}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="prices" className="space-y-4">
          <Card className="bg-eve-panel border-eve-border shadow-xl">
            <CardHeader>
              <CardTitle>Configuração de Módulos</CardTitle>
              <CardDescription>Defina o preço em ISK e a disponibilidade de cada funcionalidade</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {ACTIVITY_TYPES.map(type => {
                  const dbPrice = prices.find(p => p.module === type.id)
                  return (
                    <div key={type.id} className="flex items-center justify-between p-4 rounded-xl bg-eve-dark/40 border border-eve-border/50 hover:bg-eve-dark/60 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn("p-2 rounded-lg bg-eve-dark", type.color.replace('text-', 'bg-') + '/10')}>
                          <type.icon className={cn("h-6 w-6", type.color)} />
                        </div>
                        <div>
                           <p className="text-white font-bold">{type.label}</p>
                           <p className="text-[10px] text-gray-500 uppercase tracking-widest">{type.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <Label className="text-xs text-gray-400">Venda Ativa</Label>
                           <Switch 
                              checked={dbPrice?.isActive ?? true} 
                              onCheckedChange={async (checked) => {
                                await fetch('/api/admin/module-prices', {
                                  method: 'POST',
                                  body: JSON.stringify({ module: type.id, price: dbPrice?.price || 0, isActive: checked })
                                })
                                fetchAllData()
                              }}
                           />
                        </div>
                        <div className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-36 bg-eve-panel border-eve-border text-right font-mono" 
                            defaultValue={dbPrice?.price || 0}
                            onBlur={async (e) => {
                              await fetch('/api/admin/module-prices', {
                                method: 'POST',
                                body: JSON.stringify({ module: type.id, price: Number(e.target.value), isActive: dbPrice?.isActive ?? true })
                              })
                              toast.success(`Preço de ${type.label} atualizado`)
                            }}
                          />
                          <span className="text-xs text-gray-500 font-bold">ISK / Mês</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-4">
          <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-eve-accent" />
                Conciliação de Pagamentos
             </h2>
             <Button onClick={handleSyncWallet} disabled={isSyncing} className="bg-eve-accent text-black hover:bg-eve-accent/80 font-bold">
                {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar ESI Wallet
             </Button>
          </div>

          <Card className="bg-eve-panel border-eve-border shadow-xl overflow-hidden">
             <CardContent className="p-0">
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-eve-dark/50 border-b border-eve-border text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                         <tr>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Payer / Conta</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-eve-border/50">
                         {payments.length === 0 ? (
                            <tr>
                               <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                  Nenhum registro de pagamento encontrado. Sincronize com a ESI.
                               </td>
                            </tr>
                         ) : (
                            payments.map(payment => (
                               <tr key={payment.id} className="hover:bg-eve-dark/20 transition-colors">
                                  <td className="px-6 py-4 text-gray-400 text-xs">
                                     {new Date(payment.createdAt).toLocaleDateString()}<br/>
                                     {new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="text-white font-medium">{payment.payerCharacterName || 'Desconhecido'}</p>
                                     <Select 
                                            defaultValue={payment.userId} 
                                            onValueChange={(val) => handleLinkPayment(payment.id, val)}
                                         >
                                            <SelectTrigger className="h-7 w-[180px] text-[10px] bg-eve-dark/50 border-eve-border">
                                               <SelectValue placeholder="Vincular à conta..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-eve-panel border-eve-border">
                                               {accounts.map(acc => (
                                                  <SelectItem key={acc.id} value={acc.id} className="text-[10px]">
                                                     {acc.name || acc.accountCode} ({acc.accountCode})
                                                  </SelectItem>
                                               ))}
                                            </SelectContent>
                                         </Select>
                                  </td>
                                  <td className="px-6 py-4 text-right font-mono text-green-400 font-bold">
                                     {formatISK(payment.amount)}
                                  </td>
                                  <td className="px-6 py-4">
                                     <Badge variant="outline" className={cn(
                                        "text-[10px] px-2 py-0",
                                        payment.status === 'pending' ? "text-yellow-500 border-yellow-500/30 bg-yellow-500/5" :
                                        payment.status === 'approved' ? "text-green-500 border-green-500/30 bg-green-500/5" :
                                        "text-red-500 border-red-500/30 bg-red-500/5"
                                     )}>
                                        {payment.status.toUpperCase()}
                                     </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {payment.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                           <Button 
                                              size="sm" 
                                              className="h-8 bg-green-600 hover:bg-green-500 text-white"
                                              onClick={() => handleApprovePayment(payment.id)}
                                           >
                                              Aprovar
                                           </Button>
                                           <Button 
                                              size="sm" 
                                              variant="destructive"
                                              className="h-8"
                                              onClick={async () => {
                                                 await fetch(`/api/admin/payments/${payment.id}/reject`, { method: 'POST' })
                                                 fetchAllData()
                                              }}
                                           >
                                              <XCircle className="h-4 w-4" />
                                           </Button>
                                        </div>
                                     )}
                                     {payment.status === 'approved' && (
                                        <CheckCircle2 className="h-5 w-5 text-green-500 ml-auto" />
                                     )}
                                  </td>
                               </tr>
                            ))
                         )}
                      </tbody>
                   </table>
                </div>
             </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {/* Approve Payment Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Aprovar Pagamento</DialogTitle>
            <DialogDescription>
              Selecione os módulos que o usuário terá acesso após a aprovação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((activity) => (
                <div 
                  key={activity.id}
                  onClick={() => toggleModule(activity.id)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                    selectedModules.includes(activity.id) 
                      ? "bg-accent border-primary ring-1 ring-primary" 
                      : "bg-background border-border hover:border-muted-foreground/50"
                  )}
                >
                  <activity.icon className={cn("h-5 w-5", activity.color)} />
                  <span className="text-sm font-medium">{activity.label}</span>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancelar</Button>
            <Button onClick={confirmApprovePayment} disabled={isSyncing || selectedModules.length === 0}>
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Confirmar Aprovação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  )
}

function AccountCard({
  account,
  onRefresh
}: {
  account: AccountData
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState<string | null>(null)
  const [isBlocking, setIsBlocking] = useState(false)

  const toggleActivity = async (activityId: string, currentlyAllowed: boolean) => {
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
        onRefresh()
      }
    } catch (err) {
      console.error('Failed to update permissions:', err)
    } finally {
      setSaving(null)
    }
  }

  const handleBlock = async () => {
    setIsBlocking(true)
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
      setIsBlocking(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`TEM CERTEZA? Esta ação é IRREVERSÍVEL. Todos os dados da conta ${account.name || account.accountCode} serão deletados permanentemente.`)) return
    
    setSaving('deleting')
    try {
      const res = await fetch(`/api/admin/accounts?userId=${account.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success(`Conta ${account.accountCode} deletada permanentemente`)
        onRefresh()
      } else {
        const err = await res.json()
        toast.error(`Erro: ${err.error || 'Falha ao deletar'}`)
      }
    } catch (err) {
      toast.error('Erro de conexão ao deletar conta')
    } finally {
      setSaving(null)
    }
  }

  const isExpired = account.subscriptionEnd && new Date(account.subscriptionEnd) < new Date()

  return (
    <Card className={cn(
      "bg-eve-panel border-eve-border relative overflow-hidden transition-all duration-300",
      account.role === 'master' && "ring-1 ring-eve-accent/30",
      account.isBlocked && "opacity-70 grayscale border-red-500/50 shadow-inner"
    )}>
      {account.isBlocked && (
        <div className="absolute top-0 left-0 w-full h-full bg-red-900/10 pointer-events-none flex items-center justify-center">
           <Ban className="h-24 w-24 text-red-500/20 rotate-12" />
        </div>
      )}

      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12 border-2 border-eve-border shadow-lg">
              <AvatarImage src={account.characters[0] ? `https://images.evetech.net/characters/${account.characters[0].id}/portrait?size=64` : ''} />
              <AvatarFallback className="bg-eve-dark text-eve-accent font-bold">
                {account.name?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-lg text-white font-bold tracking-tight">
                  {account.name || account.accountCode || 'S/N'}
                </CardTitle>
                {account.role === 'master' && (
                  <Badge className="bg-eve-accent/10 border-eve-accent text-eve-accent hover:bg-eve-accent/20 text-[9px] h-4">ADMIN</Badge>
                )}
              </div>
              <p className="text-xs text-gray-500 font-mono opacity-60">ID: {account.accountCode}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {account.role !== 'master' && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className={cn(
                    "h-8 gap-2 border-none transition-all", 
                    account.isBlocked ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                  )}
                  onClick={handleBlock}
                  disabled={isBlocking || saving === 'deleting'}
                >
                  {isBlocking ? <Loader2 className="h-3 w-3 animate-spin" /> : (
                    account.isBlocked ? <Unlock className="h-4 w-4" /> : <Ban className="h-4 w-4" />
                  )}
                  <span className="text-[10px] font-bold uppercase">{account.isBlocked ? 'Reativar' : 'Bloquear'}</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="icon" 
                  className="h-8 w-8 bg-red-950/20 text-red-500 border-none hover:bg-red-500 hover:text-white transition-all shadow-sm"
                  onClick={handleDelete}
                  disabled={saving === 'deleting' || isBlocking}
                  title="Deletar Conta Permanentemente"
                >
                  {saving === 'deleting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        <div className="flex items-center justify-between p-3 rounded-xl bg-eve-dark/40 border border-eve-border/30">
          <div className="flex items-center gap-3">
             <div className={cn("p-2 rounded-lg bg-eve-dark", isExpired ? "text-red-500" : "text-eve-accent")}>
                <Zap className="h-4 w-4" />
             </div>
             <div>
                <p className="text-[10px] text-gray-500 uppercase font-bold tracking-widest">Plano</p>
                <p className={cn("text-xs font-bold", isExpired ? "text-red-400" : "text-green-400")}>
                   {account.subscriptionEnd ? new Date(account.subscriptionEnd).toLocaleDateString() : 'VITALÍCIO'}
                   {isExpired && " (EXPIRADO)"}
                </p>
             </div>
          </div>
          <Badge variant="outline" className="bg-eve-dark/50 border-eve-border text-[10px]">
             {account.allowedActivities.length} Módulos
          </Badge>
        </div>

        {account.role !== 'master' && (
          <div className="space-y-3 pt-3 border-t border-eve-border/20">
            <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold px-1">Acessos Diretos</p>
            <div className="grid grid-cols-2 gap-2">
              {ACTIVITY_TYPES.map((activity) => {
                const isAllowed = account.allowedActivities.includes(activity.id)
                const isSaving = saving === activity.id
                
                return (
                  <div key={activity.id} className="flex items-center justify-between p-2 rounded-lg bg-eve-dark/30 border border-transparent hover:border-eve-border/50 group transition-all">
                    <div className="flex items-center gap-2">
                      <activity.icon className={cn("h-3.5 w-3.5", isAllowed ? activity.color : "text-gray-600")} />
                      <span className={cn("text-[11px] font-medium transition-colors", isAllowed ? "text-white" : "text-gray-600")}>
                        {activity.label}
                      </span>
                    </div>
                    <Switch
                      checked={isAllowed}
                      disabled={isSaving}
                      onCheckedChange={() => toggleActivity(activity.id, isAllowed)}
                      className="h-4 w-8 data-[state=checked]:bg-eve-accent scale-75"
                    />
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div className="space-y-2 pt-2">
           <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold px-1">Personagens ({account._count.characters})</p>
           <div className="flex flex-wrap gap-1.5">
              {account.characters.map(char => (
                 <Avatar key={char.id} className="h-6 w-6 border border-eve-border/50">
                    <AvatarImage src={`https://images.evetech.net/characters/${char.id}/portrait?size=32`} />
                    <AvatarFallback className="text-[8px] bg-eve-dark">{char.name[0]}</AvatarFallback>
                 </Avatar>
              ))}
           </div>
        </div>
      </CardContent>
    </Card>
  )
}