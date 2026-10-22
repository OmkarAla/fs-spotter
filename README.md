# fs-spotter — Weather-aware truck routing

**Weather-Aware Truck Routing** — a web app that helps a truck driver choose the safest route
based on weather, load weight, and travel time. Enter an origin, a destination, a departure
time, and a load weight; get up to three real, truck-legal routes with weather evaluated at
every checkpoint *using the time the truck would actually arrive there*, scored against
No-Travel rules, and ranked by a safety-first recommendation.

- **Live app:** https://fs-spotter.onrender.com
- **API base (Render):** https://fs-spotter-api.onrender.com (health:
  `/api/v1/routes/health/`)

## What it does

| Need | How it is served |
|---|---|
| Route options | Up to **three distinct strategies** from OpenRouteService's truck profiler (`driving-hgv`): `fastest`, `shortest`, `avoid-highways`, with toll/ferry fallbacks. No fabricated alternatives. |
| Weather along the corridor | Checkpoints sampled at adaptive spacing (coarse 50 mi, refined toward 25/10 mi near elevated risk) via **Open-Meteo**, batched and deduplicated. |
| Risk engine | Exact brief thresholds — wind/rain/snow tables — plus load overrides (`≥55 mph` → No Travel for any load; heavy-load rules at 35–44/45–54 mph). |
| Recommendation | Fewest `No Travel` miles → fewest Severe → fewest High → lowest average risk → shortest time. |
| Map | MapTiler `streets-v4-dark` basemap, risk-colored corridor bands, checkpoint popups (weather values + ETA at the checkpoint), origin/destination markers, all-route toggle. |
| 0–48 h forecast | Forecast-offset slider recomputes corridor weather at `+0h..+48h` with a gradient heat layer that moves as time shifts. |
| Units | Default by origin country (USA → imperial, otherwise metric), with a manual toggle; weights convert on the fly. |
| Time-of-departure | Calendar + 15-minute clock in the **origin's** timezone, capped at +14 days (the provider forecast horizon). |

## Architecture

```
Browser (React 19 + Vite + TS + Zustand + Leaflet)
   │  https
   ▼
Django REST API (Gunicorn on Render)
   ├── POST /api/v1/routes/            → job trigger, Celery dispatch
   ├── GET  /api/v1/routes/{id}/       → job/result polling
   ├── GET  /api/v1/routes/{id}/forecast/?hour=0..48
   └── GET  /api/v1/geocode/?q=…       → ORS Pelias autocomplete proxy
   │
   ├── Routing provider: ORS (OpenRouteService, driving-hgv, multi-strategy)
   ├── Weather provider: Open-Meteo (batched, mph/inch units)
   └── Geocoder: ORS Pelias (proxied so the key never leaves the server)
   │
   ▼
Celery pipeline: compute in memory → one atomic transaction → idempotent persistence
   (production runs **eager mode inline** so no worker service is needed)
   ▼
Postgres (Render) — RouteJob / RouteOption / RouteCheckpoint
```

Key backend pieces:

- `backend/routing/providers/` — provider gateway (routing / geocoding / weather) with typed
  `ProviderError` classes (rate-limited, not-configured, provider-down) mapped into controlled
  API responses instead of raw 500s.
- `backend/routing/engine.py` — pure-function risk engine implementing the brief's threshold
  tables and load overrides.
- `backend/routing/tasks.py` — `process_route_job`: compute-then-persist, atomic, idempotent
  re-runs; provider failures mark the job `FAILED` with a user-safe message.

Key frontend pieces (`frontend/src/`): typed API client, Zustand store,
`useRoutePolling` (3 s interval, transient-error budget, cancellation-safe), `MapContainer`,
`LocationCombobox` (debounced global autocomplete, ARIA), `DeparturePicker` (origin-timezone),
unit-aware route cards, forecast slider.

## Deployment

The repository ships a single-file Render Blueprint (`render.yaml`):

- `fs-spotter-api` — Django + Gunicorn; migrations on start; health check
  `/api/v1/routes/health/`; Celery runs **eager** (`CELERY_TASK_ALWAYS_EAGER=1`) inside the
  web service because Render's free plan has no worker service.
- `fs-spotter` — the static Vite build; `VITE_API_URL` pinned to the API URL at build time.
- `fs-spotter-db` — Postgres (Plan free).
- Secrets are set in the Render dashboard only:
  - `ORS_API_KEY` on the API service (server-side only),
  - `VITE_MAPTILER_KEY` on the static site (browser-visible by nature — restrict it to
    `fs-spotter.onrender.com` and `localhost` in the MapTiler console).

The app cache is local-memory and the task pipeline runs inline, so no Redis/Key-Value
service is required.

## Local development

```bash
# backend (Python 3.11+, Django 5.2)
cd backend
pip install -r requirements.txt
cp .env.example .env            # then set the values you need

# run the full pipeline without any broker:
CELERY_TASK_ALWAYS_EAGER=1 python manage.py runserver 8000

# frontend
cd frontend
npm ci
npm run dev                     # dev proxy /api → http://localhost:8000
```

Live providers need `ORS_API_KEY` in `backend/.env`. For a completely offline run, switch the
providers to deterministic mocks in the same file:

```
ROUTING_PROVIDER=mock
WEATHER_PROVIDER=mock
```

Endpoint base URLs (`ORS_BASE_URL` defaults to `https://api.heigit.org`) and the provider HTTP
timeout are also configurable via environment — see `.env.example`.

## Tests

```bash
cd backend  && python manage.py test routing          # 76 tests
cd frontend && npm run test                           # 82 tests
cd frontend && npx tsc --noEmit && npm run build      # typecheck + production build
```

Test suites never call live APIs — mock providers keep them deterministic.

## Known limitations

- **New York → Los Angeles**: ORS's `driving-hgv` service cannot currently complete ~4,500 km
  lanes on available service tiers (it times out provider-side). The app surfaces this as a
  clean `FAILED` job with a user-safe message.
- ORS migrated off `api.openrouteservice.org` (deprecated 2026; retired host now serves only
  ~10 % of plan quota and is shutting down in Nov 2026). This app already targets the current
  host, `https://api.heigit.org`.
- ETAs are normal HGV estimates — the routing provider has no live traffic data.
- Long trips may return fewer than three distinct strategies; the UI shows only real options.
- Open-Meteo forecast horizon caps departures at +14 days.

## Data model & API contract (summary)

- `RouteJob` — status machine (`PENDING → PROCESSING → COMPLETED | FAILED`), nested
  origin/destination with coordinates, country and IANA timezone, departure time, load and
  unit system.
- `RouteOption` — route label, polyline (Google-encoded), distance/time, per-route risk
  breakdown (`severe`, `high`, `dangerous` miles), total risk score, recommended flag.
- `RouteCheckpoint` — per-route FK, mile marker, checkpoint geometry, ETA in the origin's
  timezone, weather data, risk level.
