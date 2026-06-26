# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Centralized registry of missing persons after the 2026 Venezuela earthquake. Scrapers pull data from multiple sources into a single deduplicated Postgres table. A Next.js frontend lets anyone search, report, and update records. A public REST API lets external systems (other sites, bots, scrapers) submit records.

## Repo structure

```
/                        Python scraper layer
  scrapers/base.py       BaseScraper + MissingPerson dataclass
  config/sources.yaml    Source catalog for scrapers
  requirements.txt       Python deps (httpx, bs4, playwright, pyyaml)
  db/schema.sql          Full Postgres schema — importable standalone

web/                     Next.js 16 app (App Router)
  app/                   Routes: / | /agregar | /persona/[id] | /api/persons
  components/            PersonCard, StatusBadge, SearchBar, PhotoUpload, PhotoZoom
  lib/db.ts              pg Pool singleton + MissingPerson type
  lib/actions.ts         Server Actions (search, create, update status)
```

## Local development

**Database** (must be running before starting the web app):
```bash
docker compose up -d        # starts postgres on localhost:5432, auto-applies schema
docker compose down         # stop (data persists in postgres_data volume)
```

**Web app:**
```bash
cd web
npm run dev                 # http://localhost:3000
npm run build               # production build
npm run lint                # eslint
```

**Python scrapers:**
```bash
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Environment variables

`web/.env.local` (already created, not in git):
```
DATABASE_URL=postgresql://sos_user:sos_pass@localhost:5432/sos_venezuela
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dgxxlp1vy
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=sos_venezuela
```

See `.env.example` for the template collaborators should copy.

## Database schema

Three tables:
- `missing_persons` — **one row = one real person**. Primary dedup key: `cedula` (UNIQUE). Fallback: `UNIQUE(full_name, date_of_birth)` where cedula IS NULL.
- `sources` — catalog of data sources (scrapers register here by name).
- `person_sources` — N:M link. `UNIQUE(source_id, source_record_id)` is the scraper's upsert key.

Status values: `missing` | `found`. Gender: `male` | `female`.

`pg_trgm` extension is enabled for fuzzy name search (`full_name % $query`).

## Public API

`POST /api/persons` — upsert a person. All fields optional except `full_name`. Pass `source_name` + `source_record_id` for scraper traceability (enables idempotent re-scraping). The endpoint runs a 3-step transaction: upsert person → upsert source → upsert person_sources link.

`GET /api/persons?q=&status=&limit=&offset=` — paginated search. Max limit: 200.

Full CORS enabled on both endpoints.

## Adding a scraper

1. Create `scrapers/<source_name>.py` extending `BaseScraper` from `scrapers/base.py`.
2. Add the source to `config/sources.yaml`.
3. Post results to `POST /api/persons` with `source_name`, `source_record_id`, and `source_record_url` — this is what enables dedup on subsequent scrape runs.

## Key architectural decisions

- **No ORM** — raw `pg` queries via a singleton Pool. All DB calls go through `lib/actions.ts` (server-side) or `app/api/persons/route.ts` (public API).
- **Photo uploads** go browser → Cloudinary directly (unsigned preset `sos_venezuela`). The app only stores the resulting URL. No file storage in Vercel/server.
- **`createPerson` Server Action** does NOT redirect — the client page (`/agregar`) handles navigation after calling it, because the form is a Client Component (needed for `PhotoUpload`).
- All pages use `export const dynamic = "force-dynamic"` — no static caching, data is always fresh.
- CSS is entirely inline styles + CSS variables defined in `globals.css`. No Tailwind utility classes in component files (Tailwind is present but only used for the `animate-fade-in-up` class on cards).
