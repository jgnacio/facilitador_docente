"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { ChevronRight, Folder, Plus } from "lucide-react";
import {
  getGroup,
  getProjects,
  createProject,
} from "@/app/api-actions";
import { ProjectCard } from "@/app/components/cards";

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

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function GroupDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPurpose, setFormPurpose] = useState("");
  const [formDurationWeeks, setFormDurationWeeks] = useState("");
  const [formFinalProduct, setFormFinalProduct] = useState("");
  const [formStartDate, setFormStartDate] = useState("");
  const [formEndDate, setFormEndDate] = useState("");
  const [formError, setFormError] = useState("");
  const [touched, setTouched] = useState(false);

  const { data: group, isPending: loadingGroup } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { data: projects = [], isPending: loadingProjects } = useQuery({
    queryKey: ["projects", groupId],
    queryFn: () => getProjects(groupId),
    enabled: Boolean(groupId),
  });

  const createMutation = useMutation({
    mutationFn: (data: Parameters<typeof createProject>[1]) => createProject(groupId, data),
    onSuccess: (result) => {
      if (!result) {
        setFormError("No se pudo crear el proyecto. Verificá que la API esté activa.");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["projects", groupId] });
      resetForm();
    },
    onError: () => {
      setFormError("Error al crear el proyecto.");
    },
  });

  const resetForm = () => {
    setShowForm(false);
    setFormName("");
    setFormPurpose("");
    setFormDurationWeeks("");
    setFormFinalProduct("");
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
      purpose: formPurpose.trim() || undefined,
      duration_weeks: formDurationWeeks ? Number(formDurationWeeks) : undefined,
      final_product: formFinalProduct.trim() || undefined,
      start_date: formStartDate || undefined,
      end_date: formEndDate || undefined,
    });
  };

  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";
  const loading = loadingGroup || loadingProjects;

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6" style={{ fontSize: "0.82rem", fontFamily: "var(--font-dm-sans)", color: onSurfaceVariant }}>
        <button
          onClick={() => router.push("/dashboard")}
          className="hover:underline transition-all"
          style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}
        >
          Mis Grupos
        </button>
        <ChevronRight size={14} style={{ opacity: 0.5 }} />
        <span style={{ color: onSurface, fontWeight: 600 }}>
          {loadingGroup ? "…" : (group?.name ?? groupId)}
        </span>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 400,
            fontFamily: "var(--font-fraunces)",
            color: onSurface,
            letterSpacing: "-0.03em",
            lineHeight: 1.2,
          }}
        >
          {loadingGroup ? <Spinner size="sm" color="warning" /> : (group?.name ?? "Grupo")}
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
          Crear proyecto integrador
        </button>
      </div>

      {/* ── Create form ──────────────────────────────────────────────────────── */}
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
          <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, marginBottom: "1.25rem" }}>
            Nuevo proyecto integrador
          </p>

          <div className="grid gap-4">
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                Nombre <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Ej: Proyecto de Ciencias Naturales — Biodiversidad"
                style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: touched && !formName.trim() ? "1.5px solid var(--danger)" : "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
              />
              {touched && !formName.trim() && (
                <p style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem" }}>El nombre es requerido.</p>
              )}
            </div>

            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                Propósito
              </label>
              <textarea
                value={formPurpose}
                onChange={(e) => setFormPurpose(e.target.value)}
                placeholder="Descripción del propósito del proyecto..."
                rows={3}
                style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical" }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                  Duración (semanas)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formDurationWeeks}
                  onChange={(e) => setFormDurationWeeks(e.target.value)}
                  placeholder="Ej: 4"
                  style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                  Producto final
                </label>
                <input
                  type="text"
                  value={formFinalProduct}
                  onChange={(e) => setFormFinalProduct(e.target.value)}
                  placeholder="Ej: Maqueta, presentación..."
                  style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
                />
              </div>
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
              <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>{formError}</p>
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
                  "Crear proyecto"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Projects list ────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner color="warning" />
        </div>
      ) : projects.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center text-center"
          style={{ background: "var(--surface-container-low)", borderRadius: "2rem", padding: "4rem 2rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127, 127, 127, 0.1)" }}
        >
          <div style={{ width: "64px", height: "64px", borderRadius: "1.25rem", marginBottom: "1.5rem", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: primaryColor }}>
            <Folder size={28} strokeWidth={1.5} />
          </div>
          <p style={{ fontSize: "1rem", fontWeight: 500, color: onSurfaceVariant, marginBottom: "1.5rem", fontFamily: "var(--font-dm-sans)", maxWidth: "280px" }}>
            Este grupo no tiene proyectos integradores todavía
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="transition-all active:scale-95 hover:brightness-110"
            style={{ background: primaryColor, color: "#ffffff", borderRadius: "1rem", border: "none", padding: "0.75rem 2rem", fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", boxShadow: "0 8px 24px var(--primary-subtle)" }}
          >
            Crear proyecto integrador
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onSurface={onSurface}
              onSurfaceVariant={onSurfaceVariant}
              onClick={() => router.push(`/groups/${groupId}/projects/${project.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

