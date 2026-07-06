import axios from "axios";
import { getDb } from "../db/schema";
import type { Card } from "../types";

const RAW_BASE =
  "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";

// ── Raw GitHub data shapes ─────────────────────────────────────────────────

interface SetMeta {
  id: string;
  name: string;
}

interface RawCard {
  id: string;
  name: string;
  supertype: string;
  subtypes?: string[];
  hp?: string;
  types?: string[];
  evolvesFrom?: string;
  attacks?: unknown[];
  weaknesses?: unknown[];
  set: { id: string; name: string };
  number: string;
  rarity?: string;
  images?: { small?: string; large?: string };
}

// ── Public types ───────────────────────────────────────────────────────────

export interface CatalogRow {
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
  image_small: string | null;
  image_large: string | null;
}

export interface CatalogStatus {
  cardCount: number;
  setCount: number;
  lastUpdated: string | null;
  isSeeding: boolean;
  seedingProgress: string | null;
}

// ── Module-level state ────────────────────────────────────────────────────

let seedingInProgress = false;
let currentProgress: string | null = null;

// ── Public API ────────────────────────────────────────────────────────────

export function getCatalogStatus(): CatalogStatus {
  const db = getDb();
  const stats = db
    .prepare(
      `SELECT
        COUNT(*)              AS cardCount,
        COUNT(DISTINCT set_id) AS setCount,
        MAX(imported_at)      AS lastUpdated
       FROM card_catalog`,
    )
    .get() as { cardCount: number; setCount: number; lastUpdated: string | null };

  return {
    cardCount: stats.cardCount,
    setCount: stats.setCount,
    lastUpdated: stats.lastUpdated,
    isSeeding: seedingInProgress,
    seedingProgress: currentProgress,
  };
}

/**
 * Downloads every English set from PokemonTCG/pokemon-tcg-data on GitHub
 * and imports all cards into the local card_catalog table.
 * Safe to call multiple times — uses INSERT OR REPLACE.
 */
export async function seedCatalog(): Promise<void> {
  if (seedingInProgress) return;
  seedingInProgress = true;

  const db = getDb();

  try {
    currentProgress = "Fetching set list…";
    console.log("[catalog] Fetching sets list from GitHub…");

    const setsRes = await axios.get<SetMeta[]>(`${RAW_BASE}/sets/en.json`, {
      timeout: 30_000,
    });
    const sets = setsRes.data;
    console.log(`[catalog] ${sets.length} sets found`);

    const insertCard = db.prepare(`
      INSERT OR REPLACE INTO card_catalog (
        id, name, supertype, subtypes, hp, types, evolves_from,
        attacks, weaknesses, set_id, set_name, number, rarity,
        image_small, image_large
      ) VALUES (
        @id, @name, @supertype, @subtypes, @hp, @types, @evolvesFrom,
        @attacks, @weaknesses, @setId, @setName, @number, @rarity,
        @imageSmall, @imageLarge
      )
    `);

    let importedSets = 0;
    let totalCards = 0;

    for (const set of sets) {
      importedSets++;
      currentProgress = `Importing set ${importedSets}/${sets.length}: ${set.name}`;

      // Polite delay before every request (first one gets a head-start pause too)
      await new Promise((r) => setTimeout(r, importedSets === 1 ? 500 : 300));

      let cards: RawCard[] = [];
      let retries = 3;

      while (retries > 0) {
        try {
          const cardsRes = await axios.get<RawCard[]>(
            `${RAW_BASE}/cards/en/${set.id}.json`,
            { timeout: 30_000 },
          );
          cards = cardsRes.data;
          retries = 0; // success — exit retry loop
        } catch (err) {
          retries--;
          if (axios.isAxiosError(err) && err.response?.status === 429) {
            const backoff = (4 - retries) * 6_000; // 6s, 12s, 18s
            console.warn(
              `[catalog] Rate-limited on ${set.id}, retrying in ${backoff / 1000}s…`,
            );
            await new Promise((r) => setTimeout(r, backoff));
          } else {
            console.warn(
              `[catalog] ✗ Failed to import set ${set.id}:`,
              err instanceof Error ? err.message : err,
            );
            retries = 0; // non-retryable error
          }
        }
      }

      if (!cards.length) continue;

        // Wrap each set in a transaction for speed (10x–50x faster than row-by-row)
        db.exec("BEGIN");
        try {
          for (const card of cards) {
            // Defensive: some older entries may have set as a string or be missing
            const setId: string =
              typeof card.set === "object" && card.set !== null
                ? card.set.id
                : (card.set as unknown as string) ?? set.id;
            const setName: string =
              typeof card.set === "object" && card.set !== null
                ? card.set.name
                : set.name;

            insertCard.run({
              id: card.id,
              name: card.name,
              supertype: card.supertype,
              subtypes: JSON.stringify(card.subtypes ?? []),
              hp: card.hp ? parseInt(card.hp, 10) : null,
              types: JSON.stringify(card.types ?? []),
              evolvesFrom: card.evolvesFrom ?? null,
              attacks: JSON.stringify(card.attacks ?? []),
              weaknesses: JSON.stringify(card.weaknesses ?? []),
              setId,
              setName,
              number: card.number,
              rarity: card.rarity ?? null,
              imageSmall:
                card.images?.small ??
                `https://images.pokemontcg.io/${setId}/${card.number}.png`,
              imageLarge:
                card.images?.large ??
                `https://images.pokemontcg.io/${setId}/${card.number}_hires.png`,
            });
          }
          db.exec("COMMIT");
        } catch (txErr) {
          db.exec("ROLLBACK");
          throw txErr;
        }

        totalCards += cards.length;
        console.log(`[catalog] ✓ ${set.name} (${cards.length} cards)`);
    }

    console.log(
      `[catalog] Seeding complete — ${totalCards} cards from ${importedSets} sets.`,
    );
  } finally {
    seedingInProgress = false;
    currentProgress = null;
  }
}

/**
 * Searches the local catalog for a card using cascading fallback strategies.
 */
export function searchCatalog(
  name: string,
  set?: string,
  number?: string,
): CatalogRow | null {
  const db = getDb();

  // 1. Exact: name + set + number
  if (set && number) {
    const row = db
      .prepare(
        "SELECT * FROM card_catalog WHERE LOWER(name) = LOWER(?) AND number = ? AND LOWER(set_name) LIKE LOWER(?) LIMIT 1",
      )
      .get(name, number, `%${set}%`) as unknown as CatalogRow | undefined;
    if (row) return row;
  }

  // 2. Name + number only
  if (number) {
    const row = db
      .prepare(
        "SELECT * FROM card_catalog WHERE LOWER(name) = LOWER(?) AND number = ? LIMIT 1",
      )
      .get(name, number) as unknown as CatalogRow | undefined;
    if (row) return row;
  }

  // 3. Name + set only
  if (set) {
    const row = db
      .prepare(
        "SELECT * FROM card_catalog WHERE LOWER(name) = LOWER(?) AND LOWER(set_name) LIKE LOWER(?) LIMIT 1",
      )
      .get(name, `%${set}%`) as unknown as CatalogRow | undefined;
    if (row) return row;
  }

  // 4. Name only (broad fallback)
  const row = db
    .prepare(
      "SELECT * FROM card_catalog WHERE LOWER(name) = LOWER(?) LIMIT 1",
    )
    .get(name) as unknown as CatalogRow | undefined;

  return row ?? null;
}

/**
 * Converts a catalog row to the internal Card data format.
 */
export function catalogRowToCardData(
  row: CatalogRow,
): Omit<Card, "quantity" | "isDuplicate" | "addedAt" | "updatedAt"> {
  return {
    id: row.id,
    name: row.name,
    supertype: row.supertype as Card["supertype"],
    subtypes: JSON.parse(row.subtypes) as string[],
    hp: row.hp !== null ? row.hp : undefined,
    types: JSON.parse(row.types) as string[],
    evolvesFrom: row.evolves_from !== null ? row.evolves_from : undefined,
    attacks: JSON.parse(row.attacks) as Card["attacks"],
    weaknesses: JSON.parse(row.weaknesses) as Card["weaknesses"],
    setId: row.set_id,
    setName: row.set_name,
    number: row.number,
    rarity: row.rarity !== null ? row.rarity : undefined,
    imageUrl: row.image_small !== null ? row.image_small : undefined,
    imageUrlHires: row.image_large !== null ? row.image_large : undefined,
  };
}
