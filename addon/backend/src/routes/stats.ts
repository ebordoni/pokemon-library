import { Request, Response, Router } from "express";
import { getDb } from "../db/schema";
import type { CollectionStats } from "../types";

const router = Router();

// GET /api/stats
router.get("/", (_req: Request, res: Response) => {
  const db = getDb();

  const totals = db
    .prepare(
      "SELECT COALESCE(SUM(quantity), 0) as totalCards, COUNT(*) as uniqueCards FROM cards",
    )
    .get() as { totalCards: number; uniqueCards: number };

  const { duplicateCards } = db
    .prepare(
      "SELECT COUNT(*) as duplicateCards FROM cards WHERE is_duplicate = 1",
    )
    .get() as { duplicateCards: number };

  // Aggregate types (stored as JSON arrays, e.g. '["Fire"]')
  const typeRows = db
    .prepare("SELECT types, SUM(quantity) as cnt FROM cards GROUP BY types")
    .all() as Array<{ types: string; cnt: number }>;
  const byType: Record<string, number> = {};
  for (const row of typeRows) {
    const types = JSON.parse(row.types) as string[];
    for (const t of types) {
      byType[t] = (byType[t] ?? 0) + row.cnt;
    }
  }

  const supertypeRows = db
    .prepare(
      "SELECT supertype, SUM(quantity) as cnt FROM cards GROUP BY supertype",
    )
    .all() as Array<{ supertype: string; cnt: number }>;
  const bySupertype: Record<string, number> = {};
  for (const row of supertypeRows) {
    bySupertype[row.supertype] = row.cnt;
  }

  const rarityRows = db
    .prepare(
      "SELECT rarity, SUM(quantity) as cnt FROM cards WHERE rarity IS NOT NULL GROUP BY rarity ORDER BY cnt DESC",
    )
    .all() as Array<{ rarity: string; cnt: number }>;
  const byRarity: Record<string, number> = {};
  for (const row of rarityRows) {
    byRarity[row.rarity] = row.cnt;
  }

  const topSets = db
    .prepare(
      "SELECT set_name as setName, SUM(quantity) as count FROM cards GROUP BY set_id, set_name ORDER BY count DESC LIMIT 10",
    )
    .all() as CollectionStats["topSets"];

  res.json({
    totalCards: totals.totalCards,
    uniqueCards: totals.uniqueCards,
    duplicateCards,
    byType,
    bySupertype,
    byRarity,
    topSets,
  } satisfies CollectionStats);
});

export default router;
