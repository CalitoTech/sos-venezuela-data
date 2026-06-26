import Link from "next/link";
import { notFound } from "next/navigation";
import { getPersonById, updateStatus } from "@/lib/actions";
import { StatusBadge } from "@/components/StatusBadge";
import { PhotoZoom } from "@/components/PhotoZoom";
import { UpdateStatusForm } from "@/components/UpdateStatusForm";

export const dynamic = "force-dynamic";

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div style={{ display: "flex", gap: "1rem", padding: "0.55rem 0", borderBottom: "1px solid var(--border)" }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.1em", minWidth: 150, paddingTop: 2, flexShrink: 0 }}>
        {label}
      </span>
      <span style={{ fontFamily: "var(--mono)", fontSize: "0.82rem", color: "var(--text)" }}>
        {value}
      </span>
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
    await updateStatus(
      id,
      formData.get("status") as string,
      formData.get("status_notes") as string,
      formData.get("found_by") as string | undefined,
      formData.get("found_contact") as string | undefined,
      formData.get("found_hospital") as string | undefined,
    );
  }

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)", background: "#0d0d0d" }}>
        <div style={{ maxWidth: 960, margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-dim)", textDecoration: "none" }}>
            ← VOLVER
          </Link>
          <span style={{ color: "var(--border)" }}>|</span>
          <span style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.08em" }}>
            FICHA DE PERSONA
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1.5rem" }}>
        {/* 3-column grid: foto | datos principales | datos secundarios + estado */}
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 1fr", gap: "1.25rem", alignItems: "start" }}>

          {/* Columna 1: foto + estado */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {person.photo_url ? (
              <PhotoZoom src={person.photo_url} alt={person.full_name} />
            ) : (
              <div style={{
                width: "100%", aspectRatio: "3/4", borderRadius: 3,
                background: "#1a1a1a", border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-faint)", fontSize: "3rem",
              }}>
                ?
              </div>
            )}
            <StatusBadge status={person.status} />
            {person.status_notes && (
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.68rem", color: "var(--text-dim)", lineHeight: 1.6 }}>
                {person.status_notes}
              </p>
            )}
          </div>

          {/* Columna 2: nombre + identidad + avistamiento + contacto */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <div style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderTop: person.status === "missing" ? "2px solid var(--red)" : "2px solid var(--border-hi)",
              borderRadius: 3, padding: "1rem",
            }}>
              <h1 style={{ fontFamily: "var(--display)", fontSize: "2rem", letterSpacing: "0.05em", lineHeight: 1, marginBottom: "0.25rem" }}>
                {person.full_name.toUpperCase()}
              </h1>
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>IDENTIDAD</p>
              <Row label="CÉDULA"       value={person.cedula} />
              <Row label="FECHA NAC."   value={formatDate(person.date_of_birth)} />
              <Row label="EDAD"         value={person.age ? `${person.age} años` : null} />
              <Row label="GÉNERO"       value={person.gender} />
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>ÚLTIMO AVISTAMIENTO</p>
              <Row label="LUGAR"        value={person.last_seen_location} />
              <Row label="FECHA"        value={formatDate(person.last_seen_date)} />
            </div>

            {(person.contact_name || person.contact_phone || person.contact_email) && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>CONTACTO</p>
                <Row label="NOMBRE"     value={person.contact_name} />
                <Row label="TELÉFONO"   value={person.contact_phone} />
                <Row label="CORREO"     value={person.contact_email} />
              </div>
            )}
          </div>

          {/* Columna 3: descripción + registro + actualizar estado */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {person.description && (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "0.75rem" }}>DESCRIPCIÓN FÍSICA</p>
                <p style={{ fontFamily: "var(--sans)", fontSize: "0.88rem", color: "var(--text)", lineHeight: 1.75 }}>{person.description}</p>
              </div>
            )}

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "0.5rem" }}>REGISTRO</p>
              <Row label="FUENTE"       value={person.reported_by_source === "manual" ? "Reporte manual" : person.reported_by_source} />
              <Row label="REGISTRADO"   value={formatDate(person.first_seen_at)} />
              <Row label="ACTUALIZADO"  value={formatDate(person.updated_at)} />
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 3, padding: "1rem" }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", marginBottom: "1rem" }}>
                ACTUALIZAR ESTADO
              </p>
              <UpdateStatusForm
                currentStatus={person.status}
                currentNotes={person.status_notes}
                action={handleStatusUpdate}
              />
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}
