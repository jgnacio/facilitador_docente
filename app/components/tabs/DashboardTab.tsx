"use client";

import { useEffect, useState } from "react";
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
  TrendingUp,
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

  useEffect(() => {
    Promise.all([getPlanificaciones(), getAlumnos(), getCurriculumEstructura()])
      .then(([p, a, curr]) => {
        setPlanificaciones(p);
        setAlumnos(a);
        const count = countEspacios(curr);
        console.debug("[Dashboard] curriculum raw:", curr);
        console.debug("[Dashboard] espacios count:", count);
        setEspacios(count);
        setLoading(false);
      });
  }, []);

  const recent = planificaciones.slice(-3).reverse();

  return (
    <div style={{ padding: "2rem 2.5rem", maxWidth: "1100px", margin: "0 auto" }}>

      {/* ── Hero banner ──────────────────────────────────────────────────── */}
      <div
        className="relative overflow-hidden mb-8"
        style={{
          background: "linear-gradient(135deg, #F27405 0%, #FF9A3C 60%, #FFBD7A 100%)",
          borderRadius: "1.5rem",
          padding: "2.5rem",
          color: "white",
        }}
      >
        {/* Decorative blobs */}
        <div style={{
          position: "absolute", top: "-40px", right: "-40px",
          width: "200px", height: "200px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "50%",
        }} />
        <div style={{
          position: "absolute", bottom: "-60px", right: "120px",
          width: "160px", height: "160px",
          background: "rgba(255,255,255,0.06)",
          borderRadius: "50%",
        }} />

        <div className="relative">
          <p style={{ fontSize: "0.85rem", opacity: 0.75, marginBottom: "0.25rem", fontFamily: "'Inter', sans-serif" }}>
            {greeting()}
          </p>
          <h1 style={{
            fontSize: "1.875rem", fontWeight: 800, letterSpacing: "-0.03em",
            fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: "0.5rem",
          }}>
            Facilitador Docente EBI
          </h1>
          <div className="flex items-center gap-1.5" style={{ opacity: 0.70, fontSize: "0.85rem" }}>
            <Calendar size={14} />
            <span style={{ fontFamily: "'Inter', sans-serif" }}>{formattedDate()}</span>
          </div>
        </div>
      </div>

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <KpiCard
          label="Planificaciones"
          value={loading ? "—" : String(planificaciones.length)}
          sub={loading ? "" : timeAgo(planificaciones)}
          icon={FileText}
          gradient="linear-gradient(135deg, rgba(242,116,5,0.12) 0%, rgba(255,189,122,0.08) 100%)"
          iconColor="#F27405"
          onClick={() => onNavigate("planificaciones")}
        />
        <KpiCard
          label="Alumnos"
          value={loading ? "—" : String(alumnos.length)}
          sub={loading ? "" : alumnos.length === 1 ? "1 registrado" : `${alumnos.length} registrados`}
          icon={Users}
          gradient="linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(110,231,183,0.08) 100%)"
          iconColor="#10b981"
          onClick={() => onNavigate("alumnos")}
        />
        <KpiCard
          label="Espacios EBI"
          value={loading ? "—" : String(espacios)}
          sub="del currículo nacional"
          icon={BookOpen}
          gradient="linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(196,181,253,0.08) 100%)"
          iconColor="#8b5cf6"
          onClick={() => onNavigate("programa")}
        />
      </div>

      {/* ── Two-col layout ────────────────────────────────────────────────── */}
      <div className="grid gap-6" style={{ gridTemplateColumns: "1fr 340px" }}>

        {/* ── Recent plans ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader
            title="Planificaciones recientes"
            action="Ver todas"
            onAction={() => onNavigate("planificaciones")}
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
            />
          ) : (
            <div className="flex flex-col gap-3">
              {recent.map((p, i) => (
                <PlanCard key={p.id} plan={p} index={i} onClick={() => onNavigate("planificaciones")} />
              ))}
            </div>
          )}
        </section>

        {/* ── Quick actions ─────────────────────────────────────────────── */}
        <aside>
          <SectionHeader title="Acciones rápidas" />

          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              icon={Plus}
              label="Nuevo Plan"
              gradient="linear-gradient(135deg, #F27405 0%, #FD7C14 100%)"
              textColor="white"
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={UserPlus}
              label="Añadir Alumno"
              gradient="linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.06) 100%)"
              textColor="#10b981"
              onClick={() => onNavigate("alumnos")}
            />
            <QuickAction
              icon={MessageSquare}
              label="Asistente IA"
              gradient="linear-gradient(135deg, rgba(242,116,5,0.10) 0%, rgba(242,116,5,0.04) 100%)"
              textColor="#F27405"
              onClick={() => onNavigate("asistente")}
            />
            <QuickAction
              icon={ClipboardList}
              label="Ver Programa"
              gradient="linear-gradient(135deg, rgba(139,92,246,0.12) 0%, rgba(139,92,246,0.06) 100%)"
              textColor="#8b5cf6"
              onClick={() => onNavigate("programa")}
            />
          </div>

          {/* Progress card */}
          {!loading && planificaciones.length > 0 && (
            <ProgressCard
              plans={planificaciones.length}
              students={alumnos.length}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, icon: Icon, gradient, iconColor, onClick,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; gradient: string;
  iconColor: string; onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="text-left w-full"
      style={{
        backgroundColor: "#FFFFFF",
        backgroundImage: gradient,
        borderRadius: "1.25rem",
        padding: "1.5rem",
        boxShadow: hovered
          ? "0 8px 30px rgba(0,0,0,0.10)"
          : "0 2px 12px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "all 0.2s ease",
        border: "none",
        cursor: "pointer",
      }}
    >
      <div className="flex items-start justify-between mb-4">
        <div
          style={{
            width: "44px", height: "44px", borderRadius: "0.875rem",
            background: `${iconColor}18`,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: iconColor,
          }}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <TrendingUp size={14} style={{ color: iconColor, opacity: 0.5, marginTop: "4px" }} />
      </div>
      <p style={{
        fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: "#0f172a", lineHeight: 1, marginBottom: "0.375rem",
      }}>
        {value}
      </p>
      <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "#64748b", marginBottom: "0.2rem", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
        {label}
      </p>
      {sub && (
        <p style={{ fontSize: "0.7rem", color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>
          {sub}
        </p>
      )}
    </button>
  );
}

function PlanCard({
  plan, index, onClick,
}: {
  plan: Planificacion; index: number; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const accentColors = ["#F27405", "#10b981", "#8b5cf6"];
  const color = accentColors[index % accentColors.length];

  const meta = [plan.nivel, plan.periodo_inicio].filter(Boolean).join(" · ");

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-full text-left flex items-center gap-4"
      style={{
        background: "#FFFFFF",
        borderRadius: "1.25rem",
        padding: "1.25rem 1.5rem",
        boxShadow: hovered ? "0 8px 28px rgba(0,0,0,0.10)" : "0 2px 10px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-1px)" : "translateY(0)",
        transition: "all 0.18s ease",
        border: "none",
        cursor: "pointer",
        borderLeft: `4px solid ${hovered ? color : "transparent"}`,
      }}
    >
      <div style={{
        width: "42px", height: "42px", borderRadius: "0.875rem", flexShrink: 0,
        background: `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: color,
      }}>
        <FileText size={18} strokeWidth={2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontWeight: 700, fontSize: "0.9rem",
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          color: "#0f172a",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          marginBottom: "0.2rem",
        }}>
          {plan.nombre}
        </p>
        {meta && (
          <p style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>
            {meta}
          </p>
        )}
      </div>

      <ArrowRight
        size={16}
        style={{
          color: hovered ? color : "#cbd5e1",
          transition: "color 0.18s, transform 0.18s",
          transform: hovered ? "translateX(2px)" : "translateX(0)",
          flexShrink: 0,
        }}
      />
    </button>
  );
}

function QuickAction({
  icon: Icon, label, gradient, textColor, onClick,
}: {
  icon: React.ElementType; label: string;
  gradient: string; textColor: string; onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = textColor === "white";
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex flex-col items-start gap-3 w-full"
      style={{
        backgroundImage: gradient,
        borderRadius: "1.125rem",
        padding: "1.25rem",
        border: "none",
        cursor: "pointer",
        boxShadow: hovered
          ? isPrimary ? "0 6px 20px rgba(242,116,5,0.35)" : "0 4px 14px rgba(0,0,0,0.08)"
          : isPrimary ? "0 3px 10px rgba(242,116,5,0.20)" : "0 1px 4px rgba(0,0,0,0.04)",
        transform: hovered ? "translateY(-2px) scale(1.01)" : "translateY(0) scale(1)",
        transition: "all 0.18s ease",
      }}
    >
      <div style={{
        width: "36px", height: "36px", borderRadius: "0.75rem",
        background: isPrimary ? "rgba(255,255,255,0.22)" : `${textColor}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
        color: textColor,
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>
      <p style={{
        fontSize: "0.78rem", fontWeight: 700,
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: textColor, lineHeight: 1.3,
      }}>
        {label}
      </p>
    </button>
  );
}

function ProgressCard({ plans, students }: { plans: number; students: number }) {
  const plansGoal = 10;
  const studentsGoal = 30;
  const plansProgress = Math.min((plans / plansGoal) * 100, 100);
  const studentsProgress = Math.min((students / studentsGoal) * 100, 100);

  return (
    <div style={{
      background: "#FFFFFF",
      borderRadius: "1.25rem",
      padding: "1.5rem",
      marginTop: "0.75rem",
      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
    }}>
      <p style={{
        fontWeight: 700, fontSize: "0.85rem", marginBottom: "1.25rem",
        fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#0f172a",
      }}>
        Progreso del ciclo
      </p>

      <ProgressBar label="Planificaciones" value={plans} goal={plansGoal} percent={plansProgress} color="#F27405" />
      <div style={{ marginTop: "1rem" }}>
        <ProgressBar label="Alumnos" value={students} goal={studentsGoal} percent={studentsProgress} color="#10b981" />
      </div>
    </div>
  );
}

function ProgressBar({
  label, value, goal, percent, color,
}: {
  label: string; value: number; goal: number; percent: number; color: string;
}) {
  return (
    <div>
      <div className="flex justify-between items-center" style={{ marginBottom: "0.4rem" }}>
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "#64748b", fontFamily: "'Inter', sans-serif" }}>
          {label}
        </span>
        <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "'Inter', sans-serif" }}>
          {value}/{goal}
        </span>
      </div>
      <div style={{
        height: "6px", background: "#F1F5F9", borderRadius: "9999px", overflow: "hidden",
      }}>
        <div style={{
          height: "100%", width: `${percent}%`,
          background: `linear-gradient(90deg, ${color} 0%, ${color}cc 100%)`,
          borderRadius: "9999px",
          transition: "width 0.6s ease",
        }} />
      </div>
    </div>
  );
}

function SectionHeader({
  title, action, onAction,
}: {
  title: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between" style={{ marginBottom: "1rem" }}>
      <h2 style={{
        fontWeight: 800, fontSize: "0.95rem",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        color: "#0f172a",
      }}>
        {title}
      </h2>
      {action && (
        <button
          onClick={onAction}
          className="flex items-center gap-1"
          style={{
            fontSize: "0.78rem", fontWeight: 600, color: "#F27405",
            fontFamily: "'Inter', sans-serif",
            background: "none", border: "none", cursor: "pointer",
          }}
        >
          {action}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );
}

function EmptyState({
  icon: Icon, message, cta, onCta,
}: {
  icon: React.ElementType; message: string; cta: string; onCta: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        background: "#FFFFFF",
        borderRadius: "1.25rem",
        padding: "3rem 2rem",
        boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <div style={{
        width: "52px", height: "52px", borderRadius: "1rem", marginBottom: "1rem",
        background: "rgba(242,116,5,0.08)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "#F27405",
      }}>
        <Icon size={24} strokeWidth={1.5} />
      </div>
      <p style={{ fontSize: "0.85rem", color: "#64748b", marginBottom: "1rem", fontFamily: "'Inter', sans-serif" }}>
        {message}
      </p>
      <button
        onClick={onCta}
        style={{
          background: "linear-gradient(135deg, #F27405 0%, #FD7C14 100%)",
          color: "white", borderRadius: "9999px", border: "none",
          padding: "0.6rem 1.5rem", fontSize: "0.8rem", fontWeight: 700,
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(242,116,5,0.25)",
        }}
      >
        {cta}
      </button>
    </div>
  );
}
