export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/api-helpers'
import { prisma } from '@/lib/prisma'
import { generateAccountCode } from '@/lib/account-code'

export async function GET() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: { accountCode: true }
    })
    
    return NextResponse.json({ accountCode: userData?.accountCode })
  } catch (error) {
    console.error('Get account code error:', error)
    return NextResponse.json({ error: 'Failed to get account code' }, { status: 500 })
  }
}

export async function POST() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const newCode = generateAccountCode()
    
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { accountCode: newCode }
    })
    
    return NextResponse.json({ accountCode: updated.accountCode })
  } catch (error) {
    console.error('Regenerate account code error:', error)
    return NextResponse.json({ error: 'Failed to regenerate account code' }, { status: 500 })
  }
}
