'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session-client'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { cn, formatISK } from '@/lib/utils'
import { Crown, Calendar, Info, Wallet, CheckCircle2, XCircle, AlertCircle, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'

export default function SubscriptionPage() {
  const { data: session } = useSession()
  const [copied, setCopied] = useState(false)
  const corpName = "EasyEve Holdings"

  const copyCorp = () => {
    navigator.clipboard.writeText(corpName)
    setCopied(true)
    toast.success("Nome da corporação copiado!")
    setTimeout(() => setCopied(false), 2000)
  }

  const isExpired = session?.user?.subscriptionEnd && new Date(session.user.subscriptionEnd) < new Date()

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight">Assinatura</h1>
          <p className="text-gray-400 mt-2">Gerencie seu acesso aos módulos do EasyEve</p>
        </div>
        
        <div className="flex items-center gap-3 bg-eve-panel p-4 rounded-xl border border-eve-border shadow-2xl">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shadow-inner",
            isExpired ? "bg-red-500/10 text-red-500" : "bg-eve-accent/10 text-eve-accent"
          )}>
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Status Atual</p>
            <p className={cn("text-lg font-bold", isExpired ? "text-red-400" : "text-green-400")}>
              {isExpired ? 'Expirada' : 'Ativa'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription Card */}
        <Card className="bg-eve-panel border-eve-border overflow-hidden relative">
          <div className="absolute top-0 right-0 p-3 opacity-10">
            <Calendar className="h-24 w-24" />
          </div>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-eve-accent" />
              Período de Acesso
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">Sua assinatura termina em:</p>
              <p className="text-3xl font-bold text-white">
                {session?.user?.subscriptionEnd ? new Date(session.user.subscriptionEnd).toLocaleDateString() : 'N/A'}
              </p>
              {isExpired && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 animate-pulse">
                  <AlertCircle className="h-4 w-4" />
                  <span>Seu acesso aos módulos pagos foi suspenso.</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-eve-dark/50 border border-eve-border/50 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-eve-accent shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="text-gray-300 font-medium">Como renovar?</p>
                  <p className="text-gray-400 leading-relaxed">
                    Envie o valor em ISK para a corporação in-game:
                  </p>
                  <div className="flex items-center gap-2 bg-eve-panel p-2 rounded border border-eve-border group cursor-pointer" onClick={copyCorp}>
                    <code className="text-eve-accent font-bold">{corpName}</code>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-600 group-hover:text-white" />}
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    A ativação é automática! O sistema detecta o envio e libera seu acesso em alguns minutos após a aprovação do Master.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules Access Card */}
        <Card className="bg-eve-panel border-eve-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Módulos Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ACTIVITY_TYPES.map(module => {
                const isAllowed = session?.user?.allowedActivities?.includes(module.id)
                return (
                  <div key={module.id} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isAllowed 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-gray-500/5 border-transparent opacity-50"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded", isAllowed ? "bg-green-500/10" : "bg-gray-500/10")}>
                        {module.icon && <module.icon className={cn("h-4 w-4", isAllowed ? "text-green-400" : "text-gray-500")} />}
                      </div>
                      <span className={cn("font-medium", isAllowed ? "text-white" : "text-gray-500")}>
                        {module.label}
                      </span>
                    </div>
                    {isAllowed ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Ativo
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-transparent text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" /> Bloqueado
                      </Badge>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
         <Card className="bg-eve-panel border-eve-border p-6 flex flex-col items-center text-center space-y-3">
            <Wallet className="h-10 w-10 text-eve-accent opacity-50" />
            <h3 className="font-bold text-white uppercase text-xs tracking-widest">Suporte Financeiro</h3>
            <p className="text-gray-400 text-sm">Problemas com seu pagamento? Abra um ticket no nosso Discord oficial.</p>
            <Button variant="outline" className="w-full mt-2" onClick={() => window.open('https://discord.gg/easyeve', '_blank')}>
               Entrar no Discord
            </Button>
         </Card>

         <Card className="md:col-span-2 bg-gradient-to-br from-eve-panel to-eve-dark border-eve-border overflow-hidden group">
            <CardHeader>
               <CardTitle className="text-sm uppercase tracking-widest text-gray-500">Histórico de Pagamentos</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8 opacity-40 group-hover:opacity-100 transition-opacity">
               <History className="h-12 w-12 text-gray-600 mb-2" />
               <p className="text-gray-500 text-sm">Nenhum pagamento registrado nos últimos 30 dias</p>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
