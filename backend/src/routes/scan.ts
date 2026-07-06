import { Request, Response, Router } from "express";
import multer from "multer";
import { getDb } from "../db/schema";
import { rowToCard, rowToSession } from "../db/helpers";
import { identifyCardsFromImage } from "../services/grok.service";
import { mapToCard, searchCard } from "../services/pokemontcg.service";
import { upsertCard } from "../services/duplicate.service";
import type { CardRow, ScanResultCard, ScanSessionRow } from "../types";

const router = Router();

// Uploads are processed entirely in memory — never written to disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are accepted"));
    }
  },
});

async function handleScan(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    res.status(400).json({ error: "No image file provided" });
    return;
  }

  const db = getDb();

  // Create a pending scan session for traceability
  const insertResult = db
    .prepare("INSERT INTO scan_sessions (status) VALUES ('pending')")
    .run();
  const sessionId = Number(insertResult.lastInsertRowid);

  try {
    // 1. Encode image to base64 (file never hits disk)
    const imageBase64 = req.file.buffer.toString("base64");
    const mimeType = req.file.mimetype;

    // 2. Ask Grok to identify cards in the image
    const identifications = await identifyCardsFromImage(imageBase64, mimeType);

    if (identifications.length === 0) {
      db.prepare(
        "UPDATE scan_sessions SET status = 'completed', card_count = 0, identified_cards = '[]' WHERE id = ?",
      ).run(sessionId);

      const sessionRow = db
        .prepare("SELECT * FROM scan_sessions WHERE id = ?")
        .get(sessionId) as unknown as ScanSessionRow;

      res.json({ session: rowToSession(sessionRow), cards: [] });
      return;
    }

    // 3. Look up each identified card on PokéTCG API, save to DB
    const resultCards: ScanResultCard[] = [];
    const savedIds: string[] = [];

    for (const identification of identifications) {
      // PokéTCG uses plain number (e.g. "4"), Grok may return "4/102"
      const number = identification.number.includes("/")
        ? identification.number.split("/")[0]
        : identification.number;

      let apiCard;
      try {
        apiCard = await searchCard(identification.name, identification.set, number);
      } catch (lookupErr) {
        console.warn(
          `[scan] PokéTCG lookup failed for "${identification.name}":`,
          lookupErr instanceof Error ? lookupErr.message : lookupErr,
        );
        continue;
      }

      if (!apiCard) {
        console.warn(
          `[scan] No match on PokéTCG for: ${identification.name} (${identification.set} #${number})`,
        );
        continue;
      }

      const cardData = mapToCard(apiCard);
      const wasDuplicate = upsertCard(cardData);
      savedIds.push(cardData.id);

      const row = db
        .prepare("SELECT * FROM cards WHERE id = ?")
        .get(cardData.id) as unknown as CardRow;

      resultCards.push({ ...rowToCard(row), isNew: !wasDuplicate });
    }

    // 4. Finalise session record
    db.prepare(
      "UPDATE scan_sessions SET status = 'completed', card_count = ?, identified_cards = ? WHERE id = ?",
    ).run(resultCards.length, JSON.stringify(savedIds), sessionId);

    const sessionRow = db
      .prepare("SELECT * FROM scan_sessions WHERE id = ?")
      .get(sessionId) as unknown as ScanSessionRow;

    res.json({ session: rowToSession(sessionRow), cards: resultCards });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[scan] Fatal error:", message);

    db.prepare(
      "UPDATE scan_sessions SET status = 'error', error_message = ? WHERE id = ?",
    ).run(message, sessionId);

    res.status(500).json({ error: `Scan failed: ${message}` });
  }
}

// POST /api/scan
router.post("/", upload.single("image"), (req: Request, res: Response) => {
  void handleScan(req, res);
});

export default router;

