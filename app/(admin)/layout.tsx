"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import {
  CreditCard,
  KeyRound,
  ArrowLeft,
  Sun,
  Moon,
  Building2,
} from "lucide-react";

const NAV = [
  { label: "Licencias",   href: "/admin/licenses", Icon: KeyRound  },
  { label: "Facturación", href: "/admin/billing",  Icon: CreditCard },
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

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const [isMobile, setIsMobile] = useState(false);

  const institutionId = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)
    ?.institution_tenant_id as string | undefined;

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const sidebarBg  = "var(--sidebar-bg, rgba(255, 255, 255, 0.85))";
  const topBarBg   = "var(--topbar-bg, rgba(255, 255, 255, 0.80))";
  const mainBg     = "var(--surface)";
  const activeNavBg  = "var(--active-nav-bg)";
  const activeColor  = "var(--primary)";
  const inactiveText = "var(--on-surface-variant)";

  return (
    <div style={{ background: mainBg, minHeight: "100vh" }}>
      {/* Sidebar */}
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
        {/* Brand / header */}
        <div className="mb-8 px-3">
          <div className="flex items-center gap-2 mb-1">
            <Building2 size={20} style={{ color: "var(--primary)" }} />
            <span
              className="font-bold text-base"
              style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
            >
              Panel Admin
            </span>
          </div>
          {institutionId && (
            <p className="text-xs truncate" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
              {institutionId}
            </p>
          )}
        </div>

        {/* Nav links */}
        <nav className="flex flex-col gap-1 flex-grow">
          {NAV.map(({ label, href, Icon }) => {
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={href}
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
        </nav>

        {/* Back to portal */}
        <div className="pt-6">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-2xl transition-all duration-200 w-full"
            style={{ fontFamily: "var(--font-body)", color: inactiveText }}
          >
            <ArrowLeft size={17} strokeWidth={2} />
            Volver al portal
          </Link>
        </div>
      </aside>

      {/* Top bar */}
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
        <div className="flex-1" />
        <div className="flex items-center gap-3 ml-auto">
          <ThemeToggle />
          <div style={{ width: "1px", height: "1.75rem", background: "var(--border)" }} />
          <UserButton appearance={{ elements: { userButtonAvatarBox: { width: "34px", height: "34px" } } }} />
        </div>
      </header>

      {/* Main content */}
      <main
        style={{
          marginLeft: isMobile ? "0" : "256px",
          paddingTop: "64px",
          minHeight: "100vh",
          overflowX: "hidden",
          overflowY: "auto",
        }}
      >
        {children}
      </main>
    </div>
  );
}
