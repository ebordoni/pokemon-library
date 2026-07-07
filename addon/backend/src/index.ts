import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { config } from "./config";
import { initDb } from "./db/schema";
import cardsRouter from "./routes/cards";
import catalogRouter from "./routes/catalog";
import scanRouter from "./routes/scan";
import statsRouter from "./routes/stats";
import { getCatalogStatus, seedCatalog } from "./services/catalog.service";

// Resolve the app version from package.json (copied next to dist/ in the
// production image and present in dev), avoiding a hard-coded value.
function resolveVersion(): string {
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, "../package.json"), "utf-8"),
    ) as { version?: string };
    return pkg.version ?? "unknown";
  } catch {
    return "unknown";
  }
}
const APP_VERSION = resolveVersion();

const app = express();

// ── Middleware ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Normalize double slashes in the request path that HA Ingress can produce
// (e.g. //api/scan → /api/scan) so routes match correctly.
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/+/g, "/");
  next();
});

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
    version: APP_VERSION,
    timestamp: new Date().toISOString(),
  });
});

// Any unmatched /api/* route is a genuine 404 — do not let it fall through to
// the SPA fallback below (which would return index.html with a 200 status).
app.use("/api", (_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// ── Frontend static files (production / HA addon) ──────────────────────────
const frontendDir = process.env.FRONTEND_DIR;
if (frontendDir) {
  app.use(express.static(frontendDir));
  // Read index.html once at startup instead of on every request.
  const indexHtml = fs.readFileSync(
    path.join(frontendDir, "index.html"),
    "utf-8",
  );
  // SPA fallback: inject the HA Ingress base path so the frontend can build
  // correct API URLs regardless of the ingress token.
  app.get("*", (req: Request, res: Response) => {
    const ingressBase =
      (req.headers["x-ingress-path"] as string | undefined) ?? "";
    const html = ingressBase
      ? indexHtml.replace(
          "</head>",
          `<script>window.__INGRESS_BASE__="${ingressBase}"</script></head>`,
        )
      : indexHtml;
    res.type("html").send(html);
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
} else {
  // Existing catalog seeded before ptcgo_code existed — backfill the printed
  // set codes (one lightweight request) so manual entry by code works.
  void backfillPtcgoCodes();
}

app.listen(config.port, () => {
  console.log(
    `[server] Pokemon Library running on port ${config.port} (${process.env.NODE_ENV ?? "development"})`,
  );
});

export default app;
