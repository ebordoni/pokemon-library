# Changelog

## [0.1.13] - 2026-07-07

### Fixed

- Su Android il pulsante **Fotocamera** apriva la galleria invece della camera: sostituito l'approccio `<input capture="environment">` (comportamento inconsistente nei WebView Android) con un overlay fullscreen basato su `getUserMedia`. Il nuovo componente `CameraCapture` accede direttamente alla fotocamera posteriore (`facingMode: environment`), mostra un'anteprima live e permette di scattare la foto con un pulsante. Funziona in modo coerente su iOS e Android

## [0.1.12] - 2026-07-07

### Added

- Pagina "Aggiungi Carte": due pulsanti separati — **Fotocamera** (apre direttamente la camera) e **Libreria foto** (apre il selettore file/galleria del telefono). L'area drag-and-drop su desktop rimane funzionante

## [0.1.11] - 2026-07-07

### Fixed

- Identificazione errata della versione della carta: il numero restituito da Grok (es. `"085"`) non corrispondeva al formato del catalogo (`"85"`) perché gli zeri iniziali non venivano normalizzati. La funzione `searchCatalog` ora normalizza il numero prima di ogni confronto (rimuove zeri iniziali e la parte `/TOTALE`)
- Aggiunto HP come campo di disambiguazione: il prompt Grok ora richiede esplicitamente il valore HP e il fallback di ricerca usa HP per scegliere la versione corretta quando numero/set non bastano
- Prompt Grok migliorato: istruzione esplicita a restituire sempre nome e set in inglese (anche per carte in altre lingue) e a normalizzare il numero della carta

## [0.1.10] - 2026-07-07

### Fixed

- `dotenv` spostato da `devDependencies` a `dependencies`: il modulo viene caricato a runtime anche in produzione (il container HA installa solo le dipendenze di produzione), quindi deve essere presente nel bundle finale

## [0.1.9] - 2026-07-06

### Added

- Interfaccia completamente tradotta in italiano (navigazione, filtri, statistiche, dettaglio carta, upload)

### Fixed

- Pagina "Aggiungi Carte" bloccata senza box di upload dopo la scansione: il risultato finale viene ora salvato in `finalResult` prima del cambio di stage, evitando il reset asincrono di `useScanStatus`
- Intervallo di polling aumentato da 2 s a 5 s (retry su errore: 8 s) per ridurre le chiamate superflue durante l'elaborazione Grok

## [0.1.8] - 2026-07-06

### Fixed

- Updated Grok model from `grok-2-vision-latest` (no longer exists) to `grok-4.3` — the current xAI flagship model with vision support
- Improved Grok error logging: the full API error body is now captured and stored in `errorMessage` for easier debugging

## [0.1.7] - 2026-07-06

### Fixed

- API base URL changed to bare relative string `"api"` (no leading slash) so the browser resolves it relative to the document URL — works in both local dev and under any HA Ingress prefix without path-guessing
- Backend: added middleware to normalise double slashes in the request path (`//api/scan` → `/api/scan`) as a catch-all safety net

## [0.1.6] - 2026-07-06

### Fixed

- API base URL is now injected server-side from the `X-Ingress-Path` header that HA Supervisor provides (`window.__INGRESS_BASE__`), eliminating all double-slash and path-guessing issues in the HA Ingress iframe

## [0.1.5] - 2026-07-06

### Fixed

- Root cause of white page: API base URL now resolved from `document.baseURI` (reliable in HA Ingress iframe) instead of `window.location.pathname`
- Store: `cards` is now always an array (`data.data ?? []`) — prevents undefined crash if the API returns unexpected content
- `CardGrid`: added optional chaining (`cards?.length`) as additional safety net

## [0.1.4] - 2026-07-06

### Fixed

- White page on load: recharts (Stats page) is now lazy-loaded in a separate chunk, preventing initialisation errors in the HA Ingress iframe
- Removed `React.StrictMode` which caused recharts v3 double-mount crashes in production
- Main bundle reduced from 625 KB to 242 KB

## [0.1.3] - 2026-07-06

### Fixed

- API calls now use a path relative to `window.location.pathname` so they are correctly routed through HA Ingress instead of hitting the HA root API

## [0.1.2] - 2026-07-06

### Fixed

- White page under HA Ingress: Vite `base: './'` makes asset paths relative to the ingress prefix
- React Router switched to `HashRouter` so internal navigation works under any ingress path

## [0.1.1] - 2026-07-06

### Fixed

- Added `ingress_entry: /` so the **Open Web UI** button appears in the HA addon info page
- Added `ports` section so the direct-access port (8099) is configurable in the **Network** tab

## [0.1.0] - 2026-07-06

### Added

- Initial release of Pokémon Library addon
- **AI card identification** via Grok Vision (`grok-2-vision-latest`): upload a photo and the card is recognized automatically
- **Async scan queue**: scans are processed one at a time; queue position and status are reported in real time
- **Local card catalog**: 173+ English Pokémon TCG sets imported from `PokemonTCG/pokemon-tcg-data`; catalog auto-syncs on startup
- **Collection database** (SQLite with WAL mode): stores cards with name, type, energy, rarity, set, HP, attacks, quantity and duplicate flag
- **Duplicate detection**: re-scanning an already-owned card increments its quantity counter instead of creating a new entry
- **Catalog page** with search (name, set, number), filter chips (supertype, energy type, rarity, duplicates-only) and Load More pagination
- **Stats page**: total / unique / duplicate counters, supertype donut chart, energy-type bar chart, rarity bar chart, top-10 sets progress bars
- **Card detail page**: full card info, ±1 quantity control, delete button
- **Upload page**: drag-and-drop or camera capture (`capture="environment"` for mobile), real-time poll of scan status
- **Mobile-first UI**: bottom navigation (Collection · Scan · Stats), Tailwind CSS, responsive card grid
- **Home Assistant Ingress** on port 8099; no port mapping required
- **API key guard**: returns HTTP 503 with a user-friendly message when Grok API key is not configured
- **Italian UI translation** (`translations/it.yaml`)
- `grok_api_key` stored as `password` type (masked in HA UI)
