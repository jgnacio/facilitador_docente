"use client";

import React, { useState, useEffect } from "react";
import { useClerk, useUser, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Sparkles,
  Folder,
  Users,
  ClipboardList,
  Plus,
  HelpCircle,
  LogOut,
  Search,
  Sun,
  Moon,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import PlanificacionesTab from "./tabs/PlanificacionesTab";
import AlumnosTab from "./tabs/AlumnosTab";
import AsistenteTab from "./tabs/AsistenteTab";
import ProgramaTab from "./tabs/ProgramaTab";

export type Tab = "dashboard" | "planificaciones" | "alumnos" | "asistente" | "programa";

const NAV: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: "dashboard",       label: "Dashboard",          Icon: LayoutDashboard },
  { id: "asistente",       label: "Planificador IA",    Icon: Sparkles        },
  { id: "planificaciones", label: "Mis Planificaciones", Icon: Folder          },
  { id: "alumnos",         label: "Alumnos",            Icon: Users           },
  { id: "programa",        label: "Programa",           Icon: ClipboardList   },
];

// ── Theme toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div style={{ width: 36, height: 36 }} />;

  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label="Cambiar tema"
      className="rounded-full transition-all active:scale-95"
      style={{ padding: "0.5rem", color: "#94a3b8" }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [activeTab, setActiveTab] = useState<Tab>("planificaciones");
  const { user } = useUser();
  const { signOut } = useClerk();
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  const sidebarBg  = isDark ? "#111827" : "#F8F9FA";
  const topBarBg   = isDark ? "rgba(17,24,39,0.80)" : "rgba(255,255,255,0.75)";
  const mainBg     = isDark ? "#0f172a" : "#F8F9FA";
  const activeNavBg = isDark ? "rgba(255,255,255,0.06)" : "#FFFFFF";
  const inactiveText = isDark ? "#94a3b8" : "#475569";
  const hoverBg    = isDark ? "rgba(242,116,5,0.10)" : "#FFF7ED";
  const dividerColor = isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0";
  const logoTitle  = isDark ? "#f1f5f9" : "#0f172a";
  const logoSub    = isDark ? "#64748b" : "#64748b";
  const searchBg   = isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9";
  const searchFocusBg = isDark ? "rgba(255,255,255,0.10)" : "#FFFFFF";
  const searchTextColor = isDark ? "#f1f5f9" : "#1e293b";
  const userNameColor = isDark ? "#f1f5f9" : "#1e293b";

  return (
    <div style={{ background: mainBg, minHeight: "100vh" }}>

      {/* ── Sidebar ───────────────────────────────────────────────────────── */}
      <aside
        className="fixed left-0 top-0 h-screen flex flex-col z-50 transition-colors duration-300"
        style={{
          width: "256px",
          background: sidebarBg,
          borderRadius: "0 3rem 3rem 0",
          padding: "1.5rem",
        }}
      >
        {/* Logo */}
        <div className="flex flex-col gap-1 mb-10 px-4">
          <h1
            className="text-lg font-black tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: logoTitle }}
          >
            Facilitador
          </h1>
          <p
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: logoSub }}
          >
            Docente EBI
          </p>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-2 flex-grow">
          {NAV.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-full transition-all duration-200 w-full"
                style={{
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  background: isActive ? activeNavBg : "transparent",
                  color: isActive ? "#F27405" : inactiveText,
                  boxShadow: isActive && !isDark ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
                    (e.currentTarget as HTMLButtonElement).style.color = "#F27405";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = inactiveText;
                  }
                }}
              >
                <Icon size={18} strokeWidth={2} />
                <span>{label}</span>
              </button>
            );
          })}

          {/* New Plan CTA */}
          <div className="mt-8 px-2">
            <button
              onClick={() => setActiveTab("asistente")}
              className="w-full py-4 text-white font-bold rounded-full flex items-center justify-center gap-2 transition-all active:scale-95 hover:brightness-90"
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                background: "linear-gradient(135deg, #F27405 0%, #FD7C14 100%)",
                boxShadow: "0 4px 15px rgba(242, 116, 5, 0.30)",
                fontSize: "0.875rem",
              }}
            >
              <Plus size={18} strokeWidth={2.5} />
              Nuevo Plan
            </button>
          </div>
        </nav>

        {/* Footer: Ayuda + Cerrar Sesión */}
        <div className="flex flex-col gap-1 pt-6" style={{ borderTop: `1px solid ${dividerColor}` }}>
          <NavFooterBtn icon={HelpCircle} label="Ayuda" isDark={isDark} />
          <NavFooterBtn
            icon={LogOut}
            label="Cerrar Sesión"
            isDark={isDark}
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          />
        </div>
      </aside>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 right-0 z-40 flex justify-between items-center px-8"
        style={{
          left: "256px",
          height: "80px",
          background: topBarBg,
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
        }}
      >
        {/* Search */}
        <div className="flex-1" style={{ maxWidth: "36rem" }}>
          {/* <div className="relative flex items-center">
            <Search
              size={15}
              className="absolute"
              style={{ left: "1rem", color: "#94a3b8", pointerEvents: "none" }}
            />
            <input
              className="w-full rounded-full text-sm transition-all"
              placeholder="Buscar planificaciones..."
              type="text"
              style={{
                fontFamily: "'Inter', sans-serif",
                background: searchBg,
                border: "none",
                paddingLeft: "2.75rem",
                paddingRight: "1rem",
                paddingTop: "0.6rem",
                paddingBottom: "0.6rem",
                outline: "none",
                color: searchTextColor,
              }}
              onFocus={(e) => {
                e.currentTarget.style.background = searchFocusBg;
                e.currentTarget.style.boxShadow = "0 0 0 2px rgba(242,116,5,0.30)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.background = searchBg;
                e.currentTarget.style.boxShadow = "none";
              }}
            />
          </div> */}
        </div>

        {/* Right: theme toggle + divider + user */}
        <div className="flex items-center gap-4">
          <ThemeToggle />

          <div style={{ width: "1px", height: "2rem", background: dividerColor }} />

          {/* User */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p
                className="text-sm font-bold"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: userNameColor }}
              >
                {user?.fullName || user?.firstName || "Docente"}
              </p>
            </div>
            <UserButton appearance={{
              elements: {
                userButtonAvatarBox: {
                  width: "38px",
                  height: "38px",
                },
              },
            }} />
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main
        className="overflow-y-auto"
        style={{ marginLeft: "256px", paddingTop: "80px", minHeight: "100vh" }}
      >
        {activeTab === "dashboard"       && <DashboardTab onNavigate={(t) => setActiveTab(t as Tab)} />}
        {activeTab === "planificaciones" && <PlanificacionesTab onGoToPlanificador={() => setActiveTab("asistente")} />}
        {activeTab === "alumnos"         && <AlumnosTab />}
        {activeTab === "asistente"       && <AsistenteTab />}
        {activeTab === "programa"        && <ProgramaTab />}
      </main>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function NavFooterBtn({
  icon: Icon,
  label,
  isDark,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isDark: boolean;
  onClick?: () => void;
}) {
  const inactiveText = isDark ? "#94a3b8" : "#475569";
  const hoverBg = isDark ? "rgba(242,116,5,0.10)" : "#FFF7ED";
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-full transition-all w-full text-left"
      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: inactiveText }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        (e.currentTarget as HTMLButtonElement).style.color = "#F27405";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = inactiveText;
      }}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}
