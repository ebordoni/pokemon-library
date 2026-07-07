import fs from "fs";
import { DatabaseSync } from "node:sqlite";
import path from "path";
import { config } from "../config";

let db: DatabaseSync;

const SCHEMA_V1 = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version    INTEGER PRIMARY KEY,
    applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS cards (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    supertype       TEXT    NOT NULL,
    subtypes        TEXT    NOT NULL DEFAULT '[]',
    hp              INTEGER,
    types           TEXT    NOT NULL DEFAULT '[]',
    evolves_from    TEXT,
    attacks         TEXT    NOT NULL DEFAULT '[]',
    weaknesses      TEXT    NOT NULL DEFAULT '[]',
    set_id          TEXT    NOT NULL,
    set_name        TEXT    NOT NULL,
    number          TEXT    NOT NULL,
    rarity          TEXT,
    image_url       TEXT,
    image_url_hires TEXT,
    quantity        INTEGER NOT NULL DEFAULT 1,
    is_duplicate    INTEGER NOT NULL DEFAULT 0,
    added_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_cards_name      ON cards(name);
  CREATE INDEX IF NOT EXISTS idx_cards_supertype  ON cards(supertype);
  CREATE INDEX IF NOT EXISTS idx_cards_set_id     ON cards(set_id);
  CREATE INDEX IF NOT EXISTS idx_cards_is_duplicate ON cards(is_duplicate);

  CREATE TABLE IF NOT EXISTS scan_sessions (
    id               INTEGER  PRIMARY KEY AUTOINCREMENT,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    card_count       INTEGER  NOT NULL DEFAULT 0,
    identified_cards TEXT     NOT NULL DEFAULT '[]',
    status           TEXT     NOT NULL DEFAULT 'pending',
    error_message    TEXT
  );

  -- Local mirror of the PokemonTCG/pokemon-tcg-data GitHub dataset
  CREATE TABLE IF NOT EXISTS card_catalog (
    id              TEXT    PRIMARY KEY,
    name            TEXT    NOT NULL,
    supertype       TEXT    NOT NULL,
    subtypes        TEXT    NOT NULL DEFAULT '[]',
    hp              INTEGER,
    types           TEXT    NOT NULL DEFAULT '[]',
    evolves_from    TEXT,
    attacks         TEXT    NOT NULL DEFAULT '[]',
    weaknesses      TEXT    NOT NULL DEFAULT '[]',
    set_id          TEXT    NOT NULL,
    set_name        TEXT    NOT NULL,
    ptcgo_code      TEXT,
    number          TEXT    NOT NULL,
    rarity          TEXT,
    image_small     TEXT,
    image_large     TEXT,
    imported_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_catalog_name       ON card_catalog(name);
  CREATE INDEX IF NOT EXISTS idx_catalog_set_id     ON card_catalog(set_id);
  CREATE INDEX IF NOT EXISTS idx_catalog_number     ON card_catalog(number);
  -- Note: idx_catalog_ptcgo_code is created in runMigrations() after ensuring
  -- the ptcgo_code column exists (older DBs created card_catalog without it).

  INSERT OR IGNORE INTO schema_version (version) VALUES (1);
`;

export function initDb(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });

  const dbPath = path.join(config.dataDir, "pokemon.db");
  db = new DatabaseSync(dbPath);

  // Performance & integrity settings
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA synchronous = NORMAL");

  db.exec(SCHEMA_V1);
  runMigrations();

  console.log(`[db] Database ready at ${dbPath}`);
}

/**
 * Idempotent schema migrations for databases created by older versions.
 * Uses ADD COLUMN guarded by PRAGMA table_info so it is safe to re-run.
 */
function runMigrations(): void {
  const cols = db.prepare("PRAGMA table_info(scan_sessions)").all() as Array<{
    name: string;
  }>;

  if (!cols.some((c) => c.name === "candidates")) {
    db.exec(
      "ALTER TABLE scan_sessions ADD COLUMN candidates TEXT NOT NULL DEFAULT '[]'",
    );
    console.log("[db] Migrated: added scan_sessions.candidates");
  }

  const catalogCols = db
    .prepare("PRAGMA table_info(card_catalog)")
    .all() as Array<{ name: string }>;

  if (!catalogCols.some((c) => c.name === "ptcgo_code")) {
    db.exec("ALTER TABLE card_catalog ADD COLUMN ptcgo_code TEXT");
    console.log("[db] Migrated: added card_catalog.ptcgo_code");
  }

  // Idempotent: safe on both fresh DBs (column from CREATE TABLE) and older
  // DBs (column just added above). Kept out of SCHEMA_V1 so it never runs
  // against a pre-existing card_catalog that lacks the column.
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_catalog_ptcgo_code ON card_catalog(ptcgo_code)",
  );
}

export function getDb(): DatabaseSync {
  if (!db) throw new Error("Database not initialized. Call initDb() first.");
  return db;
}
