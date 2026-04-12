import { z } from 'zod'

// --- ESI Public Info ---
export const EsiCharacterSchema = z.object({
  character_id: z.number(),
  character_name: z.string(),
  expires_on: z.string().optional(),
  scopes: z.string().optional(),
  token_type: z.string().optional(),
  character_owner_hash: z.string().optional(),
})

export const CharacterPublicInfoSchema = z.object({
  name: z.string(),
  corporation_id: z.number(),
  alliance_id: z.number().optional(),
  security_status: z.number().optional(),
  birthday: z.string(),
  gender: z.string(),
  race_id: z.number(),
  bloodline_id: z.number(),
})

// --- Character Stats ---
export const CharacterSkillsSchema = z.object({
  total_sp: z.number().default(0),
  free_sp: z.number().optional().default(0),
  skills: z.array(z.object({
    skill_id: z.number(),
    skillpoints_in_skill: z.number(),
    trained_skill_level: z.number(),
    active_skill_level: z.number(),
  })).optional().default([]),
  queues: z.array(z.any()).optional().default([]),
})

export const CharacterLocationSchema = z.object({
  solar_system_id: z.number(),
  station_id: z.number().optional(),
  structure_id: z.number().optional(),
})

export const CharacterShipSchema = z.object({
  ship_type_id: z.number(),
  ship_item_id: z.number(),
  ship_name: z.string(),
})

// --- Wallet ---
export const WalletTransactionSchema = z.object({
  transaction_id: z.number(),
  date: z.string(),
  type_id: z.number(),
  unit_price: z.number(),
  quantity: z.number(),
  client_id: z.number(),
  is_buy: z.boolean(),
  is_personal: z.boolean(),
  journal_ref_id: z.number(),
  location_id: z.number(),
})

export const WalletJournalSchema = z.object({
  id: z.number(),
  date: z.string(),
  amount: z.number().optional(),
  balance: z.number().optional(),
  description: z.string(),
  ref_type: z.string(),
  reason: z.string().optional(),
  first_party_id: z.number().optional(),
  second_party_id: z.number().optional(),
})

export const TypeDetailsSchema = z.object({
  type_id: z.number(),
  name: z.string(),
  description: z.string(),
  volume: z.number().optional(),
  packaged_volume: z.number().optional(),
  capacity: z.number().optional(),
  portion_size: z.number().optional(),
  mass: z.number().optional(),
  radius: z.number().optional(),
  published: z.boolean().optional(),
  group_id: z.number().optional(),
  market_group_id: z.number().optional(),
  icon_id: z.number().optional(),
  graphic_id: z.number().optional(),
})

// --- Fittings ---
export const FitModuleSchema = z.object({
  typeId: z.number(),
  name: z.string(),
  chargeTypeId: z.number().optional(),
  offline: z.boolean().optional().default(false),
})

export const CreateFittingSchema = z.object({
  name: z.string().min(1, "Name is required"),
  shipTypeId: z.number(),
  shipName: z.string(),
  modules: z.array(FitModuleSchema).optional().default([]),
  dps: z.number().optional().nullable(),
  tank: z.number().optional().nullable(),
  cost: z.number().optional().nullable(),
})

// --- Characters ---
export const LinkCharacterSchema = z.object({
  characterId: z.number(),
  accessToken: z.string(),
  characterOwnerHash: z.string().optional().nullable(),
})

// --- Admin ---
export const AdminUpdateAccountSchema = z.object({
  userId: z.string().min(1, "UserId is required"),
  allowedActivities: z.array(z.string()).optional(),
  subscriptionEnd: z.string().optional().nullable(),
})
