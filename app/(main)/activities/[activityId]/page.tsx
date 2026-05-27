"use client";

import { useState } from "react";
import { useConfirmModal } from "@/app/components/ui/confirm-modal";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Spinner } from "@heroui/react";
import {
  ChevronRight,
  Pencil,
  Trash2,
  BookOpen,
  Layers,
  Calendar,
  Tag,
  Check,
  X,
} from "lucide-react";
import {
  getActivity,
  getGroup,
  getProject,
  getSequence,
  updateActivity,
  deleteActivity,
} from "@/app/api-actions";

import {
  type Momento,
  type SecuenciaActividad,
  type ParsedContent,
  parseContent,
  ContentPanel,
  MomentoCard,
  MomentoField,
  SubActividadCard,
} from "@/app/components/activity-content";

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return dateStr;
  }
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ActivityDetailPage() {
  const params = useParams();
  const activityId = params.activityId as string;
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirmModal();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editError, setEditError] = useState("");

  const { data: activity, isPending: loadingActivity } = useQuery({
    queryKey: ["activity", activityId],
    queryFn: () => getActivity(activityId),
    enabled: Boolean(activityId),
  });

  const { data: group } = useQuery({
    queryKey: ["group", activity?.group_id],
    queryFn: () => getGroup(activity!.group_id!),
    enabled: Boolean(activity?.group_id),
  });

  const { data: project } = useQuery({
    queryKey: ["project", activity?.group_id, activity?.project_id],
    queryFn: () => getProject(activity!.group_id!, activity!.project_id!),
    enabled: Boolean(activity?.group_id) && Boolean(activity?.project_id),
  });

  const { data: sequence } = useQuery({
    queryKey: ["sequence", activity?.group_id, activity?.project_id, activity?.sequence_id],
    queryFn: () => getSequence(activity!.group_id!, activity!.project_id!, activity!.sequence_id!),
    enabled: Boolean(activity?.group_id) && Boolean(activity?.project_id) && Boolean(activity?.sequence_id),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { title?: string; raw_content?: string }) => updateActivity(activityId, data),
    onSuccess: (result) => {
      if (!result) { setEditError("No se pudo guardar."); return; }
      queryClient.invalidateQueries({ queryKey: ["activity", activityId] });
      setEditing(false);
    },
    onError: () => setEditError("Error al guardar."),
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteActivity(activityId),
    onSuccess: () => {
      if (activity?.project_id && activity?.group_id) {
        router.push(
          activity.sequence_id
            ? `/groups/${activity.group_id}/projects/${activity.project_id}/sequences/${activity.sequence_id}`
            : `/groups/${activity.group_id}/projects/${activity.project_id}`
        );
      } else {
        router.push("/dashboard");
      }
    },
  });

  const handleEditOpen = () => {
    setEditTitle(activity?.title ?? "");
    setEditContent(activity?.raw_content ?? "");
    setEditError("");
    setEditing(true);
  };

  const handleEditSave = () => {
    if (!editTitle.trim()) { setEditError("El título es requerido."); return; }
    updateMutation.mutate({
      title: editTitle.trim(),
      raw_content: editContent.trim() || undefined,
    });
  };

  const handleDelete = () => {
    confirm({
      title: "Eliminar actividad",
      message: `¿Estás seguro de que deseas eliminar "${activity?.title}"? Esta acción no se puede deshacer.`,
      onConfirm: () => deleteMutation.mutate(),
    });
  };

  const onSurface = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const primaryColor = "var(--primary)";

  if (loadingActivity) {
    return <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--warning, #f59e0b)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>;
  }

  if (!activity) {
    return (
      <div style={{ padding: "2rem 2.5rem" }}>
        <p style={{ color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)" }}>Actividad no encontrada.</p>
      </div>
    );
  }

  const parsed = parseContent(activity.raw_content);
  const generalCompetencies: string[] = (() => {
    if (!activity.general_competencies) return [];
    try { return JSON.parse(activity.general_competencies); } catch { return []; }
  })();

  const curriculumCard = (
    <CurriculumCard
      activity={activity}
      generalCompetencies={generalCompetencies}
      onSurface={onSurface}
      onSurfaceVariant={onSurfaceVariant}
      primaryColor={primaryColor}
    />
  );

  return (
    <>
      {confirmModal}
      {/* ── Panel flotante fijo — sin espacio en el DOM, solo en pantallas anchas ── */}
      <aside
        className="hidden 2xl:block"
        style={{
          position: "fixed",
          top: "80px",
          left: "max(1rem, calc(50vw - 550px - 356px))",
          width: "340px",
          maxHeight: "calc(100vh - 96px)",
          overflowY: "auto",
          zIndex: 10,
        }}
      >
        {curriculumCard}
      </aside>

      {/* ── Contenido principal — centrado en la ventana ──────────────────────── */}
      <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 2.5rem" }}>
        {/* ── Breadcrumb ─────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-2 mb-6 flex-wrap" style={{ fontSize: "0.82rem", fontFamily: "var(--font-dm-sans)", color: onSurfaceVariant }}>
          <button onClick={() => router.push("/dashboard")} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
            Mis Grupos
          </button>
          {group && (
            <>
              <ChevronRight size={14} style={{ opacity: 0.5 }} />
              <button onClick={() => router.push(`/groups/${activity.group_id}`)} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
                {group.name}
              </button>
            </>
          )}
          {project && (
            <>
              <ChevronRight size={14} style={{ opacity: 0.5 }} />
              <button onClick={() => router.push(`/groups/${activity.group_id}/projects/${activity.project_id}`)} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
                {project.name}
              </button>
            </>
          )}
          {sequence && (
            <>
              <ChevronRight size={14} style={{ opacity: 0.5 }} />
              <button onClick={() => router.push(`/groups/${activity.group_id}/projects/${activity.project_id}/sequences/${activity.sequence_id}`)} className="hover:underline" style={{ background: "none", border: "none", cursor: "pointer", color: primaryColor, fontWeight: 600, padding: 0 }}>
                {sequence.name}
              </button>
            </>
          )}
          <ChevronRight size={14} style={{ opacity: 0.5 }} />
          <span style={{ color: onSurface, fontWeight: 600, maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {activity.title}
          </span>
        </div>

        {/* ── Header ───────────────────────────────────────────────────────────── */}
        {editing ? (
          <EditForm
            title={editTitle}
            content={editContent}
            error={editError}
            isPending={updateMutation.isPending}
            onTitleChange={setEditTitle}
            onContentChange={setEditContent}
            onSave={handleEditSave}
            onCancel={() => setEditing(false)}
            onSurface={onSurface}
            onSurfaceVariant={onSurfaceVariant}
            primaryColor={primaryColor}
          />
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-8">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <StatusBadge status={activity.status} primaryColor={primaryColor} />
                  {activity.activity_type && (
                    <span style={{ fontSize: "0.72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.7 }}>
                      {activity.activity_type}
                    </span>
                  )}
                </div>
                <h1 style={{ fontSize: "2rem", fontWeight: 400, fontFamily: "var(--font-fraunces)", color: onSurface, letterSpacing: "-0.03em", lineHeight: 1.2 }}>
                  {activity.title}
                </h1>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleEditOpen}
                  className="flex items-center gap-1.5 transition-all active:scale-95 hover:brightness-110"
                  style={{ background: "var(--surface-container-low)", border: "1.5px solid var(--outline-variant)", color: onSurfaceVariant, borderRadius: "0.875rem", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}
                >
                  <Pencil size={13} /> Editar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 transition-all active:scale-95"
                  style={{ background: "none", border: "1.5px solid var(--outline-variant)", color: "var(--danger)", borderRadius: "0.875rem", padding: "0.5rem 1rem", fontSize: "0.82rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer", opacity: deleteMutation.isPending ? 0.6 : 1 }}
                >
                  {deleteMutation.isPending ? <Spinner size="sm" color="current" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>

            {/* Panel inline — pantallas menores a 2xl */}
            <div className="2xl:hidden mb-6">{curriculumCard}</div>

            <ContentPanel parsed={parsed} onSurface={onSurface} onSurfaceVariant={onSurfaceVariant} primaryColor={primaryColor} />
          </>
        )}
      </div>
    </>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────

function StatusBadge({ status, primaryColor }: { status: string; primaryColor: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft: { label: "Borrador", color: "var(--on-surface-variant)", bg: "var(--surface-container-low)" },
    active: { label: "Activa", color: primaryColor, bg: "var(--primary-subtle)" },
    archived: { label: "Archivada", color: "var(--on-surface-variant)", bg: "var(--surface-container-low)" },
  };
  const s = map[status] ?? map.draft;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: "2rem", padding: "0.2rem 0.75rem", fontSize: "0.72rem", fontWeight: 700, fontFamily: "var(--font-dm-sans)", letterSpacing: "0.03em" }}>
      {s.label}
    </span>
  );
}

// ── CurriculumCard ────────────────────────────────────────────────────────────

function CurriculumCard({
  activity,
  generalCompetencies,
  onSurface,
  onSurfaceVariant,
  primaryColor,
}: {
  activity: ReturnType<typeof parseContent> extends infer _ ? any : never;
  generalCompetencies: string[];
  onSurface: string;
  onSurfaceVariant: string;
  primaryColor: string;
}) {
  const hasAnyField = activity.curriculum_space || activity.curriculum_unit || activity.stage
    || activity.specific_competency_code || activity.learning_goal || activity.curriculum_content
    || activity.achievement_criterion || activity.methodology || generalCompetencies.length > 0
    || activity.period_start || activity.period_end;

  if (!hasAnyField) return null;

  const tableFields: { label: string; value: string }[] = [
    activity.learning_goal ? { label: "Meta", value: activity.learning_goal } : null,
    activity.curriculum_content ? { label: "Contenido", value: activity.curriculum_content } : null,
    activity.achievement_criterion ? { label: "Criterio de logro", value: activity.achievement_criterion } : null,
    activity.methodology ? { label: "Metodología", value: activity.methodology } : null,
  ].filter(Boolean) as { label: string; value: string }[];

  const hasDivider = (activity.curriculum_space || activity.stage || activity.specific_competency_code) && tableFields.length > 0;

  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.5rem", border: "1px solid rgba(127,127,127,0.08)" }}>
      <p style={{ fontSize: "0.67rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.06em", fontFamily: "var(--font-fraunces)", marginBottom: "1rem", opacity: 0.55 }}>
        Referencia curricular
      </p>

      <div className="flex flex-col">
        {/* ── Taxonomía ────────────────────────────────────────────────────── */}
        {(activity.curriculum_space || activity.curriculum_unit) && (
          <div className="flex items-start gap-2 pb-2.5" style={{ borderBottom: "1px solid rgba(127,127,127,0.07)" }}>
            <BookOpen size={13} style={{ color: onSurfaceVariant, opacity: 0.4, flexShrink: 0, marginTop: "2px" }} />
            <div>
              <p style={{ fontSize: "0.8rem", fontWeight: 700, color: onSurface, fontFamily: "var(--font-dm-sans)", lineHeight: 1.3 }}>
                {activity.curriculum_space}
              </p>
              {activity.curriculum_unit && activity.curriculum_unit !== activity.curriculum_space && (
                <p style={{ fontSize: "0.72rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", opacity: 0.7, marginTop: "0.1rem" }}>
                  {activity.curriculum_unit}
                </p>
              )}
            </div>
          </div>
        )}

        {activity.stage && (
          <div className="flex items-center gap-2 py-2.5" style={{ borderBottom: "1px solid rgba(127,127,127,0.07)" }}>
            <Layers size={13} style={{ color: onSurfaceVariant, opacity: 0.4, flexShrink: 0 }} />
            <p style={{ fontSize: "0.8rem", fontWeight: 600, color: onSurface, fontFamily: "var(--font-dm-sans)" }}>
              Tramo {activity.stage}
            </p>
          </div>
        )}

        {activity.specific_competency_code && (
          <div className="py-2.5" style={{ borderBottom: "1px solid rgba(127,127,127,0.07)" }}>
            <div className="flex items-center gap-1.5 mb-1">
              <Tag size={12} style={{ color: onSurfaceVariant, opacity: 0.4, flexShrink: 0 }} />
              <span style={{ fontSize: "0.72rem", fontWeight: 700, color: primaryColor, fontFamily: "var(--font-dm-sans)" }}>
                {activity.specific_competency_code}
              </span>
            </div>
            {activity.specific_competency && (
              <p style={{ fontSize: "0.74rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", paddingLeft: "1.35rem", lineHeight: 1.5, opacity: 0.8 }}>
                {activity.specific_competency}
              </p>
            )}
          </div>
        )}

        {/* ── Campos como tabla ─────────────────────────────────────────────── */}
        {tableFields.length > 0 && (
          <div className={hasDivider ? "pt-0.5" : ""}>
            <CurriculumTable fields={tableFields} onSurfaceVariant={onSurfaceVariant} />
          </div>
        )}

        {/* ── Competencias generales ────────────────────────────────────────── */}
        {generalCompetencies.length > 0 && (
          <div className="pt-3 mt-0.5" style={{ borderTop: "1px solid rgba(127,127,127,0.07)" }}>
            <p style={{ fontSize: "0.67rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans)", marginBottom: "0.6rem", opacity: 0.55 }}>
              Competencias generales
            </p>
            <div className="flex flex-wrap gap-1.5">
              {generalCompetencies.map((c, i) => (
                <span key={i} style={{ background: "rgba(0,0,0,0.05)", color: onSurfaceVariant, borderRadius: "2rem", padding: "0.2rem 0.625rem", fontSize: "0.7rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", opacity: 0.85 }}>
                  {c}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* ── Fechas ────────────────────────────────────────────────────────── */}
        {(activity.period_start || activity.period_end) && (
          <div className="flex items-center gap-1.5 pt-3 mt-0.5" style={{ borderTop: "1px solid rgba(127,127,127,0.07)", color: onSurfaceVariant, opacity: 0.55 }}>
            <Calendar size={12} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: "0.72rem", fontFamily: "var(--font-dm-sans)" }}>
              {[activity.period_start && formatDate(activity.period_start), activity.period_end && formatDate(activity.period_end)]
                .filter(Boolean)
                .join(" → ")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function CurriculumTable({ fields, onSurfaceVariant }: {
  fields: { label: string; value: string }[];
  onSurfaceVariant: string;
}) {
  return (
    <div className="flex flex-col">
      {fields.map(({ label, value }, i) => (
        <div key={i} style={{ padding: "0.6rem 0", borderTop: "1px solid rgba(127,127,127,0.07)" }}>
          <p style={{ fontSize: "0.67rem", fontWeight: 700, color: onSurfaceVariant, textTransform: "uppercase", letterSpacing: "0.04em", fontFamily: "var(--font-dm-sans)", opacity: 0.55, marginBottom: "0.25rem" }}>
            {label}
          </p>
          <p style={{ fontSize: "0.76rem", color: onSurfaceVariant, fontFamily: "var(--font-dm-sans)", lineHeight: 1.55, opacity: 0.88 }}>
            {value}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── EditForm ──────────────────────────────────────────────────────────────────

function EditForm({ title, content, error, isPending, onTitleChange, onContentChange, onSave, onCancel, onSurface, onSurfaceVariant, primaryColor }: {
  title: string; content: string; error: string; isPending: boolean;
  onTitleChange: (v: string) => void; onContentChange: (v: string) => void;
  onSave: () => void; onCancel: () => void;
  onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  return (
    <div style={{ background: "var(--surface-container-low)", borderRadius: "1.5rem", padding: "1.75rem", marginBottom: "2rem", boxShadow: "var(--shadow-ambient)", border: "1px solid rgba(127,127,127,0.1)" }}>
      <p style={{ fontWeight: 700, fontSize: "1rem", fontFamily: "var(--font-dm-sans)", color: onSurface, marginBottom: "1.25rem" }}>Editar actividad</p>
      <div className="grid gap-4">
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
            Título <span style={{ color: "var(--danger)" }}>*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: onSurfaceVariant, marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
            Contenido (JSON o texto libre)
          </label>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            rows={10}
            style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: onSurface, fontSize: "0.82rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical" }}
          />
        </div>
        {error && <p style={{ fontSize: "0.8rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>{error}</p>}
        <div className="flex gap-3 justify-end pt-1">
          <button onClick={onCancel} style={{ padding: "0.625rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: onSurfaceVariant, fontSize: "0.875rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer" }}>
            <span className="flex items-center gap-1.5"><X size={14} /> Cancelar</span>
          </button>
          <button
            onClick={onSave}
            disabled={isPending}
            className="flex items-center gap-2 transition-all active:scale-95"
            style={{ padding: "0.625rem 1.5rem", borderRadius: "0.875rem", border: "none", background: primaryColor, color: "#ffffff", fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: "pointer", opacity: isPending ? 0.7 : 1 }}
          >
            {isPending ? <><Spinner size="sm" color="current" /> Guardando…</> : <><Check size={14} /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  );
}
