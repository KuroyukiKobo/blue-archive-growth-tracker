export type SkillType = 'ex' | 'normal' | 'passive' | 'sub';

export interface SkillDefinition {
  id: string;
  type: SkillType;
  name: string;
  maxLevel: number;
}

export interface WbAttributeDefinition {
  id: string;
  name: string;
  maxLevel: 25;
}

export interface EquipmentSlotDefinition {
  id: string;
  equipmentTypeId: string;
  unlockedAtLevel: number;
}

export interface FavoriteItemDefinition {
  id: string;
  name: string;
  maxTier: 2;
}

export interface CharacterDefinition {
  id: string;
  name: string;
  initialStarGrade: number;
  variantGroupId: string;
  skills: SkillDefinition[];
  wbAttributes: WbAttributeDefinition[];
  equipmentSlots: EquipmentSlotDefinition[];
  hasUniqueWeapon: boolean;
  favoriteItem?: FavoriteItemDefinition;
}

export interface CharacterMaster {
  schemaVersion: number;
  region: string;
  locale: string;
  verifiedAt: string;
  sources: string[];
  characters: CharacterDefinition[];
}

export interface EquipmentType {
  id: string;
  name: string;
}

export interface EquipmentTypeMaster {
  schemaVersion: number;
  equipmentTypes: EquipmentType[];
}

export interface GameSettings {
  schemaVersion: number;
  maxSenseiLevel: number;
  maxCharacterStarGrade: number;
  bondRankCapsByStarGrade: Record<string, number>;
  equipmentSlotUnlockLevels: number[];
  abilityReleaseRequirement: {
    characterLevel: number;
    starGrade: number;
  };
  favoriteItemRequirements: {
    equipBondRank: number;
    tier2BondRank: number;
  };
}

export interface CharacterGrowth {
  starGrade: number | null;
  level: number | null;
  skills: Record<string, number | null>;
  wbLevels: Record<string, number | null>;
  bond: number | null;
  equipment: Record<string, { tier: number | null; level: number | null }>;
  uniqueWeapon: { starGrade: number | null; level: number | null } | null;
  favoriteItem: { tier: number | null } | null;
}

export interface OwnedCharacter {
  id: string;
  characterId: string;
  growth: CharacterGrowth;
  createdAt: string;
  updatedAt: string;
}

export interface UserStore {
  schemaVersion: number;
  account: { senseiLevel: number };
  characters: OwnedCharacter[];
}
