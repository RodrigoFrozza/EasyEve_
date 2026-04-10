
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('--- Checking Mining Sync Status ---')
  
  const activities = await prisma.activity.findMany({
    where: { type: 'mining' },
    orderBy: { startTime: 'desc' },
    take: 5
  })
  
  if (activities.length === 0) {
    console.log('No mining activities found.')
    return
  }
  
  activities.forEach(a => {
    const data = a.data as any
    console.log(`Activity ID: ${a.id}`)
    console.log(`Status: ${a.status}`)
    console.log(`Start Time: ${a.startTime}`)
    console.log(`Last Sync: ${data?.lastSyncAt || 'Never'}`)
    console.log(`Total Qty (m3): ${data?.totalQuantity || 0}`)
    console.log(`Total Value: ${data?.totalEstimatedValue || 0}`)
    console.log(`Logs Count: ${data?.logs?.length || 0}`)
    console.log('-----------------------------------')
  })
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
