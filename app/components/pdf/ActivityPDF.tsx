"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 36, fontSize: 10, fontFamily: "Helvetica", color: "#1a1a1a" },
  title: { fontSize: 16, fontFamily: "Helvetica-Bold", marginBottom: 16 },
  sectionLabel: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#64748b", marginBottom: 8, textTransform: "uppercase" },
  content: { fontSize: 10, color: "#374151", lineHeight: 1.6 },
});

export function ActivityPDF({
  title,
  content,
}: {
  title: string;
  content?: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>

        {content && (
          <View>
            <Text style={styles.sectionLabel}>Contenido</Text>
            <Text style={styles.content}>{content}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}
