"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { parseContent } from "@/app/components/activity-content";

const S = StyleSheet.create({
  page:        { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title:       { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle:    { fontSize: 9, color: "#666", marginBottom: 12 },
  actBlock:    { marginBottom: 14 },
  actTitle:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginBottom: 2 },
  actMet:      { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#c2410c", marginBottom: 4 },
  actDesc:     { fontSize: 8, color: "#555", marginBottom: 4 },
  table:       { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden", marginBottom: 4 },
  tHead:       { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tRow:        { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  tRowLast:    { flexDirection: "row" },
  th:          { paddingHorizontal: 6, paddingVertical: 4, fontSize: 7, fontFamily: "Helvetica-Bold", color: "#64748b" },
  td:          { paddingHorizontal: 6, paddingVertical: 5, fontSize: 8, color: "#374151", lineHeight: 1.4 },
  tag:         { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, fontSize: 7, fontFamily: "Helvetica-Bold" },
  tagInicio:   { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  tagDesarr:   { backgroundColor: "#dcfce7", color: "#15803d" },
  tagCierre:   { backgroundColor: "#ffedd5", color: "#c2410c" },
  footer:      { paddingHorizontal: 6, paddingVertical: 4, borderTopWidth: 1, borderTopColor: "#f0f4f8", backgroundColor: "#fafafa" },
  divider:     { height: 1, backgroundColor: "#e2e8f0", marginVertical: 8 },
  cMom: { width: "11%" }, cDur: { width: "8%" }, cMet: { width: "18%" },
  cAct: { width: "29%" }, cRol: { width: "18%" }, cRec: { width: "16%" },
  watermark: {
    position: "absolute",
    bottom: 0, left: 0, right: 0, top: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  watermarkText: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: "#94a3b8",
    opacity: 0.14,
    transform: "rotate(-30deg)",
    textAlign: "center",
  },
});

function Watermark() {
  return (
    <View style={S.watermark}>
      <Text style={S.watermarkText}>
        Planificación generada con Facilitador Docente{"\n"}facilitadordocente.com
      </Text>
    </View>
  );
}

function tagStyle(m: string) {
  if (m === "Inicio")     return { ...S.tag, ...S.tagInicio };
  if (m === "Desarrollo") return { ...S.tag, ...S.tagDesarr };
  if (m === "Cierre")     return { ...S.tag, ...S.tagCierre };
  return S.tag;
}

type Seq = { name: string; learning_goal?: string; start_date?: string; end_date?: string };
type Act = { title: string; raw_content?: string; order?: number };

export function SequenceExportPDF({
  sequence,
  activities,
  showWatermark = false,
}: {
  sequence: Seq;
  activities: Act[];
  showWatermark?: boolean;
}) {
  const sorted = [...activities].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <Document title={sequence.name}>
      <Page size="A4" orientation="landscape" style={S.page}>
        {showWatermark && <Watermark />}

        {/* Header */}
        <View style={{ marginBottom: 12 }}>
          <Text style={S.title}>{sequence.name}</Text>
          {sequence.learning_goal && <Text style={S.subtitle}>{sequence.learning_goal}</Text>}
        </View>

        {sorted.map((act, idx) => {
          const parsed = parseContent(act.raw_content);
          return (
            <View key={idx} style={S.actBlock} wrap={false}>
              <View style={S.divider} />

              {/* Activity header */}
              <Text style={S.actTitle}>{idx + 1}. {act.title}</Text>

              {parsed?.type === "planificacion" && (
                <>
                  {parsed.metodologia && (
                    <Text style={S.actMet}>{parsed.metodologia}{parsed.metodologia_descripcion ? ` — ${parsed.metodologia_descripcion}` : ""}</Text>
                  )}
                  {parsed.justificacion && (
                    <Text style={S.actDesc}>{parsed.justificacion}</Text>
                  )}
                  <View style={S.table}>
                    <View style={S.tHead}>
                      <Text style={[S.th, S.cMom]}>Momento</Text>
                      <Text style={[S.th, S.cDur]}>Duración</Text>
                      <Text style={[S.th, S.cMet]}>Meta</Text>
                      <Text style={[S.th, S.cAct]}>Actividad</Text>
                      <Text style={[S.th, S.cRol]}>Rol docente</Text>
                      <Text style={[S.th, S.cRec]}>Recursos</Text>
                    </View>
                    {parsed.momentos.map((m, j) => (
                      <View key={j} style={j < parsed.momentos.length - 1 ? S.tRow : S.tRowLast}>
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
                </>
              )}

              {parsed?.type === "secuencia" && parsed.actividades.map((a, k) => {
                const hasMom = Array.isArray(a.momentos) && a.momentos.length > 0;
                return (
                  <View key={k} style={{ marginBottom: 6 }}>
                    <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: "#555", marginBottom: 2 }}>
                      {k + 1}. {hasMom ? (a.titulo ?? "") : (a.recorte ?? "")}
                    </Text>
                    {hasMom && (
                      <View style={S.table}>
                        <View style={S.tHead}>
                          <Text style={[S.th, S.cMom]}>Momento</Text>
                          <Text style={[S.th, S.cDur]}>Duración</Text>
                          <Text style={[S.th, S.cMet]}>Meta</Text>
                          <Text style={[S.th, S.cAct]}>Actividad</Text>
                          <Text style={[S.th, S.cRol]}>Rol docente</Text>
                          <Text style={[S.th, S.cRec]}>Recursos</Text>
                        </View>
                        {a.momentos!.map((m, jj) => (
                          <View key={jj} style={jj < a.momentos!.length - 1 ? S.tRow : S.tRowLast}>
                            <View style={[S.td, S.cMom]}><Text style={tagStyle(m.momento ?? "")}>{m.momento ?? ""}</Text></View>
                            <Text style={[S.td, S.cDur, { color: "#888" }]}>{m.duracion ?? ""}</Text>
                            <Text style={[S.td, S.cMet, { fontFamily: "Helvetica-Bold" }]}>{m.meta_aprendizaje ?? ""}</Text>
                            <Text style={[S.td, S.cAct]}>{m.actividad ?? ""}</Text>
                            <Text style={[S.td, S.cRol, { color: "#666" }]}>{m.rol_docente ?? ""}</Text>
                            <Text style={[S.td, S.cRec, { color: "#666" }]}>{m.recursos ?? ""}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {(!parsed || parsed.type === "raw") && parsed?.type === "raw" && (
                <Text style={{ fontSize: 8, color: "#555", lineHeight: 1.5 }}>{parsed.text}</Text>
              )}
            </View>
          );
        })}

      </Page>
    </Document>
  );
}
