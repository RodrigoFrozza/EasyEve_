import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { calculateFitStats, getShipAttributes, ShipAttributes } from '@/lib/dogma-calculator'

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
    
    return NextResponse.json(fits)
  } catch (error) {
    console.error('GET fits error:', error)
    return NextResponse.json({ error: 'Failed to fetch fits' }, { status: 500 })
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
      highSlots, 
      medSlots, 
      lowSlots, 
      rigSlots,
      droneBay,
      cargo,
      description,
      source
    } = body
    
    if (!name || !shipTypeId || !shipName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    // Get ship attributes for calculation
    const shipAttrs = await getShipAttributes(shipTypeId)
    
    // Calculate fit stats if ship was found
    let calculatedStats = null
    if (shipAttrs) {
      const slots = { 
        high: highSlots || [], 
        med: medSlots || [], 
        low: lowSlots || [], 
        rig: rigSlots || [],
        drone: droneBay || [],
        cargo: cargo || []
      }
      calculatedStats = calculateFitStats(shipAttrs, slots)
    }
    
    const fit = await prisma.fit.create({
      data: {
        name,
        description,
        shipTypeId,
        shipName,
        highSlots: highSlots || [],
        medSlots: medSlots || [],
        lowSlots: lowSlots || [],
        rigSlots: rigSlots || [],
        droneBay: droneBay || [],
        cargo: cargo || [],
        source: source || 'manual',
        
        // Calculated stats
        dps: calculatedStats?.dps.total,
        volley: calculatedStats?.volley.total,
        tank: calculatedStats?.tank.shield.regen,
        ehp: calculatedStats?.ehp.total,
        cost: calculatedStats?.cost,
        
        // Capacitor
        capStable: calculatedStats?.capacitor.stable,
        capUse: calculatedStats?.capacitor.usePerSecond,
        capRecharge: calculatedStats?.capacitor.rechargeRate,
        
        // Requirements
        cpuUsed: calculatedStats?.cpu.used,
        cpuTotal: calculatedStats?.cpu.total,
        pgUsed: calculatedStats?.power.used,
        pgTotal: calculatedStats?.power.total,
        
        // Slot counts
        highSlotCount: shipAttrs?.highSlots,
        medSlotCount: shipAttrs?.medSlots,
        lowSlotCount: shipAttrs?.lowSlots,
        rigSlotCount: shipAttrs?.rigSlots,
        
        userId: user.id
      }
    })
    
    return NextResponse.json(fit)
  } catch (error) {
    console.error('POST fit error:', error)
    return NextResponse.json({ error: 'Failed to create fit' }, { status: 500 })
  }
}
