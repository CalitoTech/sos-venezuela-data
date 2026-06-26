// Shared formatting/sanitizing helpers for displaying scraped data.
// Source data is dirty (junk locations like ".", invalid dates), so every
// value that reaches the UI goes through one of these guards.

export function formatDate(
  d: string | Date | null,
  month: "short" | "long" = "short"
): string | null {
  if (!d) return null;
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return null;
  return dt.toLocaleDateString("es-VE", { day: "2-digit", month, year: "numeric" });
}

// Returns the trimmed string only if it carries real content.
// Filters out single-character junk such as "." or "-".
export function cleanText(s: string | null | undefined): string | null {
  if (!s) return null;
  const t = s.trim();
  return t.length > 1 ? t : null;
}
