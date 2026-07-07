# Pokemon Library — Specifiche Applicative

> Documento di specifiche — allineato all'implementazione v0.1.15 (2026-07-07)

---

## 1. Obiettivo

Realizzare un **Home Assistant Addon** che esponga una web app React per la gestione e il
catalogazione di una collezione di carte Pokémon. L'utente fotografa le proprie carte, il
sistema le identifica automaticamente tramite LLM, scarica immagini e dati ufficiali, e
costruisce un catalogo personale navigabile.

---

## 2. Perimetro Funzionale

### 2.1 Funzionalità Core (MVP)

| ID  | Funzionalità                | Descrizione                                                                                                                                                                                                                                                                                         |
| --- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | **Upload scansione**        | L'utente carica una foto (JPEG/PNG/WEBP) contenente fino a 4 carte Pokémon.                                                                                                                                                                                                                         |
| F02 | **Identificazione AI**      | La foto viene inviata all'API Grok (xAI) con un prompt strutturato; il modello restituisce per ogni carta: nome, numero di serie, espansione, rarità.                                                                                                                                               |
| F03 | **Recupero dati ufficiali** | Per ogni carta identificata l'app cerca nel **catalogo locale** (tabella SQLite `card_catalog`) popolato al primo avvio dal dataset **PokemonTCG/pokemon-tcg-data** (GitHub, ~20k carte EN): immagine, tipo, HP, energia, attacchi, debolezze, rarità. Nessuna chiamata alla PokéTCG API a runtime. |
| F04 | **Persistenza**             | Carta + metadati vengono salvati in un database SQLite locale. Le foto di scansione non vengono salvate.                                                                                                                                                                                            |
| F05 | **Catalogo**                | Vista griglia/lista della collezione con ricerca full-text e filtri.                                                                                                                                                                                                                                |
| F06 | **Tagging automatico**      | Ogni carta viene etichettata automaticamente con: tipo Pokémon, tipo energia, categoria (Base / Allenatore / Energia / Pokémon EX/GX/V/VMAX/VSTAR), espansione, rarità.                                                                                                                             |
| F07 | **Rilevamento duplicati**   | All'inserimento il sistema controlla se la carta (stesso ID PokéTCG) è già presente e la marca come duplicato con conteggio copie.                                                                                                                                                                  |

### 2.2 Funzionalità Future (Post-MVP)

| ID  | Funzionalità                                                       |
| --- | ------------------------------------------------------------------ |
| F08 | Stima valore collezione (integrazione prezzi TCGPlayer/Cardmarket) |
| F09 | Export CSV/PDF del catalogo                                        |
| F10 | Liste desideri / wishlist                                          |
| F11 | Statistiche collezione (grafici per tipo, espansione, rarità)      |
| F12 | Modalità scambio (carte disponibili per trade)                     |
| F13 | Autenticazione multi-utente                                        |

---

## 3. Architettura

```
┌─────────────────────────────────────────────────────────┐
│                  Home Assistant Host                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Pokemon Library Addon (Docker)          │   │
│  │                                                  │   │
│  │  ┌────────────────┐    ┌──────────────────────┐  │   │
│  │  │  React Frontend │    │  Node.js/Express API │  │   │
│  │  │  (Vite build)  │◄──►│  (Backend Server)    │  │   │
│  │  │  Port 8099     │    │  Port 3001           │  │   │
│  │  └────────────────┘    └──────────┬───────────┘  │   │
│  │                                   │               │   │
│  │                        ┌──────────▼───────────┐  │   │
│  │                        │   SQLite Database    │  │   │
│  │                        │  /data/pokemon.db    │  │   │
│  │                        └──────────────────────┘  │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS / Ingress
                     ▼
              HA Ingress Panel
              (Sidebar HA)
```

### 3.1 Comunicazioni Esterne

```
Backend ──► xAI Grok API                       (identificazione carte da immagine — runtime)
        ──► GitHub PokemonTCG/pokemon-tcg-data  (catalogo ~20k carte EN — solo al primo avvio/seeding)
        ──► (futuro) TCGPlayer API              (prezzi)
```

---

## 4. Stack Tecnologico

### Frontend

| Componente       | Tecnologia                          |
| ---------------- | ----------------------------------- |
| Framework        | **React 18** + TypeScript           |
| Build tool       | **Vite 5**                          |
| UI               | **Tailwind CSS 3** (no shadcn/ui)   |
| State management | **Zustand 4**                       |
| Routing          | **React Router v6** (`HashRouter`)  |
| HTTP client      | **Axios**                           |
| Grafici          | **Recharts** (lazy-loaded)          |
| Upload immagini  | Drag & drop nativo + `getUserMedia` |

### Backend

| Componente        | Tecnologia                                   |
| ----------------- | -------------------------------------------- |
| Runtime           | **Node.js 24**                               |
| Framework         | **Express 4**                                |
| Database          | **`node:sqlite`** (`DatabaseSync`, built-in) |
| Schema/Migrazioni | Schema SQL inline con `schema_version`       |
| Validazione       | **Zod**                                      |
| Upload handling   | **Multer** (in-memory)                       |
| HTTP client       | **axios**                                    |

### Infrastruttura

| Componente     | Tecnologia                     |
| -------------- | ------------------------------ |
| Container      | **Docker** (Alpine base)       |
| HA Integration | **Supervisor Ingress**         |
| Storage        | `/data/` volume persistente HA |
| Config         | `config.yaml` HA Addon         |

---

## 5. Struttura Repository

```
pokemon-library/
├── README.md
├── SPECS.md
├── repository.json                 # Manifest repository HA
├── docker-compose.yml              # Dev locale (usa addon/backend + addon/frontend)
│
└── addon/                          # Home Assistant Addon (codebase attiva)
    ├── config.yaml                 # Manifest addon HA
    ├── build.yaml                  # Build config multi-arch
    ├── Dockerfile                  # Build multi-stage (frontend + backend)
    ├── icon.png
    ├── CHANGELOG.md
    ├── translations/               # en.yaml, it.yaml
    │
    ├── backend/                    # Node.js API Server (Express + TypeScript)
    │   ├── Dockerfile.dev
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       ├── index.ts            # Entry point Express, static SPA, bootstrap
    │       ├── config.ts           # Config da env / /data/options.json
    │       ├── db/
    │       │   ├── schema.ts        # Schema SQLite (cards, scan_sessions, card_catalog)
    │       │   └── helpers.ts       # row → Card / ScanSession
    │       ├── routes/
    │       │   ├── cards.ts         # CRUD carte + quantità
    │       │   ├── catalog.ts       # Stato/aggiornamento catalogo locale
    │       │   ├── scan.ts          # Upload + coda scansione
    │       │   └── stats.ts         # Statistiche collezione
    │       ├── services/
    │       │   ├── grok.service.ts       # Integrazione xAI Grok Vision
    │       │   ├── catalog.service.ts    # Seeding + searchCatalog (dataset GitHub)
    │       │   ├── pokemontcg.service.ts # Wrapper legacy → catalog.service
    │       │   └── duplicate.service.ts  # upsert / decrement duplicati
    │       ├── queue/
    │       │   └── scanQueue.ts      # Coda FIFO delle scansioni
    │       └── types/
    │           └── index.ts
    │
    └── frontend/                   # React App (Vite + Tailwind)
        ├── Dockerfile.dev
        ├── package.json
        ├── vite.config.ts
        ├── tailwind.config.js
        └── src/
            ├── main.tsx
            ├── App.tsx             # HashRouter + lazy loading
            ├── pages/              # Catalog, Upload, CardDetail, Stats
            ├── components/         # CardGrid, CardTile, FilterDrawer, CameraCapture, …
            ├── hooks/              # useScanStatus (polling)
            ├── store/              # useCollectionStore (Zustand)
            ├── api/                # client.ts (Axios)
            └── types/
                └── index.ts
```

---

## 6. Modello Dati

### Tabella `cards`

| Colonna           | Tipo     | Note                                       |
| ----------------- | -------- | ------------------------------------------ |
| `id`              | TEXT PK  | ID univoco PokéTCG (es. `base1-4`)         |
| `name`            | TEXT     | Nome carta (es. "Charizard")               |
| `supertype`       | TEXT     | `Pokémon` / `Trainer` / `Energy`           |
| `subtypes`        | TEXT     | JSON array (es. `["Stage 2","Rare Holo"]`) |
| `hp`              | INTEGER  | Punti vita (null per Trainer/Energy)       |
| `types`           | TEXT     | JSON array tipi energia (es. `["Fire"]`)   |
| `evolvesFrom`     | TEXT     | Nome stadio precedente                     |
| `attacks`         | TEXT     | JSON array attacchi                        |
| `weaknesses`      | TEXT     | JSON array debolezze                       |
| `set_id`          | TEXT     | ID espansione                              |
| `set_name`        | TEXT     | Nome espansione                            |
| `number`          | TEXT     | Numero carta nell'espansione               |
| `rarity`          | TEXT     | Common / Uncommon / Rare / ...             |
| `image_url`       | TEXT     | URL immagine HD (PokéTCG)                  |
| `image_url_hires` | TEXT     | URL immagine alta risoluzione              |
| `quantity`        | INTEGER  | Copie in possesso (≥1)                     |
| `is_duplicate`    | BOOLEAN  | true se quantity > 1                       |
| `added_at`        | DATETIME | Data primo inserimento                     |
| `updated_at`      | DATETIME | Data ultimo aggiornamento                  |

### Tabella `scan_sessions`

| Colonna            | Tipo                     | Note                              |
| ------------------ | ------------------------ | --------------------------------- |
| `id`               | INTEGER PK AUTOINCREMENT |                                   |
| `created_at`       | DATETIME                 |                                   |
| `card_count`       | INTEGER                  | Carte trovate nella scansione     |
| `identified_cards` | TEXT                     | JSON array ID carte identificate  |
| `status`           | TEXT                     | `pending` / `completed` / `error` |
| `error_message`    | TEXT                     | Eventuale errore AI               |

---

## 7. Flusso di Identificazione Carta (F01→F04)

```
1. Utente trascina/seleziona foto → UploadZone
2. Frontend invia POST /api/scan (multipart/form-data)
3. Backend:
   a. Riceve immagine con Multer (in-memory, non salvata su disco)
   b. Converte in base64
   c. Invia a Grok API con prompt strutturato:
      "Identify each Pokémon TCG card in this image.
       Return JSON array with: {name, set, number, language}"
   d. Parsa risposta JSON dal modello
   e. Per ogni carta identificata:
      - Cerca nel catalogo locale SQLite (`searchCatalog`): numero normalizzato + fallback su set / HP / solo nome
      - Seleziona il match migliore
      - Controlla duplicati in DB
      - Upsert su tabella cards (quantity++)
   f. Restituisce array risultati al frontend
4. Frontend mostra ScanResult con card preview e stato (nuova/duplicato)
```

---

## 8. Configurazione Home Assistant Addon

Il repository dovrà essere aggiunto come **repository di addon personalizzato** in HA
(`Impostazioni → Addon → Negozio add-on → ⋮ → Repository`).

### `addon/config.yaml` (schema)

```yaml
name: "Pokemon Library"
description: "Personal Pokémon TCG collection catalog with AI card identification"
version: "0.1.15"
slug: "pokemon_library"
init: false
arch:
  - aarch64
  - amd64
startup: services
boot: auto
ingress: true
ingress_port: 8099
ingress_entry: /
panel_icon: "mdi:cards"
panel_title: "Pokemon Library"
options:
  grok_api_key: ""
schema:
  grok_api_key: password
map:
  - data:rw

# Nota: nessuna sezione `ports` — l'addon è raggiungibile solo via Ingress HA.
# Nessuna pokemontcg_api_key: il catalogo è locale (dataset GitHub).
```

---

## 9. API Backend (Endpoints)

| Metodo   | Path                      | Descrizione                                               |
| -------- | ------------------------- | --------------------------------------------------------- |
| `POST`   | `/api/scan`               | Upload foto → accoda scansione (202, ritorna `sessionId`) |
| `GET`    | `/api/scan/:id`           | Polling stato scansione                                   |
| `GET`    | `/api/cards`              | Lista carte (con filtri/paginazione)                      |
| `GET`    | `/api/cards/:id`          | Dettaglio singola carta                                   |
| `DELETE` | `/api/cards/:id`          | Rimuovi una copia (elimina la riga quando arriva a 0)     |
| `PATCH`  | `/api/cards/:id/quantity` | Aggiorna quantità manualmente                             |
| `GET`    | `/api/stats`              | Statistiche collezione                                    |
| `GET`    | `/api/catalog`            | Stato catalogo locale (conteggio, seeding)                |
| `POST`   | `/api/catalog/update`     | Avvia re-seeding del catalogo in background               |
| `GET`    | `/api/health`             | Health check                                              |

### Parametri GET `/api/cards`

- `q` — ricerca full-text su nome
- `type` — filtro tipo energia
- `supertype` — Pokémon / Trainer / Energy
- `rarity` — filtro rarità
- `set` — filtro espansione
- `duplicates` — `true` per mostrare solo duplicati
- `page` / `limit` — paginazione

---

## 10. Considerazioni Sicurezza

- La API key Grok è gestita esclusivamente come **opzione addon HA**, mai esposta al frontend.
- Tutte le chiamate alle API esterne avvengono **solo nel backend**.
- I file immagine caricati dall'utente vengono processati **in memoria** e mai scritti su disco.
- Validazione input con **Zod** su tutti gli endpoint.
- Il backend accetta connessioni **solo da localhost/Ingress HA** (non esposto direttamente su rete).

---

## 11. Roadmap MVP

```
Sprint 1 — Infrastruttura
  ✦ Setup repository e struttura cartelle
  ✦ Dockerfile backend + frontend
  ✦ config.yaml addon HA
  ✦ Docker Compose per sviluppo locale
  ✦ Schema SQLite e migrazioni

Sprint 2 — Backend Core
  ✦ Express server + routing
  ✦ Integrazione PokéTCG API
  ✦ Integrazione Grok API (identificazione immagine)
  ✦ Endpoint /api/scan end-to-end
  ✦ CRUD /api/cards con logica duplicati

Sprint 3 — Frontend Core
  ✦ Setup React + Vite + Tailwind + shadcn/ui
  ✦ Pagina Upload con drop zone
  ✦ Pagina Catalogo con griglia
  ✦ Filtri e ricerca
  ✦ Badge duplicati

Sprint 4 — Integrazione & QA
  ✦ Test end-to-end flusso scan→catalog
  ✦ Build Docker multi-arch (amd64 + aarch64)
  ✦ Test installazione su HA reale
  ✦ Documentazione utente
```

---

## 12. Dipendenze Esterne

| Servizio                    | URL                                                           | Note                                                                              |
| --------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| xAI Grok API                | https://api.x.ai/v1                                           | API key richiesta — modello `grok-4.3` (vision). Solo a runtime per la scansione. |
| PokemonTCG/pokemon-tcg-data | https://raw.githubusercontent.com/PokemonTCG/pokemon-tcg-data | Dataset carte EN scaricato solo al primo avvio (seeding del catalogo locale).     |
| Docker Hub / GHCR           | ghcr.io                                                       | Registry per le immagini Docker dell'addon                                        |

---

_Fine documento — aggiornare a ogni iterazione di sprint._
