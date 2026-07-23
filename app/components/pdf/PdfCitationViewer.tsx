"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Minus, Plus, X } from "lucide-react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import { getCurriculoPdfUrl } from "../../api-actions";
import type { PdfRef } from "../../lib/pdf-refs";

// El worker de pdf.js se resuelve desde el bundle — sin CDN, así funciona offline
// y no depende de que la versión remota coincida con la del paquete instalado.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const SCALE_STEP = 0.25;

/** Normaliza para comparar: sin acentos, sin mayúsculas, con espacios colapsados. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export function PdfCitationViewer({
  cita,
  onClose,
}: {
  cita: PdfRef;
  onClose: () => void;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(cita.page);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    setError(null);

    getCurriculoPdfUrl(cita.doc_id).then((signed) => {
      if (cancelled) return;
      if (signed) setUrl(signed);
      else setError("No se pudo abrir el documento del currículo oficial.");
    });

    return () => {
      cancelled = true;
    };
  }, [cita.doc_id]);

  // Al cambiar de cita el visor debe reposicionarse en la página nueva.
  useEffect(() => setPage(cita.page), [cita.page]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const target = useMemo(() => normalize(cita.excerpt ?? ""), [cita.excerpt]);

  // react-pdf inyecta el retorno como HTML en la capa de texto: cada fragmento que
  // forme parte del pasaje citado se envuelve en <mark>. Los fragmentos muy cortos
  // se saltean porque coincidirían con cualquier cosa ("de", "la").
  const customTextRenderer = useCallback(
    ({ str }: { str: string }) => {
      const fragment = normalize(str);
      const isCited = target.length > 0 && fragment.length > 3 && target.includes(fragment);
      return isCited
        ? `<mark class="pdf-cita-resaltada">${escapeHtml(str)}</mark>`
        : escapeHtml(str);
    },
    [target]
  );

  const isCitedPage = page === cita.page;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex flex-col w-full max-w-3xl rounded-2xl overflow-hidden"
        style={{ background: "var(--surface)", maxHeight: "92vh" }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={`Currículo oficial, ${cita.label}`}
      >
        <header
          className="flex items-center justify-between gap-3 px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--outline-variant)" }}
        >
          <div className="min-w-0">
            <p
              className="truncate"
              style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--on-surface)" }}
            >
              {cita.ciclo || "Currículo oficial"}
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)" }}>
              Cita en la página {cita.page}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="p-1.5 rounded-lg transition-opacity hover:opacity-70"
            style={{ color: "var(--on-surface-variant)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        <div
          className="flex-1 overflow-auto flex justify-center p-4"
          style={{ background: "var(--surface-container-low)" }}
        >
          {error ? (
            <p className="self-center text-center" style={{ color: "var(--error)" }}>
              {error}
            </p>
          ) : !url ? (
            <p className="self-center" style={{ color: "var(--on-surface-variant)" }}>
              Abriendo el documento…
            </p>
          ) : (
            <Document
              file={url}
              onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
              onLoadError={() => setError("No se pudo leer el PDF del currículo oficial.")}
              loading={
                <p style={{ color: "var(--on-surface-variant)" }}>Cargando páginas…</p>
              }
            >
              <Page
                pageNumber={page}
                scale={scale}
                customTextRenderer={isCitedPage ? customTextRenderer : undefined}
                renderAnnotationLayer={false}
              />
            </Document>
          )}
        </div>

        <footer
          className="flex items-center justify-between gap-4 px-4 py-2.5 shrink-0"
          style={{ borderTop: "1px solid var(--outline-variant)" }}
        >
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              aria-label="Página anterior"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span
              style={{ fontSize: "0.78rem", color: "var(--on-surface-variant)", minWidth: "5rem", textAlign: "center" }}
            >
              {page} / {totalPages || "…"}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => (totalPages ? Math.min(totalPages, p + 1) : p + 1))}
              disabled={totalPages > 0 && page >= totalPages}
              aria-label="Página siguiente"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {!isCitedPage && (
            <button
              type="button"
              onClick={() => setPage(cita.page)}
              style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)" }}
            >
              Volver a la cita
            </button>
          )}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(MIN_SCALE, s - SCALE_STEP))}
              disabled={scale <= MIN_SCALE}
              aria-label="Alejar"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <Minus className="w-4 h-4" />
            </button>
            <span style={{ fontSize: "0.78rem", color: "var(--on-surface-variant)", minWidth: "3rem", textAlign: "center" }}>
              {Math.round(scale * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setScale((s) => Math.min(MAX_SCALE, s + SCALE_STEP))}
              disabled={scale >= MAX_SCALE}
              aria-label="Acercar"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70 disabled:opacity-30"
              style={{ color: "var(--on-surface-variant)" }}
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
