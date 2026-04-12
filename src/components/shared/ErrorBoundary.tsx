'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw, Bug } from 'lucide-react'
import { remoteLogger } from '@/lib/remote-logger'
import { getErrorCode, isAppError } from '@/lib/app-error'
import type { ErrorCode } from '@/lib/error-codes'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorCode: ErrorCode | null
  isChunkLoadError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorCode: null,
    isChunkLoadError: false,
  }

  public static getDerivedStateFromError(error: Error): State {
    const isChunkLoadError = error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')
    const errorCode = getErrorCode(error)
    return { hasError: true, error, errorCode, isChunkLoadError }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const isChunkLoadError = error.name === 'ChunkLoadError' || error.message.includes('Loading chunk')
    const errorCode = getErrorCode(error)
    remoteLogger.error(`ErrorBoundary [${this.props.name || 'Anonymous'}] caught an error`, error, {
      componentStack: errorInfo.componentStack,
      isChunkLoadError,
      errorCode,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null, errorCode: null, isChunkLoadError: false })
  }

  private handleHardReload = () => {
    window.location.reload()
  }

  private renderErrorCode() {
    if (!this.state.errorCode) return null

    return (
      <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
        <Bug className="h-3 w-3" />
        <span>Código: {this.state.errorCode}</span>
      </div>
    )
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      if (this.state.isChunkLoadError) {
        return (
          <div className="flex flex-col items-center justify-center p-8 border border-yellow-500/20 bg-yellow-500/5 rounded-lg text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">Atualização necessária</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              O aplicativo foi atualizado. Por favor, recarregue a página para obter a versão mais recente.
            </p>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={this.handleHardReload}
                className="border-yellow-500/50 text-yellow-400 hover:bg-yellow-500/10"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Recarregar página
              </Button>
            </div>
            {this.renderErrorCode()}
          </div>
        )
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 border border-red-500/20 bg-red-500/5 rounded-lg text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Algo deu errado</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {this.props.name ? `O componente ${this.props.name}` : 'Esta parte do aplicativo'} falhou ao carregar.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleRetry}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          {this.renderErrorCode()}
        </div>
      )
    }

    return this.props.children
  }
}
