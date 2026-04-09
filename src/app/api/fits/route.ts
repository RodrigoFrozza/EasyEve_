import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const fits = await prisma.fit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    // Safe transform - only use fields guaranteed to exist
    const transformedFits = (fits || []).map(fit => ({
      id: fit.id,
      name: fit.name || 'Unnamed',
      shipTypeId: fit.shipTypeId || 0,
      shipName: fit.shipName || 'Unknown',
      modules: fit.modules || [],
      dps: fit.dps,
      tank: fit.tank,
      cost: fit.cost,
      createdAt: fit.createdAt?.toISOString() || new Date().toISOString()
    }))
    
    return NextResponse.json(transformedFits)
  } catch (error) {
    console.error('[API/FITS] GET error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Failed to fetch fits',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const body = await request.json()
    const { 
      name, 
      shipTypeId, 
      shipName, 
      modules,
      dps,
      tank,
      cost
    } = body
    
    if (!name || !shipTypeId || !shipName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const fit = await prisma.fit.create({
      data: {
        name,
        shipTypeId,
        shipName,
        modules: modules || [],
        dps: dps || null,
        tank: tank || null,
        cost: cost || null,
        userId: user.id
      }
    })
    
    return NextResponse.json({
      id: fit.id,
      name: fit.name,
      shipTypeId: fit.shipTypeId,
      shipName: fit.shipName,
      modules: fit.modules,
      dps: fit.dps,
      tank: fit.tank,
      cost: fit.cost,
      createdAt: fit.createdAt?.toISOString()
    })
  } catch (error) {
    console.error('[API/FITS] POST error:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json({ 
      error: 'Failed to create fit',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
