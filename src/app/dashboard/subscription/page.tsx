'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session-client'
import { ACTIVITY_TYPES } from '@/lib/constants/activity-data'
import { ACTIVITY_UI_MAPPING } from '@/lib/constants/activity-ui'
import { cn, formatISK } from '@/lib/utils'
import { Crown, Calendar, Info, Wallet, CheckCircle2, XCircle, AlertCircle, Copy, Check, History } from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/i18n/hooks'

export default function SubscriptionPage() {
  const { data: session } = useSession()
  const [copied, setCopied] = useState(false)
  const corpName = "Easy Eve Holding's"
  const { t } = useTranslations()

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
          <h1 className="text-4xl font-bold text-white tracking-tight">{t('subscription.title')}</h1>
          <p className="text-gray-400 mt-2">{t('subscription.subtitle')}</p>
        </div>
        
        <div className="flex items-center gap-3 bg-eve-panel p-4 rounded-xl border border-eve-border shadow-2xl">
          <div className={cn(
            "h-12 w-12 rounded-full flex items-center justify-center shadow-inner",
            isExpired ? "bg-red-500/10 text-red-500" : "bg-eve-accent/10 text-eve-accent"
          )}>
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">{t('subscription.currentStatus')}</p>
            <p className={cn("text-lg font-bold", isExpired ? "text-red-400" : "text-green-400")}>
              {isExpired ? t('common.expired') : t('common.activeStatus')}
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
              {t('subscription.accessPeriod')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-1">
              <p className="text-sm text-gray-400">{t('subscription.subscriptionEnds')}</p>
              <p className="text-3xl font-bold text-white">
                {session?.user?.subscriptionEnd ? new Date(session.user.subscriptionEnd).toLocaleDateString() : t('common.notAvailable')}
              </p>
              {isExpired && (
                <div className="flex items-center gap-2 text-red-400 text-sm mt-2 animate-pulse">
                  <AlertCircle className="h-4 w-4" />
                  <span>{t('subscription.expiredMessage')}</span>
                </div>
              )}
            </div>

            <div className="p-4 rounded-lg bg-eve-dark/50 border border-eve-border/50 space-y-3">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-eve-accent shrink-0 mt-0.5" />
                <div className="text-sm space-y-2">
                  <p className="text-gray-300 font-medium">{t('subscription.howToRenew')}</p>
                  <p className="text-gray-400 leading-relaxed">
                    {t('subscription.sendISK')}
                  </p>
                  <div className="flex items-center gap-2 bg-eve-panel p-2 rounded border border-eve-border group cursor-pointer" onClick={copyCorp}>
                    <code className="text-eve-accent font-bold">{corpName}</code>
                    {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-gray-600 group-hover:text-white" />}
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    {t('subscription.autoActivation')}
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
              {t('subscription.availableModules')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {ACTIVITY_TYPES.map(module => {
                const isAllowed = session?.user?.allowedActivities?.includes(module.id)
                const ui = ACTIVITY_UI_MAPPING[module.id]
                const Icon = ui?.icon
                
                return (
                  <div key={module.id} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-all",
                    isAllowed 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-gray-500/5 border-transparent opacity-50"
                  )}>
                    <div className="flex items-center gap-3">
                      <div className={cn("p-2 rounded", isAllowed ? "bg-green-500/10" : "bg-gray-500/10")}>
                        {Icon && <Icon className={cn("h-4 w-4", isAllowed ? "text-green-400" : "text-gray-500")} />}
                      </div>
                      <span className={cn("font-medium", isAllowed ? "text-white" : "text-gray-500")}>
                        {module.label}
                      </span>
                    </div>
                    {isAllowed ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px]">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> {t('common.active')}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-transparent text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" /> {t('common.blocked')}
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
            <p className="text-gray-400 text-sm">{t('subscription.paymentIssues')}</p>
            <Button variant="outline" className="w-full mt-2" onClick={() => window.open('https://discord.gg/easyeve', '_blank')}>
               {t('subscription.joinDiscord')}
            </Button>
         </Card>

         <Card className="md:col-span-2 bg-gradient-to-br from-eve-panel to-eve-dark border-eve-border overflow-hidden group">
            <CardHeader>
               <CardTitle className="text-sm uppercase tracking-widest text-gray-500">{t('subscription.paymentHistory')}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center py-8 opacity-40 group-hover:opacity-100 transition-opacity">
               <History className="h-12 w-12 text-gray-600 mb-2" />
               <p className="text-gray-500 text-sm">{t('subscription.noPayments')}</p>
            </CardContent>
         </Card>
      </div>
    </div>
  )
}
