import { z } from 'zod'

// --- ESI Public Info ---
export const EsiCharacterSchema = z.object({
  character_id: z.number(),
  character_name: z.string(),
  expires_on: z.string().optional(),
  scopes: z.string().optional(),
  token_type: z.string().optional(),
  character_owner_hash: z.string().optional(),
  intellectual_property: z.string().optional(),
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
  unallocated_sp: z.number().optional().default(0),
  skills: z.array(z.object({
    skill_id: z.number(),
    skillpoints_in_skill: z.number(),
    trained_skill_level: z.number(),
    active_skill_level: z.number(),
  })).optional().default([]),
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
