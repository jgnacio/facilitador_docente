"use client";

// ── Shared types ──────────────────────────────────────────────────────────────

export type Momento = {
  momento?: string;
  duracion?: string;
  meta_aprendizaje?: string;
  actividad?: string;
  rol_docente?: string;
  recursos?: string;
};

export type SecuenciaActividad = {
  titulo?: string;
  metodologia?: string;
  momentos?: Momento[];
  ce_codigo?: string;
  ce_texto?: string;
  criterio_de_logro?: string;
  numero?: number;
  recorte?: string;
  meta_aprendizaje?: string;
  plan_aprendizaje?: string[];
  recursos?: string;
};

export type ParsedContent =
  | { type: "planificacion"; titulo?: string; metodologia?: string; metodologia_descripcion?: string; grupo?: string; justificacion?: string; momentos: Momento[] }
  | { type: "secuencia"; meta_aprendizaje?: string; evaluaciones?: string; actividades: SecuenciaActividad[] }
  | { type: "raw"; text: string }
  | null;

export function parseContent(raw?: string): ParsedContent {
  if (!raw) return null;
  try {
    const d = JSON.parse(raw);
    if (!d || typeof d !== "object") return { type: "raw", text: raw };
    if (Array.isArray(d.momentos)) {
      return { type: "planificacion", titulo: d.titulo, metodologia: d.metodologia, metodologia_descripcion: d.metodologia_descripcion, grupo: d.grupo, justificacion: d.justificacion, momentos: d.momentos };
    }
    if (Array.isArray(d.actividades)) {
      return { type: "secuencia", meta_aprendizaje: d.meta_aprendizaje, evaluaciones: d.evaluaciones, actividades: d.actividades };
    }
    return { type: "raw", text: raw };
  } catch {
    return { type: "raw", text: raw };
  }
}

// ── MomentoTable ──────────────────────────────────────────────────────────────

function MomentoTable({ fields, onSurface, onSurfaceVariant }: {
  fields: { label: string; value: string; highlight?: boolean }[];
  onSurface: string;
  onSurfaceVariant: string;
}) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <tbody>
        {fields.map(({ label, value, highlight }, i) => (
          <tr key={i} style={{ borderTop: i > 0 ? "1px solid rgba(127,127,127,0.07)" : undefined }}>
            <td style={{ width: "108px", verticalAlign: "top", padding: "0.55rem 0.75rem 0.55rem 0", fontSize: "0.67rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase" as const, letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans)", opacity: 0.6, whiteSpace: "nowrap" as const }}>
              {label}
            </td>
            <td style={{ verticalAlign: "top", padding: "0.55rem 0 0.55rem 0.5rem", fontSize: "0.82rem", color: highlight ? onSurface : onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55, fontWeight: highlight ? 500 : 400 }}>
              {value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function MomentoField({ label, value, onSurface, onSurfaceVariant }: {
  label: string; value: string; onSurface: string; onSurfaceVariant: string;
}) {
  return (
    <div>
      <p style={{ fontSize: "0.68rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans)", opacity: 0.7, marginBottom: "0.2rem" }}>{label}</p>
      <p style={{ fontSize: "0.82rem", color: onSurface, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55 }}>{value}</p>
    </div>
  );
}

// ── MomentoCard ───────────────────────────────────────────────────────────────

export function MomentoCard({ momento, onSurface, onSurfaceVariant, primaryColor }: {
  momento: Momento; onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  const fields: { label: string; value: string; highlight?: boolean }[] = [
    momento.meta_aprendizaje ? { label: "Meta", value: momento.meta_aprendizaje } : null,
    momento.actividad ? { label: "Actividad", value: momento.actividad, highlight: true } : null,
    momento.rol_docente ? { label: "Rol docente", value: momento.rol_docente } : null,
    momento.recursos ? { label: "Recursos", value: momento.recursos } : null,
  ].filter(Boolean) as { label: string; value: string; highlight?: boolean }[];

  return (
    <div style={{ background: "var(--surface)", borderRadius: "1.25rem", padding: "1.25rem 1.5rem", border: "1px solid rgba(127,127,127,0.08)" }}>
      <div className="flex items-center justify-between mb-3">
        <span style={{ fontSize: "0.82rem", fontWeight: 700, color: primaryColor, fontFamily: "var(--font-fraunces)", letterSpacing: "-0.01em" }}>
          {momento.momento}
        </span>
        {momento.duracion && (
          <span style={{ fontSize: "0.72rem", fontWeight: 600, color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.7 }}>
            {momento.duracion}
          </span>
        )}
      </div>
      <MomentoTable fields={fields} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} />
    </div>
  );
}

// ── SubActividadCard ──────────────────────────────────────────────────────────

export function SubActividadCard({ actividad, onSurface, onSurfaceVariant, primaryColor }: {
  actividad: SecuenciaActividad; onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  const isNew = Array.isArray(actividad.momentos) && actividad.momentos.length > 0;
  return (
    <div style={{ background: "var(--surface)", borderRadius: "1.25rem", padding: "1.25rem 1.5rem", border: "1px solid rgba(127,127,127,0.08)" }}>
      <div className="flex items-center gap-3 mb-3">
        {!isNew && actividad.numero !== undefined && (
          <div style={{ width: "30px", height: "30px", borderRadius: "0.6rem", flexShrink: 0, background: "rgba(0,0,0,0.04)", display: "flex", alignItems: "center", justifyContent: "center", color: onSurfaceVariant, fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-dm-sans)" }}>
            {actividad.numero}
          </div>
        )}
        <p style={{ fontWeight: 700, fontSize: "0.9rem", fontFamily: "var(--font-dm-sans)", color: onSurface, flex: 1, minWidth: 0 }}>
          {isNew ? (actividad.titulo ?? "") : (actividad.recorte ?? "")}
        </p>
        {isNew && actividad.metodologia && (
          <span style={{ fontSize: "0.7rem", fontWeight: 700, padding: "0.2rem 0.6rem", borderRadius: "999px", background: `color-mix(in srgb, ${primaryColor} 12%, transparent)`, color: primaryColor, fontFamily: "var(--font-dm-sans)", flexShrink: 0 }}>
            {actividad.metodologia}
          </span>
        )}
      </div>

      {isNew && (
        <div className="flex flex-col gap-2 mt-2">
          {actividad.momentos!.map((m, i) => (
            <div key={i} style={{ background: "rgba(0,0,0,0.02)", borderRadius: "0.75rem", padding: "0.75rem 1rem" }}>
              <div className="flex items-center gap-2 mb-1">
                <span style={{ fontSize: "0.65rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", padding: "0.15rem 0.5rem", borderRadius: "999px", background: `color-mix(in srgb, ${primaryColor} 10%, transparent)`, color: primaryColor, fontFamily: "var(--font-dm-sans)" }}>
                  {m.momento}
                </span>
                <span style={{ fontSize: "0.72rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)" }}>{m.duracion}</span>
              </div>
              {m.meta_aprendizaje && <p style={{ fontSize: "0.78rem", fontWeight: 600, color: onSurface, fontFamily: "var(--font-dm-sans)", marginBottom: "0.25rem" }}>{m.meta_aprendizaje}</p>}
              <p style={{ fontSize: "0.8rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5 }}>{m.actividad}</p>
              {m.recursos && <p style={{ fontSize: "0.72rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", marginTop: "0.25rem", opacity: 0.7 }}>📎 {m.recursos}</p>}
            </div>
          ))}
        </div>
      )}

      {!isNew && actividad.meta_aprendizaje && (
        <MomentoField label="Meta" value={actividad.meta_aprendizaje} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} />
      )}

      {!isNew && actividad.plan_aprendizaje && actividad.plan_aprendizaje.length > 0 && (
        <div className="mt-2.5">
          <p style={{ fontSize: "0.68rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: "var(--font-dm-sans)", opacity: 0.7, marginBottom: "0.5rem" }}>
            Plan de aprendizaje
          </p>
          <ol className="flex flex-col gap-1.5" style={{ paddingLeft: "1.25rem", margin: 0, listStyle: "decimal" }}>
            {actividad.plan_aprendizaje.map((step, i) => (
              <li key={i} style={{ fontSize: "0.8rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.5, paddingLeft: "0.25rem" }}>
                {step}
              </li>
            ))}
          </ol>
        </div>
      )}

      {!isNew && actividad.recursos && (
        <div className="mt-2.5">
          <MomentoField label="Recursos" value={actividad.recursos} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} />
        </div>
      )}
    </div>
  );
}

// ── ContentPanel ──────────────────────────────────────────────────────────────

export function ContentPanel({ parsed, onSurface, onSurfaceVariant, primaryColor }: {
  parsed: ParsedContent; onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  if (!parsed) {
    return (
      <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "2rem", border: "1px solid rgba(127,127,127,0.08)" }}>
        <p style={{ color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", fontSize: "0.9rem", opacity: 0.7 }}>
          Esta actividad no tiene contenido guardado todavía.
        </p>
      </div>
    );
  }

  if (parsed.type === "planificacion") {
    return (
      <div className="flex flex-col gap-4">
        {parsed.metodologia && (
          <div style={{ background: "var(--surface)", borderRadius: "1rem", padding: "0.875rem 1.25rem", border: "1px solid rgba(127,127,127,0.1)" }}>
            <span style={{ fontSize: "0.72rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-fraunces)", opacity: 0.7 }}>
              Metodología
            </span>
            <p style={{ fontSize: "0.9rem", fontWeight: 700, color: onSurface, fontFamily: "var(--font-dm-sans)", marginTop: "0.2rem" }}>{parsed.metodologia}</p>
            {parsed.metodologia_descripcion && (
              <p style={{ fontSize: "0.78rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.85, marginTop: "0.3rem", lineHeight: 1.55 }}>{parsed.metodologia_descripcion}</p>
            )}
          </div>
        )}
        {parsed.justificacion && (
          <div style={{ background: "var(--surface-container-low)", borderRadius: "1rem", padding: "1rem 1.25rem", border: "1px solid rgba(127,127,127,0.08)" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans)", opacity: 0.8, marginBottom: "0.4rem" }}>Justificación</p>
            <p style={{ fontSize: "0.82rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.6 }}>{parsed.justificacion}</p>
          </div>
        )}
        {parsed.momentos.map((m, i) => (
          <MomentoCard key={i} momento={m} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} />
        ))}
      </div>
    );
  }

  if (parsed.type === "secuencia") {
    return (
      <div className="flex flex-col gap-4">
        {parsed.meta_aprendizaje && (
          <div style={{ background: "var(--surface)", borderRadius: "1rem", padding: "0.875rem 1.25rem", border: "1px solid rgba(127,127,127,0.1)" }}>
            <p style={{ fontSize: "0.72rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-fraunces)", marginBottom: "0.3rem", opacity: 0.7 }}>
              Meta de aprendizaje global
            </p>
            <p style={{ fontSize: "0.875rem", color: onSurface, fontFamily: "var(--font-dm-sans)", lineHeight: 1.6 }}>{parsed.meta_aprendizaje}</p>
          </div>
        )}
        {parsed.actividades.map((a, i) => (
          <SubActividadCard key={i} actividad={a} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} />
        ))}
      </div>
    );
  }

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.5rem", border: "1px solid rgba(127,127,127,0.08)" }}>
      <p style={{ fontSize: "0.72rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans)", opacity: 0.8, marginBottom: "0.75rem" }}>Contenido</p>
      <pre style={{ fontSize: "0.8rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.6, margin: 0 }}>
        {parsed.text}
      </pre>
    </div>
  );
}

// ── ActivityMiniView — render real escalado para previews ─────────────────────

export function ActivityMiniView({ title, rawContent }: { title: string; rawContent?: string }) {
  const parsed = parseContent(rawContent);
  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";

  return (
    <div style={{ padding: "1.25rem 1.5rem", background: "var(--surface-container-low)", minHeight: "100%" }}>
      <h2 style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", color: onSurface, marginBottom: "1rem", lineHeight: 1.3, letterSpacing: "-0.02em" }}>
        {title}
      </h2>
      <ContentPanel parsed={parsed} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} />
    </div>
  );
}
