"use client";

import { useState, useRef, useEffect } from "react";
import { Folder, Calendar, ArrowRight, Trash2, Pencil, FileText, MoreVertical, BookOpen, SquareArrowOutUpRight, Download, FileSpreadsheet, FileDown, ChevronRight as ChevronRightIcon } from "lucide-react";
import { Spinner } from "@heroui/react";
import { type IntegrativeProject, type ActivitySequence, type Activity } from "@/app/api-actions";
import { ActivityMiniView } from "@/app/components/activity-content";

function formatDateShort(dateStr?: string): string {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString("es-UY", { day: "2-digit", month: "short" });
  } catch {
    return dateStr;
  }
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
  activityCount = 0,
  onSurface,
  onSurfaceVariant,
  onClick,
  onDelete,
  isDeleting,
}: {
  sequence: ActivitySequence;
  activityCount?: number;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
  onDelete: () => void;
  isDeleting: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (!menuBtnRef.current) return;
    const r = menuBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left });
    setMenuOpen((v) => !v);
  }

  return (
    <div
      style={{
        background: hovered ? "var(--surface-container-low)" : "var(--surface)",
        borderRadius: "0.875rem",
        padding: "0.75rem 1rem",
        border: `1.5px solid ${hovered ? "var(--outline-variant, rgba(127,127,127,0.28))" : "rgba(127,127,127,0.14)"}`,
        transition: "background 0.15s ease, border-color 0.15s ease",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        cursor: "pointer",
      }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          width: "36px",
          height: "36px",
          borderRadius: "0.625rem",
          flexShrink: 0,
          background: "rgba(127,127,127,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "rgba(100,100,100,0.7)",
        }}
      >
        <Folder size={18} strokeWidth={1.5} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 600,
            fontSize: "0.875rem",
            fontFamily: "var(--font-dm-sans)",
            color: onSurface,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {sequence.name}
        </p>
        {sequence.learning_goal && (
          <p
            style={{
              fontSize: "0.72rem",
              color: onSurfaceVariant,
              opacity: 0.65,
              fontFamily: "var(--font-dm-sans)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {sequence.learning_goal}
          </p>
        )}
      </div>

      {activityCount > 0 && (
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: onSurfaceVariant,
            fontFamily: "var(--font-dm-sans)",
            opacity: 0.55,
            flexShrink: 0,
          }}
        >
          {activityCount} {activityCount === 1 ? "act." : "acts."}
        </span>
      )}

      <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
        <button
          ref={menuBtnRef}
          onClick={openMenu}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "0.5rem",
            border: "none",
            background: menuOpen ? "rgba(127,127,127,0.1)" : "transparent",
            color: onSurfaceVariant,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.12s",
          }}
        >
          <MoreVertical size={14} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              background: "var(--surface)",
              border: "1px solid rgba(127,127,127,0.15)",
              borderRadius: "0.75rem",
              boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
              zIndex: 9999,
              minWidth: "140px",
              overflow: "hidden",
            }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }}
              disabled={isDeleting}
              style={{
                width: "100%",
                padding: "0.625rem 1rem",
                background: "transparent",
                border: "none",
                color: "var(--danger)",
                fontSize: "0.82rem",
                fontFamily: "var(--font-dm-sans)",
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                textAlign: "left",
              }}
            >
              {isDeleting ? <Spinner size="sm" color="current" /> : <Trash2 size={13} />}
              Eliminar
            </button>
          </div>
        )}
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
  onRename,
  onDownloadPdf,
  onDownloadExcel,
  isDeleting,
  selected = false,
  onSelect,
}: {
  activity: Activity;
  onSurface: string;
  onSurfaceVariant: string;
  onClick: () => void;
  onDelete: () => void;
  onRename?: () => void;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
  isDeleting: boolean;
  selected?: boolean;
  onSelect?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const hasContent = Boolean(activity.raw_content);

  useEffect(() => {
    if (!menuOpen) return;
    const close = () => setMenuOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuOpen]);

  function openMenu(e: React.MouseEvent) {
    e.stopPropagation();
    if (!menuBtnRef.current) return;
    const r = menuBtnRef.current.getBoundingClientRect();
    setMenuPos({ top: r.bottom + 4, left: r.left });
    setMenuOpen((v) => !v);
  }

  const surfaceBg = selected
    ? "var(--primary-subtle)"
    : hovered
    ? "var(--surface-container, rgba(0,0,0,0.04))"
    : "rgba(0,0,0,0.02)";

  return (
    <div
      style={{
        background: surfaceBg,
        borderRadius: "0.875rem",
        border: "none",
        transition: "background 0.15s ease",
        cursor: "pointer",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        height: "245.5px",
      }}
      data-activity-card="true"
      onClick={() => onSelect?.()}
      onDoubleClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Header — ícono + título + menú, 48px de altura como en Drive */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0 8px",
          height: "48px",
          flexShrink: 0,
          minWidth: 0,
          background: surfaceBg,
          transition: "background 0.15s ease",
        }}
      >
        <FileText
          size={16}
          strokeWidth={1.75}
          style={{ flexShrink: 0, color: "var(--primary)" }}
        />

        <p
          style={{
            fontWeight: 500,
            fontSize: "0.8125rem",
            lineHeight: "20px",
            fontFamily: "var(--font-dm-sans)",
            color: onSurface,
            flex: 1,
            minWidth: 0,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activity.title}
        </p>

        <div onClick={(e) => e.stopPropagation()} style={{ flexShrink: 0 }}>
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            style={{
              width: "26px",
              height: "26px",
              borderRadius: "50%",
              border: "none",
              background: menuOpen ? "rgba(127,127,127,0.15)" : "transparent",
              color: onSurfaceVariant,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "background 0.12s",
            }}
          >
            <MoreVertical size={14} />
          </button>
          {menuOpen && (
            <div
              style={{
                position: "fixed",
                top: menuPos.top,
                left: menuPos.left,
                background: "var(--surface)",
                border: "1px solid rgba(127,127,127,0.15)",
                borderRadius: "0.75rem",
                boxShadow: "0 4px 20px rgba(0,0,0,0.14)",
                zIndex: 9999,
                minWidth: "200px",
                overflow: "hidden",
                padding: "0.375rem 0",
              }}
            >
              {/* Abrir */}
              <MenuButton icon={<FileText size={15} />} label="Abrir" onClick={() => { setMenuOpen(false); onClick(); }} />
              {/* Abrir en nueva pestaña */}
              <MenuButton icon={<SquareArrowOutUpRight size={15} />} label="Abrir en nueva pestaña" onClick={() => { setMenuOpen(false); window.open(`/activities/${activity.id}`, "_blank"); }} />
              <MenuDivider />
              {/* Renombrar */}
              {onRename && <MenuButton icon={<Pencil size={15} />} label="Renombrar" onClick={() => { setMenuOpen(false); onRename(); }} />}
              {/* Descargar con submenú */}
              <MenuButtonWithSubmenu
                icon={<Download size={15} />}
                label="Descargar"
                menuPos={menuPos}
                items={[
                  { icon: <FileDown size={15} />, label: "PDF", onClick: () => { setMenuOpen(false); onDownloadPdf?.(); } },
                  { icon: <FileSpreadsheet size={15} />, label: "Excel", onClick: () => { setMenuOpen(false); onDownloadExcel?.(); } },
                ]}
              />
              <MenuDivider />
              {/* Eliminar */}
              <MenuButton
                icon={isDeleting ? <Spinner size="sm" color="current" /> : <Trash2 size={15} />}
                label="Eliminar"
                onClick={() => { setMenuOpen(false); onDelete(); }}
                danger
                disabled={isDeleting}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview area — fondo de la card como marco, thumbnail incrustada con margen 8px en lados y abajo */}
      <div
        style={{
          flex: 1,
          background: surfaceBg,
          display: "flex",
          flexDirection: "column",
          transition: "background 0.15s ease",
        }}
      >
        <div
          style={{
            flex: 1,
            margin: "0 8px 8px 8px",
            background: "var(--surface-container-lowest, #f8f8f8)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          {hasContent ? (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "357%",
                transformOrigin: "top left",
                transform: "scale(0.28)",
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              <ActivityMiniView title={activity.title} rawContent={activity.raw_content} />
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--on-surface-variant)",
                opacity: 0.18,
              }}
            >
              <BookOpen size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Menu helpers ──────────────────────────────────────────────────────────────

function MenuButton({ icon, label, onClick, danger, disabled }: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: "100%",
        padding: "0.5rem 1rem",
        background: hov ? "rgba(127,127,127,0.07)" : "transparent",
        border: "none",
        color: danger ? "var(--danger)" : "var(--on-surface)",
        fontSize: "0.82rem",
        fontFamily: "var(--font-dm-sans)",
        fontWeight: 500,
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        textAlign: "left",
        opacity: disabled ? 0.5 : 1,
        transition: "background 0.1s",
      }}
    >
      <span style={{ opacity: 0.7, flexShrink: 0 }}>{icon}</span>
      {label}
    </button>
  );
}

function MenuDivider() {
  return <div style={{ height: "1px", background: "rgba(127,127,127,0.1)", margin: "0.25rem 0" }} />;
}

function MenuButtonWithSubmenu({ icon, label, items, menuPos }: {
  icon: React.ReactNode;
  label: string;
  menuPos: { top: number; left: number };
  items: { icon: React.ReactNode; label: string; onClick: () => void }[];
}) {
  const [hov, setHov] = useState(false);
  const [subPos, setSubPos] = useState({ top: 0, left: 0 });
  const rowRef = useRef<HTMLButtonElement>(null);

  function handleMouseEnter() {
    setHov(true);
    if (rowRef.current) {
      const r = rowRef.current.getBoundingClientRect();
      setSubPos({ top: r.top, left: r.right });
    }
  }

  return (
    <div style={{ position: "relative" }}>
      <button
        ref={rowRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setHov(false)}
        style={{
          width: "100%",
          padding: "0.5rem 1rem",
          background: hov ? "rgba(127,127,127,0.07)" : "transparent",
          border: "none",
          color: "var(--on-surface)",
          fontSize: "0.82rem",
          fontFamily: "var(--font-dm-sans)",
          fontWeight: 500,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          textAlign: "left",
          transition: "background 0.1s",
        }}
      >
        <span style={{ opacity: 0.7, flexShrink: 0 }}>{icon}</span>
        <span style={{ flex: 1 }}>{label}</span>
        <ChevronRightIcon size={13} style={{ opacity: 0.45 }} />
      </button>

      {hov && (
        <div
          onMouseEnter={() => setHov(true)}
          onMouseLeave={() => setHov(false)}
          style={{
            position: "fixed",
            top: subPos.top,
            left: subPos.left,
            background: "var(--surface)",
            border: "1px solid rgba(127,127,127,0.15)",
            borderRadius: "0.75rem",
            zIndex: 10000,
            minWidth: "160px",
            overflow: "hidden",
            padding: "0.375rem 0",
          }}
        >
          {items.map((item) => (
            <MenuButton key={item.label} icon={item.icon} label={item.label} onClick={item.onClick} />
          ))}
        </div>
      )}
    </div>
  );
}
