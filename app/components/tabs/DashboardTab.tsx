"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useUser } from "@clerk/nextjs";
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
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { Sun, Moon } from "lucide-react";

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 36, height: 36 }} />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-xl transition-all active:scale-95 p-2 text-muted-foreground hover:bg-muted"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

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
  const { user } = useUser();
  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: planificaciones = [], isPending: loadingP } = useQuery({
    queryKey: ["planificaciones"],
    queryFn: getPlanificaciones,
  });

  const { data: alumnos = [], isPending: loadingA } = useQuery({
    queryKey: ["alumnos"],
    queryFn: getAlumnos,
  });

  const { data: estructura, isPending: loadingE } = useQuery({
    queryKey: ["curriculum-estructura"],
    queryFn: getCurriculumEstructura,
  });

  const espacios = useMemo(() => estructura ? countEspacios(estructura) : 0, [estructura]);
  const loading = loadingP || loadingA || loadingE;

  const [isMobile, setIsMobile] = useState(false);
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

  // ── Design tokens (using CSS variables to avoid flashes) ──────────────────
  const primaryColor     = "var(--primary)";
  const onSurface        = "var(--on-surface)";
  const onSurfaceVariant = "var(--on-surface-variant)";
  const cardBg           = "var(--surface-container-lowest)";
  const cardBg2          = "var(--surface-container-low)";
  const shadowAmbient    = "var(--shadow-ambient)";
  const shadowHover      = "var(--shadow-hover)";


  const recent = planificaciones.slice(-3).reverse();

  return (
    <div style={{
      padding: isMobile ? "1.25rem 1rem" : "2rem 2.5rem",
      maxWidth: "1100px",
      margin: "0 auto",
    }}>

   
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div
        className="flex flex-col md:flex-row md:items-start justify-between gap-6"
        style={{ marginBottom: isMobile ? "2rem" : "3rem" }}
      >
        <h1 style={{
          fontSize: isMobile ? "1.75rem" : "2.5rem",
          fontWeight: 400,
          fontFamily: "var(--font-fraunces)",
          color: onSurface,
          letterSpacing: "-0.03em",
          lineHeight: 1.2,
          maxWidth: "600px",
        }}>
          Tu espacio de<br />
          <span style={{ fontStyle: "italic", fontWeight: 500, color: "var(--primary)" }}>planificación docente.</span>
        </h1>

        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: onSurfaceVariant, opacity: 0.6 }}>
            Espacio de gestión
          </span>
          <div className="flex items-center gap-2" style={{ color: onSurfaceVariant }}>
            <Calendar size={14} className="opacity-50" />
            <span className="text-xs font-bold" style={{ fontFamily: "var(--font-fraunces)" }}>
              {formattedDate()}
            </span>
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid" style={{ 
        gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
        gap: isMobile ? "0.75rem" : "1.5rem", 
        marginBottom: isMobile ? "2rem" : "3rem" 
      }}>
        <KpiCard
          label="Planificaciones"
          value={loading ? "—" : String(planificaciones.length)}
          sub={loading ? "" : timeAgo(planificaciones)}
          icon={FileText}
          iconBg="var(--primary-subtle)"
          iconColor="var(--primary)"
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          onClick={() => onNavigate("planificaciones")}
          isMobile={isMobile}
        />
        <KpiCard
          label="Alumnos"
          value={loading ? "—" : String(alumnos.length)}
          sub={loading ? "" : alumnos.length === 1 ? "1 registrado" : `${alumnos.length} registrados`}
          icon={Users}
          iconBg="var(--tertiary-subtle)"
          iconColor="var(--tertiary)"
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          onClick={() => onNavigate("alumnos")}
          isMobile={isMobile}
        />
        <KpiCard
          label="Espacios EBI"
          value={loading ? "—" : String(espacios)}
          sub="del currículo nacional"
          icon={BookOpen}
          iconBg="var(--tertiary-subtle)"
          iconColor="var(--tertiary)"
          onSurface={onSurface}
          onSurfaceVariant={onSurfaceVariant}
          onClick={() => onNavigate("programa")}
          isMobile={isMobile}
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
        <section style={{ minWidth: 0, overflow: "hidden" }}>
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

          <div className="grid grid-cols-2 gap-4">
            <QuickAction
              icon={Plus}
              label="Nuevo Plan"
              sub="Crear planificación"
              color="var(--primary)"
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={UserPlus}
              label="Añadir Alumno"
              sub="Registrar estudiante"
              color="#6366f1"
              onClick={() => onNavigate("alumnos")}
            />
            <QuickAction
              icon={MessageSquare}
              label="Asistente IA"
              sub="Tu apoyo docente"
              color="var(--primary)"
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={ClipboardList}
              label="Ver Programa"
              sub="Currículo nacional"
              color="#8b5cf6"
              onClick={() => onNavigate("programa")}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon,
  iconBg, iconColor,
  onSurface, onSurfaceVariant,
  onClick, isMobile,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType;
  iconBg: string; iconColor: string;
  onSurface: string; onSurfaceVariant: string;
  onClick?: () => void;
  isMobile?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full relative overflow-hidden group"
      style={{
        backgroundColor: "var(--surface-container-low)",
        borderRadius: "2.5rem",
        padding: isMobile ? "1.25rem" : "2.5rem",
        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-ambient)",
        transform: hovered ? "translateY(-6px)" : "translateY(0)",
        transition: "all 0.4s cubic-bezier(0.2, 0.8, 0.2, 1)",
        border: "1px solid rgba(127, 127, 127, 0.08)",
        cursor: "pointer",
        minHeight: isMobile ? "180px" : "240px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: isMobile ? "0.5rem" : "0",
        textAlign: "left"
      }}
    >
      {/* Glow decorative element */}
      <div className="absolute -bottom-10 -right-10 w-40 h-40 rounded-full blur-[60px] opacity-20 transition-opacity group-hover:opacity-30" 
           style={{ background: iconColor }} />
      
      {/* Wavy background decoration (Simplified) */}
      <div className="absolute bottom-0 right-0 w-full opacity-[0.03] pointer-events-none">
        <svg viewBox="0 0 400 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 150C100 100 200 200 400 120V200H0V150Z" fill={iconColor} />
        </svg>
      </div>

      <div style={{
        width: isMobile ? "40px" : "56px",
        height: isMobile ? "40px" : "56px",
        borderRadius: "1rem",
        background: iconBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: iconColor,
        marginBottom: isMobile ? "0.5rem" : "2rem",
        boxShadow: `0 8px 20px ${iconBg}`,
        position: "relative",
        zIndex: 1,
        flexShrink: 0
      }}>
        <Icon size={isMobile ? 18 : 24} strokeWidth={2.5} />
      </div>

      <div className="relative z-10" style={{ flex: 1 }}>
        <p style={{
          fontSize: isMobile ? "2rem" : "3.5rem",
          fontWeight: 800,
          letterSpacing: "-0.04em",
          fontFamily: "var(--font-dm-sans)",
          color: onSurface,
          lineHeight: 1,
          marginBottom: isMobile ? "0.25rem" : "0.5rem",
        }}>
          {value}
        </p>
        <p style={{
          fontSize: isMobile ? "0.875rem" : "1.1rem",
          fontWeight: 700,
          color: onSurface,
          fontFamily: "var(--font-dm-sans)",
          letterSpacing: "-0.01em",
        }}>
          {label}
        </p>
        <p style={{
          fontSize: "0.75rem",
          fontWeight: 500,
          color: onSurfaceVariant,
          fontFamily: "var(--font-dm-sans)",
          opacity: 0.6,
          marginTop: "0.1rem"
        }}>
          {sub}
        </p>
        </div>
    </button>
  );
}

function PlanCard({
  plan, index, onSurface, onSurfaceVariant, onClick,
}: {
  plan: Planificacion; index: number;
  onSurface: string; onSurfaceVariant: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accentColors = ["var(--primary)", "var(--tertiary)", "#6366f1"];
  const color = accentColors[index % accentColors.length];

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center gap-5 group"
      style={{
        background: "var(--surface-container-low)",
        borderRadius: "1.25rem",
        padding: "1.25rem 2rem",
        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-ambient)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.25s ease",
        border: "1px solid rgba(127, 127, 127, 0.1)",
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
          fontFamily: "var(--font-dm-sans)",
          letterSpacing: "-0.01em",
          color: onSurface,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: "0.1rem",
        }}>
          {plan.nombre}
        </p>
        <p style={{
          fontSize: "0.75rem",
          fontWeight: 600,
          color: color,
          fontFamily: "var(--font-fraunces)",
          textTransform: "uppercase",
          letterSpacing: "0.02em",
        }}>
          {plan.nivel}
        </p>
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
  icon: Icon, label, sub, color, onClick,
}: {
  icon: React.ElementType; label: string; sub: string;
  color: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-center justify-center gap-3 w-full group"
      style={{
        background: "var(--surface-container-low)",
        borderRadius: "2rem",
        padding: "2rem 1rem",
        border: "1px solid rgba(127, 127, 127, 0.08)",
        cursor: "pointer",
        boxShadow: hovered ? "var(--shadow-hover)" : "var(--shadow-ambient)",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        transition: "all 0.3s cubic-bezier(0.2, 0.8, 0.2, 1)",
      }}
    >
      <div style={{
        width: "48px", height: "48px", borderRadius: "1.25rem",
        background: "transparent",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color,
        marginBottom: "0.25rem"
      }}>
        <Icon size={24} strokeWidth={2} />
      </div>
      <div className="flex flex-col items-center text-center">
        <p style={{
          fontSize: "0.85rem", fontWeight: 700,
          fontFamily: "var(--font-dm-sans)",
          color: "var(--on-surface)",
          letterSpacing: "-0.01em",
        }}>
          {label}
        </p>
        <p style={{
          fontSize: "0.7rem", fontWeight: 500,
          fontFamily: "var(--font-dm-sans)",
          color: "var(--on-surface-variant)",
          opacity: 0.5,
          marginTop: "0.1rem"
        }}>
          {sub}
        </p>
      </div>
    </button>
  );
}

function ProgressCard({
  plans, students, cardBg, shadow, onSurface, onSurfaceVariant, primaryColor,
}: {
  plans: number; students: number;
  cardBg: string; shadow: string;
  onSurface: string; onSurfaceVariant: string; primaryColor: string;
}) {
  const plansGoal    = 10;
  const studentsGoal = 30;
  const plansProgress    = Math.min((plans / plansGoal) * 100, 100);
  const studentsProgress = Math.min((students / studentsGoal) * 100, 100);

  return (
    <div style={{
      background: "var(--surface-container-low)",
      borderRadius: "1.5rem",
      padding: "1.75rem",
      marginTop: "0.75rem",
      boxShadow: "var(--shadow-ambient)",
      border: "1px solid var(--outline-variant)",
    }}>
      <p style={{
        fontWeight: 800, fontSize: "0.9rem", marginBottom: "1.5rem",
        fontFamily: "var(--font-fraunces)",
        letterSpacing: "-0.01em",
        color: onSurface,
      }}>
        Tu actividad semanal
      </p>

      <ProgressBar
        label="Planificaciones"
        value={plans} goal={plansGoal} percent={plansProgress}
        trackColor="var(--surface-container-highest)"
        fillColor="var(--primary)"
        onSurfaceVariant={onSurfaceVariant}
      />
      <div style={{ marginTop: "1rem" }}>
        <ProgressBar
          label="Alumnos"
          value={students} goal={studentsGoal} percent={studentsProgress}
          trackColor="var(--surface-container-highest)"
          fillColor="var(--tertiary)"
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
          fontFamily: "var(--font-dm-sans)",
        }}>
          {label}
        </span>
        <span style={{
          fontSize: "0.7rem",
          color: onSurfaceVariant,
          opacity: 0.6,
          fontFamily: "var(--font-dm-sans)",
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
    <div className="flex items-center justify-between" style={{ marginBottom: "1.25rem", paddingLeft: "0.5rem" }}>
      <h2 style={{
        fontWeight: 700, fontSize: "1rem",
        fontFamily: "var(--font-dm-sans)",
        letterSpacing: "-0.01em",
        color: onSurface,
        opacity: 0.8
      }}>
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1.5 transition-all hover:translate-x-1"
          style={{
            fontSize: "0.75rem", fontWeight: 700,
            color: "var(--primary)",
            fontFamily: "var(--font-fraunces)",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          {action}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon, message, cta, onCta, onSurfaceVariant, primaryColor,
}: {
  icon: React.ElementType; message: string; cta: string; onCta: () => void;
  onSurfaceVariant: string; primaryColor: string;
}) {
  return (
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
      <div style={{
        width: "64px", height: "64px", borderRadius: "1.25rem", marginBottom: "1.5rem",
        background: "var(--primary-subtle)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--primary)",
      }}>
        <Icon size={28} strokeWidth={1.5} />
      </div>
      <p style={{
        fontSize: "1rem",
        fontWeight: 500,
        color: onSurfaceVariant,
        marginBottom: "1.5rem",
        fontFamily: "var(--font-dm-sans)",
        maxWidth: "280px",
      }}>
        {message}
      </p>
      <button
        onClick={onCta}
        className="transition-all active:scale-95 hover:brightness-110"
        style={{
          background: "var(--primary)",
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
        {cta}
      </button>
    </div>
  );
}
