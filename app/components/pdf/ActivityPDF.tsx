"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { parseContent } from "@/app/components/activity-content";

const S = StyleSheet.create({
  page:        { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title:       { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle:    { fontSize: 9, color: "#666", marginBottom: 10 },
  section:     { marginBottom: 8 },
  label:       { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#888", textTransform: "uppercase", marginBottom: 2, letterSpacing: 0.8 },
  body:        { fontSize: 9, color: "#374151", lineHeight: 1.5 },
  metodologia: { backgroundColor: "#fff7ed", borderLeftWidth: 3, borderLeftColor: "#c2410c", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginBottom: 8 },
  metTitle:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#c2410c", marginBottom: 2 },
  metDesc:     { fontSize: 8, color: "#444" },
  table:       { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  tHead:       { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tRow:        { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  tRowLast:    { flexDirection: "row" },
  th:          { paddingHorizontal: 6, paddingVertical: 5, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b" },
  td:          { paddingHorizontal: 6, paddingVertical: 6, fontSize: 8, color: "#374151", lineHeight: 1.4 },
  tag:         { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, fontSize: 7, fontFamily: "Helvetica-Bold" },
  tagInicio:   { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  tagDesarr:   { backgroundColor: "#dcfce7", color: "#15803d" },
  tagCierre:   { backgroundColor: "#ffedd5", color: "#c2410c" },
  footer:      { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  footerRow:   { flexDirection: "row", marginBottom: 2 },
  footerBold:  { fontFamily: "Helvetica-Bold", color: "#374151", fontSize: 8 },
  footerText:  { color: "#555", fontSize: 8 },
  footerMeta:  { color: "#999", fontSize: 7, marginTop: 3 },
  actHeader:   { backgroundColor: "#f8fafc", paddingHorizontal: 8, paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: "#e2e8f0", flexDirection: "row", alignItems: "center", gap: 6 },
  actNum:      { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#c2410c" },
  actTitle:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  // column widths for moments table
  cMom: { width: "11%" },
  cDur: { width: "8%" },
  cMet: { width: "18%" },
  cAct: { width: "29%" },
  cRol: { width: "18%" },
  cRec: { width: "16%" },
});

function tagStyle(momento: string) {
  if (momento === "Inicio")     return { ...S.tag, ...S.tagInicio };
  if (momento === "Desarrollo") return { ...S.tag, ...S.tagDesarr };
  if (momento === "Cierre")     return { ...S.tag, ...S.tagCierre };
  return S.tag;
}

function MomentosTable({ momentos }: { momentos: NonNullable<ReturnType<typeof parseContent> & { type: "planificacion" }>["momentos"] }) {
  return (
    <View style={S.table}>
      <View style={S.tHead}>
        <Text style={[S.th, S.cMom]}>Momento</Text>
        <Text style={[S.th, S.cDur]}>Duración</Text>
        <Text style={[S.th, S.cMet]}>Meta</Text>
        <Text style={[S.th, S.cAct]}>Actividad</Text>
        <Text style={[S.th, S.cRol]}>Rol docente</Text>
        <Text style={[S.th, S.cRec]}>Recursos</Text>
      </View>
      {momentos.map((m, i) => (
        <View key={i} style={i < momentos.length - 1 ? S.tRow : S.tRowLast}>
          <View style={[S.td, S.cMom, { justifyContent: "flex-start" }]}>
            <Text style={tagStyle(m.momento ?? "")}>{m.momento ?? ""}</Text>
          </View>
          <Text style={[S.td, S.cDur, { color: "#888" }]}>{m.duracion ?? ""}</Text>
          <Text style={[S.td, S.cMet, { fontFamily: "Helvetica-Bold" }]}>{m.meta_aprendizaje ?? ""}</Text>
          <Text style={[S.td, S.cAct]}>{m.actividad ?? ""}</Text>
          <Text style={[S.td, S.cRol, { color: "#666" }]}>{m.rol_docente ?? ""}</Text>
          <Text style={[S.td, S.cRec, { color: "#666" }]}>{m.recursos ?? ""}</Text>
        </View>
      ))}
    </View>
  );
}

export function ActivityPDF({ title, content }: { title: string; content?: string }) {
  const parsed = parseContent(content);

  return (
    <Document title={title}>
      <Page size="A4" orientation="landscape" style={S.page}>

        {/* ── Planificación individual ───────────────────────── */}
        {parsed?.type === "planificacion" && (
          <>
            <View style={S.section}>
              <Text style={S.title}>{parsed.titulo || title}</Text>
              {parsed.grupo && <Text style={S.subtitle}>{parsed.grupo}</Text>}
            </View>

            {parsed.justificacion && (
              <View style={[S.section, { marginBottom: 6 }]}>
                <Text style={{ fontSize: 8, color: "#555", lineHeight: 1.4 }}>{parsed.justificacion}</Text>
              </View>
            )}

            {parsed.metodologia && (
              <View style={S.metodologia}>
                <Text style={S.metTitle}>{parsed.metodologia}</Text>
                {parsed.metodologia_descripcion && (
                  <Text style={S.metDesc}>{parsed.metodologia_descripcion}</Text>
                )}
              </View>
            )}

            <MomentosTable momentos={parsed.momentos} />
          </>
        )}

        {/* ── Secuencia de actividades ───────────────────────── */}
        {parsed?.type === "secuencia" && (
          <>
            <View style={S.section}>
              <Text style={S.title}>{title}</Text>
              {parsed.meta_aprendizaje && (
                <Text style={{ fontSize: 9, color: "#555", marginBottom: 4 }}>{parsed.meta_aprendizaje}</Text>
              )}
            </View>

            {parsed.actividades.map((act, idx) => {
              const hasMoments = Array.isArray(act.momentos) && act.momentos.length > 0;
              return (
                <View key={idx} style={[S.table, { marginBottom: 10 }]} wrap={false}>
                  <View style={S.actHeader}>
                    <Text style={S.actNum}>{idx + 1}.</Text>
                    <Text style={S.actTitle}>{hasMoments ? (act.titulo ?? "") : (act.recorte ?? "")}</Text>
                    {hasMoments && act.metodologia && (
                      <Text style={{ fontSize: 7, color: "#c2410c", fontFamily: "Helvetica-Bold", marginLeft: 4 }}>
                        [{act.metodologia}]
                      </Text>
                    )}
                  </View>

                  {hasMoments ? (
                    <>
                      <View style={S.tHead}>
                        <Text style={[S.th, S.cMom]}>Momento</Text>
                        <Text style={[S.th, S.cDur]}>Duración</Text>
                        <Text style={[S.th, S.cMet]}>Meta</Text>
                        <Text style={[S.th, S.cAct]}>Actividad</Text>
                        <Text style={[S.th, S.cRol]}>Rol docente</Text>
                        <Text style={[S.th, S.cRec]}>Recursos</Text>
                      </View>
                      {act.momentos!.map((m, j) => (
                        <View key={j} style={j < act.momentos!.length - 1 ? S.tRow : S.tRowLast}>
                          <View style={[S.td, S.cMom, { justifyContent: "flex-start" }]}>
                            <Text style={tagStyle(m.momento ?? "")}>{m.momento ?? ""}</Text>
                          </View>
                          <Text style={[S.td, S.cDur, { color: "#888" }]}>{m.duracion ?? ""}</Text>
                          <Text style={[S.td, S.cMet, { fontFamily: "Helvetica-Bold" }]}>{m.meta_aprendizaje ?? ""}</Text>
                          <Text style={[S.td, S.cAct]}>{m.actividad ?? ""}</Text>
                          <Text style={[S.td, S.cRol, { color: "#666" }]}>{m.rol_docente ?? ""}</Text>
                          <Text style={[S.td, S.cRec, { color: "#666" }]}>{m.recursos ?? ""}</Text>
                        </View>
                      ))}
                    </>
                  ) : (
                    <View style={{ padding: 8 }}>
                      {act.meta_aprendizaje && (
                        <View style={[S.footerRow, { marginBottom: 4 }]}>
                          <Text style={[S.footerBold, { marginRight: 4 }]}>Meta: </Text>
                          <Text style={S.footerText}>{act.meta_aprendizaje}</Text>
                        </View>
                      )}
                      {Array.isArray(act.plan_aprendizaje) && act.plan_aprendizaje.map((paso, k) => (
                        <Text key={k} style={{ fontSize: 8, color: "#374151", marginBottom: 2 }}>• {paso}</Text>
                      ))}
                    </View>
                  )}

                  {(act.ce_codigo || act.criterio_de_logro) && (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 5, borderTopWidth: 1, borderTopColor: "#f0f4f8", backgroundColor: "#fafafa" }}>
                      {act.ce_codigo && (
                        <Text style={{ fontSize: 7, color: "#555" }}>
                          <Text style={{ fontFamily: "Helvetica-Bold" }}>{act.ce_codigo}</Text>
                          {act.ce_texto ? ` — ${act.ce_texto}` : ""}
                        </Text>
                      )}
                      {act.criterio_de_logro && (
                        <Text style={{ fontSize: 7, color: "#777", marginTop: 1 }}>
                          <Text style={{ fontFamily: "Helvetica-Bold" }}>Criterio: </Text>
                          {act.criterio_de_logro}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </>
        )}

        {/* ── Contenido plano (markdown/texto) ──────────────── */}
        {(!parsed || parsed.type === "raw") && (
          <>
            <Text style={S.title}>{title}</Text>
            {parsed?.type === "raw" && (
              <Text style={S.body}>{parsed.text}</Text>
            )}
          </>
        )}

      </Page>
    </Document>
  );
}
