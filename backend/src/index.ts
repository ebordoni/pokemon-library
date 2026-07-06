import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import path from "path";
import { config } from "./config";
import { initDb } from "./db/schema";
import cardsRouter from "./routes/cards";
import catalogRouter from "./routes/catalog";
import scanRouter from "./routes/scan";
import statsRouter from "./routes/stats";
import { getCatalogStatus, seedCatalog } from "./services/catalog.service";

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Allow Vite dev server origin in development only
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173" }));
}

// ── API routes ─────────────────────────────────────────────────────────────
app.use("/api/cards", cardsRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/scan", scanRouter);
app.use("/api/stats", statsRouter);

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    version: "0.1.0",
    timestamp: new Date().toISOString(),
  });
});

// ── Frontend static files (production / HA addon) ──────────────────────────
const frontendDir = process.env.FRONTEND_DIR;
if (frontendDir) {
  app.use(express.static(frontendDir));
  // SPA fallback — must come after API routes
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(frontendDir, "index.html"));
  });
}

// ── Global error handler ───────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[error]", err.message);
  res.status(500).json({ error: "Internal server error" });
});

// ── Bootstrap ─────────────────────────────────────────────────────────────
initDb();

// Auto-seed the card catalog on first run (background, non-blocking)
const catalogStatus = getCatalogStatus();
if (catalogStatus.cardCount === 0) {
  console.log(
    "[server] Card catalog is empty — starting background seeding from GitHub dataset…",
  );
  void seedCatalog();
}

app.listen(config.port, () => {
  console.log(
    `[server] Pokemon Library running on port ${config.port} (${process.env.NODE_ENV ?? "development"})`,
  );
});

export default app;
