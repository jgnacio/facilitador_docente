"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 9, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 13, fontFamily: "Helvetica-Bold", marginBottom: 10 },
  // Header info table
  infoTable: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, marginBottom: 12, overflow: "hidden" },
  infoRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  infoRowLast: { flexDirection: "row" },
  infoCell: { flex: 1, paddingHorizontal: 8, paddingVertical: 5 },
  infoCellBorder: { flex: 1, paddingHorizontal: 8, paddingVertical: 5, borderRightWidth: 1, borderRightColor: "#e2e8f0" },
  infoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b", textTransform: "uppercase", marginBottom: 2 },
  infoValue: { fontSize: 9, color: "#1a1a1a", lineHeight: 1.4 },
  metaCell: { paddingHorizontal: 8, paddingVertical: 6, backgroundColor: "#f0f9ff" },
  metaLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#0ea5e9", textTransform: "uppercase", marginBottom: 2 },
  metaValue: { fontSize: 9, color: "#1a1a1a", lineHeight: 1.4 },
  bullet: { fontSize: 8, color: "#555", lineHeight: 1.4, marginLeft: 8, marginBottom: 1 },
  // Activity table
  table: { borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 4, overflow: "hidden" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f8fafc", borderBottomWidth: 1, borderBottomColor: "#e2e8f0" },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#f0f4f8" },
  tableRowLast: { flexDirection: "row" },
  th: { paddingHorizontal: 6, paddingVertical: 5, fontSize: 8, fontFamily: "Helvetica-Bold", color: "#64748b" },
  td: { paddingHorizontal: 6, paddingVertical: 6, fontSize: 8, color: "#374151", lineHeight: 1.4 },
  colNum:    { width: "5%" },
  colRecorte: { width: "15%" },
  colMeta:   { width: "20%" },
  colPlan:   { width: "42%" },
  colRecursos: { width: "18%" },
  planStep: { fontSize: 8, color: "#374151", lineHeight: 1.4, marginBottom: 2 },
});

type SecuenciaActividad = {
  numero: number;
  recorte: string;
  meta_aprendizaje: string;
  plan_aprendizaje: string[];
  recursos?: string;
};

type SecuenciaData = {
  espacio: string;
  unidad_curricular: string;
  competencias_generales: string[];
  competencias_especificas: string[];
  criterios_de_logro: string[];
  meta_aprendizaje: string;
  contenido: string;
  evaluaciones?: string;
  actividades: SecuenciaActividad[];
};

export function SecuenciaPDF({ data, nombre }: { data: SecuenciaData; nombre: string }) {
  return (
    <Document title={nombre}>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{nombre}</Text>

        {/* Tabla de encabezado curricular */}
        <View style={styles.infoTable}>
          {/* Espacio + Unidad */}
          <View style={styles.infoRow}>
            <View style={styles.infoCellBorder}>
              <Text style={styles.infoLabel}>Espacio</Text>
              <Text style={styles.infoValue}>{data.espacio}</Text>
            </View>
            <View style={styles.infoCell}>
              <Text style={styles.infoLabel}>Unidad curricular</Text>
              <Text style={styles.infoValue}>{data.unidad_curricular}</Text>
            </View>
          </View>

          {/* Competencias generales */}
          {data.competencias_generales.length > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Competencias generales</Text>
                {data.competencias_generales.map((c, i) => (
                  <Text key={i} style={styles.bullet}>- {c}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Competencias específicas */}
          {data.competencias_especificas.length > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Competencias específicas</Text>
                {data.competencias_especificas.map((c, i) => (
                  <Text key={i} style={styles.bullet}>- {c}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Criterios de logro */}
          {data.criterios_de_logro.length > 0 && (
            <View style={styles.infoRow}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Criterios de logro</Text>
                {data.criterios_de_logro.map((c, i) => (
                  <Text key={i} style={styles.bullet}>- {c}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Meta de aprendizaje */}
          {data.meta_aprendizaje && (
            <View style={styles.infoRow}>
              <View style={styles.metaCell}>
                <Text style={styles.metaLabel}>Meta de aprendizaje</Text>
                <Text style={styles.metaValue}>{data.meta_aprendizaje}</Text>
              </View>
            </View>
          )}

          {/* Contenido */}
          {data.contenido && (
            <View style={styles.infoRowLast}>
              <View style={styles.infoCell}>
                <Text style={styles.infoLabel}>Contenido</Text>
                <Text style={styles.infoValue}>{data.contenido}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Tabla de actividades */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colNum]}>ACT.</Text>
            <Text style={[styles.th, styles.colRecorte]}>Recorte</Text>
            <Text style={[styles.th, styles.colMeta]}>Meta de aprendizaje</Text>
            <Text style={[styles.th, styles.colPlan]}>Plan de aprendizaje</Text>
            <Text style={[styles.th, styles.colRecursos]}>Recursos</Text>
          </View>
          {data.actividades.map((act, i) => (
            <View key={i} style={i < data.actividades.length - 1 ? styles.tableRow : styles.tableRowLast}>
              <Text style={[styles.td, styles.colNum, { fontFamily: "Helvetica-Bold" }]}>{act.numero}.</Text>
              <Text style={[styles.td, styles.colRecorte]}>{act.recorte}</Text>
              <Text style={[styles.td, styles.colMeta]}>{act.meta_aprendizaje}</Text>
              <View style={[styles.td, styles.colPlan]}>
                {act.plan_aprendizaje.map((paso, j) => (
                  <Text key={j} style={styles.planStep}>- {paso}</Text>
                ))}
              </View>
              <Text style={[styles.td, styles.colRecursos, { color: "#666" }]}>{act.recursos ?? ""}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
