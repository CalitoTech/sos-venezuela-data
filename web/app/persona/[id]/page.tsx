import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonById, updateStatus } from "@/lib/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { PhotoZoom } from "@/components/PhotoZoom";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex flex-col sm:flex-row sm:gap-4 py-2 border-b border-[var(--border)]">
      <span className="font-mono text-[0.65rem] text-[var(--text-faint)] tracking-widest sm:min-w-[140px] shrink-0 pt-0.5">
        {label}
      </span>
      <span className="font-mono text-[0.82rem] text-[var(--text)]">{value}</span>
    </div>
  );
}

function formatDate(d: string | null) {
  if (!d) return null;
  return new Date(d).toLocaleDateString("es-VE", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function PersonaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const person = await getPersonById(id);
  if (!person) notFound();

  async function handleStatusUpdate(formData: FormData) {
    "use server";
    await updateStatus(id, formData.get("status") as string, formData.get("status_notes") as string);
  }

  return (
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[#0d0d0d]">
        <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-3 flex items-center gap-4">
          <Link href="/" className="font-mono text-xs text-[var(--text-dim)] no-underline shrink-0">
            ← VOLVER
          </Link>
          <span className="text-[var(--border)] shrink-0">|</span>
          <span className="font-mono text-[0.65rem] text-[var(--text-faint)] tracking-wider">
            FICHA DE PERSONA
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[960px] px-4 sm:px-6 py-8">
        {/* Grid principal: se apila en móvil, 3 cols en desktop */}
        <div className="flex flex-col sm:grid sm:grid-cols-[180px_1fr_1fr] gap-5 items-start">

          {/* Columna 1: foto + estado */}
          <div className="flex sm:flex-col flex-row gap-4 sm:gap-4 items-start">
            <div className="w-32 sm:w-full shrink-0">
              {person.photo_url ? (
                <PhotoZoom src={person.photo_url} alt={person.full_name} />
              ) : (
                <div className="w-full aspect-[3/4] rounded bg-[#1a1a1a] border border-[var(--border)] flex items-center justify-center text-[var(--text-faint)] text-5xl">
                  ?
                </div>
              )}
            </div>
            <div className="flex flex-col gap-3 pt-1">
              <StatusBadge status={person.status} />
              {person.status_notes && (
                <p className="font-mono text-[0.68rem] text-[var(--text-dim)] leading-relaxed">
                  {person.status_notes}
                </p>
              )}
            </div>
          </div>

          {/* Columna 2: nombre + identidad + avistamiento + contacto */}
          <div className="flex flex-col gap-5">
            <div className={`bg-[var(--bg-card)] border border-[var(--border)] rounded p-4 ${person.status === "missing" ? "border-t-[var(--red)]" : "border-t-[var(--border-hi)]"} border-t-2`}>
              <h1 className="font-[var(--display)] text-3xl tracking-wider leading-tight">
                {person.full_name.toUpperCase()}
              </h1>
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
              <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-3">IDENTIDAD</p>
              <Row label="CÉDULA"     value={person.cedula} />
              <Row label="FECHA NAC." value={formatDate(person.date_of_birth)} />
              <Row label="EDAD"       value={person.age ? `${person.age} años` : null} />
              <Row label="GÉNERO"     value={person.gender} />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
              <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-3">ÚLTIMO AVISTAMIENTO</p>
              <Row label="LUGAR" value={person.last_seen_location} />
              <Row label="FECHA" value={formatDate(person.last_seen_date)} />
            </div>

            {(person.contact_name || person.contact_phone || person.contact_email) && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
                <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-3">CONTACTO</p>
                <Row label="NOMBRE"   value={person.contact_name} />
                <Row label="TELÉFONO" value={person.contact_phone} />
                <Row label="CORREO"   value={person.contact_email} />
              </div>
            )}
          </div>

          {/* Columna 3: descripción + registro + actualizar estado */}
          <div className="flex flex-col gap-5">
            {person.description && (
              <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
                <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-3">DESCRIPCIÓN FÍSICA</p>
                <p className="font-[var(--sans)] text-sm text-[var(--text)] leading-relaxed">{person.description}</p>
              </div>
            )}

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
              <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-3">REGISTRO</p>
              <Row label="FUENTE"      value={person.reported_by_source === "manual" ? "Reporte manual" : person.reported_by_source} />
              <Row label="REGISTRADO"  value={formatDate(person.first_seen_at)} />
              <Row label="ACTUALIZADO" value={formatDate(person.updated_at)} />
            </div>

            <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded p-4">
              <p className="font-mono text-[0.6rem] text-[var(--text-faint)] tracking-widest mb-4">ACTUALIZAR ESTADO</p>
              <form action={handleStatusUpdate} className="flex flex-col gap-3">
                <select
                  name="status"
                  defaultValue={person.status}
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded text-[var(--text)] font-mono text-sm px-3 py-2"
                >
                  <option value="missing">No localizado</option>
                  <option value="found">Localizado</option>
                </select>
                <textarea
                  name="status_notes"
                  rows={2}
                  defaultValue={person.status_notes ?? ""}
                  placeholder="Notas sobre el cambio de estado..."
                  className="w-full bg-[var(--bg-input)] border border-[var(--border)] rounded text-[var(--text)] font-mono text-sm px-3 py-2 resize-y"
                />
                <button
                  type="submit"
                  className="w-full bg-transparent border border-[var(--border-hi)] rounded text-[var(--text)] font-mono text-xs font-semibold tracking-wider py-2 cursor-pointer"
                >
                  GUARDAR CAMBIO
                </button>
              </form>
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
