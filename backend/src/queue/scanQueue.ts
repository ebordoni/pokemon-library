import { identifyCardsFromImage } from "../services/grok.service";
import { mapToCard, searchCard } from "../services/pokemontcg.service";
import { upsertCard } from "../services/duplicate.service";
import { getDb } from "../db/schema";
import type { CardRow } from "../types";

interface QueueItem {
  sessionId: number;
  imageBuffer: Buffer;
  mimeType: string;
}

class ScanQueue {
  private readonly items: QueueItem[] = [];
  private isProcessing = false;
  private activeSessionId: number | null = null;

  /**
   * Adds a scan to the queue.
   * Returns the 1-based queue position (0 means it starts processing immediately).
   */
  enqueue(item: QueueItem): number {
    this.items.push(item);
    // position = items waiting behind + 1 (this item) + 1 if something is already processing
    const position = this.items.length + (this.isProcessing ? 1 : 0);

    if (!this.isProcessing) {
      void this.processNext();
    }

    return position;
  }

  /**
   * Returns 0 if the session is currently being processed,
   * 1-based position if waiting, or -1 if not found.
   */
  getQueuePosition(sessionId: number): number {
    if (this.activeSessionId === sessionId) return 0;
    const idx = this.items.findIndex((i) => i.sessionId === sessionId);
    return idx >= 0 ? idx + 1 : -1;
  }

  /** Total scans waiting or being processed. */
  get pendingCount(): number {
    return this.items.length + (this.isProcessing ? 1 : 0);
  }

  private async processNext(): Promise<void> {
    const item = this.items.shift();
    if (!item) {
      this.isProcessing = false;
      this.activeSessionId = null;
      return;
    }

    this.isProcessing = true;
    this.activeSessionId = item.sessionId;

    try {
      await this.processScan(item);
    } catch (err) {
      // Errors are already handled inside processScan; this is a last-resort guard
      console.error("[queue] Unexpected error:", err);
    }

    // Chain next without growing the call stack
    void this.processNext();
  }

  private async processScan(item: QueueItem): Promise<void> {
    const db = getDb();
    const { sessionId, imageBuffer, mimeType } = item;

    db.prepare(
      "UPDATE scan_sessions SET status = 'processing' WHERE id = ?",
    ).run(sessionId);

    try {
      // 1. Identify cards via Grok Vision API
      const identifications = await identifyCardsFromImage(
        imageBuffer.toString("base64"),
        mimeType,
      );

      if (!identifications.length) {
        db.prepare(
          "UPDATE scan_sessions SET status = 'completed', card_count = 0, identified_cards = '[]' WHERE id = ?",
        ).run(sessionId);
        return;
      }

      // 2. Look up each card in local catalog and upsert into user collection
      const savedIds: string[] = [];

      for (const id of identifications) {
        const number = id.number.includes("/")
          ? id.number.split("/")[0]!
          : id.number;

        let apiCard = null;
        try {
          apiCard = await searchCard(id.name, id.set, number);
        } catch (e) {
          console.warn(
            `[queue] Catalog lookup failed for "${id.name}":`,
            e instanceof Error ? e.message : e,
          );
        }

        if (!apiCard) continue;

        upsertCard(mapToCard(apiCard));
        savedIds.push(apiCard.id);
      }

      db.prepare(
        "UPDATE scan_sessions SET status = 'completed', card_count = ?, identified_cards = ? WHERE id = ?",
      ).run(savedIds.length, JSON.stringify(savedIds), sessionId);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      console.error(`[queue] Scan ${sessionId} failed:`, message);
      db.prepare(
        "UPDATE scan_sessions SET status = 'error', error_message = ? WHERE id = ?",
      ).run(message, sessionId);
    }
  }
}

/** Singleton queue shared across requests. */
export const scanQueue = new ScanQueue();
