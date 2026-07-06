# Changelog

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
