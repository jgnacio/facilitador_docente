"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { ChevronRight, List, FileText, Plus } from "lucide-react";
import {
  getGroup,
  getProject,
  getSequences,
  getActivities,
  createSequence,
  createActivity,
  deleteSequence,
  deleteActivity,
} from "@/app/api-actions";
import { SequenceCard, ActivityCard } from "@/app/components/cards";

// ── Helpers ───────────────────────────────────────────────────────────────────

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const projectId = params.projectId as string;
  const router = useRouter();
  const queryClient = useQueryClient();

  // Sequence form state
  const [showSeqForm, setShowSeqForm] = useState(false);
  const [seqName, setSeqName] = useState("");
  const [seqGoal, setSeqGoal] = useState("");
  const [seqStartDate, setSeqStartDate] = useState("");
  const [seqEndDate, setSeqEndDate] = useState("");
  const [seqError, setSeqError] = useState("");
  const [seqTouched, setSeqTouched] = useState(false);

  // Activity form state
  const [showActForm, setShowActForm] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actContent, setActContent] = useState("");
  const [actError, setActError] = useState("");
  const [actTouched, setActTouched] = useState(false);

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { data: project, isPending: loadingProject } = useQuery({
    queryKey: ["project", groupId, projectId],
    queryFn: () => getProject(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  const { data: sequences = [], isPending: loadingSeqs } = useQuery({
    queryKey: ["sequences", groupId, projectId],
    queryFn: () => getSequences(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  const { data: allActivities = [], isPending: loadingActs } = useQuery({
    queryKey: ["activities", groupId, projectId],
    queryFn: () => getActivities(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  // Activities without a sequence (isolated)
  const isolatedActivities = allActivities.filter((a) => !a.sequence_id);

  const createSeqMutation = useMutation({
    mutationFn: (data: Parameters<typeof createSequence>[2]) => createSequence(groupId, projectId, data),
    onSuccess: (result) => {
      if (!result) { setSeqError("No se pudo crear la secuencia."); return; }
      queryClient.invalidateQueries({ queryKey: ["sequences", groupId, projectId] });
      resetSeqForm();
    },
    onError: () => setSeqError("Error al crear la secuencia."),
  });

  const deleteSeqMutation = useMutation({
    mutationFn: (seqId: string) => deleteSequence(groupId, projectId, seqId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sequences", groupId, projectId] }),
  });

  const createActMutation = useMutation({
    mutationFn: (data: Parameters<typeof createActivity>[2]) => createActivity(groupId, projectId, data),
    onSuccess: (result) => {
      if (!result) { setActError("No se pudo crear la actividad."); return; }
      queryClient.invalidateQueries({ queryKey: ["activities", groupId, projectId] });
      resetActForm();
    },
    onError: () => setActError("Error al crear la actividad."),
  });

  const deleteActMutation = useMutation({
    mutationFn: (actId: string) => deleteActivity(actId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["activities", groupId, projectId] }),
  });

  const resetSeqForm = () => {
    setShowSeqForm(false);
    setSeqName(""); setSeqGoal(""); setSeqStartDate(""); setSeqEndDate("");
    setSeqError(""); setSeqTouched(false);
  };

  const goToChat = (ctx?: string, label?: string) => {
    if (ctx && label) {
      router.push(`/asistente?ctx=${encodeURIComponent(ctx)}&label=${encodeURIComponent(label)}`);
    } else {
      router.push("/asistente");
    }
  };

  const handleCreateSequenceWithChat = () => {
    const ctx = [
      `[ctx: group_id=${groupId}, project_id=${projectId}]`,
      `Proyecto integrador: "${project?.name}". Grupo: ${group?.name} (${group?.stage}, nivel ${group?.level}).`,
      project?.purpose ? `Propósito: ${project.purpose}.` : "",
    ].filter(Boolean).join(" ");
    const label = `Proyecto: ${project?.name ?? "..."} · Grupo: ${group?.name ?? "..."} · Nivel ${group?.level ?? ""}`;
    goToChat(ctx, label);
  };

  const resetActForm = () => {
    setShowActForm(false);
    setActTitle(""); setActContent("");
    setActError(""); setActTouched(false);
  };

  const handleSeqSubmit = () => {
    setSeqTouched(true);
    if (!seqName.trim()) return;
    setSeqError("");
    createSeqMutation.mutate({
      name: seqName.trim(),
      learning_goal: seqGoal.trim() || undefined,
      start_date: seqStartDate || undefined,
      end_date: seqEndDate || undefined,
    });
  };

  const handleActSubmit = () => {
    setActTouched(true);
    if (!actTitle.trim()) return;
    setActError("");
    createActMutation.mutate({
      title: actTitle.trim(),
      raw_content: actContent.trim() || undefined,
    });
  };

  const handleDeleteSeq = (seqId: string, name: string) => {
    if (!confirm(`¿Eliminar la secuencia "${name}"? Se eliminarán todas sus actividades.`)) return;
    deleteSeqMutation.mutate(seqId);
  };

  const handleDeleteAct = (actId: string, title: string) => {
    if (!confirm(`¿Eliminar la actividad "${title}"?`)) return;
    deleteActMutation.mutate(actId);
  };

  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";
  const loading = loadingProject || loadingSeqs || loadingActs;

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px", margin: "0 auto" }}>
      {/* ── Breadcrumb ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: "0.82rem", fontFamily: "var(--font-dm-sans)", color: onSurfaceVariant }}>
        <button onClick={() => router.push("/dashboard")} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
          Mis Grupos
        </button>
        <ChevronRight size={14} style={{ opacity: 0.5 }} />
        <button onClick={() => router.push(`/groups/${groupId}`)} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
          {group?.name ?? "Grupo"}
        </button>
        <ChevronRight size={14} style={{ opacity: 0.5 }} />
        <span style={{ color: onSurface, fontWeight: 600 }}>
          {loadingProject ? "…" : (project?.name ?? projectId)}
        </span>
      </div>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <h1 style={{ fontSize: "2rem", fontWeight: 400, fontFamily: "var(--font-fraunces)", color: onSurface, letterSpacing: "-0.03em", lineHeight: 1.2, marginBottom: "2rem" }}>
        {loadingProject ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--warning, #f59e0b)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg> : (project?.name ?? "Proyecto")}
      </h1>

      {loading ? (
        <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--warning, #f59e0b)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* ── Secuencias ──────────────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, opacity: 0.8 }}>
                Secuencias de actividades
              </h2>
              <button
                onClick={handleCreateSequenceWithChat}
                className="flex items-center gap-1.5 transition-all active:scale-95"
                style={{ background: "none", border: "1.5px solid var(--outline-variant)", color: onSurfaceVariant, borderRadius: "0.75rem", padding: "0.4rem 0.875rem", fontSize: "0.8rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}
              >
                <Plus size={14} /> Nueva secuencia
              </button>
            </div>

            {showSeqForm && (
              <InlineForm
                title="Nueva secuencia"
                onCancel={resetSeqForm}
                onSubmit={handleSeqSubmit}
                isPending={createSeqMutation.isPending}
                error={seqError}
              >
                <FormField label="Nombre" required touched={seqTouched} value={seqName} invalid={seqTouched && !seqName.trim()} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                  <input type="text" value={seqName} onChange={(e) => setSeqName(e.target.value)} placeholder="Ej: Secuencia 1 — Introducción" style={inputStyle(seqTouched && !seqName.trim(), onSurface)} />
                </FormField>
                <FormField label="Meta de aprendizaje" onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                  <input type="text" value={seqGoal} onChange={(e) => setSeqGoal(e.target.value)} placeholder="¿Qué aprenderán los estudiantes?" style={inputStyle(false, onSurface)} />
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Fecha de inicio" onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                    <input type="date" value={seqStartDate} onChange={(e) => setSeqStartDate(e.target.value)} style={inputStyle(false, onSurface)} />
                  </FormField>
                  <FormField label="Fecha de fin" onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                    <input type="date" value={seqEndDate} onChange={(e) => setSeqEndDate(e.target.value)} style={inputStyle(false, onSurface)} />
                  </FormField>
                </div>
              </InlineForm>
            )}

            {sequences.length === 0 ? (
              <EmptyCard icon={List} message="No hay secuencias en este proyecto" onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} onCta={() => setShowSeqForm(true)} ctaLabel="Nueva secuencia" />
            ) : (
              <div className="flex flex-col gap-3">
                {sequences.map((seq) => (
                  <SequenceCard
                    key={seq.id}
                    sequence={seq}
                    onSurface={onSurface}
                    onSurfaceVariant={onSurfaceVariant}
                    onClick={() => router.push(`/groups/${groupId}/projects/${projectId}/sequences/${seq.id}`)}
                    onDelete={() => handleDeleteSeq(seq.id, seq.name)}
                    isDeleting={deleteSeqMutation.isPending && deleteSeqMutation.variables === seq.id}
                  />
                ))}
              </div>
            )}
          </section>

          {/* ── Actividades sueltas ─────────────────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, opacity: 0.8 }}>
                Actividades sueltas
              </h2>
              <button
                onClick={() => router.push("/asistente")}
                className="flex items-center gap-1.5 transition-all active:scale-95"
                style={{ background: "none", border: "1.5px solid var(--outline-variant)", color: onSurfaceVariant, borderRadius: "0.75rem", padding: "0.4rem 0.875rem", fontSize: "0.8rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}
              >
                <Plus size={14} /> Nueva actividad suelta
              </button>
            </div>

            {showActForm && (
              <InlineForm
                title="Nueva actividad suelta"
                onCancel={resetActForm}
                onSubmit={handleActSubmit}
                isPending={createActMutation.isPending}
                error={actError}
              >
                <FormField label="Título" required touched={actTouched} value={actTitle} invalid={actTouched && !actTitle.trim()} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                  <input type="text" value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="Título de la actividad" style={inputStyle(actTouched && !actTitle.trim(), onSurface)} />
                </FormField>
                <FormField label="Contenido" onSurface={onSurface} onSurfaceVariant={onSurfaceVariant}>
                  <textarea value={actContent} onChange={(e) => setActContent(e.target.value)} placeholder="Descripción o contenido de la actividad..." rows={3} style={{ ...inputStyle(false, onSurface), resize: "vertical" as const }} />
                </FormField>
              </InlineForm>
            )}

            {isolatedActivities.length === 0 ? (
              <EmptyCard icon={FileText} message="No hay actividades sueltas en este proyecto" onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} onCta={() => setShowActForm(true)} ctaLabel="Nueva actividad suelta" />
            ) : (
              <div className="flex flex-col gap-3">
                {isolatedActivities.map((act) => (
                  <ActivityCard
                    key={act.id}
                    activity={act}
                    onSurface={onSurface}
                    onSurfaceVariant={onSurfaceVariant}
                    onClick={() => router.push(`/activities/${act.id}`)}
                    onDelete={() => handleDeleteAct(act.id, act.title)}
                    isDeleting={deleteActMutation.isPending && deleteActMutation.variables === act.id}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function inputStyle(invalid: boolean, onSurface: string): React.CSSProperties {
  return {
    width: "100%",
    padding: "0.625rem 1rem",
    borderRadius: "0.75rem",
    border: invalid ? "1.5px solid var(--danger)" : "1.5px solid var(--outline-variant)",
    background: "var(--surface)",
    color: onSurface,
    fontSize: "0.875rem",
    fontFamily: "var(--font-dm-sans)",
    outline: "none",
  };
}

function FormField({ label, required, touched, value, invalid, children, onSurface: _os, onSurfaceVariant }: {
  label: string; required?: boolean; touched?: boolean; value?: string; invalid?: boolean;
  children: React.ReactNode; onSurface: string; onSurfaceVariant: string;
}) {
  return (
    <div>
      <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
        {label} {required && <span style={{ color: "var(--danger)" }}>*</span>}
      </label>
      {children}
      {invalid && (
        <p style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem" }}>Este campo es requerido.</p>
      )}
    </div>
  );
}

function InlineForm({ title, onCancel, onSubmit, isPending, error, children }: {
  title: string; onCancel: () => void; onSubmit: () => void;
  isPending: boolean; error: string; children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.75rem", marginBottom: "1rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
      <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: "var(--on-surface)", marginBottom: "1.25rem" }}>{title}</p>
      <div className="grid gap-4">
        {children}
        {error && <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>{error}</p>}
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} style={{ padding: "0.625rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: "var(--on-surface-variant)", fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>
            Cancelar
          </button>
          <button onClick={onSubmit} disabled={isPending} className="flex items-center gap-2 transition-all active:scale-95" style={{ padding: "0.625rem 1.5rem", borderRadius: "0.875rem", border: "none", background: "var(--primary)", color: "#ffffff", fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", opacity: isPending ? 0.7 : 1 }}>
            {isPending ? <><Spinner size="sm" color="current" /> Guardando…</> : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyCard({ icon: Icon, message, onSurfaceVariant, primaryColor, onCta, ctaLabel }: {
  icon: React.ElementType; message: string; onSurfaceVariant: string; primaryColor: string;
  onCta: () => void; ctaLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center" style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "2.5rem 2rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
      <div style={{ width: "48px", height: "48px", borderRadius: "1rem", marginBottom: "1rem", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: primaryColor }}>
        <Icon size={22} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: "0.9rem", fontWeight: 500, color: onSurfaceVariant, marginBottom: "1rem", fontFamily: "var(--font-dm-sans)" }}>{message}</p>
      <button onClick={onCta} className="flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110" style={{ background: primaryColor, color: "#ffffff", borderRadius: "0.875rem", border: "none", padding: "0.625rem 1.5rem", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer" }}>
        <Plus size={14} /> {ctaLabel}
      </button>
    </div>
  );
}

