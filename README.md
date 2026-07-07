<div align="center">

# 🃏 Pokémon Library

**Home Assistant Addon** per catalogare la tua collezione di carte Pokémon TCG con identificazione automatica tramite AI.

[![Version](https://img.shields.io/badge/version-0.1.13-blue)](addon/CHANGELOG.md)
[![Platform](https://img.shields.io/badge/platform-Home%20Assistant-41BDF5)](https://www.home-assistant.io/)
[![Architecture](https://img.shields.io/badge/arch-amd64%20%7C%20aarch64-lightgrey)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#)

</div>

---

## ✨ Funzionalità

### 📷 Scansione con AI
- Scatta una foto con la **fotocamera del telefono** direttamente dall'app (overlay nativo con `getUserMedia`, funziona su iOS e Android)
- In alternativa, seleziona un'immagine dalla **libreria foto** del dispositivo
- Su desktop, supporta il **drag & drop**
- L'immagine viene analizzata da **Grok Vision AI** (xAI), che identifica automaticamente fino a 4 carte per foto
- Le carte identificate vengono cercate nel catalogo locale (~20.000 carte inglesi) e aggiunte alla collezione

### 📚 Collezione
- Visualizza tutte le carte catalogate in una **griglia con immagini**
- **Ricerca** per nome, set o numero di carta
- **Filtri** per categoria (Pokémon, Trainer, Energy), tipo di energia, duplicati
- Gestione delle **quantità**: incrementa o decrementa le copie; rimuovendo l'ultima copia la carta viene eliminata
- Indicatore visivo dei **duplicati** (più copie della stessa carta)
- Paginazione con **caricamento progressivo**

### 🔍 Dettaglio carta
- Immagine ad alta risoluzione dalla carta
- Dati completi: set, numero, rarità, HP, tipo, evoluzione
- Elenco degli **attacchi** con costo energetico e danno
- Controllo quantità direttamente dalla scheda

### 📊 Statistiche
- Conteggio totale, carte uniche e duplicati
- Grafici per **categoria** (Pokémon/Trainer/Energy), **tipo di energia** e **rarità**
- Classifica dei **set più frequenti** nella collezione

### 🗂️ Catalogo locale
- Al primo avvio il catalogo (~20.000 carte EN) viene scaricato da [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) e salvato in SQLite
- Nessuna dipendenza da API esterne a runtime (solo Grok per la visione)
- Banner di avanzamento durante il seeding iniziale

---

## 🚀 Installazione

### Prerequisiti
- Home Assistant con **Supervisor** (Home Assistant OS o Supervised)
- Chiave API **xAI / Grok** ([ottienila qui](https://console.x.ai/))

### Aggiungere il repository

1. Vai su **Impostazioni → Add-on Store**
2. Clicca sul menu (⋮) in alto a destra → **Repository**
3. Aggiungi:
   ```
   https://github.com/ebordoni/pokemon-library
   ```
4. Cerca **Pokemon Library** e clicca **Installa**

### Configurazione

Dopo l'installazione, vai alla tab **Configurazione** dell'addon e inserisci la tua chiave Grok:

```yaml
grok_api_key: "xai-xxxxxxxxxxxxxxxxxxxx"
```

Avvia l'addon e aprilo dalla barra laterale di Home Assistant.

> **Nota:** al primo avvio il download del catalogo carte richiede 2–5 minuti. Un banner giallo nella UI indica che il seeding è in corso.

---

## 🛠️ Sviluppo locale

### Requisiti
- Node.js 18+
- File `.env` nella root del progetto

```env
# .env
GROK_API_KEY=xai-xxxxxxxxxxxxxxxxxxxx
```

### Avvio

```bash
# Terminale 1 — Backend (porta 3001)
cd addon/backend
npm install
npm run dev

# Terminale 2 — Frontend (porta 5173, proxy → 3001)
cd addon/frontend
npm install
npm run dev
```

Apri `http://localhost:5173` nel browser.

### Build produzione

```bash
cd addon/backend && npm run build
cd addon/frontend && npm run build
```

---

## 🏗️ Architettura

```
pokemon-library/
├── repository.json           # Manifest repository HA
└── addon/
    ├── config.yaml           # Configurazione addon HA
    ├── Dockerfile            # Multi-stage build (frontend + backend)
    ├── build.yaml            # Target architetture
    ├── icon.png              # Icona pannello HA
    ├── CHANGELOG.md
    ├── backend/              # Express + TypeScript + SQLite
    │   └── src/
    │       ├── index.ts      # Entry point, middleware, SPA fallback
    │       ├── config.ts     # Configurazione (env / options.json)
    │       ├── db/           # Schema SQLite, helper row→Card
    │       ├── routes/       # cards, scan, stats, catalog
    │       ├── services/     # grok, catalog, pokemontcg, duplicate
    │       └── queue/        # Coda FIFO per le scansioni
    └── frontend/             # React + Vite + Tailwind CSS
        └── src/
            ├── App.tsx       # HashRouter + lazy loading
            ├── pages/        # Catalog, Upload, Stats, CardDetail
            ├── components/   # CardTile, CardGrid, FilterDrawer, CameraCapture, …
            ├── hooks/        # useScanStatus (polling)
            ├── store/        # Zustand (useCollectionStore)
            └── api/          # Axios client
```

### Stack tecnico

| Layer | Tecnologia |
|---|---|
| Frontend | React 18, Vite 5, Tailwind CSS 3, React Router 6 (HashRouter), Zustand 4, Recharts 3 |
| Backend | Node.js 24, Express 4, TypeScript 5, node:sqlite (built-in) |
| AI | Grok Vision API (`grok-4.3`) — xAI |
| Dati | [pokemon-tcg-data](https://github.com/PokemonTCG/pokemon-tcg-data) (GitHub, ~20k carte EN) |
| Container | Docker multi-stage, Alpine Linux |
| Deploy | Home Assistant Addon con Ingress |

---

## 🔄 Flusso di scansione

```
Foto  →  Grok Vision  →  JSON [{ name, set, number, hp }]
                                       ↓
                          searchCatalog (5 livelli di fallback)
                          1. nome + set + numero
                          2. nome + numero
                          3. nome + set
                          4. nome + HP
                          5. nome solo
                                       ↓
                          upsertCard → SQLite collection
```

---

## 📋 Changelog

Vedi [CHANGELOG.md](addon/CHANGELOG.md) per la cronologia completa delle versioni.

---

## 📄 Licenza

MIT — [ebordoni](https://github.com/ebordoni)
