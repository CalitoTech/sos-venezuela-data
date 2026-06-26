-- =============================================================
-- SOS Venezuela — Schema de base de datos
-- Importar: psql -U sos_user -d sos_venezuela -f db/schema.sql
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- búsqueda fuzzy por nombre

-- -------------------------------------------------------------
-- Fuentes de datos
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sources (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(200) NOT NULL UNIQUE,
    url         TEXT NOT NULL,
    type        VARCHAR(20) NOT NULL DEFAULT 'html'
                    CHECK (type IN ('html', 'api', 'form', 'social', 'manual')),
    active      BOOLEAN NOT NULL DEFAULT true,
    notes       TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO sources (name, url, type, notes)
VALUES ('Manual', 'https://sos-venezuela.vercel.app/agregar', 'manual', 'Registros ingresados manualmente via formulario web')
ON CONFLICT (name) DO NOTHING;

-- -------------------------------------------------------------
-- Tabla principal: una fila = una persona real
--
-- Deduplicación:
--   1. Si hay cédula → UNIQUE en cedula (clave natural fuerte)
--   2. Sin cédula    → UNIQUE en (full_name, date_of_birth)
--      como fallback (puede colisionar en homónimos, aceptable)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS missing_persons (
    id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Identidad
    full_name           VARCHAR(500) NOT NULL,
    cedula              VARCHAR(20) UNIQUE,
    date_of_birth       DATE,
    age                 SMALLINT CHECK (age BETWEEN 0 AND 130),
    gender              VARCHAR(20) CHECK (gender IN ('male', 'female')),
    nationality         VARCHAR(100) DEFAULT 'Venezolana',

    -- Último avistamiento
    last_seen_location  VARCHAR(500),
    last_seen_date      DATE,
    description         TEXT,

    -- Contacto de quien busca
    contact_name        VARCHAR(300),
    contact_phone       VARCHAR(50),
    contact_email       VARCHAR(200),

    -- Multimedia
    photo_url           TEXT,

    -- Estado
    status              VARCHAR(20) NOT NULL DEFAULT 'missing'
                            CHECK (status IN ('missing', 'found')),
    status_notes        TEXT,

    -- Trazabilidad
    reported_by_source  VARCHAR(200),
    source_urls         TEXT[],
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uidx_mp_name_dob
    ON missing_persons (full_name, date_of_birth)
    WHERE cedula IS NULL AND date_of_birth IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_mp_full_name       ON missing_persons USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mp_status          ON missing_persons (status);
CREATE INDEX IF NOT EXISTS idx_mp_last_seen_date  ON missing_persons (last_seen_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mp_updated_at      ON missing_persons (updated_at DESC);

-- -------------------------------------------------------------
-- Relación persona <-> fuente
--
-- Lógica del scraper:
--   1. ¿Existe (source_id, source_record_id)? → UPDATE missing_persons
--   2. ¿No existe pero hay cédula? → INSERT person_sources vinculando persona existente
--   3. ¿Nada coincide? → INSERT missing_persons + INSERT person_sources
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS person_sources (
    id               SERIAL PRIMARY KEY,
    person_id        UUID NOT NULL REFERENCES missing_persons(id) ON DELETE CASCADE,
    source_id        INTEGER NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    source_record_id VARCHAR(500),       -- ID o URL del registro en la fuente original
    source_url       TEXT,               -- URL exacta del registro en la fuente
    scraped_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    raw_data         JSONB,              -- payload original sin procesar
    UNIQUE (source_id, source_record_id)
);

CREATE INDEX IF NOT EXISTS idx_ps_person_id ON person_sources (person_id);
CREATE INDEX IF NOT EXISTS idx_ps_source_id ON person_sources (source_id);

-- -------------------------------------------------------------
-- Actualiza updated_at en cada UPDATE
-- -------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_mp_updated_at
    BEFORE UPDATE ON missing_persons
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
