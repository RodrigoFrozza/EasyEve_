import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error fetching activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { status, endTime, data, space, participants } = body

    const existingActivity = await prisma.activity.findFirst({
      where: { id: params.id, userId: user.id }
    })

    if (!existingActivity) return NextResponse.json({ error: 'Activity not found' }, { status: 404 })

    // If MTU or Salvage loot is updated, appraise it on the server
    let updatedData = data || (existingActivity.data as any) || {}
    if (data && (data.mtuContents || data.salvageContents)) {
      const allLootLines: { name: string, quantity: number, category: 'mtu' | 'salvage', mtuIndex?: number }[] = []
      const mtuItems: { [index: number]: { name: string, quantity: number }[] } = {}
      
      if (data.mtuContents && Array.isArray(data.mtuContents)) {
        data.mtuContents.forEach((mtu: any, mtuIdx: number) => {
          const items: Array<{ name: string; quantity: number }> = []
          const lootLines = (mtu.loot || '').split('\n')
          lootLines.forEach((line: string) => {
            const parts = line.split('\t')
            const name = parts[0]?.trim()
            const quantity = parseInt(parts[1]?.replace(/,/g, '') || '1')
            if (name && name.length > 1 && !isNaN(quantity)) {
              allLootLines.push({ name, quantity, category: 'mtu', mtuIndex: mtuIdx })
              items.push({ name, quantity })
            }
          })
          mtuItems[mtuIdx] = items
        })
      }

      const salvageItems: { name: string, quantity: number }[] = []
      if (data.salvageContents && Array.isArray(data.salvageContents)) {
        data.salvageContents.forEach((salvage: any) => {
          (salvage.loot || '').split('\n').forEach((line: string) => {
            const parts = line.split('\t')
            const name = parts[0]?.trim()
            const quantity = parseInt(parts[1]?.replace(/,/g, '') || '1')
            if (name && name.length > 1 && !isNaN(quantity)) {
              allLootLines.push({ name, quantity, category: 'salvage' })
              salvageItems.push({ name, quantity })
            }
          })
        })
      }

      if (allLootLines.length > 0) {
        const { getMarketAppraisal } = await import('@/lib/market')
        const uniqueNames = Array.from(new Set(allLootLines.map(l => l.name)))
        const prices = await getMarketAppraisal(uniqueNames)
        
        let mtuTotal = 0
        let salvageTotal = 0
        
        // Calculate individual MTU values
        const mtuValues: number[] = []
        if (data.mtuContents && Array.isArray(data.mtuContents)) {
          data.mtuContents.forEach((_: any, mtuIdx: number) => {
            let mtuValue = 0
            const items = mtuItems[mtuIdx] || []
            items.forEach(item => {
              const price = prices[item.name.toLowerCase()] || 0
              mtuValue += price * item.quantity
            })
            mtuValues.push(mtuValue)
            mtuTotal += mtuValue
          })
        }
        
        // Calculate salvage total
        salvageItems.forEach(item => {
          const price = prices[item.name.toLowerCase()] || 0
          salvageTotal += price * item.quantity
        })

        updatedData = {
          ...updatedData,
          estimatedLootValue: mtuTotal,
          estimatedSalvageValue: salvageTotal,
          mtuValues: mtuValues,
          lootAppraisedAt: new Date().toISOString(),
          totalItemCount: allLootLines.length
        }
      } else {
        updatedData = {
          ...updatedData,
          estimatedLootValue: 0,
          estimatedSalvageValue: 0,
          mtuValues: [],
          lootAppraisedAt: new Date().toISOString(),
          totalItemCount: 0
        }
      }
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(endTime && { endTime: new Date(endTime) }),
        ...(space && { space }),
        data: updatedData,
        ...(participants && { participants })
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error in PATCH activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status, endTime } = body

    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    const activity = await prisma.activity.update({
      where: { id: params.id },
      data: {
        ...(status && { status }),
        ...(endTime && { endTime: new Date(endTime) })
      }
    })

    return NextResponse.json(activity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existingActivity = await prisma.activity.findFirst({
      where: {
        id: params.id,
        userId: user.id
      }
    })

    if (!existingActivity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    await prisma.activity.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting activity:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}