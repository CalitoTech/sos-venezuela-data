import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SOS Venezuela — Personas Desaparecidas",
  description: "Registro centralizado de personas desaparecidas tras el terremoto en Venezuela (2026).",
  viewport: "width=device-width, initial-scale=1",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
