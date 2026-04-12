'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/session-client'
import { cn, formatISK, isPremium } from '@/lib/utils'
import { 
  Crown, Calendar, Info, Wallet, CheckCircle2, 
  XCircle, AlertCircle, Copy, Check, History, 
  Target, Rocket, Shield, Users, Trophy, Sparkles,
  ChevronRight, ArrowRight
} from 'lucide-react'
import { toast } from 'sonner'
import { useTranslations } from '@/i18n/hooks'
import { SUBSCRIPTION_PLANS } from '@/lib/constants/subscription-plans'
import { motion } from 'framer-motion'

export default function SubscriptionPage() {
  const { data: session, update: updateSession } = useSession()
  const [copied, setCopied] = useState(false)
  const [activationCode, setActivationCode] = useState('')
  const [isActivating, setIsActivating] = useState(false)
  const corpName = "Easy Eve Holding's"
  const { t } = useTranslations()

  const hasPremium = isPremium(session?.user?.subscriptionEnd)
  const isExpired = session?.user?.subscriptionEnd && new Date(session.user.subscriptionEnd) < new Date()

  const handleActivateCode = async () => {
    if (!activationCode) return
    setIsActivating(true)
    try {
      const res = await fetch('/api/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: activationCode })
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Sucesso! Assinatura ativada até ${new Date(data.subscriptionEnd).toLocaleDateString()}`)
        setActivationCode('')
        // @ts-ignore
        updateSession()
      } else {
        toast.error(data.error || 'Erro ao ativar código')
      }
    } catch (err) {
      toast.error('Erro de conexão')
    } finally {
      setIsActivating(false)
    }
  }

  const copyCorp = () => {
    navigator.clipboard.writeText(corpName)
    setCopied(true)
    toast.success("Nome da corporação copiado!")
    setTimeout(() => setCopied(false), 2000)
  }

  const features = [
    { name: 'Rastreio de Atividades', free: true, premium: true, desc: 'Acompanhe ISK/h e performance em tempo real' },
    { name: 'Atividades Simultâneas', free: '1 Ativa', premium: 'Ilimitado', desc: 'Execute múltiplas operações ao mesmo tempo' },
    { name: 'Contas por Atividade', free: '1 Char', premium: 'Ilimitado', desc: 'Rastreie frotas inteiras em um único log' },
    { name: 'Gestão de Fits (Em breve)', free: false, premium: true, desc: 'Gerenciamento avançado de inventário e builds' },
    { name: 'Acesso ao Ranking Global', free: false, premium: true, desc: 'Apareça nos rankings mundiais e conquistas' },
    { name: 'Exportação de Dados', free: false, premium: true, desc: 'Relatórios detalhados para planilhas e auditoria' },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 px-4">
      {/* Dynamic Header */}
      <div className="relative text-center space-y-4 py-8">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-eve-accent/10 border border-eve-accent/20 text-eve-accent text-xs font-bold uppercase tracking-widest"
        >
          <Sparkles className="h-3 w-3" />
          Vantagem Tática Premium
        </motion.div>
        <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter">
          ESCALA O TEU <span className="text-eve-accent">IMPÉRIO</span>
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto text-lg">
          Desbloqueie o potencial máximo das suas operações industriais e táticas em New Eden.
        </p>
      </div>

      {/* Manual Activation Box */}
      <Card className="bg-eve-panel/80 border-eve-accent/30 border shadow-[0_0_30px_rgba(0,255,255,0.05)] overflow-hidden">
        <CardContent className="p-6 md:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="flex-1 space-y-2">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="h-5 w-5 text-eve-accent" />
              Ativação Manual de Código
            </h3>
            <p className="text-sm text-gray-500">Possui um código de ativação premium? Insira-o abaixo para resgatar seu tempo de assinatura imediatamente.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <div className="relative w-full md:w-64">
              <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input 
                type="text"
                placeholder="EVE-XXXX-XXXX-XXXX"
                className="w-full bg-black border border-eve-border rounded-lg h-12 pl-10 pr-4 text-eve-accent font-mono placeholder:text-gray-700 focus:border-eve-accent focus:outline-none transition-all uppercase"
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
              />
            </div>
            <Button 
                onClick={handleActivateCode}
                disabled={isActivating || !activationCode}
                className="h-12 bg-eve-accent text-black font-black hover:bg-eve-accent/80 px-8 disabled:opacity-50"
            >
              {isActivating ? <Loader2 className="h-4 w-4 animate-spin" /> : 'RESGATAR'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tier Comparison */}
      <div className="grid md:grid-cols-2 gap-8 pt-8">
        {/* FREE TIER */}
        <motion.div
          whileHover={{ y: -5 }}
          className="relative group"
        >
          <Card className="bg-zinc-950/80 border-zinc-900 border-2 h-full overflow-hidden transition-all group-hover:border-zinc-800">
            <CardHeader className="p-8">
              <div className="space-y-4">
                <Badge variant="outline" className="text-zinc-600 border-zinc-800 uppercase font-black tracking-widest text-[10px]">Acesso Básico</Badge>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">GRÁTIS</span>
                </div>
                <p className="text-zinc-500 text-sm">Ideal para pilotos solo que buscam organização básica.</p>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 pt-0">
              <div className="space-y-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-zinc-900/50">
                    <span className="text-zinc-400 text-sm">{f.name}</span>
                    {typeof f.free === 'boolean' ? (
                      f.free ? <CheckCircle2 className="h-4 w-4 text-zinc-600" /> : <XCircle className="h-4 w-4 text-red-900/40" />
                    ) : (
                      <span className="text-xs font-bold text-zinc-600 uppercase">{f.free}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* PREMIUM TIER */}
        <motion.div
          whileHover={{ y: -5 }}
          className="relative group"
        >
          <div className="absolute -top-[2px] -left-[2px] -right-[2px] -bottom-[2px] bg-gradient-to-br from-eve-accent to-blue-600 rounded-xl blur-[2px] opacity-0 group-hover:opacity-40 transition-opacity" />
          <Card className="bg-eve-panel border-eve-accent/30 border-2 h-full relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <Crown className="h-16 w-16 text-eve-accent rotate-12" />
            </div>
            <CardHeader className="p-8">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-eve-accent text-black uppercase font-black tracking-widest text-[10px]">Tactical Suite</Badge>
                  {!hasPremium && <span className="text-[10px] text-eve-accent font-bold animate-pulse">RECOMENDADO</span>}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-white">PREMIUM</span>
                  <span className="text-eve-accent text-sm font-bold">ISK/mês</span>
                </div>
                <p className="text-zinc-400 text-sm">Eficiência máxima para frotas industriais e combatentes profissionais.</p>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-6 pt-0">
              <div className="space-y-4">
                {features.map((f, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-eve-accent/10">
                    <div className="flex flex-col">
                       <span className="text-white text-sm font-medium">{f.name}</span>
                       <span className="text-[10px] text-zinc-500 uppercase">{f.desc}</span>
                    </div>
                    {typeof f.premium === 'boolean' ? (
                      <CheckCircle2 className="h-5 w-5 text-eve-accent drop-shadow-[0_0_8px_rgba(0,255,255,0.4)]" />
                    ) : (
                      <span className="text-sm font-black text-eve-accent uppercase tracking-widest">{f.premium}</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="bg-zinc-950 p-4 rounded-xl border border-eve-accent/20">
                 <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest mb-1">Status Atual</p>
                 <div className="flex items-center justify-between">
                    <p className={cn("text-sm font-bold", isExpired ? "text-red-400" : hasPremium ? "text-green-400" : "text-zinc-500")}>
                        {hasPremium ? (isExpired ? "ASSINATURA EXPIRADA" : `ATIVA ATÉ ${new Date(session?.user?.subscriptionEnd!).toLocaleDateString()}`) : "PLANO FREE ATIVO"}
                    </p>
                    {hasPremium && !isExpired && <CheckCircle2 className="h-4 w-4 text-green-500 animate-pulse" />}
                 </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <div className="bg-eve-panel/30 border border-eve-border rounded-2xl p-8 md:p-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Wallet className="h-40 w-40" />
        </div>
        <div className="max-w-2xl space-y-8 relative z-10">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Protocolo de Ativação</h2>
            <p className="text-zinc-400 italic">&quot;Trust is a weakness. ISK is a tool.&quot;</p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6">
              <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-950 border border-eve-accent/20 flex items-center justify-center font-black text-eve-accent shadow-[0_0_15px_rgba(0,255,255,0.1)]">01</div>
              <div className="space-y-3">
                <p className="text-white text-xl font-bold">Gerar Transferência In-Game</p>
                <p className="text-sm text-zinc-500 leading-relaxed">Envie o valor do plano desejado (ex: 100M ISK para 30 dias) para a nossa corporação holding. Certifique-se de que a transferência seja para o nome exato.</p>
                
                <div className="flex items-center gap-4 bg-black p-4 rounded-xl border border-eve-border group cursor-pointer w-fit pr-8" onClick={copyCorp}>
                  <div className="space-y-0.5">
                    <p className="text-[10px] uppercase font-black text-zinc-600 tracking-widest">Corporação Alvo</p>
                    <code className="text-eve-accent font-bold text-xl">{corpName}</code>
                  </div>
                  <div className="h-10 w-10 rounded-lg bg-eve-panel flex items-center justify-center border border-eve-border group-hover:border-eve-accent transition-all">
                    {copied ? <Check className="h-5 w-5 text-green-500" /> : <Copy className="h-5 w-5 text-zinc-500 group-hover:text-white" />}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-6">
               <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-zinc-600">02</div>
               <div className="space-y-2 pt-1">
                 <p className="text-white text-xl font-bold">Processamento de Inteligência</p>
                 <p className="text-sm text-zinc-500">Nosso sistema monitora as wallets corporativas em tempo real. Sua conta premium será inicializada automaticamente em <span className="text-eve-accent font-bold">5-10 minutos</span> após a detecção.</p>
               </div>
            </div>

            <div className="flex gap-6">
               <div className="h-12 w-12 shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center font-black text-zinc-600">03</div>
               <div className="space-y-2 pt-1">
                 <p className="text-white text-xl font-bold">Ativação Instantânea (Opcional)</p>
                 <p className="text-sm text-zinc-500">Já possui um código de ativação fornecido por um administrador ou via parceiros? Use a caixa de resgate no topo da página para ativação instantânea.</p>
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
