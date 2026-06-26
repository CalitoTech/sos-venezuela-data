"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPerson } from "@/lib/actions";
import { PhotoUpload } from "@/components/PhotoUpload";

const fieldStyle = {
  width: "100%",
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 3,
  color: "var(--text)",
  fontFamily: "var(--mono)",
  fontSize: "0.85rem",
  padding: "0.6rem 0.8rem",
} as React.CSSProperties;

const labelStyle = {
  display: "block",
  fontFamily: "var(--mono)",
  fontSize: "0.65rem",
  letterSpacing: "0.1em",
  color: "var(--text-faint)",
  marginBottom: "0.4rem",
} as React.CSSProperties;

export default function AgregarPage() {
  const [photoUrl, setPhotoUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const formData = new FormData(e.currentTarget);
    if (photoUrl) formData.set("photo_url", photoUrl);
    await createPerson(formData);
    router.push("/");
  }

  return (
    <main style={{ minHeight: "100vh" }}>
      <header style={{ borderBottom: "1px solid var(--border)", background: "#0d0d0d" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-dim)", textDecoration: "none" }}>
            ← VOLVER
          </Link>
          <span style={{ color: "var(--border)", fontSize: "0.75rem" }}>|</span>
          <span style={{ fontFamily: "var(--display)", fontSize: "1.2rem", letterSpacing: "0.08em" }}>
            REPORTAR PERSONA DESAPARECIDA
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderTop: "2px solid var(--red)", borderRadius: 4, padding: "2rem",
        }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "2rem", alignItems: "flex-start" }}>

              {/* Columna izquierda: foto */}
              <div style={{ flex: "0 0 180px" }}>
                <p style={labelStyle}>FOTO</p>
                <PhotoUpload onUpload={setPhotoUrl} />
              </div>

              {/* Columna derecha: campos */}
              <div style={{ flex: "1 1 280px", minWidth: 0, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>NOMBRE COMPLETO *</label>
                  <input name="full_name" required placeholder="Apellidos y nombres" style={{ ...fieldStyle, fontSize: "1rem" }} />
                </div>

                <div>
                  <label style={labelStyle}>CÉDULA DE IDENTIDAD</label>
                  <input name="cedula" placeholder="Ej: 12345678" style={fieldStyle} />
                </div>

                <div>
                  <label style={labelStyle}>EDAD</label>
                  <input name="age" type="number" min={0} max={130} placeholder="Años" style={fieldStyle} />
                </div>

                <div>
                  <label style={labelStyle}>FECHA DE NACIMIENTO</label>
                  <input name="date_of_birth" type="date" style={fieldStyle} />
                </div>

                <div>
                  <label style={labelStyle}>GÉNERO</label>
                  <select name="gender" style={fieldStyle}>
                    <option value="">— seleccionar —</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>ÚLTIMO LUGAR VISTO</label>
                  <input name="last_seen_location" placeholder="Ciudad, sector, dirección..." style={fieldStyle} />
                </div>

                <div>
                  <label style={labelStyle}>FECHA ÚLTIMO AVISTAMIENTO</label>
                  <input name="last_seen_date" type="date" style={fieldStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>DESCRIPCIÓN FÍSICA</label>
                  <textarea
                    name="description"
                    rows={3}
                    placeholder="Rasgos físicos, ropa que llevaba, señas particulares..."
                    style={{ ...fieldStyle, resize: "vertical" }}
                  />
                </div>

                {/* Sección contacto */}
                <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                  <p style={{ ...labelStyle, marginBottom: "1rem" }}>DATOS DE CONTACTO (QUIEN REPORTA)</p>
                </div>

                <div>
                  <label style={labelStyle}>NOMBRE DE CONTACTO</label>
                  <input name="contact_name" placeholder="Nombre completo" style={fieldStyle} />
                </div>

                <div>
                  <label style={labelStyle}>TELÉFONO</label>
                  <input name="contact_phone" type="tel" placeholder="+58 ..." style={fieldStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>CORREO ELECTRÓNICO</label>
                  <input name="contact_email" type="email" placeholder="correo@ejemplo.com" style={fieldStyle} />
                </div>

                <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      width: "100%",
                      background: submitting ? "#881111" : "var(--red)",
                      color: "#fff", border: "none", borderRadius: 3,
                      fontFamily: "var(--mono)", fontSize: "0.85rem",
                      fontWeight: 600, letterSpacing: "0.1em",
                      padding: "0.85rem", cursor: submitting ? "not-allowed" : "pointer",
                      transition: "background 0.15s",
                    }}
                  >
                    {submitting ? "REGISTRANDO..." : "REGISTRAR PERSONA DESAPARECIDA"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
