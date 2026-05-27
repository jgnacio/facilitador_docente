"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import { ChevronRight, FileText, Plus, Trash2, Calendar, Pencil, Check, X } from "lucide-react";
import {
  getGroup,
  getProject,
  getSequence,
  getActivities,
  createActivity,
  deleteActivity,
  updateActivity,
  updateSequence,
  deleteSequence,
  type Activity,
} from "@/app/api-actions";
import { ActivityCard } from "@/app/components/cards";
import { useConfirmModal, RenameModal } from "@/app/components/ui/confirm-modal";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SequenceDetailPage() {
  const params = useParams();
  const groupId = params.groupId as string;
  const projectId = params.projectId as string;
  const sequenceId = params.sequenceId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirmModal();
  const [selectedActId, setSelectedActId] = useState<string | null>(null);
  useEffect(() => {
    const clear = (e: MouseEvent) => {
      if (!(e.target as Element).closest("[data-activity-card]")) {
        setSelectedActId(null);
      }
    };
    document.addEventListener("click", clear);
    return () => document.removeEventListener("click", clear);
  }, []);

  // New activity form
  const [showForm, setShowForm] = useState(false);
  const [actTitle, setActTitle] = useState("");
  const [actError, setActError] = useState("");
  const [actTouched, setActTouched] = useState(false);

  // Edit sequence form
  const [editingSeq, setEditingSeq] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGoal, setEditGoal] = useState("");
  const [editStart, setEditStart] = useState("");
  const [editEnd, setEditEnd] = useState("");
  const [editSeqError, setEditSeqError] = useState("");

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });

  const { data: project } = useQuery({
    queryKey: ["project", groupId, projectId],
    queryFn: () => getProject(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  const { data: sequence, isPending: loadingSeq } = useQuery({
    queryKey: ["sequence", groupId, projectId, sequenceId],
    queryFn: () => getSequence(groupId, projectId, sequenceId),
    enabled: Boolean(groupId) && Boolean(projectId) && Boolean(sequenceId),
  });

  const { data: activities = [], isPending: loadingActs } = useQuery({
    queryKey: ["activities", groupId, projectId, sequenceId],
    queryFn: () => getActivities(groupId, projectId, sequenceId),
    enabled: Boolean(groupId) && Boolean(projectId) && Boolean(sequenceId),
  });

  const sortedActivities = [...activities].sort((a, b) => a.order - b.order);

  const createActMutation = useMutation({
    mutationFn: (data: Parameters<typeof createActivity>[2]) =>
      createActivity(groupId, projectId, data, sequenceId),
    onSuccess: (result) => {
      if (!result) { setActError("No se pudo crear la actividad."); return; }
      queryClient.invalidateQueries({ queryKey: ["activities", groupId, projectId, sequenceId] });
      resetForm();
    },
    onError: () => setActError("Error al crear la actividad."),
  });

  const deleteActMutation = useMutation({
    mutationFn: (activityId: string) => deleteActivity(activityId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", groupId, projectId, sequenceId] });
    },
  });

  const [renamingActId, setRenamingActId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const renameActMutation = useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => updateActivity(id, { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activities", groupId, projectId, sequenceId] });
      setRenamingActId(null);
    },
  });

  const handleDownloadPdf = async (act: Activity) => {
    const { pdf } = await import("@react-pdf/renderer");
    const { ActivityPDF } = await import("@/app/components/pdf/ActivityPDF");
    const blob = await pdf(<ActivityPDF title={act.title} content={act.raw_content} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${act.title.replace(/\s+/g, "_").slice(0, 60)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadExcel = (act: Activity) => {
    const bom = "\uFEFF";
    const headers = ["Título", "Contenido"];
    const rows = [[act.title, act.raw_content ?? ""]];
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${act.title.replace(/\s+/g, "_").slice(0, 60)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleRename = (activityId: string, currentTitle: string) => {
    setRenameValue(currentTitle);
    setRenamingActId(activityId);
  };

  const updateSeqMutation = useMutation({
    mutationFn: (data: Parameters<typeof updateSequence>[3]) => updateSequence(groupId, projectId, sequenceId, data),
    onSuccess: (result) => {
      if (!result) { setEditSeqError("No se pudo guardar."); return; }
      queryClient.invalidateQueries({ queryKey: ["sequence", groupId, projectId, sequenceId] });
      setEditingSeq(false);
    },
    onError: () => setEditSeqError("Error al guardar."),
  });

  const handleCreateActivityWithChat = () => {
    const actList = sortedActivities.length > 0
      ? `Actividades existentes en la secuencia: ${sortedActivities.map((a, i) => `${i + 1}. ${a.title}`).join(", ")}.`
      : "La secuencia aún no tiene actividades.";
    const ctx = [
      `[ctx: group_id=${groupId}, project_id=${projectId}, sequence_id=${sequenceId}]`,
      `Secuencia: "${sequence?.name}". Proyecto: "${project?.name}". Grupo: ${group?.name} (${group?.stage}, nivel ${group?.level}).`,
      project?.duration_weeks ? `Duración del proyecto: ${project.duration_weeks} semanas.` : "",
      sequence?.learning_goal ? `Objetivo de la secuencia: ${sequence.learning_goal}.` : "",
      actList,
    ].filter(Boolean).join(" ");
    const label = `Secuencia: ${sequence?.name ?? "..."} · ${project?.name ?? "..."} · Grupo: ${group?.name ?? "..."}`;
    router.push(`/asistente?ctx=${encodeURIComponent(ctx)}&label=${encodeURIComponent(label)}`);
  };

  const deleteSeqMutation = useMutation({
    mutationFn: () => deleteSequence(groupId, projectId, sequenceId),
    onSuccess: () => router.push(`/groups/${groupId}/projects/${projectId}`),
  });

  const resetForm = () => {
    setShowForm(false);
    setActTitle("");
    setActError("");
    setActTouched(false);
  };

  const handleSubmit = () => {
    setActTouched(true);
    if (!actTitle.trim()) return;
    setActError("");
    createActMutation.mutate({ title: actTitle.trim() });
  };

  const handleDelete = (activityId: string, title: string) => {
    confirm({
      title: "Eliminar actividad",
      message: `¿Estás seguro de que deseas eliminar la actividad "${title}"? Esta acción no se puede deshacer.`,
      onConfirm: () => deleteActMutation.mutate(activityId),
    });
  };

  const handleDeleteSequence = () => {
    confirm({
      title: "Eliminar secuencia",
      message: `¿Estás seguro de que deseas eliminar la secuencia "${sequence?.name}"? Se eliminarán todas sus actividades y no se puede deshacer.`,
      onConfirm: () => deleteSeqMutation.mutate(),
    });
  };

  const openEditSeq = () => {
    setEditName(sequence?.name ?? "");
    setEditGoal(sequence?.learning_goal ?? "");
    setEditStart(sequence?.start_date ?? "");
    setEditEnd(sequence?.end_date ?? "");
    setEditSeqError("");
    setEditingSeq(true);
  };

  const handleSaveSeq = () => {
    if (!editName.trim()) { setEditSeqError("El nombre es requerido."); return; }
    updateSeqMutation.mutate({
      name: editName.trim(),
      learning_goal: editGoal.trim() || undefined,
      start_date: editStart || undefined,
      end_date: editEnd || undefined,
    });
  };

  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";

  return (
    <>
    {confirmModal}
    {renamingActId && (
      <RenameModal
        value={renameValue}
        onChange={setRenameValue}
        isPending={renameActMutation.isPending}
        onConfirm={() => renameActMutation.mutate({ id: renamingActId, title: renameValue.trim() })}
        onCancel={() => setRenamingActId(null)}
      />
    )}
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
        <button onClick={() => router.push(`/groups/${groupId}/projects/${projectId}`)} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
          {project?.name ?? "Proyecto"}
        </button>
        <ChevronRight size={14} style={{ opacity: 0.5 }} />
        <span style={{ color: onSurface, fontWeight: 600 }}>
          {loadingSeq ? "…" : (sequence?.name ?? "Secuencia")}
        </span>
      </div>

      {/* ── Sequence header ──────────────────────────────────────────────────── */}
      {editingSeq ? (
        <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.75rem", marginBottom: "2rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
          <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, marginBottom: "1.25rem" }}>Editar secuencia</p>
          <div className="grid gap-4">
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                Nombre <span style={{ color: "var(--danger)" }}>*</span>
              </label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={inputStyle(false, onSurface)} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>Meta de aprendizaje</label>
              <input type="text" value={editGoal} onChange={(e) => setEditGoal(e.target.value)} style={inputStyle(false, onSurface)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>Fecha inicio</label>
                <input type="date" value={editStart} onChange={(e) => setEditStart(e.target.value)} style={inputStyle(false, onSurface)} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>Fecha fin</label>
                <input type="date" value={editEnd} onChange={(e) => setEditEnd(e.target.value)} style={inputStyle(false, onSurface)} />
              </div>
            </div>
            {editSeqError && <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>{editSeqError}</p>}
            <div className="flex gap-3 justify-end pt-1">
              <button onClick={() => setEditingSeq(false)} style={{ padding: "0.625rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: onSurfaceVariant, fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>
                <span className="flex items-center gap-1.5"><X size={13} /> Cancelar</span>
              </button>
              <button onClick={handleSaveSeq} disabled={updateSeqMutation.isPending} className="flex items-center gap-2 transition-all active:scale-95" style={{ padding: "0.625rem 1.5rem", borderRadius: "0.875rem", border: "none", background: primaryColor, color: "#ffffff", fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", opacity: updateSeqMutation.isPending ? 0.7 : 1 }}>
                {updateSeqMutation.isPending ? <><Spinner size="sm" color="current" /> Guardando…</> : <><Check size={14} /> Guardar</>}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Title row */}
          <div className="flex items-start justify-between gap-4" style={{ marginBottom: "0.75rem" }}>
            <h1 style={{ fontSize: "2rem", fontWeight: 400, fontFamily: "var(--font-fraunces)", color: onSurface, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
              {loadingSeq
                ? <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--warning, #f59e0b)" }}><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                : (sequence?.name ?? "Secuencia")}
            </h1>
            {sequence && (
              <div className="flex items-center gap-2 flex-shrink-0 pt-1">
                <button onClick={openEditSeq} className="flex items-center gap-1.5 transition-all hover:opacity-80 active:scale-95" style={{ padding: "0.4rem 0.875rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: onSurfaceVariant, fontSize: "0.8rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>
                  <Pencil size={13} /> Editar
                </button>
                <button onClick={handleDeleteSequence} disabled={deleteSeqMutation.isPending} className="flex items-center justify-center transition-all hover:opacity-80" title="Eliminar secuencia" style={{ width: "34px", height: "34px", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: "var(--danger)", cursor: "pointer", opacity: deleteSeqMutation.isPending ? 0.5 : 1 }}>
                  {deleteSeqMutation.isPending ? <Spinner size="sm" color="current" /> : <Trash2 size={14} />}
                </button>
              </div>
            )}
          </div>

          {/* Meta chips */}
          {!loadingSeq && sequence && (
            <div className="flex flex-wrap items-center gap-2 mb-6" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {project && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--surface-container-low)", color: onSurfaceVariant }}>
                  {project.name}
                </span>
              )}
              {group && (
                <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--surface-container-low)", color: onSurfaceVariant }}>
                  {group.name} · {group.stage} · Nivel {group.level}
                </span>
              )}
              {project?.duration_weeks && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "var(--primary-subtle)", color: "var(--primary)" }}>
                  {project.duration_weeks} semanas
                </span>
              )}
              {(sequence.start_date || sequence.end_date) && (
                <span className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full" style={{ background: "var(--surface-container-low)", color: onSurfaceVariant }}>
                  <Calendar size={11} />
                  {[formatDate(sequence.start_date), formatDate(sequence.end_date)].filter(Boolean).join(" → ")}
                </span>
              )}
              {sequence.learning_goal && (
                <p className="w-full text-sm mt-1" style={{ color: onSurfaceVariant, opacity: 0.85, lineHeight: 1.55 }}>
                  {sequence.learning_goal}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Activities ───────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, opacity: 0.8 }}>
            Actividades
          </h2>
          <button
            onClick={handleCreateActivityWithChat}
            className="flex items-center gap-1.5 transition-all active:scale-95"
            style={{ background: "none", border: "1.5px solid var(--primary)", color: primaryColor, borderRadius: "0.75rem", padding: "0.4rem 0.875rem", fontSize: "0.8rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer" }}
          >
            <Plus size={14} /> Nueva actividad
          </button>
        </div>

        {showForm && (
          <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.75rem", marginBottom: "1rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, marginBottom: "1.25rem" }}>Nueva actividad</p>
            <div className="grid gap-4">
              <div>
                <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
                  Título <span style={{ color: "var(--danger)" }}>*</span>
                </label>
                <input type="text" value={actTitle} onChange={(e) => setActTitle(e.target.value)} placeholder="Título de la actividad" style={inputStyle(actTouched && !actTitle.trim(), onSurface)} />
                {actTouched && !actTitle.trim() && <p style={{ fontSize: "0.75rem", color: "var(--danger)", marginTop: "0.25rem" }}>El título es requerido.</p>}
              </div>
              {actError && <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>{actError}</p>}
              <div className="flex gap-3 justify-end pt-1">
                <button onClick={resetForm} style={{ padding: "0.625rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: onSurfaceVariant, fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>Cancelar</button>
                <button onClick={handleSubmit} disabled={createActMutation.isPending} className="flex items-center gap-2 transition-all active:scale-95" style={{ padding: "0.625rem 1.5rem", borderRadius: "0.875rem", border: "none", background: primaryColor, color: "#ffffff", fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", opacity: createActMutation.isPending ? 0.7 : 1 }}>
                  {createActMutation.isPending ? <><Spinner size="sm" color="current" /> Guardando…</> : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loadingActs ? (
          <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--warning, #f59e0b)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
        ) : sortedActivities.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center" style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "2.5rem 2rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
            <div style={{ width: "48px", height: "48px", borderRadius: "1rem", marginBottom: "1rem", background: "var(--primary-subtle)", display: "flex", alignItems: "center", justifyContent: "center", color: primaryColor }}>
              <FileText size={22} strokeWidth={1.5} />
            </div>
            <p style={{ fontSize: "0.9rem", fontWeight: 500, color: onSurfaceVariant, marginBottom: "1rem", fontFamily: "var(--font-dm-sans)" }}>
              No hay actividades en esta secuencia todavía
            </p>
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110" style={{ background: primaryColor, color: "#ffffff", borderRadius: "0.875rem", border: "none", padding: "0.625rem 1.5rem", fontSize: "0.82rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer" }}>
              <Plus size={14} /> Nueva actividad
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem" }}>
            {sortedActivities.map((act) => (
              <ActivityCard
                key={act.id}
                activity={act}
                onSurface={onSurface}
                onSurfaceVariant={onSurfaceVariant}
                onClick={() => router.push(`/activities/${act.id}`)}
                onDelete={() => handleDelete(act.id, act.title)}
                onRename={() => handleRename(act.id, act.title)}
                onDownloadPdf={() => handleDownloadPdf(act)}
                onDownloadExcel={() => handleDownloadExcel(act)}
                isDeleting={deleteActMutation.isPending && deleteActMutation.variables === act.id}
                selected={selectedActId === act.id}
                onSelect={() => setSelectedActId(act.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputStyle(invalid: boolean, onSurface: string): React.CSSProperties {
  return { width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: invalid ? "1.5px solid var(--danger)" : "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" };
}

