"use client";

import { useState } from "react";
import { Folder, Calendar, ArrowRight, Trash2, Pencil } from "lucide-react";
import { Spinner } from "@heroui/react";
import { type IntegrativeProject, type ActivitySequence, type Activity } from "@/app/api-actions";

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-UY", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
}

function titleFromContent(raw?: string): string | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw);
    if (p && typeof p.titulo === "string") return p.titulo;
  } catch { /* not JSON */ }
  return null;
}

// ── ProjectCard ───────────────────────────────────────────────────────────────

export function ProjectCard({
  project,
  onSurface,
  onSurfaceVariant,
  onClick,
  onEdit,
  onDelete,
  isDeleting,
}: {
  project: IntegrativeProject;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-5 cursor-pointer"
      style={{
        background: "var(--surface)",
        borderRadius: "1.25rem",
        padding: "1.25rem 1.5rem",
        border: `1px solid ${hovered ? "rgba(127,127,127,0.15)" : "rgba(127,127,127,0.08)"}`,
        transition: "border-color 0.18s ease",
        position: "relative",
      }}
    >
      <div
        style={{
          width: "42px",
          height: "42px",
          borderRadius: "0.875rem",
          flexShrink: 0,
          background: hovered ? "var(--primary-subtle)" : "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hovered ? "var(--primary)" : onSurfaceVariant,
          transition: "background 0.18s ease, color 0.18s ease",
        }}
      >
        <Folder size={18} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: "0.9rem",
            fontFamily: "var(--font-dm-sans)",
            letterSpacing: "-0.01em",
            color: hovered ? "var(--primary)" : onSurface,
            marginBottom: "0.2rem",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            transition: "color 0.18s ease",
          }}
        >
          {project.name}
        </p>

        {project.purpose && (
          <p
            style={{
              fontSize: "0.78rem",
              color: onSurfaceVariant,
              fontFamily: "var(--font-dm-sans)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "480px",
              opacity: 0.8,
              marginBottom: "0.15rem",
            }}
          >
            {project.purpose}
          </p>
        )}

        <div className="flex items-center gap-3 flex-wrap">
          {project.duration_weeks && (
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: hovered ? "var(--primary)" : onSurfaceVariant,
                fontFamily: "var(--font-fraunces)",
                textTransform: "uppercase",
                letterSpacing: "0.02em",
                transition: "color 0.18s ease",
              }}
            >
              {project.duration_weeks} sem.
            </span>
          )}
          {(project.start_date || project.end_date) && (
            <div className="flex items-center gap-1" style={{ color: onSurfaceVariant, opacity: 0.55 }}>
              <Calendar size={11} />
              <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-dm-sans)" }}>
                {[
                  project.start_date && new Date(project.start_date).toLocaleDateString("es-UY", { day: "2-digit", month: "short" }),
                  project.end_date && new Date(project.end_date).toLocaleDateString("es-UY", { day: "2-digit", month: "short" }),
                ]
                  .filter(Boolean)
                  .join(" → ")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Action buttons on hover ── */}
      <div
        className="flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
        style={{
          opacity: hovered ? 1 : 0,
          pointerEvents: hovered ? "auto" : "none",
          transition: "opacity 0.18s",
          flexShrink: 0,
        }}
      >
        {onEdit && (
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            title="Editar proyecto"
            style={{
              width: "30px", height: "30px", borderRadius: "0.625rem",
              border: "1.5px solid var(--outline-variant)", background: "var(--surface)",
              color: onSurfaceVariant, display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}
          >
            <Pencil size={13} strokeWidth={2} />
          </button>
        )}
        {onDelete && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            disabled={isDeleting}
            title="Eliminar proyecto"
            style={{
              width: "30px", height: "30px", borderRadius: "0.625rem",
              border: "1.5px solid rgba(var(--danger-rgb, 220,38,38),0.3)", background: "var(--surface)",
              color: "var(--danger)", display: "flex", alignItems: "center",
              justifyContent: "center", cursor: "pointer",
            }}
          >
            {isDeleting ? <Spinner size="sm" color="current" /> : <Trash2 size={13} strokeWidth={2} />}
          </button>
        )}
        <ArrowRight
          size={15}
          style={{
            color: hovered ? "var(--primary)" : onSurfaceVariant,
            opacity: hovered ? 0.7 : 0.2,
            transition: "color 0.18s, opacity 0.18s",
            marginLeft: "0.25rem",
          }}
        />
      </div>
    </div>
  );
}

// ── SequenceCard ──────────────────────────────────────────────────────────────

export function SequenceCard({
  sequence,
  onSurface,
  onSurfaceVariant,
  onClick,
  onDelete,
  isDeleting,
}: {
  sequence: ActivitySequence;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "1.25rem",
        padding: "1rem 1.5rem",
        border: `1px solid ${hovered ? "rgba(127,127,127,0.15)" : "rgba(127,127,127,0.08)"}`,
        transition: "border-color 0.18s ease",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "0.65rem",
          flexShrink: 0,
          background: hovered ? "var(--primary-subtle)" : "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hovered ? "var(--primary)" : onSurfaceVariant,
          fontSize: "0.75rem",
          fontWeight: 700,
          fontFamily: "var(--font-dm-sans)",
          transition: "background 0.18s ease, color 0.18s ease",
        }}
      >
        {sequence.order}
      </div>

      <div className="text-left" style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: "0.88rem",
            fontFamily: "var(--font-dm-sans)",
            color: onSurface,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
            marginBottom: "0.15rem",
          }}
        >
          {sequence.name}
        </p>
        {sequence.learning_goal && (
          <p
            style={{
              fontSize: "0.75rem",
              color: onSurfaceVariant,
              opacity: 0.7,
              fontFamily: "var(--font-dm-sans)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sequence.learning_goal}
          </p>
        )}
        {(sequence.start_date || sequence.end_date) && (
          <div className="flex items-center gap-1 mt-0.5" style={{ color: onSurfaceVariant, opacity: 0.45 }}>
            <Calendar size={11} />
            <span style={{ fontSize: "0.7rem", fontFamily: "var(--font-dm-sans)" }}>
              {[formatDateShort(sequence.start_date), formatDateShort(sequence.end_date)]
                .filter(Boolean)
                .join(" → ")}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
        <ArrowRight
          size={14}
          style={{
            color: hovered ? "var(--primary)" : onSurfaceVariant,
            opacity: hovered ? 0.9 : 0.2,
            transition: "color 0.18s, opacity 0.18s",
          }}
        />
        <button
          onClick={onDelete}
          disabled={isDeleting}
          className="flex items-center justify-center"
          title="Eliminar"
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "0.5rem",
            border: "none",
            background: "transparent",
            color: onSurfaceVariant,
            cursor: "pointer",
            opacity: 0.3,
          }}
        >
          {isDeleting ? <Spinner size="sm" color="current" /> : <Trash2 size={13} />}
        </button>
      </div>
    </div>
  );
}

// ── ActivityCard ──────────────────────────────────────────────────────────────

export function ActivityCard({
  activity,
  onSurface,
  onSurfaceVariant,
  onClick,
  onDelete,
  isDeleting,
}: {
  activity: Activity;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const preview = titleFromContent(activity.raw_content) ?? activity.curriculum_space ?? activity.activity_type;

  return (
    <div
      style={{
        background: "var(--surface)",
        borderRadius: "1.25rem",
        padding: "1rem 1.5rem",
        border: `1px solid ${hovered ? "rgba(127,127,127,0.15)" : "rgba(127,127,127,0.08)"}`,
        transition: "border-color 0.18s ease",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "0.5rem",
          flexShrink: 0,
          background: hovered ? "var(--primary-subtle)" : "rgba(0,0,0,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: hovered ? "var(--primary)" : onSurfaceVariant,
          fontSize: "0.72rem",
          fontWeight: 700,
          fontFamily: "var(--font-dm-sans)",
          transition: "background 0.18s ease, color 0.18s ease",
        }}
      >
        {activity.order}
      </div>

      <div className="text-left" style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: "0.88rem",
            fontFamily: "var(--font-dm-sans)",
            color: hovered ? "var(--primary)" : onSurface,
            marginBottom: preview ? "0.15rem" : 0,
            transition: "color 0.18s ease",
          }}
        >
          {activity.title}
        </p>
        {preview && (
          <p
            style={{
              fontSize: "0.75rem",
              color: onSurfaceVariant,
              opacity: 0.6,
              fontFamily: "var(--font-dm-sans)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              maxWidth: "520px",
            }}
          >
            {preview}
          </p>
        )}
      </div>

      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        disabled={isDeleting}
        className="flex items-center justify-center"
        title="Eliminar"
        style={{
          width: "28px",
          height: "28px",
          borderRadius: "0.5rem",
          border: "none",
          background: "transparent",
          color: onSurfaceVariant,
          cursor: "pointer",
          opacity: 0.3,
          flexShrink: 0,
        }}
      >
        {isDeleting ? <Spinner size="sm" color="current" /> : <Trash2 size={13} />}
      </button>
    </div>
  );
}
