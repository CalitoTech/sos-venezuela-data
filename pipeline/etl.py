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


def _csv(path: str) -> bool:
    """True si el archivo existe y tiene contenido (no solo el header)."""
    try:
        return os.path.getsize(path) > 0
    except OSError:
        return False


def normalize(con: duckdb.DuckDBPyConnection) -> None:
    parts = []

    if _csv(f"{SCRAPERS}/ayudavenezuela/personas.csv"):
        parts.append(f"""
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
            NULL::VARCHAR                                                   AS found_hospital,
            NULL::TIMESTAMPTZ                                               AS data_as_of
        FROM read_csv_auto('{SCRAPERS}/ayudavenezuela/personas.csv')""")

    if _csv(f"{SCRAPERS}/desaparecidosapi/personas.csv"):
        parts.append(f"""
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
            NULL,
            epoch_ms(TRY_CAST(updated_at AS BIGINT)) AT TIME ZONE 'UTC'  -- ms epoch -> TIMESTAMPTZ
        FROM read_csv_auto('{SCRAPERS}/desaparecidosapi/personas.csv')""")

    if _csv(f"{SCRAPERS}/encuentralos/personas.csv"):
        parts.append(f"""
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
            NULLIF(TRIM(pv_lugar), ''),
            NULL::TIMESTAMPTZ
        FROM read_csv_auto('{SCRAPERS}/encuentralos/personas.csv')""")

    if _csv(f"{SCRAPERS}/venezuelareportaorg/personas.csv"):
        parts.append(f"""
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
            NULL, NULL, NULL,
            NULL::TIMESTAMPTZ
        FROM read_csv_auto('{SCRAPERS}/venezuelareportaorg/personas.csv')""")

    if _csv(f"{SCRAPERS}/venezuelatebusca/personas.csv"):
        parts.append(f"""
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
            NULLIF(hospital_name, ''),
            TRY_CAST(updated_at AS TIMESTAMPTZ)  -- ISO 8601 -> TIMESTAMPTZ
        FROM read_csv_auto('{SCRAPERS}/venezuelatebusca/personas.csv')
        -- Excluir registros que la fuente ocultó o borró (no re-publicar bajas)
        WHERE NULLIF(TRIM(CAST(hidden_at  AS VARCHAR)), '') IS NULL
          AND NULLIF(TRIM(CAST(deleted_at AS VARCHAR)), '') IS NULL""")

    if _csv(f"{SCRAPERS}/pacienteshospitales/pacientes.csv"):
        parts.append(f"""
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
            NULLIF(TRIM(CONCAT_WS(', ', NULLIF(hospital,''), NULLIF(ciudad,''))), ''),
            -- Supabase: updated_at real (trigger en cada UPDATE). Verificado en
            -- vivo como ISO 8601 con offset +00:00 y microsegundos
            -- (ej. 2026-06-26T04:56:51.504232+00:00). DuckDB castea ISO con
            -- offset sin problema; dejamos el fallback a epoch ms por las dudas.
            COALESCE(
                TRY_CAST(updated_at AS TIMESTAMPTZ),
                epoch_ms(TRY_CAST(updated_at AS BIGINT)) AT TIME ZONE 'UTC'
            )
        FROM read_csv_auto('{SCRAPERS}/pacienteshospitales/pacientes.csv')""")

    if not parts:
        raise RuntimeError("No hay ningún CSV de scraper disponible — abortando ETL")

    skipped = 6 - len(parts)
    if skipped:
        print(f"  ⚠ {skipped} source(s) sin CSV — se omiten del ETL")

    con.execute(f"CREATE OR REPLACE VIEW normalized AS {' UNION ALL '.join(parts)}")


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
        found_by, found_contact, found_hospital, data_as_of
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
    "data_as_of",
]

# max chars por índice en el tuple de output de _truncate
_LIMITS = {0: 500, 1: 20, 3: 20, 4: 500, 7: 300, 8: 50, 9: 200, 12: 300, 13: 300, 14: 300}


def _truncate(row: tuple) -> tuple:
    # row tiene 19 elementos; saltamos source_name/id/url (12-14), conservamos data_as_of (18)
    lst = list(row[:12]) + list(row[15:18]) + [row[18]]
    for idx, max_len in _LIMITS.items():
        if isinstance(lst[idx], str) and len(lst[idx]) > max_len:
            lst[idx] = lst[idx][:max_len]
    return tuple(lst)


# Prioridad temporal (Opción A): EXCLUDED (el scraper) solo gana si trae una
# fecha confiable Y es estrictamente más nueva que la del dato vigente. Si la
# fuente no tiene fecha (data_as_of NULL) nunca pisa: solo rellena nulos.
_EXCL_WINS = (
    "EXCLUDED.data_as_of IS NOT NULL AND "
    "(missing_persons.data_as_of IS NULL OR EXCLUDED.data_as_of > missing_persons.data_as_of)"
)

# Campos de datos que se fusionan con criterio temporal.
_MERGE_FIELDS = [
    "age", "gender", "last_seen_location", "last_seen_date", "description",
    "contact_name", "contact_phone", "contact_email", "photo_url",
    "found_by", "found_contact", "found_hospital",
]


def _merge_clause(col: str) -> str:
    # Gana el scraper -> su valor con fallback al existente; pierde -> conserva
    # el existente y solo rellena si estaba nulo.
    return (
        f"{col} = CASE WHEN {_EXCL_WINS} "
        f"THEN COALESCE(EXCLUDED.{col}, missing_persons.{col}) "
        f"ELSE COALESCE(missing_persons.{col}, EXCLUDED.{col}) END"
    )


_SET_CLAUSES = ",\n        ".join(_merge_clause(c) for c in _MERGE_FIELDS) + ",\n        " + ",\n        ".join([
    # 'found' es pegajoso: si cualquiera de los dos lados lo tiene, manda.
    "status = CASE WHEN 'found' IN (missing_persons.status, EXCLUDED.status) THEN 'found' ELSE EXCLUDED.status END",
    # El dato vigente avanza a la fecha más nueva (GREATEST ignora NULLs en PG).
    "data_as_of = GREATEST(missing_persons.data_as_of, EXCLUDED.data_as_of)",
    "updated_at = NOW()",
])

_UPSERT_SQL = f"""
    INSERT INTO missing_persons ({', '.join(_COLS)})
    VALUES %s
    ON CONFLICT (cedula) WHERE cedula IS NOT NULL DO UPDATE SET
        {_SET_CLAUSES}
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
