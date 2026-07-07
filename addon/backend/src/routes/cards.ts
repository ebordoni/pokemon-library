import { Request, Response, Router } from "express";
import { z } from "zod";
import { rowToCard } from "../db/helpers";
import { getDb } from "../db/schema";
import { decrementOrRemoveCard } from "../services/duplicate.service";
import type { CardRow, PaginatedCards } from "../types";

const router = Router();

type DBParam = string | number | null;

const FiltersSchema = z.object({
  q: z.string().optional(),
  type: z.string().optional(),
  supertype: z.enum(["Pokémon", "Trainer", "Energy"]).optional(),
  rarity: z.string().optional(),
  set: z.string().optional(),
  duplicates: z.coerce.boolean().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(24),
});

const QuantitySchema = z.object({
  quantity: z.number().int().min(1),
});

const ManualSchema = z.object({
  set: z.string().trim().min(1),
  number: z.string().trim().min(1),
});

// GET /api/cards
router.get("/", (req: Request, res: Response) => {
  const parse = FiltersSchema.safeParse(req.query);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { q, type, supertype, rarity, set, duplicates, page, limit } =
    parse.data;
  const db = getDb();

  const conditions: string[] = [];
  const params: DBParam[] = [];

  if (q) {
    // Number match ignores leading zeros and case so "054" finds "54" and
    // "tg05" finds "TG05" (LTRIM strips leading '0's from both sides).
    conditions.push(
      "(name LIKE ? OR set_name LIKE ? OR LOWER(LTRIM(number, '0')) = LOWER(LTRIM(?, '0')))",
    );
    params.push(`%${q}%`, `%${q}%`, q);
  }
  if (type) {
    conditions.push("types LIKE ?");
    params.push(`%"${type}"%`);
  }
  if (supertype) {
    conditions.push("supertype = ?");
    params.push(supertype);
  }
  if (rarity) {
    conditions.push("rarity = ?");
    params.push(rarity);
  }
  if (set) {
    conditions.push("(set_id = ? OR set_name LIKE ?)");
    params.push(set, `%${set}%`);
  }
  if (duplicates !== undefined) {
    conditions.push("is_duplicate = ?");
    params.push(duplicates ? 1 : 0);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const run = (stmt: ReturnType<typeof db.prepare>, extra?: DBParam[]) =>
    extra
      ? stmt.all(...([...params, ...extra] as any[]))
      : stmt.get(...(params as any[]));

  const { count, copies } = run(
    db.prepare(
      `SELECT COUNT(*) as count, COALESCE(SUM(quantity), 0) as copies FROM cards ${where}`,
    ),
  ) as { count: number; copies: number };

  const rows = db
    .prepare(`SELECT * FROM cards ${where} ORDER BY name ASC LIMIT ? OFFSET ?`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .all(...([...params, limit, offset] as any[])) as unknown as CardRow[];

  const result: PaginatedCards = {
    data: rows.map(rowToCard),
    total: count,
    totalQuantity: copies,
    page,
    limit,
    totalPages: Math.ceil(count / limit),
  };

  res.json(result);
});

// POST /api/cards/manual — add a card by its printed set code + number,
// resolved directly against the local catalog (no AI / no network).
router.post("/manual", (req: Request, res: Response) => {
  const parse = ManualSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Set e numero sono obbligatori" });
    return;
  }

  const { set, number } = parse.data;
  const row = findBySetCodeAndNumber(set, number);
  if (!row) {
    res.status(404).json({
      error: `Nessuna carta trovata per "${set} ${number}" nel catalogo locale`,
    });
    return;
  }

  const cardData = catalogRowToCardData(row);
  const wasDuplicate = upsertCard(cardData);

  const db = getDb();
  const saved = db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(cardData.id) as unknown as CardRow;

  res.status(wasDuplicate ? 200 : 201).json({
    card: rowToCard(saved),
    wasDuplicate,
  });
});

// GET /api/cards/:id
router.get("/:id", (req: Request, res: Response) => {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(req.params.id) as CardRow | undefined;

  if (!row) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(rowToCard(row));
});

// DELETE /api/cards/:id
router.delete("/:id", (req: Request, res: Response) => {
  const remaining = decrementOrRemoveCard(req.params.id);

  if (remaining === -1) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json({ id: req.params.id, remainingQuantity: remaining });
});

// PATCH /api/cards/:id/quantity
router.patch("/:id/quantity", (req: Request, res: Response) => {
  const parse = QuantitySchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: parse.error.flatten() });
    return;
  }

  const { quantity } = parse.data;
  const db = getDb();

  const existing = db
    .prepare("SELECT id FROM cards WHERE id = ?")
    .get(req.params.id) as { id: string } | undefined;

  if (!existing) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  db.prepare(
    "UPDATE cards SET quantity = ?, is_duplicate = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
  ).run(quantity, quantity > 1 ? 1 : 0, req.params.id);

  const updated = db
    .prepare("SELECT * FROM cards WHERE id = ?")
    .get(req.params.id) as unknown as CardRow;

  res.json(rowToCard(updated));
});

export default router;
