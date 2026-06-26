"use client";

import { useState } from "react";

const inputStyle = {
  background: "var(--bg-input)",
  border: "1px solid var(--border)",
  borderRadius: 3,
  color: "var(--text)",
  fontFamily: "var(--mono)",
  fontSize: "0.82rem",
  padding: "0.55rem 0.8rem",
  width: "100%",
  boxSizing: "border-box" as const,
};

interface Props {
  currentStatus: string;
  currentNotes: string | null;
  action: (formData: FormData) => Promise<void>;
}

export function UpdateStatusForm({ currentStatus, currentNotes, action }: Props) {
  const [status, setStatus] = useState(currentStatus);

  return (
    <form action={action} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <select
        name="status"
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        style={inputStyle}
      >
        <option value="missing">No localizado</option>
        <option value="found">Localizado</option>
      </select>

      <textarea
        name="status_notes"
        rows={2}
        defaultValue={currentNotes ?? ""}
        placeholder="Notas sobre el cambio de estado..."
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {status === "found" && (
        <>
          <p style={{ fontFamily: "var(--mono)", fontSize: "0.6rem", color: "var(--text-faint)", letterSpacing: "0.12em", margin: 0 }}>
            QUIÉN LO ENCONTRÓ
          </p>
          <input
            name="found_by"
            type="text"
            placeholder="Nombre de quien lo localizó"
            style={inputStyle}
          />
          <input
            name="found_contact"
            type="text"
            placeholder="Teléfono / correo de contacto"
            style={inputStyle}
          />
          <input
            name="found_hospital"
            type="text"
            placeholder="Hospital o refugio (si aplica)"
            style={inputStyle}
          />
        </>
      )}

      <button
        type="submit"
        style={{
          background: "transparent",
          border: "1px solid var(--border-hi)",
          borderRadius: 3,
          color: "var(--text)",
          fontFamily: "var(--mono)",
          fontSize: "0.75rem",
          fontWeight: 600,
          letterSpacing: "0.08em",
          padding: "0.55rem",
          cursor: "pointer",
        }}
      >
        GUARDAR CAMBIO
      </button>
    </form>
  );
}
