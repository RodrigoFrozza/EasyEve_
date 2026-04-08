import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { syncFilamentTypes } from '@/lib/sde/filaments'

export async function POST() {
  try {
    await syncFilamentTypes()
    
    return NextResponse.json({ 
      success: true, 
      message: 'SDE data synchronized successfully',
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error('Failed to sync SDE:', error)
    return NextResponse.json({ 
      error: 'Failed to sync SDE data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
