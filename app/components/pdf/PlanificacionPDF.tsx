"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  subtitle: { fontSize: 9, color: "#666", marginBottom: 12 },
  section: { marginBottom: 8 },
  tag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10, fontSize: 8, fontFamily: "Helvetica-Bold" },
  tagInicio:     { backgroundColor: "#dbeafe", color: "#1d4ed8" },
  tagDesarrollo: { backgroundColor: "#dcfce7", color: "#15803d" },
  tagCierre:     { backgroundColor: "#ffedd5", color: "#c2410c" },
  metodologia: { backgroundColor: "#eff6ff", borderLeftWidth: 3, borderLeftColor: "#3b82f6", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, marginBottom: 8 },
  metodologiaTitle: { fontSize: 9, fontFamily: "Helvetica-Bold", color: "#3b82f6", marginBottom: 2 },
  metodologiaDesc: { fontSize: 8, color: "#444" },
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  tableRowLast: { flexDirection: "row" },
  th: { paddingHorizontal: 6, paddingVertical: 5, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b" },
  td: { paddingHorizontal: 6, paddingVertical: 6, fontSize: 8, color: "#374151", lineHeight: 1.4 },
  colMomento:   { width: "12%" },
  colDuracion:  { width: "9%" },
  colMeta:      { width: "18%" },
  colActividad: { width: "27%" },
  colRol:       { width: "18%" },
  colRecursos:  { width: "16%" },
  footer: { marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#e2e8f0" },
  footerLabel: { fontFamily: "Helvetica-Bold", color: "#374151" },
  footerText:  { color: "#555" },
  footerMeta:  { color: "#999", marginTop: 2 },
  row: { flexDirection: "row", marginBottom: 2 },
  watermark: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    top: 0,
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
    <View style={styles.watermark}>
      <Text style={styles.watermarkText}>
        Planificación generada con Facilitador Docente{"\n"}facilitadordocente.com
      </Text>
    </View>
  );
}

type PlanMomento = {
  momento: string;
  duracion: string;
  meta_aprendizaje?: string;
  actividad: string;
  rol_docente: string;
  recursos: string;
};

type PlanificacionData = {
  titulo: string;
  grupo: string;
  justificacion?: string;
  metodologia?: string;
  metodologia_descripcion?: string;
  momentos: PlanMomento[];
  ce_codigo?: string;
  ce_texto?: string;
  contenido?: string;
  criterio_de_logro?: string;
  espacio?: string;
  unidad?: string;
  tramo?: number;
  competencias_mcn?: string[];
};

const tagStyle = (momento: string) => {
  if (momento === "Inicio")     return { ...styles.tag, ...styles.tagInicio };
  if (momento === "Desarrollo") return { ...styles.tag, ...styles.tagDesarrollo };
  if (momento === "Cierre")     return { ...styles.tag, ...styles.tagCierre };
  return styles.tag;
};

export function PlanificacionPDF({
  data,
  nombre,
  showWatermark = false,
}: {
  data: PlanificacionData;
  nombre: string;
  showWatermark?: boolean;
}) {
  return (
    <Document title={nombre}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        {showWatermark && <Watermark />}
        {/* Encabezado */}
        <View style={styles.section}>
          <Text style={styles.title}>{data.titulo || nombre}</Text>
          {data.grupo && <Text style={styles.subtitle}>{data.grupo}</Text>}
        </View>

        {/* Justificación */}
        {data.justificacion && (
          <View style={[styles.section, { marginBottom: 6 }]}>
            <Text style={{ fontSize: 8, color: "#555", lineHeight: 1.4 }}>{data.justificacion}</Text>
          </View>
        )}

        {/* Metodología */}
        {data.metodologia && (
          <View style={styles.metodologia}>
            <Text style={styles.metodologiaTitle}>{data.metodologia}</Text>
            {data.metodologia_descripcion && (
              <Text style={styles.metodologiaDesc}>{data.metodologia_descripcion}</Text>
            )}
          </View>
        )}

        {/* Tabla de momentos */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colMomento]}>Momento</Text>
            <Text style={[styles.th, styles.colDuracion]}>Duración</Text>
            <Text style={[styles.th, styles.colMeta]}>Meta de aprendizaje</Text>
            <Text style={[styles.th, styles.colActividad]}>Actividad</Text>
            <Text style={[styles.th, styles.colRol]}>Rol docente</Text>
            <Text style={[styles.th, styles.colRecursos]}>Recursos</Text>
          </View>
          {data.momentos.map((m, i) => (
            <View key={i} style={i < data.momentos.length - 1 ? styles.tableRow : styles.tableRowLast}>
              <View style={[styles.td, styles.colMomento, { justifyContent: "flex-start" }]}>
                <Text style={tagStyle(m.momento)}>{m.momento}</Text>
              </View>
              <Text style={[styles.td, styles.colDuracion, { color: "#888" }]}>{m.duracion}</Text>
              <Text style={[styles.td, styles.colMeta, { fontFamily: "Helvetica-Bold" }]}>{m.meta_aprendizaje ?? ""}</Text>
              <Text style={[styles.td, styles.colActividad]}>{m.actividad}</Text>
              <Text style={[styles.td, styles.colRol, { color: "#666" }]}>{m.rol_docente}</Text>
              <Text style={[styles.td, styles.colRecursos, { color: "#666" }]}>{m.recursos}</Text>
            </View>
          ))}
        </View>

        {/* Referencias normativas */}
        {(data.ce_codigo || data.contenido) && (
          <View style={styles.footer}>
            {data.ce_codigo && (
              <View style={styles.row}>
                <Text style={styles.footerLabel}>{data.ce_codigo}</Text>
                {data.ce_texto && <Text style={styles.footerText}> — {data.ce_texto}</Text>}
              </View>
            )}
            {data.contenido && (
              <View style={styles.row}>
                <Text style={styles.footerLabel}>Contenido: </Text>
                <Text style={styles.footerText}>{data.contenido}</Text>
              </View>
            )}
            {data.criterio_de_logro && (
              <View style={styles.row}>
                <Text style={styles.footerLabel}>Criterio de logro: </Text>
                <Text style={styles.footerText}>{data.criterio_de_logro}</Text>
              </View>
            )}
            <Text style={styles.footerMeta}>
              {[data.espacio, data.unidad, data.tramo ? `Tramo ${data.tramo}` : ""].filter(Boolean).join(" · ")}
            </Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
