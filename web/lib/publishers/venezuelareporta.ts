import type { Publisher, PublishInput } from "./types";

const BASE = "https://venezuelareporta.org";

type BuscarItem = { id: string; cedula?: string; nombre?: string };

const venezuelareporta: Publisher = {
  name: "venezuelareporta",
  sourceUrl: BASE,

  async search(input: PublishInput): Promise<string | null> {
    const q = input.cedula ?? input.full_name;
    const res = await fetch(`${BASE}/api/buscar?q=${encodeURIComponent(q)}`);
    if (!res.ok) return null;
    const data = await res.json() as BuscarItem[];
    if (!Array.isArray(data)) return null;
    const match = data.find(
      (p) =>
        (input.cedula && p.cedula === input.cedula) ||
        p.nombre?.toLowerCase() === input.full_name.toLowerCase()
    );
    return match?.id ?? null;
  },

  async create(input: PublishInput): Promise<string> {
    const form = new FormData();
    form.set("nombre", input.full_name);
    form.set("ciudad", input.last_seen_location ?? "Venezuela");
    if (input.cedula) form.set("cedula", input.cedula);
    if (input.age != null) form.set("edad", String(input.age));
    if (input.gender === "male") form.set("genero", "masculino");
    else if (input.gender === "female") form.set("genero", "femenino");
    if (input.description) form.set("descripcion", input.description);
    if (input.contact_phone) form.set("telefono_propio", input.contact_phone);
    form.set(
      "contactos",
      JSON.stringify(
        input.contact_name
          ? [{ nombre: input.contact_name, telefono: input.contact_phone ?? "", mostrar_publico: true }]
          : []
      )
    );
    form.set("lugares", JSON.stringify([]));

    const res = await fetch(`${BASE}/api/reports`, { method: "POST", body: form });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { id?: string };
    return data.id ?? "created";
  },
};

export default venezuelareporta;
