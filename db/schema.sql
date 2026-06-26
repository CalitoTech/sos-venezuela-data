-- =============================================================
-- SOS Venezuela — Schema de base de datos
-- Importar: psql -U sos_user -d sos_venezuela -f db/schema.sql
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- búsqueda fuzzy por nombre

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
    cedula              VARCHAR(20) UNIQUE,                     -- clave natural si existe
    date_of_birth       DATE,
    age                 SMALLINT CHECK (age BETWEEN 0 AND 130),
    gender              VARCHAR(20) CHECK (gender IN ('male', 'female')),
    nationality         VARCHAR(100) DEFAULT 'Venezolana',

    -- Último avistamiento
    last_seen_location  VARCHAR(500),
    last_seen_date      DATE,
    description         TEXT,                                   -- rasgos físicos, ropa, etc.

    -- Contacto de quien busca
    contact_name        VARCHAR(300),
    contact_phone       VARCHAR(50),
    contact_email       VARCHAR(200),

    -- Multimedia
    photo_url           TEXT,

    -- Estado
    status              VARCHAR(20) NOT NULL DEFAULT 'missing'
                            CHECK (status IN ('missing', 'found')),
    status_notes        TEXT,                                   -- cómo fue encontrado, etc.

    -- Trazabilidad
    reported_by_source  VARCHAR(200),                          -- fuente donde se vio por primera vez
    source_urls         TEXT[],                                 -- todas las URLs donde aparece
    first_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraint de unicidad cuando no hay cédula
CREATE UNIQUE INDEX IF NOT EXISTS uidx_mp_name_dob
    ON missing_persons (full_name, date_of_birth)
    WHERE cedula IS NULL AND date_of_birth IS NOT NULL;

-- -------------------------------------------------------------
-- Índices de búsqueda
-- -------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_mp_full_name       ON missing_persons USING gin (full_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_mp_status          ON missing_persons (status);
CREATE INDEX IF NOT EXISTS idx_mp_last_seen_date  ON missing_persons (last_seen_date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_mp_updated_at      ON missing_persons (updated_at DESC);

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
