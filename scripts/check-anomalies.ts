import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const samples = await prisma.eveType.findMany({
    where: {
      OR: [
        { name: { contains: 'Haven' } },
        { name: { contains: 'Hub' } },
        { name: { contains: 'Sanctum' } }
      ]
    },
    take: 10,
    include: {
      group: {
        include: {
          category: true
        }
      }
    }
  })

  console.log('--- Samples of Anomaly-like Types ---')
  samples.forEach(s => {
    console.log(`Type: ${s.name} (ID: ${s.id})`)
    console.log(`Group: ${s.group.name} (ID: ${s.groupId})`)
    console.log(`Category: ${s.group.category.name} (ID: ${s.group.categoryId})`)
    console.log('---')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
