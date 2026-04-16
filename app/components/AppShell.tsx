"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
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
  Sun,
  Moon,
} from "lucide-react";
import DashboardTab from "./tabs/DashboardTab";
import PlanificacionesTab from "./tabs/PlanificacionesTab";
import AlumnosTab from "./tabs/AlumnosTab";
import AsistenteTab from "./tabs/AsistenteTab";
import ProgramaTab from "./tabs/ProgramaTab";

export type Tab = "dashboard" | "planificaciones" | "alumnos" | "asistente" | "programa";

const NAV: { id: Tab; label: string; mobileLabel: string; Icon: React.ElementType }[] = [
  { id: "dashboard",       label: "Dashboard",           mobileLabel: "Inicio",   Icon: LayoutDashboard },
  { id: "asistente",       label: "Planificador IA",     mobileLabel: "IA",       Icon: Sparkles        },
  { id: "planificaciones", label: "Mis Planificaciones", mobileLabel: "Planes",   Icon: Folder          },
  { id: "alumnos",         label: "Alumnos",             mobileLabel: "Alumnos",  Icon: Users           },
  { id: "programa",        label: "Programa",            mobileLabel: "Programa", Icon: ClipboardList   },
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
      className="rounded-xl transition-all active:scale-95"
      style={{
        padding: "0.5rem",
        color: isDark ? "var(--on-surface-variant)" : "var(--on-surface-variant)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = isDark
          ? "rgba(255,182,143,0.10)"
          : "rgba(156,68,0,0.06)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
      }}
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
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  // ── Design tokens ──────────────────────────────────────────────────────────
  // Glassmorphism sidebar (The "Glass & Gradient" Rule)
  const sidebarBg = isDark
    ? "rgba(16, 18, 19, 0.88)"
    : "rgba(255, 255, 255, 0.85)";

  const topBarBg = isDark
    ? "rgba(10, 12, 14, 0.82)"
    : "rgba(255, 255, 255, 0.80)";

  const mainBg = isDark ? "#101213" : "#f9f9fd";

  // Surface-container-lowest for active nav
  const activeNavBg = isDark
    ? "rgba(255, 182, 143, 0.10)"
    : "rgba(156, 68, 0, 0.06)";

  const activeColor  = isDark ? "oklch(0.72 0.16 38)" : "#F27405";
  const inactiveText = isDark ? "#d3bcaf" : "#574238";

  const hoverBg = isDark
    ? "rgba(200, 100, 50, 0.12)"
    : "rgba(242, 116, 5, 0.08)";

  const userNameColor = isDark ? "#e2e0dd" : "#191c1e";

  const ctaGradient = isDark ? "oklch(0.72 0.16 38)" : "#F27405";
  const ctaShadow   = isDark
    ? "0 4px 20px rgba(200, 100, 50, 0.35)"
    : "0 4px 20px rgba(242, 116, 5, 0.22)";

  return (
    <div style={{ background: mainBg, minHeight: "100vh" }}>

      {/* ── Sidebar (desktop) ────────────────────────────────────────────── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen flex-col z-50 transition-all duration-300"
        style={{
          width: "256px",
          background: sidebarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "1.75rem 1.25rem",
          // Ambient shadow instead of border
          boxShadow: isDark
            ? "4px 0 40px rgba(0, 0, 0, 0.20)"
            : "4px 0 40px rgba(25, 28, 30, 0.06)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-10 px-3">
          <Image
            src={isDark ? "/logo_dark.png" : "/logo.png"}
            alt="Facilitador Docente"
            width={156}
            height={44}
            style={{ objectFit: "contain", objectPosition: "left center" }}
            priority
          />
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 flex-grow">
          {NAV.map(({ id, label, Icon }) => {
            const isActive = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 w-full"
                style={{
                  fontFamily: "var(--font-display)",
                  background: isActive ? activeNavBg : "transparent",
                  color: isActive ? activeColor : inactiveText,
                  letterSpacing: "-0.01em",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
                    (e.currentTarget as HTMLButtonElement).style.color = activeColor;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = inactiveText;
                  }
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </button>
            );
          })}

          {/* CTA: Nuevo Plan */}
          <div className="mt-8 px-1">
            <button
              onClick={() => setActiveTab("asistente")}
              className="w-full py-3.5 text-white font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                fontFamily: "var(--font-display)",
                background: ctaGradient,
                boxShadow: ctaShadow,
                fontSize: "0.875rem",
                letterSpacing: "-0.01em",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.filter = "none";
              }}
            >
              <Plus size={17} strokeWidth={2.5} />
              Nuevo Plan
            </button>
          </div>
        </nav>

        {/* Footer — no divider line: use spacing + tonal shift */}
        <div className="flex flex-col gap-0.5 pt-6">
          <NavFooterBtn
            icon={HelpCircle}
            label="Ayuda"
            isDark={isDark}
            activeColor={activeColor}
            inactiveText={inactiveText}
            hoverBg={hoverBg}
            onClick={() => window.open("mailto:ignacio.gomez@bit-a.com?subject=Ayuda%20-%20Facilitador%20Docente", "_blank")}
          />
          <NavFooterBtn
            icon={LogOut}
            label="Cerrar Sesión"
            isDark={isDark}
            activeColor={activeColor}
            inactiveText={inactiveText}
            hoverBg={hoverBg}
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          />
        </div>
      </aside>

      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <header
        className="fixed top-0 right-0 z-40 flex justify-between items-center px-4 md:px-8"
        style={{
          left: isMobile ? "0" : "256px",
          height: "64px",
          background: topBarBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          // Tonal elevation — no hard border
          boxShadow: isDark
            ? "0 1px 0 rgba(255,255,255,0.04)"
            : "0 1px 0 rgba(25,28,30,0.05)",
        }}
      >
        {/* Isotipo en mobile */}
        {isMobile && (
          <Image
            src={isDark ? "/isotipo_dark.png" : "/isotipo.png"}
            alt="Facilitador Docente"
            width={32}
            height={32}
            style={{ objectFit: "contain" }}
            priority
          />
        )}

        {!isMobile && <div className="flex-1" />}

        {/* Right: theme toggle + user */}
        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />

          {/* Ghost border fallback: 15% opacity */}
          <div style={{
            width: "1px", height: "1.75rem",
            background: isDark
              ? "rgba(87,66,56,0.50)"
              : "rgba(222,193,179,0.60)",
          }} />

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p
                className="text-sm font-semibold"
                style={{
                  fontFamily: "var(--font-display)",
                  color: userNameColor,
                  letterSpacing: "-0.01em",
                }}
              >
                {user?.fullName || user?.firstName || "Docente"}
              </p>
            </div>
            <UserButton appearance={{
              elements: {
                userButtonAvatarBox: { width: "34px", height: "34px" },
              },
            }} />
          </div>
        </div>
      </header>

      {/* ── Main Content ──────────────────────────────────────────────────── */}
      <main
        className={activeTab === "asistente" ? "flex flex-col" : "overflow-y-auto"}
        style={{
          marginLeft: isMobile ? "0" : "256px",
          paddingTop: "64px",
          paddingBottom: isMobile ? "72px" : "0",
          ...(activeTab === "asistente"
            ? { height: "100vh", overflow: "hidden" }
            : { minHeight: "100vh" }),
        }}
      >
        {activeTab === "dashboard"       && <DashboardTab onNavigate={(t) => setActiveTab(t as Tab)} />}
        {activeTab === "planificaciones" && <PlanificacionesTab onGoToPlanificador={() => setActiveTab("asistente")} />}
        {activeTab === "alumnos"         && <AlumnosTab />}
        {activeTab === "asistente"       && <AsistenteTab />}
        {activeTab === "programa"        && <ProgramaTab />}
      </main>

      {/* ── Bottom Nav (mobile) ───────────────────────────────────────────── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch"
        style={{
          background: sidebarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          // Tonal separation — no hard border
          boxShadow: isDark
            ? "0 -1px 0 rgba(255,255,255,0.05)"
            : "0 -1px 0 rgba(25,28,30,0.06)",
          height: "72px",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV.map(({ id, mobileLabel, Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 active:scale-90"
              style={{ color: isActive ? activeColor : inactiveText }}
            >
              <div
                className="rounded-2xl transition-all duration-200 flex items-center justify-center"
                style={{
                  padding: "5px 14px",
                  background: isActive ? activeNavBg : "transparent",
                }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span
                style={{
                  fontSize: "10px",
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  letterSpacing: "-0.01em",
                }}
              >
                {mobileLabel}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function NavFooterBtn({
  icon: Icon,
  label,
  isDark,
  activeColor,
  inactiveText,
  hoverBg,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  isDark: boolean;
  activeColor: string;
  inactiveText: string;
  hoverBg: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all w-full text-left"
      style={{
        fontFamily: "var(--font-display)",
        color: inactiveText,
        letterSpacing: "-0.01em",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = hoverBg;
        (e.currentTarget as HTMLButtonElement).style.color = activeColor;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "transparent";
        (e.currentTarget as HTMLButtonElement).style.color = inactiveText;
      }}
    >
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
