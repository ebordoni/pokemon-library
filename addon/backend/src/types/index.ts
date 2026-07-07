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

/** Row as stored in SQLite (JSON columns are strings) */
export interface CardRow {
  id: string;
  name: string;
  supertype: string;
  subtypes: string; // JSON
  hp: number | null;
  types: string; // JSON
  evolves_from: string | null;
  attacks: string; // JSON
  weaknesses: string; // JSON
  set_id: string;
  set_name: string;
  number: string;
  rarity: string | null;
  image_url: string | null;
  image_url_hires: string | null;
  quantity: number;
  is_duplicate: number; // SQLite stores booleans as 0/1
  added_at: string;
  updated_at: string;
}

/** Card fields as resolved from the catalog, before it enters the collection. */
export type CardData = Omit<
  Card,
  "quantity" | "isDuplicate" | "addedAt" | "updatedAt"
>;

/**
 * A single card proposed by a scan, awaiting the user's review decision.
 * `matched` is false when the AI reading could not be resolved in the catalog.
 */
export interface ScanCandidate {
  index: number;
  matched: boolean;
  raw: { name: string; set: string; number: string; hp?: number };
  card?: CardData;
  alreadyInCollection: boolean;
  currentQuantity: number;
}

export interface ScanSession {
  id: number;
  createdAt: string;
  cardCount: number;
  identifiedCards: string[];
  candidates: ScanCandidate[];
  status: "pending" | "processing" | "completed" | "applied" | "error";
  errorMessage?: string;
}

/** A per-candidate decision sent to POST /api/scan/:id/confirm */
export interface ScanDecision {
  index: number;
  action: "add" | "skip";
}

export interface CardFilters {
  q?: string;
  type?: string;
  supertype?: string;
  rarity?: string;
  set?: string;
  duplicates?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedCards {
  data: Card[];
  total: number; // number of distinct cards matching the filters
  totalQuantity: number; // sum of copies (quantity) matching the filters
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

/** scan_sessions row as stored in SQLite */
export interface ScanSessionRow {
  id: number;
  created_at: string;
  card_count: number;
  identified_cards: string; // JSON
  candidates: string; // JSON
  status: string;
  error_message: string | null;
}
