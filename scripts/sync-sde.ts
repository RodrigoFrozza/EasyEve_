import { PrismaClient } from '@prisma/client'
import { getGroupTypes, getTypeDetails, getMarketPrices, getCategoryGroups } from '../src/lib/esi.ts'

const prisma = new PrismaClient()

/**
 * CONFIGURAÇÃO DE CATEGORIAS DO EVE
 * 25: Asteroid (Ores)
 * 6: Ship
 * 7: Module
 * 8: Charge (Ammo)
 * 18: Drone
 * 4: Material (Includes Moon Ores and minerals)
 */
const SYNC_CONFIG = [
  { id: 25, name: 'Asteroids' },
  { id: 6,  name: 'Ships' },
  { id: 7,  name: 'Modules' },
  { id: 8,  name: 'Charges/Ammo' },
  { id: 18, name: 'Drones' },
  { id: 4,  name: 'Materials/Moon' },
  { id: 63, name: 'Special Items/Filaments' },
  { id: 2,  name: 'Celestial Objects/Sites' },
  { id: 17, name: 'Trade Goods/Tags' },
  { id: 34, name: 'Ancient Relics/Data Loot' }
]

async function main() {
  console.log('🚀 Iniciando Motor de Sincronização Universal EasyEve...')
  
  // 1. Preços em tempo real
  console.log('📊 Buscando preços globais via ESI...')
  const prices = await getMarketPrices()
  
  for (const category of SYNC_CONFIG) {
    console.log(`\n--- Sincronizando Categoria: ${category.name} (${category.id}) ---`)
    
    // Upsert Category
    await prisma.eveCategory.upsert({
      where: { id: category.id },
      update: { name: category.name },
      create: { id: category.id, name: category.name }
    })

    const groupIds = await getCategoryGroups(category.id)
    console.log(`📦 Encontrados ${groupIds.length} grupos nesta categoria.`)

    for (const groupId of groupIds) {
      // Aqui poderíamos buscar o nome do grupo se quiséssemos (GET /universe/groups/{groupId})
      // Por agora, vamos simplificar para focar nos itens
      
      const typeIds = await getGroupTypes(groupId)
      if (typeIds.length === 0) continue

      // Usamos o primeiro item para pegar o nome do grupo como referência (opcional)
      const firstType = await getTypeDetails(typeIds[0])
      const groupName = firstType?.name ? `Group ${groupId}` : `Group ${groupId}`

      await prisma.eveGroup.upsert({
        where: { id: groupId },
        update: { name: groupName, categoryId: category.id },
        create: { id: groupId, name: groupName, categoryId: category.id }
      })

      console.log(`  > Grupo ${groupId}: Processando ${typeIds.length} itens...`)

      for (const typeId of typeIds) {
        try {
          const details = await getTypeDetails(typeId)
          if (!details || !details.published) continue

          await prisma.eveType.upsert({
            where: { id: typeId },
            update: {
              name: details.name,
              description: details.description,
              groupId: groupId,
              volume: details.volume ?? null,
              basePrice: prices[typeId] ?? null,
              iconId: details.icon_id ?? null,
              published: details.published
            },
            create: {
              id: typeId,
              name: details.name,
              description: details.description,
              groupId: groupId,
              volume: details.volume ?? null,
              basePrice: prices[typeId] ?? null,
              iconId: details.icon_id ?? null,
              published: details.published
            }
          })
        } catch (err) {
          // Ignorar erros individuais para não travar o sync
        }
      }
    }
  }

  console.log('\n✨ Sincronização Universal Concluída!')
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect()
  })
