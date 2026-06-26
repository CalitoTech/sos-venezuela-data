import type { Publisher, PublishInput } from "./types";

const BASE = "https://ayudavenezuela.info";

type AyudaPersona = { id: string; cedula?: string; nombre?: string };

const ayudavenezuela: Publisher = {
  name: "ayudavenezuela",
  sourceUrl: BASE,

  async search(input: PublishInput): Promise<string | null> {
    const q = input.cedula ?? input.full_name;
    const res = await fetch(`${BASE}/api/personas?q=${encodeURIComponent(q)}&limit=10`);
    if (!res.ok) return null;
    const data = await res.json() as AyudaPersona[];
    if (!Array.isArray(data)) return null;
    const match = data.find(
      (p) =>
        (input.cedula && p.cedula === input.cedula) ||
        p.nombre?.toLowerCase() === input.full_name.toLowerCase()
    );
    return match?.id ?? null;
  },

  async create(input: PublishInput): Promise<string> {
    const payload =
      input.status === "found"
        ? {
            tipo: "reporte",
            nombre: input.full_name,
            cedula: input.cedula ?? undefined,
            estado: input.last_seen_location ?? "Venezuela",
            estado_persona: input.found_hospital ? "HERIDO" : "A_SALVO",
            localizadoPor: input.found_by ?? input.contact_name ?? "SOS Venezuela",
            localizadoContacto: input.found_contact ?? input.contact_phone ?? undefined,
            localizadoNota: input.status_notes ?? undefined,
            autor: input.contact_name ?? "SOS Venezuela",
            contacto: input.contact_phone ?? input.contact_email ?? "Sin contacto",
          }
        : {
            tipo: "busqueda",
            nombre: input.full_name,
            cedula: input.cedula ?? undefined,
            edad: input.age != null ? `${input.age} años` : undefined,
            estado: input.last_seen_location ?? "Venezuela",
            descripcion: input.description ?? undefined,
            autor: input.contact_name ?? "SOS Venezuela",
            contacto: input.contact_phone ?? input.contact_email ?? "Sin contacto",
          };

    const res = await fetch(`${BASE}/api/personas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as { id: string };
    return data.id;
  },

  // Cuando la persona ya existe y pasa a "found": publicar un reporte nuevo
  async update(_externalId: string, input: PublishInput): Promise<void> {
    if (input.status !== "found") return;
    await ayudavenezuela.create(input);
  },
};

export default ayudavenezuela;
