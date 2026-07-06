export type Supertype = "Pokémon" | "Trainer" | "Energy";

export interface Attack {
  name: string;
  cost: string[];
  convertedEnergyCost: number;
  damage: string;
  text: string;
}

export interface Weakness {
  type: string;
  value: string;
}

export interface Card {
  id: string;
  name: string;
  supertype: Supertype;
  subtypes: string[];
  hp?: number;
  types: string[];
  evolvesFrom?: string;
  attacks: Attack[];
  weaknesses: Weakness[];
  setId: string;
  setName: string;
  number: string;
  rarity?: string;
  imageUrl?: string;
  imageUrlHires?: string;
  quantity: number;
  isDuplicate: boolean;
  addedAt: string;
  updatedAt: string;
}

export interface ScanResultCard extends Card {
  isNew: boolean;
}

export interface ScanSession {
  id: number;
  createdAt: string;
  cardCount: number;
  identifiedCards: string[];
  status: "pending" | "completed" | "error";
  errorMessage?: string;
}

export interface ScanResponse {
  session: ScanSession;
  cards: ScanResultCard[];
}

export interface CardFilters {
  q?: string;
  type?: string;
  supertype?: Supertype;
  rarity?: string;
  set?: string;
  duplicates?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedCards {
  data: Card[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CollectionStats {
  totalCards: number;
  uniqueCards: number;
  duplicateCards: number;
  byType: Record<string, number>;
  bySupertype: Record<string, number>;
  byRarity: Record<string, number>;
  topSets: Array<{ setName: string; count: number }>;
}
