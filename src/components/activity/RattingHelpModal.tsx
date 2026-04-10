'use client'

import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { 
  HelpCircle, 
  Zap, 
  ShieldCheck, 
  Wallet, 
  RefreshCw, 
  Target,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { useTranslations } from '@/i18n/hooks'

interface RattingHelpModalProps {
  children?: React.ReactNode
}

export function RattingHelpModal({ children }: RattingHelpModalProps) {
  const { t } = useTranslations()
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-500 hover:text-eve-accent">
            <HelpCircle className="h-4 w-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-eve-panel border-eve-border text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            <Target className="h-6 w-6 text-red-500" />
            {t('activity.ratting.title')}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            {t('activity.ratting.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Section 1: Preparação */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-eve-accent flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              {t('activity.ratting.characterPreparation')}
            </h3>
            <p className="text-sm text-gray-300 leading-relaxed">
              {t('activity.ratting.characterPreparationText')}
            </p>
            <div className="bg-eve-dark/50 border border-eve-border rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-white">Escopo de Carteira:</span> É essencial que o personagem tenha o escopo de leitura de <span className="text-blue-400 font-mono italic">Wallet Journal</span> ativo. Sem isso, o EasyEve não conseguirá ver os pagamentos de Bounties e ESS.
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                <div className="text-sm">
                  <span className="font-bold text-white">{t('activity.ratting.activeTokens')}</span> {t('activity.ratting.activeTokensHelp')}
                </div>
              </div>
            </div>
          </section>

          <Separator className="bg-eve-border/50" />

          {/* Section 2: Iniciando a Operação */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-eve-accent flex items-center gap-2">
              <Zap className="h-5 w-5" />
              {t('activity.ratting.startOperation')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t('activity.ratting.stepA')}</h4>
                <p className="text-xs text-gray-400">
                  Clique em <span className="text-white font-bold">&quot;Start New Activity&quot;</span> e selecione o ícone de Ratting (mira vermelha).
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">{t('activity.ratting.stepB')}</h4>
                <p className="text-xs text-gray-400">
                  Selecione os personagens que participarão da frota e a <span className="text-white font-bold">NPC Faction</span> local.
                </p>
              </div>
            </div>
            <div className="mt-2 text-xs bg-red-500/10 border border-red-500/20 rounded p-3 text-red-400 flex gap-2 italic">
              <Info className="h-4 w-4 shrink-0" />
              {t('activity.ratting.note')}
            </div>
          </section>

          <Separator className="bg-eve-border/50" />

          {/* Section 3: Sincronização Automática */}
          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-eve-accent flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              {t('activity.ratting.iskSync')}
            </h3>
            <p className="text-sm text-gray-300">
              {t('activity.ratting.iskSyncText')}
            </p>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="bg-zinc-900 p-3 rounded-lg border border-eve-border flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Wallet className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-bold text-white uppercase">Ticks de Bounty</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Sincronizados a cada 20 minutos (tempo padrão do jogo). Use o botão <span className="text-white font-bold">&quot;Sync ESI&quot;</span> para atualizar.
                  </p>
                </div>
                <div className="bg-zinc-900 p-3 rounded-lg border border-eve-border flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-bold text-white uppercase">Payouts do ESS</span>
                  </div>
                  <p className="text-[10px] text-gray-400">
                    Surgem na carteira cerca de 3 horas após a atividade. Se você fechar a atividade, o EasyEve continuará monitorando por mais 4 horas.
                  </p>
                </div>
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                <h4 className="text-xs font-bold text-yellow-500 uppercase flex items-center gap-2 mb-1">
                  <AlertCircle className="h-3 w-3" />
                  {t('activity.ratting.important')}
                </h4>
                <p className="text-[10px] text-yellow-500/80">
                  O ESI da CCP pode ter um atraso (cache) de até 5 minutos. Se você acabou de receber o tick no jogo, espere alguns instantes antes de clicar em sincronizar no portal.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4: Dicas de Especialista */}
          <section className="bg-zinc-900/50 border border-eve-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
              {t('activity.ratting.expertTips')}
            </h3>
            <ul className="text-xs text-gray-400 space-y-2 list-disc pl-4">
              <li>Priorize <span className="text-white">Havens (Rock)</span> e <span className="text-white">Sanctums</span> para melhor ISK/Hora em Nullsec.</li>
              <li>Sempre clique em <span className="text-white">&quot;Sync ESI&quot;</span> antes de finalizar a atividade para garantir que o último tick foi capturado.</li>
              <li>O cálculo de <span className="text-eve-accent font-bold">ISK/hr</span> considera o lucro líquido acumulado dividido pelo tempo total de operação.</li>
            </ul>
          </section>
        </div>

        <div className="flex justify-end mt-4">
          <Button onClick={() => {}} className="bg-eve-accent text-black font-bold hover:bg-eve-accent/80">
            {t('activity.ratting.gotIt')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
