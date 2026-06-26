import Link from "next/link";
import { createPerson } from "@/lib/actions";

const field = {
  label: (s: string) => ({
    display: "block",
    fontFamily: "var(--mono)",
    fontSize: "0.65rem",
    letterSpacing: "0.1em",
    color: "var(--text-faint)",
    marginBottom: "0.4rem",
  }),
  input: {
    width: "100%",
    background: "var(--bg-input)",
    border: "1px solid var(--border)",
    borderRadius: 3,
    color: "var(--text)",
    fontFamily: "var(--mono)",
    fontSize: "0.85rem",
    padding: "0.6rem 0.8rem",
    outline: "none",
  } as React.CSSProperties,
};

export default function AgregarPage() {
  return (
    <main style={{ minHeight: "100vh" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", background: "#0d0d0d" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0.75rem 1.5rem", display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ fontFamily: "var(--mono)", fontSize: "0.75rem", color: "var(--text-dim)", textDecoration: "none" }}>
            ← VOLVER
          </Link>
          <span style={{ color: "var(--border)", fontSize: "0.75rem" }}>|</span>
          <span style={{ fontFamily: "var(--display)", fontSize: "1.2rem", letterSpacing: "0.08em" }}>
            REPORTAR PERSONA DESAPARECIDA
          </span>
        </div>
      </header>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem 1.5rem" }}>
        <div style={{
          background: "var(--bg-card)", border: "1px solid var(--border)",
          borderTop: "2px solid var(--red)", borderRadius: 4, padding: "2rem",
        }}>
          <form action={createPerson}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>

              {/* Full name — full width */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={field.label("")}>NOMBRE COMPLETO *</label>
                <input name="full_name" required placeholder="Apellidos y nombres" style={{ ...field.input, fontSize: "1rem" }} />
              </div>

              <div>
                <label style={field.label("")}>CÉDULA DE IDENTIDAD</label>
                <input name="cedula" placeholder="Ej: 12345678" style={field.input} />
              </div>

              <div>
                <label style={field.label("")}>EDAD</label>
                <input name="age" type="number" min={0} max={130} placeholder="Años" style={field.input} />
              </div>

              <div>
                <label style={field.label("")}>FECHA DE NACIMIENTO</label>
                <input name="date_of_birth" type="date" style={field.input} />
              </div>

              <div>
                <label style={field.label("")}>GÉNERO</label>
                <select name="gender" style={{ ...field.input }}>
                  <option value="">— seleccionar —</option>
                  <option value="male">Masculino</option>
                  <option value="female">Femenino</option>
                  <option value="other">Otro</option>
                  <option value="unknown">Desconocido</option>
                </select>
              </div>

              <div>
                <label style={field.label("")}>ÚLTIMO LUGAR VISTO</label>
                <input name="last_seen_location" placeholder="Ciudad, sector, dirección..." style={field.input} />
              </div>

              <div>
                <label style={field.label("")}>FECHA ÚLTIMO AVISTAMIENTO</label>
                <input name="last_seen_date" type="date" style={field.input} />
              </div>

              {/* Description — full width */}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={field.label("")}>DESCRIPCIÓN FÍSICA</label>
                <textarea
                  name="description"
                  rows={3}
                  placeholder="Rasgos físicos, ropa que llevaba, señas particulares..."
                  style={{ ...field.input, resize: "vertical" }}
                />
              </div>

              {/* Divider */}
              <div style={{ gridColumn: "1 / -1", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: "0.65rem", color: "var(--text-faint)", letterSpacing: "0.1em", marginBottom: "1rem" }}>
                  DATOS DE CONTACTO (QUIEN REPORTA)
                </p>
              </div>

              <div>
                <label style={field.label("")}>NOMBRE DE CONTACTO</label>
                <input name="contact_name" placeholder="Nombre completo" style={field.input} />
              </div>

              <div>
                <label style={field.label("")}>TELÉFONO</label>
                <input name="contact_phone" type="tel" placeholder="+58 ..." style={field.input} />
              </div>

              <div style={{ gridColumn: "1 / -1" }}>
                <label style={field.label("")}>CORREO ELECTRÓNICO</label>
                <input name="contact_email" type="email" placeholder="correo@ejemplo.com" style={field.input} />
              </div>

              {/* Submit */}
              <div style={{ gridColumn: "1 / -1", marginTop: "0.5rem" }}>
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    background: "var(--red)",
                    color: "#fff",
                    border: "none",
                    borderRadius: 3,
                    fontFamily: "var(--mono)",
                    fontSize: "0.85rem",
                    fontWeight: 600,
                    letterSpacing: "0.1em",
                    padding: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  REGISTRAR PERSONA DESAPARECIDA
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
