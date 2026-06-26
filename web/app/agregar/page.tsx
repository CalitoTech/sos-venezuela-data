"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createPerson } from "@/lib/actions";
import { PhotoUpload } from "@/components/PhotoUpload";

const field = "w-full bg-[var(--bg-input)] border border-[var(--border)] rounded text-[var(--text)] font-mono text-sm px-3 py-2 outline-none";
const label = "block font-mono text-[0.65rem] tracking-widest text-[var(--text-faint)] mb-1.5";

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
    <main className="min-h-screen">
      <header className="border-b border-[var(--border)] bg-[#0d0d0d]">
        <div className="mx-auto max-w-[860px] px-4 sm:px-6 py-3 flex items-center gap-4 overflow-hidden">
          <Link href="/" className="font-mono text-xs text-[var(--text-dim)] no-underline shrink-0">
            ← VOLVER
          </Link>
          <span className="text-[var(--border)] shrink-0">|</span>
          <span className="font-[var(--display)] text-lg tracking-wider truncate">
            REPORTAR PERSONA DESAPARECIDA
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[860px] px-4 sm:px-6 py-8">
        <div className="bg-[var(--bg-card)] border border-[var(--border)] border-t-[var(--red)] border-t-2 rounded p-5 sm:p-8">
          <form onSubmit={handleSubmit}>
            {/* Layout: foto + campos, se apila en móvil */}
            <div className="flex flex-wrap gap-8 items-start">

              {/* Foto */}
              <div className="w-full sm:w-44 shrink-0">
                <p className={label}>FOTO</p>
                <PhotoUpload onUpload={setPhotoUrl} />
              </div>

              {/* Campos */}
              <div className="flex-1 min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div className="col-span-1 sm:col-span-2">
                  <label className={label}>NOMBRE COMPLETO *</label>
                  <input name="full_name" required placeholder="Apellidos y nombres" className={`${field} text-base`} />
                </div>

                <div>
                  <label className={label}>CÉDULA DE IDENTIDAD</label>
                  <input name="cedula" placeholder="Ej: 12345678" className={field} />
                </div>

                <div>
                  <label className={label}>EDAD</label>
                  <input name="age" type="number" min={0} max={130} placeholder="Años" className={field} />
                </div>

                <div>
                  <label className={label}>FECHA DE NACIMIENTO</label>
                  <input name="date_of_birth" type="date" className={field} />
                </div>

                <div>
                  <label className={label}>GÉNERO</label>
                  <select name="gender" className={field}>
                    <option value="">— seleccionar —</option>
                    <option value="male">Masculino</option>
                    <option value="female">Femenino</option>
                  </select>
                </div>

                <div>
                  <label className={label}>ÚLTIMO LUGAR VISTO</label>
                  <input name="last_seen_location" placeholder="Ciudad, sector, dirección..." className={field} />
                </div>

                <div>
                  <label className={label}>FECHA ÚLTIMO AVISTAMIENTO</label>
                  <input name="last_seen_date" type="date" className={field} />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className={label}>DESCRIPCIÓN FÍSICA</label>
                  <textarea name="description" rows={3} placeholder="Rasgos físicos, ropa que llevaba, señas particulares..." className={`${field} resize-y`} />
                </div>

                <div className="col-span-1 sm:col-span-2 border-t border-[var(--border)] pt-4">
                  <p className={`${label} mb-4`}>DATOS DE CONTACTO (QUIEN REPORTA)</p>
                </div>

                <div>
                  <label className={label}>NOMBRE DE CONTACTO</label>
                  <input name="contact_name" placeholder="Nombre completo" className={field} />
                </div>

                <div>
                  <label className={label}>TELÉFONO</label>
                  <input name="contact_phone" type="tel" placeholder="+58 ..." className={field} />
                </div>

                <div className="col-span-1 sm:col-span-2">
                  <label className={label}>CORREO ELECTRÓNICO</label>
                  <input name="contact_email" type="email" placeholder="correo@ejemplo.com" className={field} />
                </div>

                <div className="col-span-1 sm:col-span-2 mt-2">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[var(--red)] disabled:bg-[#881111] text-white border-none rounded font-mono text-sm font-semibold tracking-widest py-3 cursor-pointer disabled:cursor-not-allowed transition-colors"
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
