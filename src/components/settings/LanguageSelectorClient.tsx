'use client'

import { useTranslations, getCurrentLocale, setLocale } from '@/i18n/hooks'
import { Globe, ChevronDown } from 'lucide-react'
import { useState } from 'react'

export function LanguageSelector() {
  const { t, locale } = useTranslations()
  const [isOpen, setIsOpen] = useState(false)
  const currentLocale = getCurrentLocale()

  const languages = [
    { code: 'en', name: t('settings.english') },
    { code: 'pt-BR', name: t('settings.portuguese') }
  ]

  const currentLang = languages.find(l => l.code === currentLocale) || languages[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full justify-between p-2 rounded-lg bg-eve-dark/50 border border-eve-border hover:border-gray-500 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-eve-accent" />
          <span className="text-sm text-white">{currentLang.name}</span>
        </div>
        <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-eve-panel border border-eve-border rounded-lg shadow-xl z-50 overflow-hidden">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLocale(lang.code)
                setIsOpen(false)
              }}
              className={`w-full p-2 text-left text-sm hover:bg-eve-dark/50 transition-colors ${
                lang.code === currentLocale ? 'text-eve-accent bg-eve-dark/30' : 'text-gray-300'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}