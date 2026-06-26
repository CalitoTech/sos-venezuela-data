import type { Publisher, PublishInput } from "./types";
import { isSamePerson } from "./match";

const BASE = "https://encuentralos.tecnosoft.dev";

type EncuentralosPersona = { id: string; cedula?: string; nombre?: string; edad?: number | null };
type EncuentralosResponse = EncuentralosPersona[] | { items?: EncuentralosPersona[] };

function toList(data: EncuentralosResponse): EncuentralosPersona[] {
  return Array.isArray(data) ? data : (data.items ?? []);
}

const encuentralos: Publisher = {
  name: "encuentralos",
  sourceUrl: BASE,

  async search(input: PublishInput): Promise<string | null> {
    // 1. Buscar por cédula (identificador fuerte)
    if (input.cedula) {
      const res = await fetch(
        `${BASE}/api/personas?cedula=${encodeURIComponent(input.cedula)}&limit=5`
      );
      if (res.ok) {
        const byCedula = toList(await res.json()).find((p) => p.cedula === input.cedula);
        if (byCedula) return byCedula.id;
      }
    }

    // 2. Fallback por nombre (fuzzy + edad) — mismo criterio que el ETL
    if (!input.full_name.trim()) return null;
    const res = await fetch(
      `${BASE}/api/personas?q=${encodeURIComponent(input.full_name)}&limit=10`
    );
    if (!res.ok) return null;
    return (
      toList(await res.json()).find((p) =>
        isSamePerson(input.full_name, input.age, p.nombre ?? "", p.edad ?? null)
      )?.id ?? null
    );
  },

  async create(input: PublishInput): Promise<string> {
    const form = new FormData();
    form.set("nombre", input.full_name);
    if (input.cedula) form.set("cedula", input.cedula);
    if (input.age != null) form.set("edad", String(input.age));
    if (input.gender === "male") form.set("sexo", "masculino");
    else if (input.gender === "female") form.set("sexo", "femenino");
    if (input.description) form.set("descripcion", input.description);
    if (input.last_seen_location) form.set("ultima_ubicacion", input.last_seen_location);
    if (input.contact_name) form.set("reporta_nombre", input.contact_name);
    if (input.contact_phone) form.set("reporta_contacto", input.contact_phone);
    form.set("estado", input.status === "found" ? "encontrado" : "desaparecido");

    const res = await fetch(`${BASE}/api/personas`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { id: string };
    return data.id;
  },
  // PATCH /api/personas/:id requiere auth de admin
};

export default encuentralos;
