import { 
  Gem, 
  Crosshair, 
  Zap, 
  Compass, 
  ShieldCheck, 
  AlertTriangle, 
  Target 
} from 'lucide-react'

export const ACTIVITY_TYPES = [
  { id: 'mining', label: 'Mining', icon: Gem, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  { id: 'ratting', label: 'Ratting', icon: Crosshair, color: 'text-red-400', bg: 'bg-red-500/10' },
  { id: 'abyssal', label: 'Abyssal', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  { id: 'exploration', label: 'Exploration', icon: Compass, color: 'text-green-400', bg: 'bg-green-500/10' },
  { id: 'crab', label: 'Crab Beacon', icon: ShieldCheck, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  { id: 'escalations', label: 'Escalations', icon: AlertTriangle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  { id: 'pvp', label: 'PVP', icon: Target, color: 'text-pink-400', bg: 'bg-pink-500/10' },
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
  ESS: ['ess_payout', 'ess_escrow'],
  TAX: ['corporation_tax_payout']
} as const
