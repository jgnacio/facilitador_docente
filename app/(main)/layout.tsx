"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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

export type Tab = "dashboard" | "planificaciones" | "alumnos" | "asistente" | "programa";

const NAV: { id: Tab; label: string; mobileLabel: string; Icon: React.ElementType; href: string }[] = [
  { id: "dashboard",       label: "Dashboard",           mobileLabel: "Inicio",   Icon: LayoutDashboard, href: "/dashboard" },
  { id: "asistente",       label: "Planificador IA",     mobileLabel: "IA",       Icon: Sparkles,        href: "/asistente" },
  { id: "planificaciones", label: "Mis Planificaciones", mobileLabel: "Planes",   Icon: Folder,          href: "/planificaciones" },
  { id: "alumnos",         label: "Alumnos",             mobileLabel: "Alumnos",  Icon: Users,           href: "/alumnos" },
  { id: "programa",        label: "Programa",            mobileLabel: "Programa", Icon: ClipboardList,   href: "/programa" },
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
      className="rounded-xl transition-all active:scale-95 p-2 text-muted-foreground hover:bg-muted"
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
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
  const activeTab = NAV.find(item => pathname.startsWith(item.href))?.id || "dashboard";

  const sidebarBg = "var(--sidebar-bg, rgba(255, 255, 255, 0.85))";
  const topBarBg  = "var(--topbar-bg, rgba(255, 255, 255, 0.80))";
  const mainBg    = "var(--surface)";
  const activeNavBg = "var(--active-nav-bg)";
  const activeColor = "var(--primary)";
  const inactiveText = "var(--on-surface-variant)";
  const hoverBg      = "var(--hover-bg)";
  const userNameColor = "var(--on-surface)";
  const ctaBg       = "var(--primary-subtle)";
  const ctaColor    = "var(--primary)";
  const ctaShadow   = "0 4px 12px var(--primary-subtle)";

  return (
    <div style={{ background: mainBg, minHeight: "100vh" }}>
      <aside
        className="hidden md:flex fixed left-0 top-0 h-screen flex-col z-50 transition-all duration-300 w-64"
        style={{
          background: sidebarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "1.75rem 1.25rem",
          boxShadow: "var(--shadow-ambient)",
        }}
      >
        <Link href="/dashboard" className="flex flex-col items-center justify-center mb-10 px-3">
          <Image
            src={isDark ? "/logo_dark.png" : "/logo.png"}
            alt="Facilitador Docente"
            width={120}
            height={40}
            style={{ objectFit: "contain" }}
            priority
          />
        </Link>

        <nav className="flex flex-col gap-1 flex-grow">
          {NAV.map(({ id, label, Icon, href }) => {
            const isActive = activeTab === id;
            return (
              <Link
                key={id}
                href={href}
                className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 w-full"
                style={{
                  fontFamily: "var(--font-body)",
                  background: isActive ? activeNavBg : "transparent",
                  color: isActive ? activeColor : inactiveText,
                  letterSpacing: "-0.01em",
                }}
              >
                <Icon size={17} strokeWidth={isActive ? 2.5 : 2} />
                <span>{label}</span>
              </Link>
            );
          })}

          <div className="mt-8 px-1">
            <button
              onClick={() => router.push("/asistente")}
              className="w-full py-3 font-bold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 group"
              style={{
                fontFamily: "var(--font-display)",
                background: "transparent",
                color: "var(--primary)",
                fontSize: "0.875rem",
                letterSpacing: "-0.01em",
                border: "1px solid var(--primary)",
              }}
            >
              <Plus size={17} strokeWidth={2.5} />
              Nuevo Plan
            </button>
          </div>
        </nav>

        <div className="flex flex-col gap-0.5 pt-6">
          <NavFooterBtn
            icon={HelpCircle}
            label="Ayuda"
            activeColor={activeColor}
            inactiveText={inactiveText}
            hoverBg={hoverBg}
            onClick={() => window.open("mailto:ignacio.gomez@bit-a.com?subject=Ayuda%20-%20Facilitador%20Docente", "_blank")}
          />
          <NavFooterBtn
            icon={LogOut}
            label="Cerrar Sesión"
            activeColor={activeColor}
            inactiveText={inactiveText}
            hoverBg={hoverBg}
            onClick={() => signOut({ redirectUrl: "/sign-in" })}
          />
        </div>
      </aside>

      <header
        className="fixed top-0 right-0 z-40 flex justify-between items-center px-4 md:px-8 h-16"
        style={{
          left: isMobile ? "0" : "256px",
          background: topBarBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          boxShadow: "var(--shadow-ambient)",
        }}
      >
        {isMobile && (
          <Image
            src={isDark ? "/isotipo_dark.png" : "/isotipo.png"}
            alt="Facilitador Docente"
            width={32}
            height={32}
            priority
          />
        )}
        {!isMobile && <div className="flex-1" />}
        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />
          <div style={{ width: "1px", height: "1.75rem", background: "var(--border)" }} />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ fontFamily: "var(--font-display)", color: userNameColor }}>
                {user?.fullName || user?.firstName || "Docente"}
              </p>
            </div>
            <UserButton appearance={{ elements: { userButtonAvatarBox: { width: "34px", height: "34px" } } }} />
          </div>
        </div>
      </header>

      <main
        className={activeTab === "asistente" ? "flex flex-col" : ""}
        style={{
          marginLeft: isMobile ? "0" : "256px",
          paddingTop: "64px",
          paddingBottom: isMobile ? "72px" : "0",
          overflowX: "hidden",
          ...(activeTab === "asistente" ? { height: "100vh", overflowY: "hidden" } : { minHeight: "100vh", overflowY: "auto" }),
        }}
      >
        {children}
      </main>

      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch h-[72px]"
        style={{
          background: sidebarBg,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "var(--shadow-ambient)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {NAV.map(({ id, mobileLabel, Icon, href }) => {
          const isActive = activeTab === id;
          return (
            <Link key={id} href={href} className="flex-1 flex flex-col items-center justify-center gap-0.5" style={{ color: isActive ? activeColor : inactiveText }}>
              <div className="rounded-2xl flex items-center justify-center" style={{ padding: "5px 14px", background: isActive ? activeNavBg : "transparent" }}>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: "10px", fontWeight: 600, fontFamily: "var(--font-display)" }}>{mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function NavFooterBtn({ icon: Icon, label, activeColor, inactiveText, hoverBg, onClick }: any) {
  return (
    <button onClick={onClick} className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all w-full text-left" style={{ fontFamily: "var(--font-display)", color: inactiveText }}>
      <Icon size={17} strokeWidth={2} />
      <span>{label}</span>
    </button>
  );
}
