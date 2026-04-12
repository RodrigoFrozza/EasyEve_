'use client'

import { useMemo } from 'react'
import en from './locales/en.json'
import ptBR from './locales/pt-BR.json'
import zh from './locales/zh.json'
import ja from './locales/ja.json'
import ko from './locales/ko.json'

type NestedKeyOf<T, Prefix extends string = ''> = {
  [K in keyof T]: T[K] extends object
    ? NestedKeyOf<T[K], `${Prefix}${K & string}.`>
    : `${Prefix}${K & string}`
}[keyof T]

type MessageKeys = NestedKeyOf<typeof en>

const translations: Record<string, Record<string, unknown>> = {
  en,
  'pt-BR': ptBR,
  zh,
  ja,
  ko
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const keys = path.split('.')
  let result: unknown = obj
  for (const key of keys) {
    if (result && typeof result === 'object' && key in result) {
      result = (result as Record<string, unknown>)[key]
    } else {
      return undefined
    }
  }
  return typeof result === 'string' ? result : undefined
}

function interpolate(text: string, params?: Record<string, string | number>): string {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, key) => String(params[key] ?? `{${key}}`))
}

const LOCALE_KEY = 'easyeve-locale'

function getStoredLocale(): string {
  if (typeof window === 'undefined') return 'en'
  return localStorage.getItem(LOCALE_KEY) || 'en'
}

export function useTranslations() {
  const locale = getStoredLocale()
  
  const messages = useMemo(() => {
    return translations[locale] || translations.en
  }, [locale])

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number>): string => {
      const text = getNestedValue(messages, key) || getNestedValue(translations.en, key) || key
      return interpolate(text, params)
    }
  }, [messages])

  return { t, locale }
}

export function setLocale(newLocale: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCALE_KEY, newLocale)
    window.location.reload()
  }
}

export function getCurrentLocale(): string {
  return getStoredLocale()
}