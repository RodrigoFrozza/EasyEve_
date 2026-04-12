'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { 
  Loader2, Shield, DollarSign, Activity, History, Search, RefreshCw, Wallet, CheckCircle2, XCircle, Zap
} from 'lucide-react'
import { useSession } from '@/lib/session-client'
import { formatISK, cn } from '@/lib/utils'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { ACTIVITY_UI_MAPPING } from '@/lib/constants/activity-ui'
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
import { useTranslations } from '@/i18n/hooks'

// New Modular Components
import { StatsRow } from '@/components/admin/StatsRow'
import { AccountList } from '@/components/admin/AccountList'
import { AccountDetailDialog } from '@/components/admin/AccountDetailDialog'
import { GlobalLogs } from '@/components/admin/GlobalLogs'
import { AdminDashboardSkeleton } from '@/components/admin/AdminSkeleton'

interface AccountData {
  id: string
  accountCode: string | null
  name: string | null
  role: string
  isBlocked: boolean
  subscriptionEnd: string | null
  lastLoginAt: string | null
  discordId: string | null
  discordName: string | null
  allowedActivities: string[]
  createdAt: string
  characters: Array<{
    id: number
    name: string
    isMain: boolean
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
  const { t } = useTranslations()
  const [accounts, setAccounts] = useState<AccountData[]>([])
  const [prices, setPrices] = useState<ModulePrice[]>([])
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('accounts')

  // UI States
  const [selectedAccount, setSelectedAccount] = useState<AccountData | null>(null)
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null)
  const [selectedModules, setSelectedModules] = useState<string[]>(['ratting'])
  const [isSyncing, setIsSyncing] = useState(false)
  const [adminCodes, setAdminCodes] = useState<any[]>([])
  const [paymentSearch, setPaymentSearch] = useState('')
  const [holdingStatus, setHoldingStatus] = useState({ connected: false, loading: true, characterName: '', isExpired: false })

  const fetchCodes = async () => {
    try {
      const res = await fetch('/api/admin/codes')
      if (res.ok) {
        const data = await res.json()
        setAdminCodes(data || [])
      }
    } catch (err) {
      console.error('Failed to fetch codes:', err)
    }
  }

  const [serverStats, setServerStats] = useState({
    totalAccounts: 0,
    activeSubscriptions: 0,
    pendingIsk: 0,
    totalCharacters: 0
  })

  // Memoized Stats
  const stats = useMemo(() => {
    return serverStats
  }, [serverStats])

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
      fetchCodes()
      fetchHoldingStatus()
    }
  }, [sessionStatus, session])

  const fetchHoldingStatus = async () => {
    try {
      const res = await fetch('/api/admin/holding/status')
      if (res.ok) {
        setHoldingStatus({ ...(await res.json()), loading: false })
      }
    } catch (err) {
      console.error('Failed to fetch holding status:', err)
      setHoldingStatus(prev => ({ ...prev, loading: false }))
    }
  }

  const handleConnectHolding = () => {
    window.location.href = '/api/auth/signin?app=holding'
  }

  useEffect(() => {
    if (sessionStatus === 'authenticated') {
      const timer = setTimeout(() => {
        fetchPayments()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [paymentSearch])

  const fetchPayments = async () => {
    try {
      const payRes = await fetch(`/api/admin/payments?search=${encodeURIComponent(paymentSearch)}`)
      if (payRes.ok) {
        const data = await payRes.json()
        setPayments(data?.items || [])
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err)
      setPayments([])
    }
  }

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [accRes, priceRes, statsRes] = await Promise.all([
        fetch('/api/admin/accounts'),
        fetch('/api/admin/module-prices'),
        fetch('/api/admin/stats')
      ])
      
      if (accRes.ok) {
        const accData = await accRes.json()
        setAccounts(accData?.accounts || [])
      }
      if (priceRes.ok) {
        const pData = await priceRes.json()
        setPrices(pData || [])
      }
      if (statsRes.ok) {
        const sData = await statsRes.json()
        setServerStats(sData || serverStats)
      }
      
      await Promise.all([
        fetchPayments(),
        fetchCodes()
      ])
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
      toast.error(t('admin.syncAPIError'))
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

  const handleLinkPayment = async (paymentId: string, userId: string) => {
    try {
      const res = await fetch(`/api/admin/payments/${paymentId}/link`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      })
      if (res.ok) {
        toast.success(t('admin.paymentLinked'))
        fetchAllData()
      }
    } catch (err) {
      toast.error('Erro ao vincular pagamento')
    }
  }

  if (loading && sessionStatus !== 'unauthenticated') {
    return <AdminDashboardSkeleton />
  }

  return (
    <div className="space-y-8 pb-20">
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

      <StatsRow 
        totalAccounts={stats.totalAccounts}
        activeSubscriptions={stats.activeSubscriptions}
        pendingIsk={stats.pendingIsk}
        totalCharacters={stats.totalCharacters}
      />

      <Tabs defaultValue="accounts" className="space-y-6" onValueChange={setActiveTab}>
        <TabsList className="bg-eve-panel border-eve-border p-1 gap-1">
          <TabsTrigger value="accounts" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black font-bold">
            {t('admin.manageAccounts')}
          </TabsTrigger>
          <TabsTrigger value="prices" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black font-bold">
            {t('admin.modulesAndPrices')}
          </TabsTrigger>
          <TabsTrigger value="payments" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black font-bold">
            {t('admin.esconciliation')}
          </TabsTrigger>
          <TabsTrigger value="codes" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black font-bold">
            <Zap className="h-3 w-3 mr-2" />
            Códigos Premium
          </TabsTrigger>
          <TabsTrigger value="health" className="data-[state=active]:bg-eve-accent data-[state=active]:text-black font-bold">
            {t('admin.systemHealth')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <AccountList 
            accounts={accounts} 
            onSelectAccount={(acc) => setSelectedAccount(acc)} 
          />
        </TabsContent>

        <TabsContent value="codes" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-eve-accent" />
                {t('admin.codeGenerator')}
              </h2>
              <p className="text-xs text-gray-500">{t('admin.codeGeneratorDesc')}</p>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={async () => {
                  const res = await fetch('/api/admin/codes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'DAYS_30', count: 1 })
                  })
                  if (res.ok) {
                    toast.success('Código de 30 dias gerado!')
                    fetchCodes()
                  }
                }}
                className="bg-eve-accent text-black hover:bg-eve-accent/80 font-bold h-9"
              >
                + 30 DIAS
              </Button>
              <Button 
                onClick={async () => {
                  const res = await fetch('/api/admin/codes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type: 'LIFETIME', count: 1 })
                  })
                  if (res.ok) {
                    toast.success('Código VITALÍCIO gerado!')
                    fetchCodes()
                  }
                }}
                variant="outline"
                className="border-eve-accent text-eve-accent hover:bg-eve-accent/10 font-bold h-9"
              >
                + VITALÍCIO
              </Button>
            </div>
          </div>

          <Card className="bg-eve-panel border-eve-border shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-eve-dark/50 border-b border-eve-border/50 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Código</th>
                      <th className="px-6 py-4">Tipo</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Data Criação</th>
                      <th className="px-6 py-4">Uso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-eve-border/30">
                    {adminCodes.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">Nenhum código gerado.</td>
                      </tr>
                    ) : (
                      adminCodes.map(code => (
                        <tr key={code.id} className="hover:bg-eve-dark/10 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-eve-accent flex items-center gap-2">
                            {code.code}
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 w-6 p-0 hover:bg-eve-accent/10"
                              onClick={() => {
                                navigator.clipboard.writeText(code.code)
                                toast.success('Copiado!')
                              }}
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                          </td>
                          <td className="px-6 py-4">
                            <Badge className={cn(
                              "text-[10px] font-bold",
                              code.type === 'LIFETIME' ? "bg-purple-500/20 text-purple-400 border-purple-500/50" : "bg-blue-500/20 text-blue-400 border-blue-500/50"
                            )}>
                              {code.type === 'LIFETIME' ? 'VITALÍCIO' : '30 DIAS'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <Badge variant="outline" className={cn(
                              "text-[10px] px-2 py-0 border-none",
                              code.isUsed ? "text-red-500 bg-red-500/10" : "text-green-500 bg-green-500/10"
                            )}>
                              {code.isUsed ? 'USADO' : 'DISPONÍVEL'}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
                            {new Date(code.createdAt).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-400">
                             {code.usedBy ? `Conta ID: ${code.usedBy}` : '-'}
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

        <TabsContent value="prices" className="space-y-4">
          <Card className="bg-eve-panel border-eve-border shadow-xl overflow-hidden">
            <CardHeader className="bg-eve-dark/30 border-b border-eve-border/50">
              <CardTitle>{t('admin.modulesConfig')}</CardTitle>
              <CardDescription>{t('admin.modulePriceDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid gap-3">
                {(ACTIVITY_TYPES || []).map(type => {
                  const dbPrice = (prices || []).find(p => p.module === type.id)
                    const ui = ACTIVITY_UI_MAPPING[type.id]
                    const Icon = ui?.icon
                    
                    return (
                      <div key={type.id} className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl bg-eve-dark/40 border border-eve-border/50 hover:bg-eve-dark/60 transition-colors gap-4">
                        <div className="flex items-center gap-4 flex-1">
                          <div className={cn("p-2 rounded-lg bg-eve-dark", (ui?.color || "text-gray-400").replace('text-', 'bg-') + '/10')}>
                            {(() => {
                              const FallbackIcon = Activity
                              const Icon = ui?.icon || FallbackIcon
                              return <Icon className={cn("h-6 w-6", ui?.color || "text-eve-accent")} />
                            })()}
                          </div>
                        <div>
                           <p className="text-white font-bold">{type.label}</p>
                           <p className="text-[10px] text-gray-500 uppercase tracking-widest leading-none mt-1">{type.id}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6">
                        <div className="flex items-center gap-2">
                           <Label className="text-xs text-gray-400">Status de Venda</Label>
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
                          <span className="text-xs text-gray-500 font-bold uppercase tracking-tighter">ISK/mês</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card className="bg-eve-dark/40 border-eve-border/50 border-dashed">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-full",
                  holdingStatus.connected ? (holdingStatus.isExpired ? "bg-yellow-500/10" : "bg-green-500/10") : "bg-red-500/10"
                )}>
                  <Shield className={cn(
                    "h-5 w-5",
                    holdingStatus.connected ? (holdingStatus.isExpired ? "text-yellow-500" : "text-green-500") : "text-red-500"
                  )} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    Wallet CEO (App Holding)
                    {holdingStatus.connected && (
                      <Badge variant="outline" className={cn(
                        "text-[9px] h-4",
                        holdingStatus.isExpired ? "text-yellow-500 border-yellow-500/30" : "text-green-500 border-green-500/30"
                      )}>
                        {holdingStatus.isExpired ? 'TOKEN EXPIRADO' : 'TOKEN ATIVO'}
                      </Badge>
                    )}
                  </h3>
                  <p className="text-[10px] text-gray-500">
                    {holdingStatus.connected 
                      ? `Conectado via: ${holdingStatus.characterName}` 
                      : 'Nenhuma conta CEO conectada para sincronização corporativa.'}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleConnectHolding} 
                variant="outline" 
                size="sm"
                className="h-8 text-[10px] bg-eve-dark border-eve-border hover:bg-eve-accent hover:text-black transition-all"
              >
                {holdingStatus.connected ? 'Alternar/Reconectar CEO' : 'Conectar Wallet CEO'}
              </Button>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
             <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <History className="h-5 w-5 text-eve-accent" />
                Histórico de Transações
             </h2>
             <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input 
                    placeholder="Buscar..." 
                    className="pl-9 h-9 w-[200px] bg-eve-dark border-eve-border text-xs"
                    value={paymentSearch}
                    onChange={(e) => setPaymentSearch(e.target.value)}
                  />
                </div>
                <Button onClick={handleSyncWallet} disabled={isSyncing} className="bg-eve-accent text-black hover:bg-eve-accent/80 font-bold">
                    {isSyncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Sincronizar ESI Wallet
                </Button>
             </div>
          </div>

          <Card className="bg-eve-panel border-eve-border shadow-2xl overflow-hidden">
             <CardContent className="p-0">
                <div className="overflow-x-auto">
                   <table className="w-full text-left text-sm">
                      <thead className="bg-eve-dark/50 border-b border-eve-border/50 text-gray-400 uppercase text-[10px] font-bold tracking-widest">
                         <tr>
                            <th className="px-6 py-4">Data/Hora</th>
                            <th className="px-6 py-4">Payer / Vinculação</th>
                            <th className="px-6 py-4 text-right">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-right">Ação</th>
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-eve-border/30">
                         {(payments?.length || 0) === 0 ? (
                            <tr>
                               <td colSpan={5} className="px-6 py-12 text-center text-gray-500 italic">
                                  Nenhum registro de pagamento encontrado.
                               </td>
                            </tr>
                         ) : (
                            (payments || []).map(payment => (
                               <tr key={payment.id} className="hover:bg-eve-dark/10 transition-colors">
                                  <td className="px-6 py-4 text-gray-400 text-xs">
                                     <p className="font-bold text-gray-300">{new Date(payment.createdAt).toLocaleDateString()}</p>
                                     <p className="opacity-60">{new Date(payment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                  </td>
                                  <td className="px-6 py-4">
                                     <p className="text-white font-bold mb-1.5 flex items-center gap-2">
                                        <Wallet className="h-3.5 w-3.5 text-eve-accent" />
                                        {payment.payerCharacterName || 'Desconhecido'}
                                     </p>
                                     <Select 
                                            defaultValue={payment.userId} 
                                            onValueChange={(val) => handleLinkPayment(payment.id, val)}
                                         >
                                            <SelectTrigger className="h-8 w-[220px] text-[10px] bg-eve-dark/40 border-eve-border/50 hover:border-eve-accent/50 transition-all">
                                               <SelectValue placeholder="Vincular à conta..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-eve-panel border-eve-border">
                                               {(accounts || []).map(acc => (
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
                                        "text-[10px] px-2 py-0 border-none",
                                        payment.status === 'pending' ? "text-yellow-500 bg-yellow-500/10" :
                                        payment.status === 'approved' ? "text-green-500 bg-green-500/10" :
                                        "text-red-500 bg-red-500/10"
                                     )}>
                                        {payment.status.toUpperCase()}
                                     </Badge>
                                  </td>
                                  <td className="px-6 py-4 text-right">
                                     {payment.status === 'pending' && (
                                        <div className="flex items-center justify-end gap-2">
                                           <Button 
                                              size="sm" 
                                              className="h-8 bg-green-600 hover:bg-green-500 text-white font-bold px-4"
                                              onClick={() => handleApprovePayment(payment.id)}
                                           >
                                              Aprovar
                                           </Button>
                                           <Button 
                                              size="sm" 
                                              variant="ghost"
                                              className="h-8 w-8 p-0 text-red-500 hover:bg-red-500/10"
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
                                        <div className="flex items-center justify-end gap-2 text-green-500">
                                            <span className="text-[10px] font-bold uppercase tracking-widest">Conciliado</span>
                                            <CheckCircle2 className="h-5 w-5" />
                                        </div>
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

        <TabsContent value="health">
          <GlobalLogs />
        </TabsContent>
      </Tabs>

      {/* Account Detail Modal */}
      <AccountDetailDialog 
        account={selectedAccount}
        isOpen={!!selectedAccount}
        onClose={() => setSelectedAccount(null)}
        onRefresh={fetchAllData}
      />

      {/* Approve Payment Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-eve-panel border-eve-border text-white">
          <DialogHeader>
            <DialogTitle>{t('admin.confirmPayment')}</DialogTitle>
            <DialogDescription className="text-gray-400">
              {t('admin.selectModules')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-2">
              {(ACTIVITY_TYPES || []).map((activity) => {
                const ui = ACTIVITY_UI_MAPPING[activity.id]
                const Icon = ui?.icon

                return (
                  <div 
                    key={activity.id}
                    onClick={() => {
                      setSelectedModules(prev => 
                        prev.includes(activity.id) 
                          ? prev.filter(m => m !== activity.id)
                          : [...prev, activity.id]
                      )
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all",
                      selectedModules.includes(activity.id) 
                        ? "bg-eve-accent/10 border-eve-accent text-eve-accent shadow-[0_0_15px_rgba(255,255,255,0.05)]" 
                        : "bg-eve-dark border-eve-border hover:border-gray-500"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg", selectedModules.includes(activity.id) ? "bg-eve-accent/10" : "bg-black/20")}>
                      {(() => {
                        const FallbackIcon = Activity
                        const Icon = ui?.icon || FallbackIcon
                        return <Icon className={cn("h-5 w-5", ui?.color || (selectedModules.includes(activity.id) ? "text-eve-accent" : "text-gray-500"))} />
                      })()}
                    </div>
                    <span className="text-sm font-medium">{activity.label}</span>
                  </div>
                )
              })}
            </div>
          </div>
          <DialogFooter className="bg-eve-dark/30 p-4 -m-6 mt-4 border-t border-eve-border/50">
            <Button variant="ghost" onClick={() => setIsApproveDialogOpen(false)} className="text-gray-400">{t('admin.cancel')}</Button>
            <Button 
                onClick={confirmApprovePayment} 
                disabled={isSyncing || selectedModules.length === 0}
                className="bg-eve-accent text-black font-bold hover:bg-eve-accent/80"
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('admin.confirmApproval')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}