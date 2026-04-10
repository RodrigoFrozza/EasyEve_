'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertTriangle, StopCircle, X } from 'lucide-react'

interface ConfirmEndModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  activityName?: string
}

export function ConfirmEndModal({ open, onOpenChange, onConfirm, activityName = 'Activity' }: ConfirmEndModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] bg-zinc-950 border-zinc-800 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-wider">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Finalizar Operação
          </DialogTitle>
          <DialogDescription className="text-zinc-400 text-sm">
            Você está prestes a finalizar esta atividade. Esta ação não pode ser desfeita.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-sm text-zinc-300">
              <span className="font-black text-red-400 uppercase">ATENÇÃO:</span> Ao finalizar a atividade, todos os dados não salvos serão perdidos.
            </p>
          </div>
          
          <div className="mt-4 space-y-2">
            <p className="text-xs text-zinc-500 uppercase font-black tracking-wider">
              Atividade: <span className="text-zinc-300">{activityName}</span>
            </p>
            <p className="text-xs text-zinc-500 uppercase font-black tracking-wider">
              Ação: <span className="text-red-400">Finalizar e salvar dados</span>
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex-1 bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700"
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            onClick={onConfirm}
            className="flex-1 bg-red-500 hover:bg-red-600 text-black font-black uppercase text-xs tracking-wider"
          >
            <StopCircle className="h-4 w-4 mr-2" />
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}