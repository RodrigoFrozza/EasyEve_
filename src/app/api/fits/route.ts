import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { isPremium } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPremium(user.subscriptionEnd)) {
      return NextResponse.json({ error: 'Fit Management is a Premium feature.' }, { status: 403 })
    }
    
    const fits = await prisma.fit.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    
    return NextResponse.json(fits || [])
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
    const { name, shipTypeId, shipName, modules, dps, tank, cost } = body
    
    if (!name || !shipTypeId || !shipName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    const fit = await prisma.fit.create({
      data: {
        name,
        shipTypeId,
        shipName,
        modules: modules || [],
        dps,
        tank,
        cost,
        userId: user.id
      }
    })
    
    return NextResponse.json(fit)
  } catch (error) {
    console.error('POST fit error:', error)
    return NextResponse.json({ error: 'Failed to create fit' }, { status: 500 })
  }
}