import type { Publisher, PublishInput } from "./types";

const BASE = "https://encuentralos.tecnosoft.dev";

type EncuentralosPersona = { id: string; cedula?: string };
type EncuentralosResponse = EncuentralosPersona[] | { items?: EncuentralosPersona[] };

const encuentralos: Publisher = {
  name: "encuentralos",
  sourceUrl: BASE,

  async search(input: PublishInput): Promise<string | null> {
    if (!input.cedula) return null;
    const res = await fetch(
      `${BASE}/api/personas?cedula=${encodeURIComponent(input.cedula)}&limit=5`
    );
    if (!res.ok) return null;
    const data = await res.json() as EncuentralosResponse;
    const list = Array.isArray(data) ? data : (data.items ?? []);
    return list.find((p) => p.cedula === input.cedula)?.id ?? null;
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
