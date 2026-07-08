import { Request, Response, Router } from "express";
import { getDb } from "../db/schema";
import {
  catalogRowToCardData,
  clearCatalog,
  findBySetCodeAndNumber,
  getCatalogStatus,
  listSets,
  seedCatalog,
} from "../services/catalog.service";

const router = Router();

// GET /api/catalog — catalog status and card count
router.get("/", (_req: Request, res: Response) => {
  res.json(getCatalogStatus());
});

// GET /api/catalog/sets — list of sets in the local catalog (for autocomplete)
router.get("/sets", (_req: Request, res: Response) => {
  res.json(listSets());
});

// GET /api/catalog/lookup?set=TWM&number=126 — preview a catalog card by its
// printed set code + number, without adding it to the collection. Also reports
// whether the card is already owned (and in what quantity).
router.get("/lookup", (req: Request, res: Response) => {
  const set = typeof req.query.set === "string" ? req.query.set.trim() : "";
  const number =
    typeof req.query.number === "string" ? req.query.number.trim() : "";

  if (!set || !number) {
    res.status(400).json({ error: "Parametri 'set' e 'number' obbligatori" });
    return;
  }

  const row = findBySetCodeAndNumber(set, number);
  if (!row) {
    res.status(404).json({
      error: `Nessuna carta trovata per "${set} ${number}" nel catalogo locale`,
    });
    return;
  }

  const card = catalogRowToCardData(row);
  const existing = getDb()
    .prepare("SELECT quantity FROM cards WHERE id = ?")
    .get(card.id) as { quantity: number } | undefined;

  res.json({
    card,
    alreadyInCollection: existing !== undefined,
    currentQuantity: existing?.quantity ?? 0,
  });
});

// POST /api/catalog/update — trigger a full catalog re-seed in the background
router.post("/update", (_req: Request, res: Response) => {
  const status = getCatalogStatus();

  if (status.isSeeding) {
    res.status(409).json({
      message: "Catalog seeding already in progress",
      progress: status.seedingProgress,
    });
    return;
  }

  void seedCatalog();
  res.status(202).json({
    message:
      "Catalog update started in background. Check GET /api/catalog for progress.",
  });
});

// POST /api/catalog/clear — empty the downloaded catalog (not the collection)
router.post("/clear", (_req: Request, res: Response) => {
  try {
    const removed = clearCatalog();
    res.json({ removed });
  } catch (err) {
    res.status(409).json({
      error: err instanceof Error ? err.message : "Cannot clear catalog now",
    });
  }
});

export default router;
