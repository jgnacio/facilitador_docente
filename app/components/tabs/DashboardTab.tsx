"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Spinner } from "@heroui/react";
import {
  FileText,
  Users,
  BookOpen,
  Plus,
  UserPlus,
  MessageSquare,
  ClipboardList,
  ArrowRight,
  Calendar,
} from "lucide-react";
import {
  getPlanificaciones,
  getAlumnos,
  getCurriculumEstructura,
  type Planificacion,
  type Alumno,
} from "../../api-actions";

type Props = { onNavigate: (tab: string) => void };

// ── Helpers ───────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 20) return "Buenas tardes";
  return "Buenas noches";
}

function formattedDate() {
  const now = new Date();
  const days = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];
  const months = ["enero","febrero","marzo","abril","mayo","junio",
                  "julio","agosto","septiembre","octubre","noviembre","diciembre"];
  const d = days[now.getDay()];
  return `${d[0].toUpperCase()}${d.slice(1)}, ${now.getDate()} de ${months[now.getMonth()]}`;
}

function countEspacios(estructura: { tramos: Record<string, unknown> }): number {
  const espaciosSet = new Set<string>();
  for (const tramo of Object.values(estructura.tramos)) {
    const t = tramo as { espacios?: Record<string, unknown> };
    if (t.espacios) {
      for (const key of Object.keys(t.espacios)) {
        espaciosSet.add(key);
      }
    }
  }
  return espaciosSet.size;
}

function timeAgo(planificaciones: Planificacion[]): string {
  if (planificaciones.length === 0) return "Sin actividad";
  return `${planificaciones.length} en total`;
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function DashboardTab({ onNavigate }: Props) {
  const [planificaciones, setPlanificaciones] = useState<Planificacion[]>([]);
  const [alumnos,         setAlumnos]         = useState<Alumno[]>([]);
  const [espacios,        setEspacios]        = useState<number>(0);
  const [loading,         setLoading]         = useState(true);
  const [isMobile,        setIsMobile]        = useState(false);
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  // ── Design tokens (light / dark) ──────────────────────────────────────────
  const primaryColor     = isDark ? "oklch(0.72 0.16 38)" : "#F27405";
  const onSurface        = isDark ? "#e2e0dd" : "#191c1e";
  const onSurfaceVariant = isDark ? "#d3bcaf" : "#574238";
  const cardBg           = isDark ? "#191c1e" : "#ffffff";
  const cardBg2          = isDark ? "#1e2022" : "#f9f9fd";
  const shadowAmbient    = isDark
    ? "0 12px 32px -4px rgba(0,0,0,0.28)"
    : "0 12px 32px -4px rgba(25,28,30,0.06)";
  const shadowHover      = isDark
    ? "0 12px 32px -4px rgba(0,0,0,0.40)"
    : "0 12px 32px -4px rgba(25,28,30,0.12)";

  useEffect(() => {
    Promise.all([getPlanificaciones(), getAlumnos(), getCurriculumEstructura()])
      .then(([p, a, curr]) => {
        setPlanificaciones(p);
        setAlumnos(a);
        setEspacios(countEspacios(curr));
        setLoading(false);
      });
  }, []);

  const recent = planificaciones.slice(-3).reverse();

  return (
    <div style={{
      padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem",
      maxWidth: "1100px",
      margin: "0 auto",
    }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex items-end justify-between"
        style={{ marginBottom: isMobile ? "1.25rem" : "2rem" }}
      >
        <h1 style={{
          fontSize: isMobile ? "1.4rem" : "1.875rem",
          fontWeight: 800,
          fontFamily: "var(--font-display)",
          color: onSurface,
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}>
          Tu espacio de planificación docente
        </h1>

        <div
          className="flex flex-col items-end gap-0.5 flex-shrink-0 ml-4"
          style={{ paddingBottom: "0.2rem" }}
        >
          <span style={{
            fontSize: "0.78rem",
            fontWeight: 600,
            fontFamily: "var(--font-display)",
            color: onSurfaceVariant,
            letterSpacing: "-0.01em",
          }}>
            {greeting()}
          </span>
          <div className="flex items-center gap-1.5" style={{
            fontSize: "0.72rem",
            fontFamily: "var(--font-body)",
            color: onSurfaceVariant,
            opacity: 0.7,
          }}>
            <Calendar size={11} />
            <span>{formattedDate()}</span>
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3" style={{ gap: isMobile ? "0.75rem" : "1rem", marginBottom: isMobile ? "1.25rem" : "2rem" }}>
        <KpiCard
          label="Planificaciones"
          value={loading ? "—" : String(planificaciones.length)}
          sub={loading ? "" : timeAgo(planificaciones)}
          icon={FileText}
          iconBg={isDark ? "rgba(200,100,50,0.16)" : "rgba(242,116,5,0.08)"}
          iconColor={primaryColor}
          cardBg={cardBg}
          shadow={shadowAmbient}
          shadowHover={shadowHover}
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          compact={isMobile}
          onClick={() => onNavigate("planificaciones")}
        />
        <KpiCard
          label="Alumnos"
          value={loading ? "—" : String(alumnos.length)}
          sub={loading ? "" : alumnos.length === 1 ? "1 registrado" : `${alumnos.length} registrados`}
          icon={Users}
          iconBg={isDark ? "rgba(18,74,240,0.15)" : "rgba(18,74,240,0.08)"}
          iconColor={isDark ? "#bdceff" : "#124af0"}
          cardBg={cardBg}
          shadow={shadowAmbient}
          shadowHover={shadowHover}
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          compact={isMobile}
          onClick={() => onNavigate("alumnos")}
        />
        <KpiCard
          label="Espacios EBI"
          value={loading ? "—" : String(espacios)}
          sub="del currículo nacional"
          icon={BookOpen}
          iconBg={isDark ? "rgba(129,151,255,0.15)" : "rgba(18,74,240,0.06)"}
          iconColor={isDark ? "#8197ff" : "#124af0"}
          cardBg={cardBg}
          shadow={shadowAmbient}
          shadowHover={shadowHover}
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          compact={isMobile}
          onClick={() => onNavigate("programa")}
        />
      </div>

      {/* ── Two-col layout ────────────────────────────────────────────────── */}
      <div
        className="grid"
        style={{
          gridTemplateColumns: isMobile ? "1fr" : "1fr 340px",
          gap: isMobile ? "1.25rem" : "1.5rem",
        }}
      >

        {/* ── Recent plans ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Planificaciones recientes"
            action="Ver todas"
            onAction={() => onNavigate("planificaciones")}
            onSurface={onSurface}
            onSurfaceVariant={onSurfaceVariant}
          />

          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner color="warning" />
            </div>
          ) : recent.length === 0 ? (
            <EmptyState
              icon={FileText}
              message="No hay planificaciones todavía."
              cta="Crear primera"
              onCta={() => onNavigate("asistente")}
              cardBg={cardBg}
              shadow={shadowAmbient}
              onSurfaceVariant={onSurfaceVariant}
              primaryColor={primaryColor}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((p, i) => (
                <PlanCard
                  key={p.id}
                  plan={p}
                  index={i}
                  isDark={isDark}
                  cardBg={cardBg}
                  shadow={shadowAmbient}
                  shadowHover={shadowHover}
                  onSurface={onSurface}
                  onSurfaceVariant={onSurfaceVariant}
                  onClick={() => onNavigate("planificaciones")}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <aside>
          <SectionHeader
            title="Acciones rápidas"
            onSurface={onSurface}
            onSurfaceVariant={onSurfaceVariant}
          />

          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={Plus}
              label="Nuevo Plan"
              gradient={primaryColor}
              textColor="#ffffff"
              shadow={isDark
                ? "0 8px 24px rgba(200,100,50,0.30)"
                : "0 8px 24px rgba(242,116,5,0.28)"}
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={UserPlus}
              label="Añadir Alumno"
              gradient={isDark ? "rgba(18,74,240,0.14)" : "rgba(18,74,240,0.07)"}
              textColor={isDark ? "#bdceff" : "#124af0"}
              shadow="none"
              onClick={() => onNavigate("alumnos")}
            />
            <QuickAction
              icon={MessageSquare}
              label="Asistente IA"
              gradient={isDark ? "rgba(200,100,50,0.16)" : "rgba(242,116,5,0.07)"}
              textColor={primaryColor}
              shadow="none"
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={ClipboardList}
              label="Ver Programa"
              gradient={isDark ? "rgba(129,151,255,0.14)" : "rgba(18,74,240,0.07)"}
              textColor={isDark ? "#8197ff" : "#124af0"}
              shadow="none"
              onClick={() => onNavigate("programa")}
            />
          </div>

          {!loading && planificaciones.length > 0 && (
            <ProgressCard
              plans={planificaciones.length}
              students={alumnos.length}
              isDark={isDark}
              cardBg={cardBg2}
              shadow={shadowAmbient}
              onSurface={onSurface}
              onSurfaceVariant={onSurfaceVariant}
              primaryColor={primaryColor}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon,
  iconBg, iconColor, cardBg, shadow, shadowHover,
  onSurface, onSurfaceVariant, compact,
  onClick,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType;
  iconBg: string; iconColor: string;
  cardBg: string; shadow: string; shadowHover: string;
  onSurface: string; onSurfaceVariant: string;
  compact?: boolean;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full"
      style={{
        backgroundColor: cardBg,
        borderRadius: compact ? "1rem" : "1.5rem",
        padding: compact ? "0.875rem 0.75rem" : "1.5rem",
        boxShadow: hovered ? shadowHover : shadow,
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.22s ease",
        border: "none",
        cursor: "pointer",
      }}
    >
      <div style={{
        width: compact ? "34px" : "44px",
        height: compact ? "34px" : "44px",
        borderRadius: compact ? "0.625rem" : "0.875rem",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: iconColor,
        marginBottom: compact ? "0.625rem" : "1rem",
      }}>
        <Icon size={compact ? 16 : 20} strokeWidth={2} />
      </div>
      <p style={{
        fontSize: compact ? "1.625rem" : "2.125rem",
        fontWeight: 800,
        letterSpacing: "-0.04em",
        fontFamily: "var(--font-display)",
        color: onSurface,
        lineHeight: 1,
        marginBottom: "0.25rem",
      }}>
        {value}
      </p>
      <p style={{
        fontSize: compact ? "0.68rem" : "0.8rem",
        fontWeight: 600,
        color: onSurfaceVariant,
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.01em",
        lineHeight: 1.3,
      }}>
        {label}
      </p>
      {sub && !compact && (
        <p style={{
          fontSize: "0.7rem",
          color: onSurfaceVariant,
          opacity: 0.7,
          fontFamily: "var(--font-body)",
          marginTop: "0.2rem",
        }}>
          {sub}
        </p>
      )}
    </button>
  );
}

function PlanCard({
  plan, index, isDark, cardBg, shadow, shadowHover, onSurface, onSurfaceVariant, onClick,
}: {
  plan: Planificacion; index: number; isDark: boolean;
  cardBg: string; shadow: string; shadowHover: string;
  onSurface: string; onSurfaceVariant: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  // Accent colors aligned to design tokens
  const accentColors = isDark
    ? ["oklch(0.72 0.16 38)", "#bdceff", "#8197ff"]
    : ["#F27405", "#124af0", "#8197ff"];
  const color = accentColors[index % accentColors.length];

  const meta = [plan.nivel, plan.periodo_inicio].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center gap-4"
      style={{
        background: cardBg,
        borderRadius: "1.25rem",
        padding: "1.25rem 1.5rem",
        boxShadow: hovered ? shadowHover : shadow,
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.20s ease",
        border: "none",
        cursor: "pointer",
      }}
    >
      <div style={{
        width: "42px", height: "42px", borderRadius: "0.875rem", flexShrink: 0,
        background: `${color}14`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color,
      }}>
        <FileText size={18} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 700, fontSize: "0.875rem",
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.01em",
          color: onSurface,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: "0.2rem",
        }}>
          {plan.nombre}
        </p>
        {meta && (
          <p style={{
            fontSize: "0.73rem",
            color: onSurfaceVariant,
            opacity: 0.8,
            fontFamily: "var(--font-body)",
          }}>
            {meta}
          </p>
        )}
      </div>

      <ArrowRight
        size={15}
        style={{
          color: hovered ? color : onSurfaceVariant,
          opacity: hovered ? 1 : 0.4,
          transition: "all 0.18s",
          transform: hovered ? "translateX(2px)" : "translateX(0)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

function QuickAction({
  icon: Icon, label, gradient, textColor, shadow, onClick,
}: {
  icon: React.ElementType; label: string;
  gradient: string; textColor: string;
  shadow: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = textColor === "#ffffff";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-start gap-3 w-full"
      style={{
        background: gradient,
        borderRadius: "1.25rem",
        padding: "1.25rem",
        border: "none",
        cursor: "pointer",
        boxShadow: hovered ? shadow : "none",
        transform: hovered ? "translateY(-2px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.18s ease",
        filter: hovered && isPrimary ? "brightness(1.06)" : "none",
      }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "0.75rem",
        background: isPrimary ? "rgba(255,255,255,0.20)" : `${textColor}1a`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: textColor,
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <p style={{
        fontSize: "0.78rem", fontWeight: 700,
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.01em",
        color: textColor, lineHeight: 1.3,
      }}>
        {label}
      </p>
    </button>
  );
}

function ProgressCard({
  plans, students, isDark, cardBg, shadow, onSurface, onSurfaceVariant, primaryColor,
}: {
  plans: number; students: number;
  isDark: boolean; cardBg: string; shadow: string;
  onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  const plansGoal    = 10;
  const studentsGoal = 30;
  const plansProgress    = Math.min((plans / plansGoal) * 100, 100);
  const studentsProgress = Math.min((students / studentsGoal) * 100, 100);

  return (
    <div style={{
      background: cardBg,
      borderRadius: "1.25rem",
      padding: "1.5rem",
      marginTop: "0.75rem",
      boxShadow: shadow,
    }}>
      <p style={{
        fontWeight: 700, fontSize: "0.85rem", marginBottom: "1.25rem",
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.01em",
        color: onSurface,
      }}>
        Progreso del ciclo
      </p>

      <ProgressBar
        label="Planificaciones"
        value={plans} goal={plansGoal} percent={plansProgress}
        trackColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(25,28,30,0.06)"}
        fillColor={primaryColor}
        onSurfaceVariant={onSurfaceVariant}
      />
      <div style={{ marginTop: "1rem" }}>
        <ProgressBar
          label="Alumnos"
          value={students} goal={studentsGoal} percent={studentsProgress}
          trackColor={isDark ? "rgba(255,255,255,0.06)" : "rgba(25,28,30,0.06)"}
          fillColor={isDark ? "#bdceff" : "#124af0"}
          onSurfaceVariant={onSurfaceVariant}
        />
      </div>
    </div>
  );
}

function ProgressBar({
  label, value, goal, percent,
  trackColor, fillColor, onSurfaceVariant,
}: {
  label: string; value: number; goal: number; percent: number;
  trackColor: string; fillColor: string; onSurfaceVariant: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: "0.4rem" }}>
        <span style={{
          fontSize: "0.73rem", fontWeight: 600,
          color: onSurfaceVariant,
          fontFamily: "var(--font-body)",
        }}>
          {label}
        </span>
        <span style={{
          fontSize: "0.7rem",
          color: onSurfaceVariant,
          opacity: 0.6,
          fontFamily: "var(--font-body)",
        }}>
          {value}/{goal}
        </span>
      </div>
      <div style={{
        height: "5px",
        background: trackColor,
        borderRadius: "9999px",
        overflow: "hidden",
      }}>
        <div style={{
          height: "100%",
          width: `${percent}%`,
          background: fillColor,
          borderRadius: "9999px",
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function SectionHeader({
  title, action, onAction, onSurface, onSurfaceVariant,
}: {
  title: string; action?: string; onAction?: () => void;
  onSurface: string; onSurfaceVariant: string;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
      <h2 style={{
        fontWeight: 800, fontSize: "0.92rem",
        fontFamily: "var(--font-display)",
        letterSpacing: "-0.02em",
        color: onSurface,
      }}>
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1 transition-opacity hover:opacity-70"
          style={{
            fontSize: "0.75rem", fontWeight: 600,
            color: onSurfaceVariant,
            fontFamily: "var(--font-body)",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          {action}
          <ArrowRight size={12} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon, message, cta, onCta, cardBg, shadow, onSurfaceVariant, primaryColor,
}: {
  icon: React.ElementType; message: string; cta: string; onCta: () => void;
  cardBg: string; shadow: string; onSurfaceVariant: string; primaryColor: string;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        background: cardBg,
        borderRadius: "1.5rem",
        padding: "3rem 2rem",
        boxShadow: shadow,
      }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "1rem", marginBottom: "1rem",
        background: "rgba(242,116,5,0.10)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: primaryColor,
      }}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <p style={{
        fontSize: "0.84rem",
        color: onSurfaceVariant,
        marginBottom: "1rem",
        fontFamily: "var(--font-body)",
      }}>
        {message}
      </p>
      <button
        onClick={onCta}
        style={{
          background: primaryColor,
          color: "#ffffff",
          borderRadius: "0.75rem",
          border: "none",
          padding: "0.625rem 1.5rem",
          fontSize: "0.8rem",
          fontWeight: 700,
          fontFamily: "var(--font-display)",
          letterSpacing: "-0.01em",
          cursor: "pointer",
          boxShadow: "0 8px 24px rgba(242,116,5,0.20)",
        }}
      >
        {cta}
      </button>
    </div>
  );
}
