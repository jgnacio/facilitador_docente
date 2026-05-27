"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Users } from "lucide-react";
import { getAlumnosByGroup } from "@/app/api-actions";

export function AlumnosPanel({ groupId, groupName, defaultCollapsed = false }: { groupId: string; groupName?: string; defaultCollapsed?: boolean }) {
  const { data: students = [], isPending } = useQuery({
    queryKey: ["students", groupId],
    queryFn: () => getAlumnosByGroup(groupId),
    enabled: Boolean(groupId),
  });

  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const onSurface        = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor     = "var(--primary)";
  const isEmpty          = !isPending && students.length === 0;
  const compact          = collapsed || isEmpty;

  return (
    <div
      style={{
        background: "var(--surface-container-low)",
        borderRadius: "1.5rem",
        padding: compact ? "0.75rem 1.25rem" : "1.25rem 1.5rem",
        border: "1px solid rgba(127,127,127,0.08)",
      }}
    >
      {/* Header — clickeable para colapsar */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setCollapsed((c) => !c)}
        style={{ marginBottom: compact ? "0" : "1rem" }}
      >
        <div className="flex items-center gap-2">
          <ChevronDown
            size={14}
            strokeWidth={2}
            style={{
              color: onSurfaceVariant,
              transition: "transform 0.2s",
              transform: collapsed ? "rotate(-90deg)" : "rotate(0deg)",
            }}
          />
          <div
            style={{
              width: compact ? "24px" : "28px",
              height: compact ? "24px" : "28px",
              borderRadius: "0.625rem",
              background: "var(--primary-subtle)", display: "flex",
              alignItems: "center", justifyContent: "center",
              color: primaryColor, flexShrink: 0,
            }}
          >
            <Users size={compact ? 12 : 14} strokeWidth={2} />
          </div>
          <p style={{ fontWeight: 700, fontSize: compact ? "0.8rem" : "0.875rem", fontFamily: "var(--font-dm-sans)", color: onSurface }}>
            Alumnos
          </p>
        </div>
        {!isPending && (
          <span
            style={{
              fontSize: "0.72rem", fontWeight: 600, color: onSurfaceVariant,
              fontFamily: "var(--font-dm-sans)", background: "var(--surface)",
              borderRadius: "0.5rem", padding: "0.15rem 0.5rem",
              border: "1px solid var(--outline-variant)",
            }}
          >
            {students.length}
          </span>
        )}
      </div>

      {/* Content — solo se muestra si no está colapsado */}
      {!collapsed && (
        isPending ? (
          <div className="flex justify-center py-4">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : isEmpty ? (
          <div>
            <p style={{ fontSize: "0.72rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.45 }}>
              Sin alumnos asignados al grupo <strong>{groupName ?? "este grupo"}</strong>
            </p>
            <p style={{ fontSize: "0.68rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.6, marginTop: "0.15rem" }}>
              Agregalos desde la pestaña Alumnos
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {students.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2.5"
                style={{ padding: "0.5rem 0.625rem", borderRadius: "0.875rem", background: "var(--surface)" }}
              >
                <div
                  style={{
                    width: "28px", height: "28px", borderRadius: "0.625rem", flexShrink: 0,
                    background: "var(--primary-subtle)", display: "flex", alignItems: "center",
                    justifyContent: "center", color: primaryColor,
                    fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--font-dm-sans)",
                  }}
                >
                  {s.nombre_completo?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: "0.8rem", fontWeight: 600, color: onSurface, fontFamily: "var(--font-dm-sans)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {s.nombre_completo}
                  </p>
                  {(s.nivel || s.grado) && (
                    <p style={{ fontSize: "0.68rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.7 }}>
                      {[s.nivel, s.grado].filter(Boolean).join(" · ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}
