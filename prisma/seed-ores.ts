import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Base Ore data structure to generate variations
const BASE_ORES = [
  { id: 1230,  name: 'Veldspar', groupName: 'Standard Ore', volume: 0.1, basePrice: 15.5, v1: 'Concentrated', v1Id: 17470, v2: 'Dense', v2Id: 17471, v3: 'Stable', v3Id: 28422 },
  { id: 1228,  name: 'Scordite', groupName: 'Standard Ore', volume: 0.15, basePrice: 18.2, v1: 'Condensed', v1Id: 17463, v2: 'Massive', v2Id: 17464, v3: 'Glossy', v3Id: 28421 },
  { id: 1224,  name: 'Pyroxeres', groupName: 'Standard Ore', volume: 0.3, basePrice: 22.1, v1: 'Solid', v1Id: 17459, v2: 'Viscous', v2Id: 17460, v3: 'Pliable', v3Id: 28420 },
  { id: 18,    name: 'Plagioclase', groupName: 'Standard Ore', volume: 0.35, basePrice: 25.4, v1: 'Azure', v1Id: 17455, v2: 'Rich', v2Id: 17456, v3: 'Sparkling', v3Id: 28419 },
  { id: 20,    name: 'Kernite', groupName: 'Standard Ore', volume: 1.2, basePrice: 45.0, v1: 'Luminous', v1Id: 17452, v2: 'Fiery', v2Id: 17453, v3: 'Resplendent', v3Id: 28418 },
  { id: 1227,  name: 'Omber', groupName: 'Standard Ore', volume: 0.6, basePrice: 38.0, v1: 'Silvery', v1Id: 17448, v2: 'Golden', v2Id: 17449, v3: 'Platinum', v3Id: 28417 },
  { id: 1226,  name: 'Jaspet', groupName: 'Standard Ore', volume: 2.0, basePrice: 120.0, v1: 'Pure', v1Id: 17444, v2: 'Pristine', v2Id: 17445, v3: 'Flawless', v3Id: 28416 },
  { id: 1231,  name: 'Hemorphite', groupName: 'Standard Ore', volume: 3.0, basePrice: 180.0, v1: 'Vivid', v1Id: 17440, v2: 'Radiant', v2Id: 17441, v3: 'Scintillating', v3Id: 28415 },
  { id: 1232,  name: 'Hedbergite', groupName: 'Standard Ore', volume: 3.0, basePrice: 195.0, v1: 'Vitric', v1Id: 17436, v2: 'Glazed', v2Id: 17437, v3: 'Lustrous', v3Id: 28414 },
  { id: 1229,  name: 'Gneiss', groupName: 'Standard Ore', volume: 5.0, basePrice: 350.0, v1: 'Iridescent', v1Id: 17428, v2: 'Prismatic', v2Id: 17429, v3: 'Brilliant', v3Id: 28413 },
  { id: 1232,  name: 'Dark Ochre', groupName: 'Standard Ore', volume: 8.0, basePrice: 520.0, v1: 'Onyx', v1Id: 17424, v2: 'Obsidian', v2Id: 17425, v3: 'Jet', v3Id: 28412 },
  { id: 19,    name: 'Spodumain', groupName: 'Standard Ore', volume: 16.0, basePrice: 1100.0, v1: 'Bright', v1Id: 17466, v2: 'Gleaming', v2Id: 17467, v3: 'Dazzling', v3Id: 28423 },
  { id: 1225,  name: 'Crokite', groupName: 'Standard Ore', volume: 16.0, basePrice: 1500.0, v1: 'Sharp', v1Id: 17432, v2: 'Crystalline', v2Id: 17433, v3: 'Pellucid', v3Id: 28411 },
  { id: 1223,  name: 'Bistot', groupName: 'Standard Ore', volume: 16.0, basePrice: 1800.0, v1: 'Triclinic', v1Id: 17420, v2: 'Monoclinic', v2Id: 17421, v3: 'Cubic', v3Id: 28410 },
  { id: 22,    name: 'Arkonor', groupName: 'Standard Ore', volume: 16.0, basePrice: 2200.0, v1: 'Crimson', v1Id: 17416, v2: 'Prime', v2Id: 17417, v3: 'Flawless', v3Id: 28409 },
  { id: 11396, name: 'Mercoxit', groupName: 'Standard Ore', volume: 40.0, basePrice: 12500.0, v1: 'Magma', v1Id: 17867, v2: 'Vitreous', v2Id: 17868, v3: 'Glassy', v3Id: 28424 },
]

// Standalone specific resources
const SPECIAL_ORES = [
  // --- Moon Ores (R4 - Ubiquitous) ---
  { id: 46689, name: 'Bitumens', groupName: 'Moon Ore (R4)', volume: 10.0, basePrice: 2500.0 },
  { id: 46687, name: 'Coesite', groupName: 'Moon Ore (R4)', volume: 10.0, basePrice: 2200.0 },
  { id: 46686, name: 'Sylvite', groupName: 'Moon Ore (R4)', volume: 10.0, basePrice: 2800.0 },
  { id: 46681, name: 'Zeolites', groupName: 'Moon Ore (R4)', volume: 10.0, basePrice: 2100.0 },

  // --- Moon Ores (R8 - Common) ---
  { id: 46675, name: 'Cobaltite', groupName: 'Moon Ore (R8)', volume: 10.0, basePrice: 4500.0 },
  { id: 46679, name: 'Euxenite', groupName: 'Moon Ore (R8)', volume: 10.0, basePrice: 4800.0 },
  { id: 46677, name: 'Scheelite', groupName: 'Moon Ore (R8)', volume: 10.0, basePrice: 5100.0 },
  { id: 46683, name: 'Titanite', groupName: 'Moon Ore (R8)', volume: 10.0, basePrice: 4200.0 },

  // --- Moon Ores (R16 - Uncommon) ---
  { id: 46676, name: 'Chromite', groupName: 'Moon Ore (R16)', volume: 10.0, basePrice: 8500.0 },
  { id: 46684, name: 'Otavite', groupName: 'Moon Ore (R16)', volume: 10.0, basePrice: 8200.0 },
  { id: 46682, name: 'Sperrylite', groupName: 'Moon Ore (R16)', volume: 10.0, basePrice: 9500.0 },
  { id: 46678, name: 'Vanadinite', groupName: 'Moon Ore (R16)', volume: 10.0, basePrice: 7800.0 },

  // --- Moon Ores (R32 - Rare) ---
  { id: 46680, name: 'Carnotite', groupName: 'Moon Ore (R32)', volume: 10.0, basePrice: 15500.0 },
  { id: 46685, name: 'Cinnabar', groupName: 'Moon Ore (R32)', volume: 10.0, basePrice: 16200.0 },
  { id: 46688, name: 'Pollucite', groupName: 'Moon Ore (R32)', volume: 10.0, basePrice: 18500.0 },
  { id: 46690, name: 'Zircon', groupName: 'Moon Ore (R32)', volume: 10.0, basePrice: 14800.0 },

  // --- Moon Ores (R64 - Exceptional) ---
  { id: 46691, name: 'Loparite', groupName: 'Moon Ore (R64)', volume: 10.0, basePrice: 35500.0 },
  { id: 46692, name: 'Monazite', groupName: 'Moon Ore (R64)', volume: 10.0, basePrice: 38200.0 },
  { id: 46693, name: 'Xenotime', groupName: 'Moon Ore (R64)', volume: 10.0, basePrice: 42500.0 },
  { id: 46694, name: 'Ytterbite', groupName: 'Moon Ore (R64)', volume: 10.0, basePrice: 41800.0 },

  // --- Ice ---
  { id: 16268, name: 'Glare Crust', groupName: 'Ice', volume: 1000.0, basePrice: 250000.0 },
  { id: 16267, name: 'Dark Glitter', groupName: 'Ice', volume: 1000.0, basePrice: 185000.0 },
  { id: 16266, name: 'Krystallos', groupName: 'Ice', volume: 1000.0, basePrice: 140000.0 },
  { id: 16264, name: 'Blue Ice', groupName: 'Ice', volume: 1000.0, basePrice: 110000.0 },
  { id: 16262, name: 'Clear Icicle', groupName: 'Ice', volume: 1000.0, basePrice: 95000.0 },

  // --- Gas ---
  { id: 30374, name: 'Fullerite-C320', groupName: 'Gas', volume: 5.0, basePrice: 85000.0 },
  { id: 30378, name: 'Fullerite-C540', groupName: 'Gas', volume: 10.0, basePrice: 42000.0 },
  { id: 30370, name: 'Fullerite-C50', groupName: 'Gas', volume: 1.0, basePrice: 4500.0 },
  { id: 30371, name: 'Fullerite-C60', groupName: 'Gas', volume: 1.0, basePrice: 3800.0 },
  { id: 30372, name: 'Fullerite-C70', groupName: 'Gas', volume: 1.0, basePrice: 4100.0 },
  { id: 30373, name: 'Fullerite-C72', groupName: 'Gas', volume: 2.0, basePrice: 12000.0 },
  { id: 30375, name: 'Fullerite-C28', groupName: 'Gas', volume: 1.0, basePrice: 2200.0 },

  // --- Pochven / Abyssal ---
  { id: 52187, name: 'Talassonite', groupName: 'Pochven Ore', volume: 0.1, basePrice: 450.0 },
  { id: 52189, name: 'Beidellite', groupName: 'Pochven Ore', volume: 0.1, basePrice: 620.0 },
  { id: 52143, name: 'Bezdine', groupName: 'Pochven Ore', volume: 0.1, basePrice: 950.0 },
  { id: 52144, name: 'Rakovene', groupName: 'Pochven Ore', volume: 0.1, basePrice: 1100.0 },
]

async function main() {
  const finalOres = [...SPECIAL_ORES]

  // Generate variations for Base Ores
  for (const base of BASE_ORES) {
    // Standard version
    finalOres.push({
      id: base.id,
      name: base.name,
      groupName: base.groupName,
      volume: base.volume,
      basePrice: base.basePrice
    })

    // Variation I (+5%)
    finalOres.push({
      id: base.v1Id,
      name: `${base.v1} ${base.name}`,
      groupName: base.groupName,
      volume: base.volume,
      basePrice: base.basePrice * 1.05
    })

    // Variation II (+10%)
    finalOres.push({
      id: base.v2Id,
      name: `${base.v2} ${base.name}`,
      groupName: base.groupName,
      volume: base.volume,
      basePrice: base.basePrice * 1.10
    })

    // Variation III (+15%)
    finalOres.push({
      id: base.v3Id,
      name: `${base.v3} ${base.name}`,
      groupName: base.groupName,
      volume: base.volume,
      basePrice: base.basePrice * 1.15
    })
  }

  console.log(`Iniciando população de ${finalOres.length} tipos de recursos (incluindo variações I, II e III)...`)
  
  for (const ore of finalOres) {
    try {
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
          basePrice: ore.basePrice ?? 0,
          published: true,
        },
      })
    } catch (err) {
      console.error(`Erro ao processar ${ore.name}:`, err)
    }
  }

  console.log('✅ Base de dados de mineração completa atualizada com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
