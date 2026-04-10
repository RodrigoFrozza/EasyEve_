export const ACTIVITY_TYPES = [
  { id: 'mining', label: 'Mining' },
  { id: 'ratting', label: 'Ratting' },
  { id: 'abyssal', label: 'Abyssal' },
  { id: 'exploration', label: 'Exploration' },
  { id: 'crab', label: 'Crab Beacon' },
  { id: 'escalations', label: 'Escalations' },
  { id: 'pvp', label: 'PVP' },
]

export const REGIONS = ['Minmatar', 'Gallente', 'Caldari', 'Amarr', 'Jove', 'Wormhole']
export const SPACE_TYPES = ['Highsec', 'Lowsec', 'Nullsec', 'Wormhole']
export const MINING_TYPES = ['Ore', 'Ice', 'Gas', 'Moon']
export const NPC_FACTIONS = ['Angel Cartel', 'Blood Raider', 'Guristas', 'Sansha', 'Serpentis', 'Rogue Drones']
export const SITE_TYPES_RATTING = ['Combat Anomaly', 'Cosmic Signature', 'DED Complex', 'Belt Ratting']

export const ANOMALIES_BY_FACTION: Record<string, string[]> = {
  'Angel Cartel': ['Angel Hub', 'Angel Haven (Rock)', 'Angel Haven (Gas)', 'Angel Sanctum', 'Angel Forsaken Hub', 'Angel Forlorn Hub', 'Angel Rally Point'],
  'Blood Raider': ['Blood Raider Hub', 'Blood Raider Haven', 'Blood Raider Sanctum', 'Blood Raider Forsaken Hub', 'Blood Raider Forlorn Hub'],
  'Guristas': ['Guristas Hub', 'Guristas Haven', 'Guristas Sanctum', 'Guristas Forsaken Hub', 'Guristas Forlorn Hub'],
  'Sansha': ['Sansha Hub', 'Sansha Haven', 'Sansha Sanctum', 'Sansha Forsaken Hub', 'Sansha Forlorn Hub'],
  'Serpentis': ['Serpentis Hub', 'Serpentis Haven', 'Serpentis Sanctum', 'Serpentis Forsaken Hub', 'Serpentis Forlorn Hub'],
  'Rogue Drones': ['Drone Patrol', 'Drone Horde', 'Drone Squad', 'Hive']
}

export const ABYSSAL_TIERS = ['T0 (Tranquil)', 'T1 (Calm)', 'T2 (Agitated)', 'T3 (Fierce)', 'T4 (Raging)', 'T5 (Chaotic)', 'T6 (Cataclysmic)']
export const ABYSSAL_WEATHER = ['Electrical', 'Dark', 'Exotic', 'Firestorm', 'Gamma']
export const SHIP_SIZES = ['Frigate', 'Destroyer', 'Cruiser']
export const EXPLORATION_SITE_TYPES = ['Relic Site', 'Data Site', 'Ghost Site', 'Gas Site', 'Sleeper Cache', 'Wormhole']
export const DIFFICULTIES = ['Level I', 'Level II', 'Level III', 'Level IV', 'Level V']
export const CRAB_PHASES = ['Deployment', 'Linking (4min)', 'Scanning (10min)', 'Rewards']
export const DED_LEVELS = ['1/10', '2/10', '3/10', '4/10', '5/10', '6/10', '7/10', '8/10', '9/10', '10/10']

export const ESI_REF_TYPES = {
  BOUNTY: ['bounty', 'bounty_prizes', 'bounty_payout', 'agent_mission_reward'],
  ESS: ['ess_payout', 'ess_escrow']
} as const
