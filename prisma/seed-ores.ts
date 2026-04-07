import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ORES = [
  // Highsec Ores
  { id: 1230,  name: 'Veldspar', groupName: 'Veldspar', volume: 0.1, basePrice: 15.5 },
  { id: 1228,  name: 'Scordite', groupName: 'Scordite', volume: 0.15, basePrice: 18.2 },
  { id: 1224,  name: 'Pyroxeres', groupName: 'Pyroxeres', volume: 0.3, basePrice: 22.1 },
  { id: 18,    name: 'Plagioclase', groupName: 'Plagioclase', volume: 0.35, basePrice: 25.4 },
  { id: 20,    name: 'Kernite', groupName: 'Kernite', volume: 1.2, basePrice: 45.0 },
  { id: 1227,  name: 'Omber', groupName: 'Omber', volume: 0.6, basePrice: 38.0 },

  // Lowsec/Nullsec Ores
  { id: 1226,  name: 'Jaspet', groupName: 'Jaspet', volume: 2.0, basePrice: 120.0 },
  { id: 1231,  name: 'Hemorphite', groupName: 'Hemorphite', volume: 3.0, basePrice: 180.0 },
  { id: 1232,  name: 'Hedbergite', groupName: 'Hedbergite', volume: 3.0, basePrice: 195.0 },
  { id: 1229,  name: 'Gneiss', groupName: 'Gneiss', volume: 5.0, basePrice: 350.0 },
  { id: 1232,  name: 'Dark Ochre', groupName: 'Dark Ochre', volume: 8.0, basePrice: 520.0 },
  { id: 19,    name: 'Spodumain', groupName: 'Spodumain', volume: 16.0, basePrice: 1100.0 },
  { id: 1225,  name: 'Crokite', groupName: 'Crokite', volume: 16.0, basePrice: 1500.0 },
  { id: 1223,  name: 'Bistot', groupName: 'Bistot', volume: 16.0, basePrice: 1800.0 },
  { id: 22,    name: 'Arkonor', groupName: 'Arkonor', volume: 16.0, basePrice: 2200.0 },
  { id: 11396, name: 'Mercoxit', groupName: 'Mercoxit', volume: 40.0, basePrice: 12500.0 },

  // Abyssal / Pog Ores (Values are very high per m3)
  { id: 52187, name: 'Talassonite', groupName: 'Abyssal Ore', volume: 0.1, basePrice: 450.0 },
  { id: 52189, name: 'Beidellite', groupName: 'Abyssal Ore', volume: 0.1, basePrice: 620.0 },
  { id: 52190, name: 'Sphenite', groupName: 'Abyssal Ore', volume: 0.1, basePrice: 850.0 },
  { id: 52191, name: 'Limonite', groupName: 'Abyssal Ore', volume: 0.1, basePrice: 1100.0 },
]

async function main() {
  console.log('Iniciando população da tabela OreType...')
  
  for (const ore of ORES) {
    await prisma.oreType.upsert({
      where: { id: ore.id },
      update: {
        name: ore.name,
        groupName: ore.groupName,
        volume: ore.volume,
        basePrice: ore.basePrice,
        published: true,
      },
      create: {
        id: ore.id,
        name: ore.name,
        groupName: ore.groupName,
        volume: ore.volume,
        basePrice: ore.basePrice,
        published: true,
      },
    })
  }

  console.log('✅ População concluída com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
