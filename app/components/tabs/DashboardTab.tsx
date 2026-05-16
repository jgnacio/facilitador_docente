"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { Users, Plus, Calendar, ArrowRight } from "lucide-react";
import {
  getGroups,
  createGroup,
  type Group,
} from "../../api-actions";

// ── Curriculum helpers ────────────────────────────────────────────────────────

type GradoEntry = { label: string; tramoKey: string; tramoLabel: string };

const GRADOS: Record<string, GradoEntry> = {
  nivel_3_anios: { label: "Nivel 3 años", tramoKey: "tramo_1", tramoLabel: "Tramo 1" },
  nivel_4_anios: { label: "Nivel 4 años", tramoKey: "tramo_1", tramoLabel: "Tramo 1" },
  nivel_5_anios: { label: "Nivel 5 años", tramoKey: "tramo_1", tramoLabel: "Tramo 1" },
  "1er_grado":   { label: "1.er grado",   tramoKey: "tramo_2", tramoLabel: "Tramo 2" },
  "2do_grado":   { label: "2.do grado",   tramoKey: "tramo_2", tramoLabel: "Tramo 2" },
  "3er_grado":   { label: "3.er grado",   tramoKey: "tramo_3", tramoLabel: "Tramo 3" },
  "4to_grado":   { label: "4.to grado",   tramoKey: "tramo_3", tramoLabel: "Tramo 3" },
  "5to_grado":   { label: "5.to grado",   tramoKey: "tramo_4", tramoLabel: "Tramo 4" },
  "6to_grado":   { label: "6.to grado",   tramoKey: "tramo_4", tramoLabel: "Tramo 4" },
};

const TRAMO_GROUPS: { tramoKey: string; tramoLabel: string; grados: string[] }[] = [
  { tramoKey: "tramo_1", tramoLabel: "Tramo 1", grados: ["nivel_3_anios", "nivel_4_anios", "nivel_5_anios"] },
  { tramoKey: "tramo_2", tramoLabel: "Tramo 2", grados: ["1er_grado", "2do_grado"] },
  { tramoKey: "tramo_3", tramoLabel: "Tramo 3", grados: ["3er_grado", "4to_grado"] },
  { tramoKey: "tramo_4", tramoLabel: "Tramo 4", grados: ["5to_grado", "6to_grado"] },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardTab() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formLevel, setFormLevel] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formError, setFormError] = useState("");
  const [touched, setTouched] = useState(false);

  const derivedTramo = formLevel ? GRADOS[formLevel] : null;

  const { data: groups = [], isPending: loading } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createGroup>[0]) => createGroup(data),
    onSuccess: (result) => {
      if (!result) {
        setFormError("No se pudo crear el grupo. Verificá que la API esté activa.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["groups"] });
      resetForm();
    },
    onError: () => {
      setFormError("Error al crear el grupo.");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setFormName("");
    setFormLevel("");
    setFormStartDate("");
    setFormEndDate("");
    setFormError("");
    setTouched(false);
  };

  const handleSubmit = () => {
    setTouched(true);
    if (!formName.trim()) return;
    setFormError("");
    createMutation.mutate({
      name: formName.trim(),
      stage: derivedTramo?.tramoLabel,
      level: derivedTramo ? GRADOS[formLevel].label : undefined,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
    });
  };

  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: 400,
            fontFamily: "var(--font-fraunces)",
            color: onSurface,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
            maxWidth: "600px",
          }}
        >
          Mis Grupos
        </h1>

        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 transition-all active:scale-95 hover:brightness-110"
          style={{
            background: primaryColor,
            color: "#ffffff",
            borderRadius: "1rem",
            border: "none",
            padding: "0.75rem 1.5rem",
            fontSize: "0.875rem",
            fontWeight: 700,
            fontFamily: "var(--font-fraunces)",
            letterSpacing: "-0.01em",
            cursor: "pointer",
            boxShadow: "0 8px 24px var(--primary-subtle)",
            flexShrink: 0,
          }}
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo grupo
        </button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────────────── */}
      {showForm && (
        <div
          style={{
            background: "var(--surface-container-low)",
            borderRadius: "1.5rem",
            padding: "1.75rem",
            marginBottom: "2rem",
            boxShadow: "var(--shadow-ambient)",
            border: "1px solid rgba(127,127,127,0.1)",
          }}
        >
          <p
            style={{
              fontWeight: 700,
              fontSize: "1rem",
              fontFamily: "var(--font-dm-sans)",
              color: onSurface,
              marginBottom: "1.25rem",
            }}
          >
            Crear nuevo grupo
          </p>

          <div className="grid gap-4">
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: onSurfaceVariant,
                  marginBottom: "0.4rem",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Nombre del grupo <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: 3.er grado A — 2025"
                style={{
                  width: "100%",
                  padding: "0.625rem 1rem",
                  borderRadius: "0.75rem",
                  border: touched && !formName.trim() ? "1.5px solid var(--danger)" : "1.5px solid var(--outline-variant)",
                  background: "var(--surface)",
                  color: onSurface,
                  fontSize: "0.875rem",
                  fontFamily: "var(--font-dm-sans)",
                  outline: "none",
                }}
              />
              {touched && !formName.trim() && (
                <p style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem" }}>
                  El nombre es requerido.
                </p>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                Grado
              </label>
              <select
                value={formLevel}
                onChange={(e) => setFormLevel(e.target.value)}
                style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: formLevel ? onSurface : onSurfaceVariant, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", cursor: "pointer", appearance: "auto" }}
              >
                <option value="">Seleccioná el grado</option>
                {TRAMO_GROUPS.map(({ tramoKey, tramoLabel, grados }) => (
                  <optgroup key={tramoKey} label={tramoLabel}>
                    {grados.map((g) => (
                      <option key={g} value={g}>{GRADOS[g].label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {derivedTramo && (
                <p style={{ marginTop: "0.4rem", fontSize: "0.75rem", fontWeight: 600, color: "var(--primary)", fontFamily: "var(--font-dm-sans)" }}>
                  {derivedTramo.tramoLabel}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                  Fecha de inicio
                </label>
                <input
                  type="date"
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                  Fecha de fin
                </label>
                <input
                  type="date"
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
                />
              </div>
            </div>

            {formError && (
              <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>
                {formError}
              </p>
            )}

            <div className="flex gap-3 justify-end pt-1">
              <button
                onClick={resetForm}
                style={{ padding: "0.625rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: onSurfaceVariant, fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 transition-all active:scale-95"
                style={{ padding: "0.625rem 1.5rem", borderRadius: "0.875rem", border: "none", background: primaryColor, color: "#ffffff", fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", opacity: createMutation.isPending ? 0.7 : 1 }}
              >
                {createMutation.isPending ? (
                  <><Spinner size="sm" color="current" /> Creando…</>
                ) : (
                  "Crear grupo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner color="warning" />
        </div>
      ) : groups.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{
            background: "var(--surface-container-low)",
            borderRadius: "2rem",
            padding: "4rem 2rem",
            boxShadow: "var(--shadow-ambient)",
            border: "1px solid rgba(127, 127, 127, 0.1)",
          }}
        >
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "1.25rem",
              marginBottom: "1.5rem",
              background: "var(--primary-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: primaryColor,
            }}
          >
            <Users size={28} strokeWidth={1.5} />
          </div>
          <p
            style={{
              fontSize: "1rem",
              fontWeight: 500,
              color: onSurfaceVariant,
              marginBottom: "1.5rem",
              fontFamily: "var(--font-dm-sans)",
              maxWidth: "280px",
            }}
          >
            Aún no tenés grupos creados
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="transition-all active:scale-95 hover:brightness-110"
            style={{
              background: primaryColor,
              color: "#ffffff",
              borderRadius: "1rem",
              border: "none",
              padding: "0.75rem 2rem",
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "var(--font-fraunces)",
              letterSpacing: "-0.01em",
              cursor: "pointer",
              boxShadow: "0 8px 24px var(--primary-subtle)",
            }}
          >
            Crear primer grupo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              onSurface={onSurface}
              onSurfaceVariant={onSurfaceVariant}
              onClick={() => router.push(`/groups/${group.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── GroupCard ─────────────────────────────────────────────────────────────────

function GroupCard({
  group,
  onSurface,
  onSurfaceVariant,
  onClick,
}: {
  group: Group;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full"
      style={{
        background: "var(--surface-container-low)",
        borderRadius: "1.5rem",
        padding: "1.5rem",
        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-ambient)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
        border: "1px solid rgba(127, 127, 127, 0.08)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div
          style={{
            width: "40px",
            height: "40px",
            borderRadius: "0.875rem",
            background: "var(--primary-subtle)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--primary)",
            flexShrink: 0,
          }}
        >
          <Users size={18} strokeWidth={2} />
        </div>
        <ArrowRight
          size={15}
          style={{
            color: hovered ? "var(--primary)" : onSurfaceVariant,
            opacity: hovered ? 1 : 0.4,
            transition: "all 0.18s",
            transform: hovered ? "translateX(2px)" : "translateX(0)",
            flexShrink: 0,
            marginTop: "4px",
          }}
        />
      </div>

      <div>
        <p
          style={{
            fontWeight: 700,
            fontSize: "0.975rem",
            fontFamily: "var(--font-dm-sans)",
            color: onSurface,
            letterSpacing: "-0.01em",
            marginBottom: "0.25rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {group.name}
        </p>

        {(group.stage || group.level) && (
          <p
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "var(--primary)",
              fontFamily: "var(--font-fraunces)",
              textTransform: "uppercase",
              letterSpacing: "0.02em",
              marginBottom: "0.25rem",
            }}
          >
            {[group.stage, group.level].filter(Boolean).join(" · ")}
          </p>
        )}

        {(group.start_date || group.end_date) && (
          <div className="flex items-center gap-1.5" style={{ color: onSurfaceVariant, opacity: 0.6 }}>
            <Calendar size={12} />
            <p style={{ fontSize: "0.72rem", fontFamily: "var(--font-dm-sans)" }}>
              {[group.start_date && formatDate(group.start_date), group.end_date && formatDate(group.end_date)]
                .filter(Boolean)
                .join(" → ")}
            </p>
          </div>
        )}
      </div>
    </button>
  );
}
