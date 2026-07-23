"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { FileText } from "lucide-react";

import type { PdfRef } from "../../lib/pdf-refs";

// pdf.js sólo corre en el browser y pesa bastante: el visor se carga recién
// cuando la docente abre una cita.
const PdfCitationViewer = dynamic(
  () => import("./PdfCitationViewer").then((m) => m.PdfCitationViewer),
  { ssr: false }
);

export function CitationBadges({ refs }: { refs: PdfRef[] }) {
  const [citaAbierta, setCitaAbierta] = useState<PdfRef | null>(null);

  if (refs.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2 mt-1">
        {refs.map((ref) => (
          <button
            key={`${ref.doc_id}#${ref.page}`}
            type="button"
            onClick={() => setCitaAbierta(ref)}
            title={ref.excerpt || undefined}
            className="inline-flex items-center gap-1.5 rounded-xl transition-opacity hover:opacity-80"
            style={{
              padding: "0.25rem 0.75rem",
              background: "var(--tertiary-subtle)",
              color: "var(--tertiary)",
              fontSize: "0.72rem",
              fontWeight: 600,
              fontFamily: "var(--font-body)",
            }}
          >
            <FileText className="w-3.5 h-3.5" />
            {ref.label}
          </button>
        ))}
      </div>

      {citaAbierta && (
        <PdfCitationViewer cita={citaAbierta} onClose={() => setCitaAbierta(null)} />
      )}
    </>
  );
}
