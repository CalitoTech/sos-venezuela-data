import type { Publisher, PublishInput } from "./types";

const BASE = "https://venezuelatebusca.com";

function mapGender(g: string | null) {
  if (g === "male") return "masculino";
  if (g === "female") return "femenino";
  return undefined;
}

function toPayload(input: PublishInput) {
  const parts = input.full_name.trim().split(/\s+/);
  return {
    first_name: parts[0],
    last_name: parts.slice(1).join(" ") || undefined,
    national_id: input.cedula ?? undefined,
    age: input.age ?? undefined,
    gender: mapGender(input.gender),
    last_seen_location: input.last_seen_location ?? undefined,
    description: input.description ?? undefined,
    status: input.status,
    reporter_name: input.contact_name ?? "SOS Venezuela",
    reporter_phone: input.contact_phone ?? "N/D",
    reporter_email: input.contact_email ?? "contacto@sosvenezuela.info",
    found_notes: input.status === "found"
      ? [input.status_notes, input.found_by ? `Localizado por: ${input.found_by}` : null, input.found_contact ? `Contacto: ${input.found_contact}` : null]
          .filter(Boolean).join(" — ") || undefined
      : undefined,
    hospital_name: input.found_hospital ?? undefined,
  };
}

type VTBPersona = { id: string; national_id?: string | null };
type VTBResponse = { persons?: VTBPersona[]; person?: VTBPersona };

const venezuelatebusca: Publisher = {
  name: "venezuelatebusca",
  sourceUrl: BASE,

  async search(input: PublishInput): Promise<string | null> {
    if (!input.cedula) return null;
    const res = await fetch(
      `${BASE}/api/persons?national_id=${encodeURIComponent(input.cedula)}&limit=5`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json() as VTBResponse;
    const list = data.persons ?? [];
    return list.find((p) => p.national_id === input.cedula)?.id ?? null;
  },

  async create(input: PublishInput): Promise<string> {
    const res = await fetch(`${BASE}/api/persons`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ person: toPayload(input) }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json() as VTBResponse;
    if (!data.person?.id) throw new Error("No id in response");
    return data.person.id;
  },

  async update(externalId: string, input: PublishInput): Promise<void> {
    const res = await fetch(`${BASE}/api/persons/${externalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ person: toPayload(input) }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  },
};

export default venezuelatebusca;
