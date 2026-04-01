'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function LinkCharacterContent() {
  const searchParams = useSearchParams()
  const [status, setStatus] = useState('processing')
  const [error, setError] = useState('')
  
  useEffect(() => {
    async function linkCharacter() {
      try {
        const callbackUrl = searchParams.get('callbackUrl')
        
        if (callbackUrl) {
          const response = await fetch('/api/auth/callback/eveonline' + window.location.search)
          
          if (response.ok) {
            setStatus('success')
            setTimeout(() => {
              window.location.href = '/dashboard/characters'
            }, 2000)
          } else {
            const data = await response.json()
            setError(data.error || 'Failed to link character')
            setStatus('error')
          }
        }
      } catch (err) {
        console.error('Link character error:', err)
        setError('An unexpected error occurred')
        setStatus('error')
      }
    }
    
    linkCharacter()
  }, [searchParams])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-eve-dark">
      <div className="text-center">
        {status === 'processing' && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-eve-accent mx-auto mb-4" />
            <p className="text-white text-lg">Linking character...</p>
          </>
        )}
        
        {status === 'success' && (
          <>
            <div className="text-green-500 text-5xl mb-4">✓</div>
            <p className="text-white text-lg mb-4">Character linked successfully!</p>
            <p className="text-gray-400">Redirecting...</p>
          </>
        )}
        
        {status === 'error' && (
          <>
            <div className="text-red-500 text-5xl mb-4">✗</div>
            <p className="text-white text-lg mb-4">{error}</p>
            <button
              onClick={() => window.location.href = '/dashboard/characters'}
              className="px-6 py-2 bg-eve-accent text-black rounded-lg hover:bg-eve-accent/80"
            >
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-eve-dark">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-eve-accent mx-auto mb-4" />
        <p className="text-white text-lg">Loading...</p>
      </div>
    </div>
  )
}

export default function LinkCharacterPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <LinkCharacterContent />
    </Suspense>
  )
}
