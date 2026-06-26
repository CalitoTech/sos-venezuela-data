// Replica el criterio de "misma persona" del ETL (pipeline/etl.py).
// Mantener en sync con FUZZY_THRESHOLD / AGE_TOLERANCE / _norm de ese archivo.

export const FUZZY_THRESHOLD = 88; // token_sort_ratio mínimo para considerar misma persona
export const AGE_TOLERANCE = 2; // años de diferencia permitidos al fusionar por nombre

/** Quita acentos, mayúsculas y espacios extra. Equivale a _norm/_norm_str del ETL. */
export function normName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // marcas diacríticas combinantes
    .toUpperCase()
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");
}

/** Longitud de la subsecuencia común más larga (LCS). */
function lcsLength(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0 || n === 0) return 0;
  let prev = new Array<number>(n + 1).fill(0);
  let curr = new Array<number>(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      curr[j] = a[i - 1] === b[j - 1] ? prev[j - 1] + 1 : Math.max(prev[j], curr[j - 1]);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

/** fuzz.ratio de rapidfuzz: similitud Indel normalizada = 100 * 2*LCS / (len_a + len_b). */
function ratio(a: string, b: string): number {
  const total = a.length + b.length;
  if (total === 0) return 100;
  return (200 * lcsLength(a, b)) / total;
}

/** fuzz.token_sort_ratio: ordena los tokens alfabéticamente antes de comparar. */
export function tokenSortRatio(a: string, b: string): number {
  const sort = (s: string) => s.split(" ").filter(Boolean).sort().join(" ");
  return ratio(sort(a), sort(b));
}

/** Edades compatibles si difieren ≤ AGE_TOLERANCE o alguna es nula (igual que _ages_compatible). */
export function agesCompatible(a: number | null | undefined, b: number | null | undefined): boolean {
  if (a == null || b == null) return true;
  return Math.abs(a - b) <= AGE_TOLERANCE;
}

/** True si dos personas son la misma según el criterio del ETL: nombre fuzzy + edad compatible. */
export function isSamePerson(
  nameA: string,
  ageA: number | null | undefined,
  nameB: string,
  ageB: number | null | undefined
): boolean {
  if (!nameA || !nameB) return false;
  return (
    tokenSortRatio(normName(nameA), normName(nameB)) >= FUZZY_THRESHOLD &&
    agesCompatible(ageA, ageB)
  );
}
