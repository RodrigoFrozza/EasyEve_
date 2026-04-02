'use client'

import { useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

function LinkCharacterContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  
  useEffect(() => {
    const accountCode = searchParams.get('accountCode')
    
    if (accountCode) {
      const callbackUrl = encodeURIComponent(`/link-character?accountCode=${accountCode}`)
      window.location.href = `/api/auth/link?accountCode=${accountCode}&callbackUrl=${callbackUrl}`
    } else {
      router.push('/login')
    }
  }, [searchParams, router])
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-eve-dark">
      <div className="text-center">
        <Loader2 className="h-12 w-12 animate-spin text-eve-accent mx-auto mb-4" />
        <p className="text-white text-lg">Redirecting to EVE Online...</p>
        <p className="text-gray-400 text-sm mt-2">Please wait</p>
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
