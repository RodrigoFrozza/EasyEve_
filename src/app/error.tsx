'use client'

import { useEffect } from 'react'
import { AlertCircle, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion } from 'framer-motion'
import { ErrorCodes, getErrorMessage } from '@/lib/error-codes'
import { extractErrorCode } from '@/lib/api-error'
import { useTranslations } from '@/i18n/hooks'

/**
 * Global Error Boundary for the Next.js App Router.
 * This catch-all component handles unhandled runtime errors in the application.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const { t } = useTranslations()
  const errorCode = extractErrorCode(error) || ErrorCodes.UNKNOWN_ERROR
  const message = getErrorMessage(errorCode)

  useEffect(() => {
    // In a production environment, you should log this to an error reporting service like Sentry
    console.error('[GLOBAL ERROR]:', error)
  }, [error])

  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-background px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="max-w-md space-y-6"
      >
        <div className="flex justify-center">
          <div className="rounded-full bg-destructive/10 p-4 animate-pulse">
            <AlertCircle className="h-12 w-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tighter sm:text-4xl text-foreground">
            {t('error.title')}
          </h1>
          <p className="text-muted-foreground sm:text-lg">
            {message}
          </p>
        </div>

        {process.env.NODE_ENV === 'development' && (
          <div className="rounded-md bg-muted p-4 text-left font-mono text-xs overflow-auto max-h-40 border border-border/50">
            <p className="font-bold text-destructive mb-1 uppercase tracking-wider">Debug Info ({errorCode}):</p>
            <p className="whitespace-pre-wrap">{error.message}</p>
            {error.digest && (
              <p className="mt-2 text-muted-foreground opacity-70 italic">
                Digest: {error.digest}
              </p>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button
            onClick={() => reset()}
            variant="default"
            className="gap-2 h-11 px-8 transition-all hover:scale-105"
          >
            <RefreshCcw className="h-4 w-4" />
            {t('error.retry')}
          </Button>
          <Button
            onClick={() => window.location.href = '/'}
            variant="outline"
            className="gap-2 h-11 px-8 transition-all hover:bg-accent"
          >
            <Home className="h-4 w-4" />
            {t('error.goHome')}
          </Button>
        </div>

        <div className="pt-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest opacity-50 font-medium">
            {t('error.securityPriority')} • Código: <span className="font-mono">{errorCode}</span>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
