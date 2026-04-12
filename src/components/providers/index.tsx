'use client'

import { LogManager } from './LogManager'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { I18nProvider } from '@/i18n/client'

import { ErrorBoundary } from '@/components/shared/ErrorBoundary'

const LOCALE_KEY = 'easyeve-locale'

function getStoredLocale(): string {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem(LOCALE_KEY) || 'en'
}

function I18nProviderWrapper({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<string>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setLocale(getStoredLocale())
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <I18nProvider locale="en">
        {children}
      </I18nProvider>
    )
  }

  return (
    <I18nProvider locale={locale} onLocaleChange={setLocale}>
      {children}
    </I18nProvider>
  )
}

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
      <I18nProviderWrapper>
        <ErrorBoundary name="GlobalApp">
          <LogManager />
          {children}
        </ErrorBoundary>
      </I18nProviderWrapper>
    </QueryClientProvider>
  )
}
