import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      console.error('[API/Fits] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[API/Fits] Fetching fits for user: ${user.id} at ${new Date().toISOString()}`)
    
    try {
      const fits = await prisma.fit.findMany({
        where: { userId: user.id },
        orderBy: { updatedAt: 'desc' },
      })
      
      console.log(`[API/Fits] Successfully fetched ${fits.length} fits for user ${user.id}`)
      return NextResponse.json(fits)
    } catch (dbError: any) {
      console.error('[API/Fits] Prisma Database Error:', {
        message: dbError.message,
        code: dbError.code,
        meta: dbError.meta,
        stack: dbError.stack,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ 
        error: 'Database connection error',
        details: dbError.message 
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[API/Fits] Unexpected GET Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Unexpected server error',
      details: error.message
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, shipId, fittingData, hullAnalysis } = await request.json()
    
    console.log(`[API/Fits] Creating fit for user ${user.id}: ${name}`)
    
    try {
      const fit = await prisma.fit.create({
        data: {
          name,
          shipId,
          fittingData,
          hullAnalysis,
          userId: user.id,
        },
      })
      
      console.log(`[API/Fits] Successfully created fit ID: ${fit.id}`)
      return NextResponse.json(fit)
    } catch (dbError: any) {
      console.error('[API/Fits] Prisma Create Error:', {
        message: dbError.message,
        code: dbError.code,
        stack: dbError.stack,
        timestamp: new Date().toISOString()
      })
      return NextResponse.json({ 
        error: 'Error saving fit to database',
        details: dbError.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('[API/Fits] Unexpected POST Error:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Unexpected error processing request',
      details: error.message
    }, { status: 500 })
  }
}
