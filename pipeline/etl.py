#!/usr/bin/env python3
"""
ETL: normaliza los CSVs de scrapers/ y los carga en Postgres.
Requiere: pip install duckdb psycopg2-binary python-dotenv rapidfuzz
"""
import os
import time
import unicodedata
from collections import defaultdict

import duckdb
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv
from rapidfuzz import fuzz

load_dotenv(os.path.join(os.path.dirname(__file__), "..", "web", ".env.local"))
DATABASE_URL = os.environ["DATABASE_URL"]
SCRAPERS = os.path.join(os.path.dirname(__file__), "..", "scrapers")


def normalize(con: duckdb.DuckDBPyConnection) -> None:
    con.execute(f"""
    CREATE OR REPLACE VIEW normalized AS

    -- ayudavenezuela
    SELECT
        nombre                                                          AS full_name,
        NULLIF(TRIM(cedula), '')                                        AS cedula,
        TRY_CAST(edad AS SMALLINT)                                      AS age,
        NULL::VARCHAR                                                   AS gender,
        municipio                                                       AS last_seen_location,
        NULL::DATE                                                      AS last_seen_date,
        CONCAT_WS(' | ', NULLIF(descripcion,''), NULLIF(nota,''))       AS description,
        autor                                                           AS contact_name,
        NULLIF(contacto, '')                                            AS contact_phone,
        NULL::VARCHAR                                                   AS contact_email,
        NULL::VARCHAR                                                   AS photo_url,
        CASE UPPER(TRIM(estado_persona))
            WHEN 'DESAPARECIDO' THEN 'missing'
            WHEN 'ENCONTRADO'   THEN 'found'
            ELSE 'missing'
        END                                                             AS status,
        'ayudavenezuela'                                                AS source_name,
        id                                                              AS source_record_id,
        NULL::VARCHAR                                                   AS source_url,
        NULLIF(TRIM(localizado_por), '')                                AS found_by,
        NULLIF(TRIM(localizado_contacto), '')                           AS found_contact,
        NULL::VARCHAR                                                   AS found_hospital
    FROM read_csv_auto('{SCRAPERS}/ayudavenezuela/personas.csv')

    UNION ALL

    -- desaparecidosapi
    SELECT
        nombre,
        NULL,
        TRY_CAST(edad AS SMALLINT),
        NULL,
        NULLIF(ubicacion, ''),
        TRY_CAST(fecha AS DATE),
        NULLIF(descripcion, ''),
        NULL,
        NULLIF(contacto, ''),
        NULL,
        NULLIF(foto, ''),
        CASE LOWER(TRIM(estado))
            WHEN 'sin-contacto' THEN 'missing'
            WHEN 'localizado'   THEN 'found'
            ELSE 'missing'
        END,
        'desaparecidosapi', id, NULL,
        NULLIF(TRIM(localizado_por), ''),
        NULLIF(TRIM(localizado_contacto), ''),
        NULL
    FROM read_csv_auto('{SCRAPERS}/desaparecidosapi/personas.csv')

    UNION ALL

    -- encuentralos
    SELECT
        nombre,
        NULLIF(TRIM(cedula), ''),
        TRY_CAST(edad AS SMALLINT),
        CASE LOWER(TRIM(sexo))
            WHEN 'masculino' THEN 'male'
            WHEN 'femenino'  THEN 'female'
        END,
        NULLIF(ultima_ubicacion, ''),
        TRY_CAST(ultima_vez AS DATE),
        NULLIF(descripcion, ''),
        NULL,
        NULLIF(reporta_contacto, ''),
        NULL,
        NULLIF(foto, ''),
        CASE LOWER(TRIM(estado))
            WHEN 'desaparecido' THEN 'missing'
            WHEN 'localizado'   THEN 'found'
            ELSE 'missing'
        END,
        'encuentralos', id, NULL,
        NULLIF(TRIM(pv_por), ''),
        NULLIF(TRIM(pv_contacto), ''),
        NULLIF(TRIM(pv_lugar), '')
    FROM read_csv_auto('{SCRAPERS}/encuentralos/personas.csv')

    UNION ALL

    -- venezuelareportaorg
    SELECT
        nombre,
        NULL,
        NULL,
        NULL,
        NULLIF(ubicacion, ''),
        NULL,
        NULL,
        NULL,
        NULL,
        NULL,
        NULLIF(foto_url, ''),
        CASE TRIM(estado)
            WHEN 'Se busca'   THEN 'missing'
            WHEN 'Encontrado' THEN 'found'
            ELSE 'missing'
        END,
        'venezuelareportaorg', id, url,
        NULL, NULL, NULL
    FROM read_csv_auto('{SCRAPERS}/venezuelareportaorg/personas.csv')

    UNION ALL

    -- venezuelatebusca
    SELECT
        NULLIF(TRIM(first_name || ' ' || last_name), ''),
        NULLIF(TRIM(CAST(national_id AS VARCHAR)), ''),
        TRY_CAST(age AS SMALLINT),
        CASE LOWER(TRIM(gender))
            WHEN 'masculino' THEN 'male'
            WHEN 'femenino'  THEN 'female'
        END,
        NULLIF(last_seen_location, ''),
        NULL,
        NULLIF(description, ''),
        NULLIF(reporter_name, ''),
        NULLIF(reporter_phone, ''),
        NULLIF(reporter_email, ''),
        NULL,
        CASE LOWER(TRIM(status))
            WHEN 'missing' THEN 'missing'
            WHEN 'found'   THEN 'found'
            ELSE 'missing'
        END,
        'venezuelatebusca', id, NULL,
        NULLIF(found_notes, ''),
        NULL,
        NULLIF(hospital_name, '')
    FROM read_csv_auto('{SCRAPERS}/venezuelatebusca/personas.csv')

    UNION ALL

    -- pacienteshospitales
    SELECT
        nombre,
        NULL,
        TRY_CAST(edad AS SMALLINT),
        NULL,
        NULL,
        NULL,
        NULLIF(notas, ''),
        NULL,
        NULL,
        NULL,
        NULL,
        'missing',
        'pacienteshospitales', id, NULL,
        NULLIF(TRIM(reportado_por), ''),
        NULL,
        NULLIF(TRIM(CONCAT_WS(', ', NULLIF(hospital,''), NULLIF(ciudad,''))), '')
    FROM read_csv_auto('{SCRAPERS}/pacienteshospitales/pacientes.csv')
    """)


def dedup(con: duckdb.DuckDBPyConnection) -> list:
    """
    Dedup en dos niveles:
    1. Por cédula exacta (clave fuerte)
    2. Por nombre + edad para registros sin cédula — previene falsos positivos
       entre homónimos de distinta edad
    3. Fallback a nombre solo cuando no hay edad

    Cuando hay duplicados se elige el registro más completo.
    """
    return con.execute("""
    WITH scored AS (
        SELECT *,
            (CASE WHEN cedula              IS NOT NULL THEN 10 ELSE 0 END +
             CASE WHEN age                 IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN gender              IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN photo_url           IS NOT NULL THEN 2  ELSE 0 END +
             CASE WHEN description         IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN last_seen_location  IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN contact_phone       IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN found_by            IS NOT NULL THEN 2  ELSE 0 END +
             CASE WHEN found_contact       IS NOT NULL THEN 1  ELSE 0 END +
             CASE WHEN found_hospital      IS NOT NULL THEN 1  ELSE 0 END) AS completeness
        FROM normalized
        WHERE full_name IS NOT NULL AND TRIM(full_name) != ''
    ),
    ranked AS (
        SELECT *,
            ROW_NUMBER() OVER (
                PARTITION BY CASE
                    WHEN cedula IS NOT NULL THEN cedula
                    WHEN age    IS NOT NULL THEN UPPER(TRIM(full_name)) || '|' || CAST(age AS VARCHAR)
                    ELSE                        UPPER(TRIM(full_name))
                END
                ORDER BY completeness DESC, status DESC
            ) AS rn
        FROM scored
    )
    SELECT
        full_name, cedula, age, gender,
        last_seen_location, last_seen_date, description,
        contact_name, contact_phone, contact_email,
        photo_url, status, source_name, source_record_id, source_url,
        found_by, found_contact, found_hospital
    FROM ranked WHERE rn = 1
    """).fetchall()


FUZZY_THRESHOLD = 88  # token_sort_ratio mínimo para considerar misma persona
AGE_TOLERANCE   = 2   # años de diferencia permitidos al fusionar por nombre


def _norm(name: str) -> str:
    """Elimina acentos, mayúsculas y espacios extra para comparación."""
    nfkd = unicodedata.normalize("NFKD", name)
    return "".join(c for c in nfkd if not unicodedata.combining(c)).upper().split()


def _norm_str(name: str) -> str:
    return " ".join(_norm(name))


def _completeness(row: tuple) -> int:
    # Índices: 0=full_name 1=cedula 2=age 3=gender 4=last_seen_location
    #          5=last_seen_date 6=description 7=contact_name 8=contact_phone
    #          9=contact_email 10=photo_url 11=status 12=source_name
    #          13=source_record_id 14=source_url 15=found_by 16=found_contact 17=found_hospital
    weights = [
        0, 0, 1, 1, 1, 1, 1, 0, 1, 0, 2, 0,  # 0-11
        0, 0, 0,                                # 12-14 (source — no cuentan)
        2, 1, 1,                                # 15-17 (found fields)
    ]
    return sum(w for w, v in zip(weights, row) if v is not None)


def _ages_compatible(rows: list, ia: int, ib: int) -> bool:
    """Dos registros son compatibles si sus edades difieren ≤ AGE_TOLERANCE o alguna es nula."""
    a1, a2 = rows[ia][2], rows[ib][2]
    if a1 is None or a2 is None:
        return True
    return abs(a1 - a2) <= AGE_TOLERANCE


def fuzzy_dedup(rows: list) -> list:
    """
    Segunda pasada de dedup para registros sin cédula.
    Usa blocking por primeras 4 letras del nombre normalizado.
    Solo fusiona si token_sort_ratio ≥ FUZZY_THRESHOLD Y edades son compatibles.
    """
    parent = list(range(len(rows)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(x: int, y: int) -> None:
        parent[find(x)] = find(y)

    blocks: dict[str, list] = defaultdict(list)
    norms = [_norm_str(r[0]) for r in rows]
    for i, n in enumerate(norms):
        blocks[n[:4]].append(i)

    for indices in blocks.values():
        if len(indices) < 2:
            continue
        for a in range(len(indices)):
            for b in range(a + 1, len(indices)):
                ia, ib = indices[a], indices[b]
                if find(ia) == find(ib):
                    continue
                if fuzz.token_sort_ratio(norms[ia], norms[ib]) >= FUZZY_THRESHOLD \
                        and _ages_compatible(rows, ia, ib):
                    union(ia, ib)

    groups: dict[int, list] = defaultdict(list)
    for i, row in enumerate(rows):
        groups[find(i)].append(row)

    return [max(g, key=_completeness) for g in groups.values()]


# Columnas que van a missing_persons (sin los de fuente en posiciones 12-14)
_COLS = [
    "full_name", "cedula", "age", "gender",
    "last_seen_location", "last_seen_date", "description",
    "contact_name", "contact_phone", "contact_email",
    "photo_url", "status",
    "found_by", "found_contact", "found_hospital",
]

# max chars por índice en el tuple de output de _truncate
_LIMITS = {0: 500, 1: 20, 3: 20, 4: 500, 7: 300, 8: 50, 9: 200, 12: 300, 13: 300, 14: 300}


def _truncate(row: tuple) -> tuple:
    # row tiene 18 elementos; saltamos source_name/id/url (índices 12-14)
    lst = list(row[:12]) + list(row[15:18])
    for idx, max_len in _LIMITS.items():
        if isinstance(lst[idx], str) and len(lst[idx]) > max_len:
            lst[idx] = lst[idx][:max_len]
    return tuple(lst)


_UPSERT_SQL = f"""
    INSERT INTO missing_persons ({', '.join(_COLS)})
    VALUES %s
    ON CONFLICT (cedula) WHERE cedula IS NOT NULL DO UPDATE SET
        age                = COALESCE(EXCLUDED.age,                missing_persons.age),
        gender             = COALESCE(EXCLUDED.gender,             missing_persons.gender),
        last_seen_location = COALESCE(EXCLUDED.last_seen_location, missing_persons.last_seen_location),
        description        = COALESCE(EXCLUDED.description,        missing_persons.description),
        contact_phone      = COALESCE(EXCLUDED.contact_phone,      missing_persons.contact_phone),
        photo_url          = COALESCE(EXCLUDED.photo_url,          missing_persons.photo_url),
        status             = CASE
                                 WHEN missing_persons.status = 'found' THEN 'found'
                                 ELSE EXCLUDED.status
                             END,
        found_by           = COALESCE(EXCLUDED.found_by,           missing_persons.found_by),
        found_contact      = COALESCE(EXCLUDED.found_contact,      missing_persons.found_contact),
        found_hospital     = COALESCE(EXCLUDED.found_hospital,     missing_persons.found_hospital),
        updated_at         = NOW()
"""


def load(rows: list, pg_url: str) -> int:
    values = [_truncate(r) for r in rows]
    with psycopg2.connect(pg_url) as conn, conn.cursor() as cur:
        execute_values(cur, _UPSERT_SQL, values, page_size=10_000)
        conn.commit()
    return len(values)


if __name__ == "__main__":
    t0 = time.time()

    con = duckdb.connect()

    print("Normalizando fuentes...")
    normalize(con)
    total_raw = con.execute("SELECT COUNT(*) FROM normalized").fetchone()[0]
    print(f"  {total_raw:,} registros crudos en 6 fuentes")

    print("Deduplicando (exacto + nombre+edad)...")
    rows = dedup(con)
    print(f"  {len(rows):,} tras dedup exacto ({total_raw - len(rows):,} eliminados)")

    print("Deduplicando (fuzzy, solo sin cédula)...")
    with_cedula    = [r for r in rows if r[1] is not None]
    without_cedula = [r for r in rows if r[1] is None]
    deduped_fuzzy  = fuzzy_dedup(without_cedula)
    rows = with_cedula + deduped_fuzzy
    print(f"  {len(rows):,} tras fuzzy ({len(without_cedula) - len(deduped_fuzzy):,} adicionales eliminados)")

    print("Cargando en Postgres...")
    n = load(rows, DATABASE_URL)
    print(f"  {n:,} registros insertados/actualizados")

    print(f"\nListo en {time.time() - t0:.1f}s")
