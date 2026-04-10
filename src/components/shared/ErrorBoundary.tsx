'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { remoteLogger } from '@/lib/remote-logger'

interface Props {
  children?: ReactNode
  fallback?: ReactNode
  name?: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    remoteLogger.error(`ErrorBoundary [${this.props.name || 'Anonymous'}] caught an error`, error, {
      componentStack: errorInfo.componentStack,
    })
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null })
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center p-8 border border-red-500/20 bg-red-500/5 rounded-lg text-center">
          <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Something went wrong</h3>
          <p className="text-sm text-gray-400 mb-6 max-w-xs">
            {this.props.name ? `The ${this.props.name} component` : 'This part of the app'} failed to load properly.
          </p>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.handleRetry}
            className="border-red-500/50 text-red-400 hover:bg-red-500/10"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Try again
          </Button>
        </div>
      )
    }

    return this.props.children
  }
}
