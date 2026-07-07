# Changelog

## [0.2.6] - 2026-07-07

### Added

- **Gestione catalogo carte** (pagina _Statistiche_): nuova sezione che mostra numero di carte, set e data dell'ultimo aggiornamento, con due azioni:
  - **Aggiorna catalogo**: riscarica il dataset da PokemonTCG in background
  - **Svuota catalogo**: elimina il catalogo locale scaricato (con conferma). Non tocca la collezione dell'utente
- **Endpoint `POST /api/catalog/clear`**: svuota la tabella `card_catalog` (rifiuta l'operazione durante un seeding in corso)

### Note

- I pulsanti sono nell'app (Ingress) e non nella Configurazione dell'addon: il pannello Configurazione di Home Assistant supporta solo campi di form derivati dallo schema, non pulsanti d'azione

## [0.2.5] - 2026-07-07

### Added

- **Inserimento manuale di una carta (senza scansione)**: nella pagina _Aggiungi Carte_ è ora disponibile un form "Inserimento manuale" dove digitare il codice del set stampato sulla carta e il numero (es. `TWM` + `126/167`). La carta viene cercata direttamente nel catalogo locale (nessuna AI, nessuna chiamata di rete), mostrata in anteprima con avviso "già in collezione ×N", e aggiunta con un clic (con gestione doppioni)
- **Endpoint `GET /api/catalog/lookup?set=&number=`**: anteprima di una carta del catalogo per codice set + numero
- **Endpoint `POST /api/cards/manual`**: aggiunge alla collezione una carta risolta per codice set + numero

### Changed

- **Catalogo**: memorizzato il codice stampato del set (`ptcgoCode`, es. `TWM`) nella tabella `card_catalog` (nuova colonna `ptcgo_code` con migrazione automatica). Per i cataloghi già esistenti il codice viene ripopolato all'avvio con una singola richiesta leggera dell'indice dei set — senza re-seed completo

## [0.2.4] - 2026-07-07

### Fixed

- **Porta di accesso diretto non configurabile**: la porta `8099/tcp` era mappata a `null`, quindi Home Assistant la considerava "disattivata" e la nascondeva nella card _Rete_ (visibile solo attivando l'interruttore _"Mostra porte disattivate"_). Ora ha un valore predefinito (`8099`), così il campo appare direttamente ed è modificabile, e l'accesso diretto fuori dall'Ingress è abilitato di default

## [0.2.3] - 2026-07-07

### Added

- **Filtro per rarità nella libreria**: il pannello filtri della collezione ora include una sezione _Rarità_ popolata dinamicamente dalle rarità effettivamente presenti in collezione (via `/api/stats`). Il filtro selezionato viene mostrato tra i chip dei filtri attivi nel catalogo ed è combinabile con categoria, tipo energia e "solo duplicati"

## [0.2.2] - 2026-07-07

### Fixed

- **Build frontend fallita (v0.2.1)**: corretto `api/client.ts`, dove il metodo `getScanStatus` e il nuovo `confirmScan` erano stati mescolati generando errori di sintassi (`TS1005`/`TS1109`/`TS1160`) durante `tsc && vite build`

## [0.2.1] - 2026-07-07

### Fixed

- **Build fallita (v0.2.0)**: ripristinati due import rimossi accidentalmente da un organize-imports in `routes/scan.ts` (`z` da `zod` e `upsertCard`), che facevano fallire `tsc` in fase di build Docker (`TS2304`)

## [0.2.0] - 2026-07-07

### Added

- **Revisione dei risultati di scansione**: dopo l'identificazione AI, l'app mostra una schermata di revisione dove confermare o rifiutare ogni carta singolarmente prima di salvarla. Per le carte già presenti in collezione viene mostrato un avviso _"Già in collezione ×N"_ con la scelta tra _+1 doppione_ o _Scarta_ (default: scarta, per evitare doppioni accidentali). Le letture non risolte a catalogo sono elencate come informative (non aggiungibili). Al termine viene mostrato un riepilogo (nuove / doppioni / scartate)
- **Endpoint `POST /api/scan/:id/confirm`**: applica le decisioni per candidato (`add`/`skip`) e committa in collezione solo le carte confermate

### Changed

- **Le carte scansionate non vengono più salvate automaticamente**: la coda di scansione ora produce dei _candidati_ (con match a catalogo, stato "già in collezione" e quantità attuale) e li salva sulla sessione; l'inserimento in collezione avviene solo dopo la conferma dell'utente
- **Schema DB**: aggiunta colonna `scan_sessions.candidates` (JSON) con migrazione automatica `ALTER TABLE` per i database esistenti; nuovo stato sessione `applied`

## [0.1.18] - 2026-07-07

### Fixed

- **Ricerca per numero con zeri iniziali**: cercando "054" nella collezione non veniva trovata la carta "54". Il confronto sul numero ora ignora gli zeri iniziali ed è case-insensitive (`LOWER(LTRIM(number, '0'))`), così "054"→"54" e "tg05"→"TG05" combaciano

### Changed

- **Accesso diretto opzionale (porta 8099)**: ripristinata la sezione `ports` in `config.yaml`. Mappando la porta dalla tab **Network** dell'addon, la UI è raggiungibile direttamente (fuori dall'iframe Ingress di HA), evitando i blocchi di scroll che l'iframe può causare su mobile. Nota: l'accesso diretto è sulla LAN senza autenticazione — abilitare solo su reti fidate

## [0.1.17] - 2026-07-07

### Added

- **Tema chiaro/scuro**: nuovo interruttore per passare tra tema chiaro e scuro, presente nell'intestazione di tutte le pagine (Collezione, Aggiungi Carte, Statistiche, Dettaglio carta). La scelta viene salvata in `localStorage` e riapplicata all'avvio (senza flash grazie a uno script inline in `index.html`). Tutte le superfici, testi, bordi e stati hover sono stati adattati al tema scuro tramite le varianti `dark:` di Tailwind (`darkMode: "class"`)

## [0.1.16] - 2026-07-07

### Changed

- **Aggiornamento `multer` 1.4.5-lts → 2.0.1**: la 1.x era deprecata e con vulnerabilità note. L'API usata (`memoryStorage`, `single`, `fileFilter`) è invariata. `package-lock.json` rigenerato di conseguenza

## [0.1.15] - 2026-07-07

### Fixed

- **Identificazione carte con numeri speciali**: `searchCatalog` confrontava il numero con un semplice `= number` in SQL, fallendo per prints speciali come `TG05`, `GG01`, `SWSH001`, `H1`. Ora tutti i candidati per un nome vengono caricati una volta e confrontati in JS su un numero in forma canonica (prefisso lettera in minuscolo, zeri iniziali rimossi in ogni gruppo di cifre), così `085`↔`85`, `TG05`↔`tg5`, `SWSH001`↔`swsh1` combaciano

### Added

- **Conteggio copie nel catalogo**: l'endpoint `GET /api/cards` restituisce ora anche `totalQuantity` (somma delle copie) oltre a `total` (carte uniche). L'intestazione della collezione mostra "N carte · M copie" quando sono presenti duplicati

### Changed

- **Documentazione**: `SPECS.md` allineato all'implementazione reale — catalogo locale offline (dataset GitHub) invece della PokéTCG API a runtime, stack corretto (`node:sqlite`, Express 4, Node 24, Tailwind senza shadcn/ui), struttura repository sotto `addon/`, `config.yaml` senza `ports` e con la sola `grok_api_key`, modello Grok `grok-4.3`, endpoint completi

## [0.1.14] - 2026-07-07

### Fixed

- **Seeding del catalogo robusto**: `seedCatalog()` era protetto solo da `try/finally`; se la prima richiesta a GitHub falliva (assenza di rete, timeout o 429) l'eccezione diventava un _unhandled rejection_ che poteva terminare il processo al primo avvio. Aggiunto un blocco `catch` che logga l'errore e resetta lo stato di seeding
- **Sincronizzazione UI/DB sulla rimozione carte**: `removeCard` nello store rimuoveva sempre la carta dalla lista e decrementava il totale di 1, mentre il backend elimina la riga solo quando l'ultima copia viene rimossa. Ora lo store usa `remainingQuantity` restituito da `DELETE /api/cards/:id`: aggiorna la quantità se restano copie, rimuove la carta solo quando arriva a 0
- **Rotte API inesistenti**: una richiesta a un endpoint `/api/*` non gestito ricadeva nel fallback SPA restituendo `index.html` con stato 200. Ora restituisce un 404 JSON corretto
- **Versione nell'health check**: `/api/health` restituiva `0.1.0` hardcoded; ora legge la versione dinamicamente da `package.json`
- **Statistiche `topSets`**: la query usava `GROUP BY set_id` selezionando `set_name` (colonna non aggregata, non deterministica in SQL standard); ora raggruppa per `set_id, set_name`

### Changed

- **Sicurezza — accesso solo via Ingress**: rimossa la sezione `ports` (8099/tcp) da `config.yaml`. L'addon non è più esposto direttamente sulla rete locale: l'unico accesso è tramite l'Ingress di Home Assistant, in linea con le specifiche di sicurezza. Questo evita che la chiave Grok sia utilizzabile da chiunque sulla LAN
- **Ricerca con debounce**: la barra di ricerca del catalogo non invia più una richiesta a ogni tasto premuto; attende 350 ms di inattività
- **Tipo `ScanSession`**: aggiunto lo stato `processing` (usato dalla coda) al tipo del backend, allineandolo al frontend
- **Performance**: `index.html` viene letto una sola volta all'avvio invece che a ogni richiesta del fallback SPA

### Removed

- Rimossa la copia duplicata e obsoleta di `backend/` e del `Dockerfile` nella root del repository: non erano usati dal build (che punta ad `addon/`) e generavano confusione

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
