import { Request, Response, Router } from "express";
import multer from "multer";
import { config } from "../config";
import { rowToCard, rowToSession } from "../db/helpers";
import { getDb } from "../db/schema";
import { scanQueue } from "../queue/scanQueue";
import type { CardRow, ScanSessionRow } from "../types";

const router = Router();

// Uploads are held in memory only — never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Only image files are accepted"));
  },
});

// POST /api/scan — enqueue scan, return 202 immediately
router.post("/", upload.single("image"), (req: Request, res: Response) => {
  if (!config.grokApiKey) {
    res.status(503).json({
      error:
        "Grok API key not configured. Set it in the addon Configuration panel.",
    });
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  const db = getDb();
  const result = db
    .prepare("INSERT INTO scan_sessions (status) VALUES ('pending')")
    .run();
  const sessionId = Number(result.lastInsertRowid);

  const queuePosition = scanQueue.enqueue({
    sessionId,
    imageBuffer: req.file.buffer,
    mimeType: req.file.mimetype,
  });

  res
    .status(202)
    .json({ sessionId, queuePosition, statusUrl: `/api/scan/${sessionId}` });
});

// GET /api/scan/:id — poll scan status (called repeatedly by frontend)
router.get("/:id", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const db = getDb();
  const sessionRow = db
    .prepare("SELECT * FROM scan_sessions WHERE id = ?")
    .get(id) as unknown as ScanSessionRow | undefined;

  if (!sessionRow) {
    res.status(404).json({ error: "Scan session not found" });
    return;
  }

  const session = rowToSession(sessionRow);
  const queuePosition = scanQueue.getQueuePosition(id);

  // `session` already carries the review candidates (parsed from JSON).
  res.json({ session, queuePosition });
});

// POST /api/scan/:id/confirm — apply the user's per-candidate review decisions.
// action "add"  → insert the card (or +1 if already in collection)
// action "skip" → discard the candidate (nothing written)
const confirmSchema = z.object({
  decisions: z.array(
    z.object({
      index: z.number().int(),
      action: z.enum(["add", "skip"]),
    }),
  ),
});

router.post("/:id/confirm", (req: Request, res: Response) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid session ID" });
    return;
  }

  const parse = confirmSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Invalid decisions payload" });
    return;
  }

  const db = getDb();
  const sessionRow = db
    .prepare("SELECT * FROM scan_sessions WHERE id = ?")
    .get(id) as unknown as ScanSessionRow | undefined;

  if (!sessionRow) {
    res.status(404).json({ error: "Scan session not found" });
    return;
  }

  const session = rowToSession(sessionRow);
  if (session.status !== "completed") {
    res.status(409).json({
      error:
        session.status === "applied"
          ? "This scan has already been applied"
          : "Scan is not ready for review",
    });
    return;
  }

  const byIndex = new Map(session.candidates.map((c) => [c.index, c]));
  const appliedIds: string[] = [];
  let addedCount = 0;
  let duplicateCount = 0;
  let skippedCount = 0;

  for (const decision of parse.data.decisions) {
    const candidate = byIndex.get(decision.index);
    if (!candidate || !candidate.matched || !candidate.card) continue;

    if (decision.action === "add") {
      const wasDuplicate = upsertCard(candidate.card);
      if (wasDuplicate) duplicateCount++;
      else addedCount++;
      appliedIds.push(candidate.card.id);
    } else {
      skippedCount++;
    }
  }

  db.prepare(
    "UPDATE scan_sessions SET status = 'applied', card_count = ?, identified_cards = ? WHERE id = ?",
  ).run(appliedIds.length, JSON.stringify(appliedIds), id);

  const cards = appliedIds
    .map((cardId) => {
      const row = db
        .prepare("SELECT * FROM cards WHERE id = ?")
        .get(cardId) as unknown as CardRow | undefined;
      return row ? rowToCard(row) : null;
    })
    .filter((c): c is NonNullable<typeof c> => c !== null);

  res.json({ addedCount, duplicateCount, skippedCount, cards });
});

// GET /api/scan — queue overview
router.get("/", (_req: Request, res: Response) => {
  res.json({ pendingScans: scanQueue.pendingCount });
});

export default router;
