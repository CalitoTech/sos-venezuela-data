# SOS Venezuela — Datos de Desaparecidos

> Plataforma centralizada de búsqueda de personas desaparecidas tras el terremoto en Venezuela (2026).

Este proyecto agrega y normaliza datos de múltiples fuentes en línea que recopilan información de personas desaparecidas, para ofrecer una fuente única, limpia y consultable en tiempo real.

---

## El problema

Tras el sismo, la información sobre desaparecidos está dispersa en docenas de sitios web, redes sociales y formularios independientes. Las familias tienen que revisar cada fuente manualmente, muchas veces con datos duplicados, inconsistentes o desactualizados.

## La solución

Un scraper que consolida todas las fuentes conocidas en una base de datos unificada, expuesta a través de una interfaz web simple y filtrable.

---

## Fuentes de datos (en construcción)

| Fuente | URL | Estado |
|--------|-----|--------|
| — | — | por agregar |

> Si conoces alguna fuente con listados de desaparecidos, abre un issue o un PR agregándola a esta tabla y a `config/sources.yaml`.

---

## Estructura del proyecto

```
sos-venezuela-data/
├── db/
│   └── schema.sql          # Schema completo — importable directamente
├── config/
│   └── sources.yaml        # Lista de fuentes a scrapear
├── scrapers/               # Un scraper por fuente
│   └── base.py             # Clase base compartida
├── data/
│   └── processed/          # Datos limpios exportados (CSV/JSON)
├── api/                    # API REST (fase 2)
├── web/                    # Frontend de búsqueda (fase 2)
├── docker-compose.yml      # Levanta PostgreSQL en local
├── .env.example
└── requirements.txt
```

---

## Base de datos

Una sola tabla `missing_persons` — una fila = una persona real.

La deduplicación funciona así:
- Si hay **cédula** → es la clave única (constraint `UNIQUE` en `cedula`)
- Sin cédula → se usa `(full_name, date_of_birth)` como fallback

Los scrapers deben hacer `INSERT ... ON CONFLICT DO UPDATE` para actualizar registros existentes sin crear duplicados.

### Levantar la base de datos (requiere Docker)

```bash
docker compose up -d
```

Eso levanta PostgreSQL en `localhost:5432` y aplica `db/schema.sql` automáticamente.

```
Host:     localhost
Puerto:   5432
DB:       sos_venezuela
Usuario:  sos_user
Password: sos_pass
```

### Sin Docker (PostgreSQL nativo)

```bash
cp .env.example .env           # edita con tus credenciales
createdb sos_venezuela
psql -U sos_user -d sos_venezuela -f db/schema.sql
```

---

## API pública

La API REST permite reportar y consultar personas desaparecidas desde cualquier sistema externo.

Base URL (producción): `https://sos-venezuela.vercel.app/api`  
Base URL (local): `http://localhost:3000/api`

### `GET /api/persons`

Consulta registros con filtros opcionales.

| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `q` | string | Búsqueda por nombre o cédula |
| `status` | `missing` \| `found` | Filtrar por estado |
| `limit` | number | Máximo de resultados (default: 50, max: 200) |
| `offset` | number | Paginación |

```bash
curl "https://sos-venezuela.vercel.app/api/persons?q=garcia&status=missing"
```

### `POST /api/persons`

Registra una persona desaparecida. Si ya existe un registro con la misma cédula, lo actualiza.

**Campos:**

| Campo | Tipo | Requerido |
|-------|------|-----------|
| `full_name` | string | ✓ |
| `cedula` | string | — (clave de deduplicación) |
| `age` | number | — |
| `gender` | `male` \| `female` | — |
| `last_seen_location` | string | — |
| `last_seen_date` | string (YYYY-MM-DD) | — |
| `description` | string | — |
| `photo_url` | string | — |
| `contact_name` | string | — |
| `contact_phone` | string | — |
| `contact_email` | string | — |
| `source_urls` | string[] | — (URLs donde aparece el registro) |
| `reported_by_source` | string | — (nombre de tu sistema) |

```bash
curl -X POST "https://sos-venezuela.vercel.app/api/persons" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "María García",
    "cedula": "12345678",
    "age": 34,
    "last_seen_location": "Caracas, La California",
    "last_seen_date": "2026-06-24",
    "reported_by_source": "mi-sistema"
  }'
```

Responde con el registro creado o actualizado (`201`).

---

## Cómo contribuir

Este proyecto necesita ayuda urgente. Cualquier contribución cuenta.

### Formas de ayudar

- **Agregar fuentes**: conoces un sitio con listados de desaparecidos → abre un issue
- **Escribir scrapers**: implementar el scraper para una fuente nueva
- **Normalización**: mejorar la lógica de deduplicación por nombre/cédula
- **Frontend**: construir la interfaz de búsqueda
- **Devops**: automatizar la ejecución periódica de los scrapers

### Setup local

```bash
git clone https://github.com/CalitoTech/sos-venezuela-data.git
cd sos-venezuela-data

# Base de datos
docker compose up -d

# Python
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
```

### Flujo de trabajo

1. Crea un branch desde `main`: `git checkout -b feature/scraper-nombre-fuente`
2. Implementa tu cambio
3. Abre un Pull Request con descripción clara de qué fuente agrega o qué problema resuelve

---

## Stack tecnológico (propuesto)

- **Python** — scrapers (requests / httpx + BeautifulSoup / Playwright)
- **PostgreSQL 16** — almacenamiento (Docker)
- **FastAPI** — API REST (fase 2)
- **Next.js o HTML estático** — frontend (fase 2)

---

## Código de conducta

Este es un proyecto humanitario. Se espera respeto y colaboración en todas las interacciones. Cero tolerancia a desinformación intencional.

---

## Licencia

MIT — libre de usar, modificar y distribuir.

---

*Si tienes información sobre personas desaparecidas y quieres reportarla directamente, usa las líneas de emergencia oficiales de Venezuela.*
