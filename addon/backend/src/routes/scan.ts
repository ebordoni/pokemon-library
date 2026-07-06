import { Request, Response, Router } from "express";
import multer from "multer";
import { rowToCard, rowToSession } from "../db/helpers";
import { getDb } from "../db/schema";
import { scanQueue } from "../queue/scanQueue";
import { config } from "../config";
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

  if (session.status === "completed") {
    const cards = session.identifiedCards
      .map((cardId) => {
        const row = db
          .prepare("SELECT * FROM cards WHERE id = ?")
          .get(cardId) as unknown as CardRow | undefined;
        return row ? rowToCard(row) : null;
      })
      .filter((c): c is NonNullable<typeof c> => c !== null);

    res.json({ session, cards, queuePosition });
    return;
  }

  res.json({ session, cards: [], queuePosition });
});

// GET /api/scan — queue overview
router.get("/", (_req: Request, res: Response) => {
  res.json({ pendingScans: scanQueue.pendingCount });
});

export default router;
