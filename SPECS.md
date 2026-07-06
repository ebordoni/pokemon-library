# Pokemon Library — Specifiche Applicative

> Documento di specifiche v0.1 — 2026-07-06

---

## 1. Obiettivo

Realizzare un **Home Assistant Addon** che esponga una web app React per la gestione e il
catalogazione di una collezione di carte Pokémon. L'utente fotografa le proprie carte, il
sistema le identifica automaticamente tramite LLM, scarica immagini e dati ufficiali, e
costruisce un catalogo personale navigabile.

---

## 2. Perimetro Funzionale

### 2.1 Funzionalità Core (MVP)

| ID  | Funzionalità                | Descrizione                                                                                                                                                                               |
| --- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F01 | **Upload scansione**        | L'utente carica una foto (JPEG/PNG/WEBP) contenente fino a 4 carte Pokémon.                                                                                                               |
| F02 | **Identificazione AI**      | La foto viene inviata all'API Grok (xAI) con un prompt strutturato; il modello restituisce per ogni carta: nome, numero di serie, espansione, rarità.                                     |
| F03 | **Recupero dati ufficiali** | Per ogni carta identificata l'app interroga la **PokéTCG API** (pokemontcg.io) e scarica immagine HD, tipo, HP, energia, attacchi, debolezze, rarità, valore di mercato (se disponibile). |
| F04 | **Persistenza**             | Carta + metadati vengono salvati in un database SQLite locale. Le foto di scansione non vengono salvate.                                                                                  |
| F05 | **Catalogo**                | Vista griglia/lista della collezione con ricerca full-text e filtri.                                                                                                                      |
| F06 | **Tagging automatico**      | Ogni carta viene etichettata automaticamente con: tipo Pokémon, tipo energia, categoria (Base / Allenatore / Energia / Pokémon EX/GX/V/VMAX/VSTAR), espansione, rarità.                   |
| F07 | **Rilevamento duplicati**   | All'inserimento il sistema controlla se la carta (stesso ID PokéTCG) è già presente e la marca come duplicato con conteggio copie.                                                        |

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
Backend ──► xAI Grok API          (identificazione carte da immagine)
        ──► PokéTCG API v2        (dati e immagini ufficiali)
        ──► (futuro) TCGPlayer API (prezzi)
```

---

## 4. Stack Tecnologico

### Frontend

| Componente       | Tecnologia                   |
| ---------------- | ---------------------------- |
| Framework        | **React 18** + TypeScript    |
| Build tool       | **Vite**                     |
| UI Library       | **shadcn/ui** + Tailwind CSS |
| State management | **Zustand**                  |
| Routing          | **React Router v6**          |
| HTTP client      | **Axios** / Fetch API        |
| Upload immagini  | **react-dropzone**           |

### Backend

| Componente      | Tecnologia                                     |
| --------------- | ---------------------------------------------- |
| Runtime         | **Node.js 20**                                 |
| Framework       | **Express 5**                                  |
| ORM             | **better-sqlite3** (sync, ideale per addon HA) |
| Migrazioni DB   | **db-migrate**                                 |
| Validazione     | **Zod**                                        |
| Upload handling | **Multer**                                     |
| HTTP client     | **node-fetch** / **axios**                     |

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
│
├── addon/                          # Configurazione Home Assistant Addon
│   ├── config.yaml                 # Manifest addon HA
│   ├── build.yaml                  # Build config multi-arch
│   └── translations/
│       └── en.yaml
│
├── backend/                        # Node.js API Server
│   ├── Dockerfile
│   ├── package.json
│   ├── src/
│   │   ├── index.ts                # Entry point Express
│   │   ├── db/
│   │   │   ├── schema.ts           # Definizioni tabelle SQLite
│   │   │   └── migrations/
│   │   ├── routes/
│   │   │   ├── cards.ts            # CRUD carte
│   │   │   ├── scan.ts             # Upload + identificazione AI
│   │   │   └── stats.ts            # Statistiche collezione
│   │   ├── services/
│   │   │   ├── grok.service.ts     # Integrazione xAI Grok API
│   │   │   ├── pokemontcg.service.ts # Integrazione PokéTCG API
│   │   │   └── duplicate.service.ts  # Rilevamento duplicati
│   │   └── types/
│   │       └── index.ts
│   └── tsconfig.json
│
├── frontend/                       # React App
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.ts
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── pages/
│   │   │   ├── Catalog.tsx         # Pagina principale catalogo
│   │   │   ├── Upload.tsx          # Pagina upload scansione
│   │   │   ├── CardDetail.tsx      # Dettaglio singola carta
│   │   │   └── Stats.tsx           # Statistiche (post-MVP)
│   │   ├── components/
│   │   │   ├── CardGrid.tsx        # Griglia carte
│   │   │   ├── CardTile.tsx        # Tile singola carta
│   │   │   ├── FilterPanel.tsx     # Pannello filtri/tag
│   │   │   ├── UploadZone.tsx      # Drop zone upload
│   │   │   ├── ScanResult.tsx      # Preview risultato scansione
│   │   │   └── DuplicateBadge.tsx  # Badge duplicato
│   │   ├── store/
│   │   │   └── useCollectionStore.ts
│   │   ├── api/
│   │   │   └── client.ts
│   │   └── types/
│   │       └── index.ts
│   └── tsconfig.json
│
└── docker-compose.yml              # Dev locale
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
      - Cerca su PokéTCG API: GET /v2/cards?q=name:{name} number:{number} set.name:{set}
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
description: "Catalogo personale carte Pokémon con identificazione AI"
version: "0.1.0"
slug: "pokemon_library"
init: false
arch:
  - aarch64
  - amd64
ingress: true
ingress_port: 8099
panel_icon: "mdi:cards"
panel_title: "Pokemon Library"
options:
  grok_api_key: ""
  pokemontcg_api_key: ""
schema:
  grok_api_key: str
  pokemontcg_api_key: str
map:
  - data:rw
```

---

## 9. API Backend (Endpoints)

| Metodo   | Path                      | Descrizione                          |
| -------- | ------------------------- | ------------------------------------ |
| `POST`   | `/api/scan`               | Upload foto + identificazione AI     |
| `GET`    | `/api/cards`              | Lista carte (con filtri/paginazione) |
| `GET`    | `/api/cards/:id`          | Dettaglio singola carta              |
| `DELETE` | `/api/cards/:id`          | Rimuovi carta dalla collezione       |
| `PATCH`  | `/api/cards/:id/quantity` | Aggiorna quantità manualmente        |
| `GET`    | `/api/stats`              | Statistiche collezione               |
| `GET`    | `/api/health`             | Health check                         |

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

- Le API key (Grok, PokéTCG) sono gestite esclusivamente come **opzioni addon HA**, mai esposte al frontend.
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

| Servizio          | URL                          | Note                                                          |
| ----------------- | ---------------------------- | ------------------------------------------------------------- |
| xAI Grok API      | https://api.x.ai/v1          | API key richiesta — modello `grok-2-vision-latest`            |
| PokéTCG API v2    | https://api.pokemontcg.io/v2 | Gratuita (rate limit), API key opzionale per limiti aumentati |
| Docker Hub / GHCR | ghcr.io                      | Registry per le immagini Docker del addon                     |

---

_Fine documento — aggiornare a ogni iterazione di sprint._
