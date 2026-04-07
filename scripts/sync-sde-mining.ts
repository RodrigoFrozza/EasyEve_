import { PrismaClient } from '@prisma/client'
import { getGroupTypes, getTypeDetails, getMarketPrices, getCategoryGroups } from '../src/lib/esi'

const prisma = new PrismaClient()

// Configuration for Mining Resources
const MINING_CONFIG = {
  categories: [25], // Asteroids (includes common ores)
  groups: [
    462,  // Ice
    711,  // Industrial Gas
    1884, // Ubiquitous Moon Ore (R4)
    1920, // Common Moon Ore (R8)
    1921, // Uncommon Moon Ore (R16)
    1922, // Rare Moon Ore (R32)
    1923, // Exceptional Moon Ore (R64)
  ],
}

async function main() {
  console.log('🚀 Iniciando Sincronização Dinâmica de Mineração (ESI -> SDE)...')
  
  // 1. Fetch real-time market prices once
  console.log('📊 Buscando preços reais de mercado...')
  const prices = await getMarketPrices()
  
  const typeIdsToSync = new Set<number>()

  // 2. Resolve all Type IDs from categories
  for (const catId of MINING_CONFIG.categories) {
    const groups = await getCategoryGroups(catId)
    for (const groupId of groups) {
      const types = await getGroupTypes(groupId)
      types.forEach(id => typeIdsToSync.add(id))
    }
  }

  // 3. Resolve standalone Groups
  for (const groupId of MINING_CONFIG.groups) {
    const types = await getGroupTypes(groupId)
    types.forEach(id => typeIdsToSync.add(id))
  }

  console.log(`📦 Encontrados ${typeIdsToSync.size} itens únicos para processar.`)

  let successCount = 0
  let errorCount = 0

  // 4. Process each type
  for (const typeId of typeIdsToSync) {
    try {
      const info = await getTypeDetails(typeId)
      
      if (!info || !info.published) continue

      const price = prices[typeId] || 0
      
      // Update OreType table (or specialized table)
      await prisma.oreType.upsert({
        where: { id: typeId },
        update: {
          name: info.name,
          groupName: `${info.group_id}`, // In the future, we could resolve group names too
          volume: info.volume || 0,
          basePrice: price,
          published: info.published,
        },
        create: {
          id: typeId,
          name: info.name,
          groupName: `${info.group_id}`,
          volume: info.volume || 0,
          basePrice: price,
          published: info.published,
        },
      })
      
      successCount++
      if (successCount % 20 === 0) {
        console.log(`✅ Progress: ${successCount}/${typeIdsToSync.size} processados...`)
      }
    } catch (err) {
      errorCount++
      console.error(`❌ Erro ao sincronizar item ${typeId}:`, err)
    }
  }

  console.log(`\n✨ Sincronização Concluída!`)
  console.log(`- Sucesso: ${successCount}`)
  console.log(`- Erros: ${errorCount}`)
  console.log(`- Preços atualizados via ESI: Sim`)
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
