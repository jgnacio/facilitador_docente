/** Citas al currículo oficial EBI/ANEP que el agente adjunta a sus respuestas. */
export type PdfRef = {
  doc_id: string;
  page: number;
  ciclo?: string;
  label: string;
  excerpt?: string;
};

/**
 * Filtra las refs que llegan del agente. Una cita sin `doc_id` o sin `page` no se
 * puede abrir en el visor, así que se descarta en vez de renderizar un badge muerto.
 */
export function normalizeRefs(value: unknown): PdfRef[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const refs: PdfRef[] = [];

  for (const item of value) {
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;
    if (typeof r.doc_id !== "string" || !r.doc_id) continue;
    if (typeof r.page !== "number" || !Number.isFinite(r.page) || r.page < 1) continue;

    const key = `${r.doc_id}#${r.page}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const ciclo = typeof r.ciclo === "string" ? r.ciclo : "";
    refs.push({
      doc_id: r.doc_id,
      page: r.page,
      ciclo,
      label:
        typeof r.label === "string" && r.label
          ? r.label
          : `${ciclo || "Currículo oficial"} — p.${r.page}`,
      excerpt: typeof r.excerpt === "string" ? r.excerpt : "",
    });
  }

  return refs;
}
