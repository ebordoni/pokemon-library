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

export type CardData = Omit<
  Card,
  "quantity" | "isDuplicate" | "addedAt" | "updatedAt"
>;

/** A single card proposed by a scan, awaiting the user's review decision. */
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

export interface ScanDecision {
  index: number;
  action: "add" | "skip";
}

/** Response from POST /api/scan (enqueue) */
export interface ScanEnqueueResponse {
  sessionId: number;
  queuePosition: number;
  statusUrl: string;
}

/** Response from GET /api/scan/:id (poll) */
export interface ScanStatusResponse {
  session: ScanSession;
  queuePosition: number;
}

/** Response from POST /api/scan/:id/confirm */
export interface ScanConfirmResponse {
  addedCount: number;
  duplicateCount: number;
  skippedCount: number;
  cards: Card[];
}

/** Response from GET /api/catalog/lookup (manual entry preview) */
export interface ManualLookupResponse {
  card: CardData;
  alreadyInCollection: boolean;
  currentQuantity: number;
}

/** Response from POST /api/cards/manual (manual entry commit) */
export interface ManualAddResponse {
  card: Card;
  wasDuplicate: boolean;
}

export interface CatalogStatus {
  cardCount: number;
  setCount: number;
  lastUpdated: string | null;
  isSeeding: boolean;
  seedingProgress: string | null;
}

/** A set available in the local catalog (for manual-entry autocomplete). */
export interface CatalogSet {
  setId: string;
  setName: string;
  ptcgoCode: string | null;
  cardCount: number;
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
