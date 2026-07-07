/**
 * DB init / migration smoke test.
 *
 * Reproduces the runtime crash class we hit (e.g. "no such column: ptcgo_code")
 * by running the real `initDb()` against temporary databases:
 *   1. a FRESH database (no file yet)
 *   2. an OLD-SCHEMA database (card_catalog created WITHOUT ptcgo_code, as older
 *      versions did) with a pre-existing row that must be preserved
 *
 * It does NOT boot the HTTP server, on purpose: the full bootstrap triggers
 * seedCatalog()/backfillPtcgoCodes() which hit the network. This test stays
 * offline, fast and deterministic, while still exercising the migration logic.
 *
 * Run with: npm run smoke
 */
import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import os from "os";
import path from "path";
import { config } from "../src/config";
import { getDb, initDb } from "../src/db/schema";

function assert(condition: unknown, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function makeTempDir(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

/** Creates a pokemon.db with the pre-ptcgo_code card_catalog shape + one row. */
function seedOldSchema(dataDir: string): void {
  const db = new DatabaseSync(path.join(dataDir, "pokemon.db"));
  db.exec(`
    CREATE TABLE card_catalog (
      id           TEXT    PRIMARY KEY,
      name         TEXT    NOT NULL,
      supertype    TEXT    NOT NULL,
      subtypes     TEXT    NOT NULL DEFAULT '[]',
      hp           INTEGER,
      types        TEXT    NOT NULL DEFAULT '[]',
      evolves_from TEXT,
      attacks      TEXT    NOT NULL DEFAULT '[]',
      weaknesses   TEXT    NOT NULL DEFAULT '[]',
      set_id       TEXT    NOT NULL,
      set_name     TEXT    NOT NULL,
      number       TEXT    NOT NULL,
      rarity       TEXT,
      image_small  TEXT,
      image_large  TEXT,
      imported_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    INSERT INTO card_catalog (id, name, supertype, set_id, set_name, number)
    VALUES ('sv6-126', 'Test Card', 'Pokémon', 'sv6', 'Twilight Masquerade', '126');
  `);
  db.close();
}

function assertCatalogMigrated(context: string): void {
  const db = getDb();

  const cols = db
    .prepare("PRAGMA table_info(card_catalog)")
    .all() as Array<{ name: string }>;
  assert(
    cols.some((c) => c.name === "ptcgo_code"),
    `[${context}] card_catalog.ptcgo_code column exists`,
  );

  const index = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='index' AND name='idx_catalog_ptcgo_code'",
    )
    .get() as { name: string } | undefined;
  assert(index, `[${context}] idx_catalog_ptcgo_code index exists`);
}

function runScenario(name: string, seed?: (dataDir: string) => void): void {
  const dataDir = makeTempDir("pl-smoke-");
  // initDb() reads config.dataDir at call time — point it at our temp dir.
  config.dataDir = dataDir;

  if (seed) seed(dataDir);

  // Must not throw (this is what crashed at startup before the fix).
  initDb();
  assertCatalogMigrated(name);

  console.log(`  ✓ ${name}`);

  // Release file handles (WAL) before the next scenario / cleanup.
  getDb().close();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

function main(): void {
  console.log("DB migration smoke test:");

  runScenario("fresh database initializes and has ptcgo_code + index");

  runScenario(
    "old-schema database migrates without crashing",
    (dataDir) => {
      seedOldSchema(dataDir);
    },
  );

  // Old-schema row must survive the migration.
  const dataDir = makeTempDir("pl-smoke-");
  config.dataDir = dataDir;
  seedOldSchema(dataDir);
  initDb();
  const { n } = getDb()
    .prepare("SELECT COUNT(*) AS n FROM card_catalog")
    .get() as { n: number };
  assert(n === 1, "existing catalog row is preserved after migration");
  console.log("  ✓ existing catalog row is preserved after migration");
  getDb().close();
  fs.rmSync(dataDir, { recursive: true, force: true });

  console.log("All smoke checks passed.");
}

try {
  main();
  process.exit(0);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
