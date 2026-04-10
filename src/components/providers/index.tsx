'use client'

import { LogManager } from './LogManager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { I18nProvider } from '@/i18n/client'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider locale="en">
        <ErrorBoundary name="GlobalApp">
          <LogManager />
          {children}
        </ErrorBoundary>
      </I18nProvider>
    </QueryClientProvider>
  )
}
