"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  ClipboardList,
  Plus,
  HelpCircle,
  Sun,
  Moon,
} from "lucide-react";

export type Tab = "dashboard" | "alumnos" | "asistente" | "programa";

const NAV: { id: Tab; label: string; mobileLabel: string; Icon: React.ElementType; href: string }[] = [
  { id: "dashboard", label: "Mis Grupos",      mobileLabel: "Grupos",   Icon: LayoutDashboard, href: "/dashboard" },
  { id: "asistente", label: "Planificador IA", mobileLabel: "IA",       Icon: Sparkles,        href: "/asistente" },
  { id: "alumnos",   label: "Alumnos",         mobileLabel: "Alumnos",  Icon: Users,           href: "/alumnos" },
  { id: "programa",  label: "Programa",        mobileLabel: "Programa", Icon: ClipboardList,   href: "/programa" },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div style={{ width: 36, height: 36 }} />;
  const isDark = resolvedTheme === "dark";
  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="rounded-xl transition-all active:scale-95 p-2"
      style={{ color: "var(--on-surface-variant)" }}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useUser();

  const activeTab = NAV.find(item => pathname.startsWith(item.href))?.id || "dashboard";

  const navbarBg    = "var(--sidebar-bg, rgba(255, 255, 255, 0.85))";
  const mainBg      = "var(--surface)";
  const activeNavBg = "var(--active-nav-bg)";
  const activeColor = "var(--primary)";
  const inactiveText = "var(--on-surface-variant)";
  const userNameColor = "var(--on-surface)";

  return (
    <div style={{ background: mainBg, minHeight: "100vh" }}>
      {/* Top Navbar */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 px-4 md:px-6 h-16"
        style={{
          background: navbarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "var(--shadow-ambient)",
        }}
      >
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center shrink-0 mr-4">
          <Image
            src="/images/logo_navbar_crop.png"
            alt="Facilitador Docente"
            width={1909}
            height={494}
            className="h-9 w-auto"
            priority
          />
        </Link>

        {/* Nav links — desktop */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV.map(({ id, label, Icon, href }) => {
            const isActive = activeTab === id;
            return (
              <Link
                key={id}
                href={href}
                className="flex items-center gap-2 px-3 py-2 text-sm font-semibold rounded-xl transition-all duration-200"
                style={{
                  fontFamily: "var(--font-body)",
                  background: isActive ? activeNavBg : "transparent",
                  color: isActive ? activeColor : inactiveText,
                  letterSpacing: "-0.01em",
                }}
              >
                <Icon size={16} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Mobile logo placeholder so right side aligns */}
        <div className="flex-1 md:hidden" />

        {/* Right side */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => router.push("/asistente")}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-sm font-bold rounded-xl transition-all active:scale-95"
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--primary)",
              border: "1px solid var(--primary)",
              letterSpacing: "-0.01em",
            }}
          >
            <Plus size={15} strokeWidth={2.5} />
            Nuevo Plan
          </button>

          <button
            onClick={() => window.open("mailto:facilitadordocenteuy@gmail.com?subject=Ayuda%20-%20Facilitador%20Docente", "_blank")}
            className="hidden md:flex items-center justify-center rounded-xl p-2 transition-all"
            style={{ color: inactiveText }}
            title="Ayuda"
          >
            <HelpCircle size={18} />
          </button>

          <ThemeToggle />

          <div className="mx-1" style={{ width: "1px", height: "1.75rem", background: "var(--border)" }} />

          <div className="flex items-center gap-2">
            <span className="hidden sm:block text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: userNameColor }}>
              {user?.fullName || user?.firstName || "Docente"}
            </span>
            <UserButton appearance={{ elements: { userButtonAvatarBox: { width: "34px", height: "34px" } } }} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main
        className={`${activeTab === "asistente" ? "flex flex-col" : ""} pb-[72px] md:pb-0`}
        style={{
          paddingTop: "64px",
          overflowX: "clip",
          ...(activeTab === "asistente"
            ? { height: "100vh", overflowY: "hidden" }
            : { minHeight: "100vh", overflowY: "auto" }),
        }}
      >
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch h-[72px]"
        style={{
          background: navbarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "var(--shadow-ambient)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV.map(({ id, mobileLabel, Icon, href }) => {
          const isActive = activeTab === id;
          return (
            <Link
              key={id}
              href={href}
              className="flex-1 flex flex-col items-center justify-center gap-0.5"
              style={{ color: isActive ? activeColor : inactiveText }}
            >
              <div
                className="rounded-2xl flex items-center justify-center"
                style={{ padding: "5px 14px", background: isActive ? activeNavBg : "transparent" }}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-display)" }}>
                {mobileLabel}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
