'use client'

import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, RefreshCw, AlertTriangle, ShieldAlert, Info, Terminal } from 'lucide-react'
import { cn } from '@/lib/utils'

interface GlobalLog {
  id: string
  userId: string
  level: string
  message: string
  stack: string | null
  url: string | null
  userAgent: string | null
  createdAt: string
  user: {
    name: string | null
    accountCode: string | null
  }
}

export function GlobalLogs() {
  const [logs, setLogs] = useState<GlobalLog[]>([])
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/logs')
      if (res.ok) {
        setLogs(await res.json())
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
    const interval = setInterval(fetchLogs, 30000) // Auto-refresh every 30s
    return () => clearInterval(interval)
  }, [])

  const memoizedLogs = useMemo(() => logs, [logs])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Terminal className="h-5 w-5 text-red-500" />
            Últimos Erros do Sistema
          </h2>
          <p className="text-xs text-gray-500">Monitoramento em tempo real de falhas no navegador dos usuários</p>
        </div>
        <button 
          onClick={fetchLogs} 
          disabled={loading}
          className="p-2 rounded-lg bg-eve-panel border border-eve-border hover:bg-eve-dark transition-colors"
          title="Recarregar logs agora"
        >
          <RefreshCw className={cn("h-4 w-4 text-gray-400", loading && "animate-spin")} />
        </button>
      </div>

      <div className="grid gap-2">
        {loading && memoizedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-eve-panel rounded-xl border border-eve-border border-dashed">
            <Loader2 className="h-8 w-8 animate-spin text-eve-accent mb-2" />
            <p className="text-gray-500 text-sm">Escaneando logs...</p>
          </div>
        ) : memoizedLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 bg-eve-panel rounded-xl border border-eve-border border-dashed">
            <Info className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-gray-500 text-sm font-medium">Nenhum erro registrado recentemente.</p>
            <p className="text-xs text-gray-600">O sistema está operando normalmente conforme o esperado.</p>
          </div>
        ) : (
          memoizedLogs.map((log) => (
            <Card key={log.id} className="bg-eve-panel border-eve-border hover:bg-eve-dark/30 transition-all group">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div 
                    className={cn(
                        "p-2 rounded-lg shrink-0",
                        log.level === 'error' ? "bg-red-500/10 text-red-500" : "bg-yellow-500/10 text-yellow-500"
                    )}
                    title={log.level === 'error' ? "Erro Crítico" : "Aviso/Alerta"}
                  >
                    {log.level === 'error' ? <ShieldAlert className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white uppercase tracking-tighter">
                          {log.user?.name || log.user?.accountCode || 'Usuário Desconhecido'}
                        </span>
                        <Badge variant="outline" className="text-[10px] h-4 px-1.5 opacity-50 border-gray-700">
                          {log.user?.accountCode}
                        </Badge>
                      </div>
                      <span className="text-[10px] text-gray-500 font-medium">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-300 font-medium line-clamp-1">{log.message}</p>
                    {log.url && <p className="text-[10px] text-gray-600 truncate mt-1">URL: {log.url}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
