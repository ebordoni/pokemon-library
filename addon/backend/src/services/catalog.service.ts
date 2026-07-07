import axios from "axios";
import { getDb } from "../db/schema";
import type { Card } from "../types";

const RAW_BASE =
  "https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data/master";

// ── Raw GitHub data shapes ─────────────────────────────────────────────────

interface SetMeta {
  id: string;
  name: string;
  ptcgoCode?: string;
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
  ptcgo_code: string | null;
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
    .get() as {
    cardCount: number;
    setCount: number;
    lastUpdated: string | null;
  };

  return {
    cardCount: stats.cardCount,
    setCount: stats.setCount,
    lastUpdated: stats.lastUpdated,
    isSeeding: seedingInProgress,
    seedingProgress: currentProgress,
  };
}

/**
 * Empties the local card_catalog table (the downloaded PokemonTCG dataset).
 * Does NOT touch the user's collection (the `cards` table). Refuses to run
 * while a seeding is in progress. Returns the number of rows removed.
 */
export function clearCatalog(): number {
  if (seedingInProgress) {
    throw new Error("Catalog seeding in progress — cannot clear now");
  }
  const db = getDb();
  const { n } = db.prepare("SELECT COUNT(*) AS n FROM card_catalog").get() as {
    n: number;
  };
  db.exec("DELETE FROM card_catalog");
  console.log(`[catalog] Cleared ${n} cards from local catalog.`);
  return n;
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
        attacks, weaknesses, set_id, set_name, ptcgo_code, number, rarity,
        image_small, image_large
      ) VALUES (
        @id, @name, @supertype, @subtypes, @hp, @types, @evolvesFrom,
        @attacks, @weaknesses, @setId, @setName, @ptcgoCode, @number, @rarity,
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
              : ((card.set as unknown as string) ?? set.id);
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
            ptcgoCode: set.ptcgoCode ?? null,
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
  } catch (err) {
    // Never let a rejection escape: seedCatalog is invoked with `void`, so an
    // uncaught error here would become an unhandledRejection and could crash
    // the process on the first run (e.g. no network, timeout, GitHub 429).
    console.error(
      "[catalog] Seeding failed:",
      err instanceof Error ? err.message : err,
    );
  } finally {
    seedingInProgress = false;
    currentProgress = null;
  }
}

/**
 * Canonical form of a card number so that values printed/read in different
 * styles compare equal. It:
 *  - drops the "/TOTAL" suffix ("085/132" → "085")
 *  - lowercases any letter prefix ("TG05" → "tg05", "SWSH001" → "swsh001")
 *  - strips leading zeros inside every digit group ("085" → "85",
 *    "tg05" → "tg5", "swsh001" → "swsh1", "h1" → "h1")
 */
function normalizeNumber(raw: string): string {
  const left = raw.includes("/") ? raw.split("/")[0]! : raw;
  return left
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/0*(\d+)/g, "$1");
}

/**
 * Searches the local catalog for a card using cascading fallback strategies.
 * All candidates for a given name are loaded once (the name column is indexed
 * and even common names map to a bounded set of rows) and matched in JS, so
 * numbers are compared in canonical form — this handles special prints such as
 * "TG05", "GG01", "SWSH001" and "H1" that plain SQL equality would miss.
 * When hp is supplied it is used as a tiebreaker on name-only fallbacks.
 */
export function searchCatalog(
  name: string,
  set?: string,
  number?: string,
  hp?: number,
): CatalogRow | null {
  const db = getDb();

  const rows = db
    .prepare("SELECT * FROM card_catalog WHERE LOWER(name) = LOWER(?)")
    .all(name) as unknown as CatalogRow[];
  if (!rows.length) return null;

  const normQ = number ? normalizeNumber(number) : undefined;
  const setLc = set?.toLowerCase();

  const matchesSet = (r: CatalogRow): boolean =>
    setLc !== undefined && r.set_name.toLowerCase().includes(setLc);
  const matchesNumber = (r: CatalogRow): boolean =>
    normQ !== undefined && normalizeNumber(r.number) === normQ;

  // 1. set + number
  if (setLc !== undefined && normQ !== undefined) {
    const row = rows.find((r) => matchesSet(r) && matchesNumber(r));
    if (row) return row;
  }

  // 2. number only
  if (normQ !== undefined) {
    const row = rows.find(matchesNumber);
    if (row) return row;
  }

  // 3. set only
  if (setLc !== undefined) {
    const row = rows.find(matchesSet);
    if (row) return row;
  }

  // 4. HP — narrows down the right print when number/set are unknown
  if (hp !== undefined) {
    const row = rows.find((r) => r.hp === hp);
    if (row) return row;
  }

  // 5. name only (broad last-resort fallback)
  return rows[0] ?? null;
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

/**
 * Finds a card in the local catalog by the set code printed on the card and
 * its collector number — e.g. code "TWM", number "126/167".
 *
 * The printed code is the set's `ptcgoCode` ("TWM"), which differs from the
 * dataset `set_id` ("sv6"). To be forgiving we try, in order:
 *   1. ptcgo_code == code           (the printed code — preferred)
 *   2. set_id     == code           (dataset id, e.g. "sv6")
 *   3. set_name LIKE %code%         (partial name, e.g. "Twilight")
 * always combined with a canonical number match (so "126", "0126" and
 * "126/167" are equivalent). Returns null when nothing matches.
 */
export function findBySetCodeAndNumber(
  code: string,
  number: string,
): CatalogRow | null {
  const db = getDb();
  const normQ = normalizeNumber(number);
  const codeLc = code.trim().toLowerCase();
  if (!codeLc || !normQ) return null;

  // Narrow to plausible rows in SQL, then match the number canonically in JS.
  const rows = db
    .prepare(
      `SELECT * FROM card_catalog
       WHERE LOWER(ptcgo_code) = ?
          OR LOWER(set_id) = ?
          OR LOWER(set_name) LIKE ?`,
    )
    .all(codeLc, codeLc, `%${codeLc}%`) as unknown as CatalogRow[];
  if (!rows.length) return null;

  const numberMatches = (r: CatalogRow): boolean =>
    normalizeNumber(r.number) === normQ;

  // Prefer the strongest set signal first.
  return (
    rows.find(
      (r) => r.ptcgo_code?.toLowerCase() === codeLc && numberMatches(r),
    ) ??
    rows.find((r) => r.set_id.toLowerCase() === codeLc && numberMatches(r)) ??
    rows.find(numberMatches) ??
    null
  );
}

/**
 * One-shot backfill of ptcgo_code for catalogs seeded before the column
 * existed. Fetches only the small sets index (one request) and updates every
 * card_catalog row grouped by set_id. Safe to call repeatedly — it exits
 * early when no rows are missing the code.
 */
export async function backfillPtcgoCodes(): Promise<void> {
  const db = getDb();

  const missing = db
    .prepare("SELECT COUNT(*) AS n FROM card_catalog WHERE ptcgo_code IS NULL")
    .get() as { n: number };
  if (missing.n === 0) return;

  console.log(
    `[catalog] Backfilling ptcgo_code for ${missing.n} cards (fetching sets index)…`,
  );

  try {
    const setsRes = await axios.get<SetMeta[]>(`${RAW_BASE}/sets/en.json`, {
      timeout: 30_000,
    });

    const update = db.prepare(
      "UPDATE card_catalog SET ptcgo_code = ? WHERE set_id = ? AND ptcgo_code IS NULL",
    );

    db.exec("BEGIN");
    try {
      for (const set of setsRes.data) {
        if (set.ptcgoCode) update.run(set.ptcgoCode, set.id);
      }
      db.exec("COMMIT");
    } catch (txErr) {
      db.exec("ROLLBACK");
      throw txErr;
    }

    console.log("[catalog] ptcgo_code backfill complete.");
  } catch (err) {
    console.warn(
      "[catalog] ptcgo_code backfill failed (will retry on next start):",
      err instanceof Error ? err.message : err,
    );
  }
}
