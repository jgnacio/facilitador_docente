"use client";

import { useEffect } from "react";
import { Trash2, AlertTriangle } from "lucide-react";
import { Spinner } from "@heroui/react";

export type ConfirmModalProps = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning";
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  variant = "danger",
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !isPending) onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm, isPending]);

  const accentColor = variant === "danger" ? "var(--danger)" : "var(--warning, #f59e0b)";
  const accentBg = variant === "danger" ? "rgba(220,38,38,0.08)" : "rgba(245,158,11,0.08)";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "1.5rem",
          padding: "2rem",
          maxWidth: "400px",
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          border: "1px solid rgba(127,127,127,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        {/* Icon + text */}
        <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "0.875rem",
              flexShrink: 0,
              background: accentBg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: accentColor,
            }}
          >
            {variant === "danger" ? <Trash2 size={18} strokeWidth={2} /> : <AlertTriangle size={18} strokeWidth={2} />}
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)", marginBottom: "0.375rem" }}>
              {title}
            </p>
            <p style={{ fontSize: "0.82rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", lineHeight: 1.55, opacity: 0.85 }}>
              {message}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.875rem",
              border: "1.5px solid var(--outline-variant)",
              background: "transparent",
              color: "var(--on-surface-variant)",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
              opacity: isPending ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="flex items-center gap-2 transition-all active:scale-95"
            style={{
              padding: "0.6rem 1.25rem",
              borderRadius: "0.875rem",
              border: "none",
              background: accentColor,
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "var(--font-fraunces)",
              cursor: isPending ? "not-allowed" : "pointer",
              opacity: isPending ? 0.7 : 1,
            }}
          >
            {isPending ? <><Spinner size="sm" color="current" /> Eliminando…</> : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Hook para manejar el estado del modal de confirmación ─────────────────────

import { useState } from "react";

type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: "danger" | "warning";
  onConfirm: () => void;
} | null;

export function useConfirmModal() {
  const [state, setState] = useState<ConfirmState>(null);

  function confirm(opts: Omit<NonNullable<ConfirmState>, "onConfirm"> & { onConfirm: () => void }) {
    setState(opts);
  }

  function close() {
    setState(null);
  }

  const modal = state ? (
    <ConfirmModal
      title={state.title}
      message={state.message}
      confirmLabel={state.confirmLabel}
      variant={state.variant}
      onConfirm={() => { state.onConfirm(); close(); }}
      onCancel={close}
    />
  ) : null;

  return { confirm, modal };
}

// ── RenameModal ───────────────────────────────────────────────────────────────

export function RenameModal({
  value,
  onChange,
  isPending,
  onConfirm,
  onCancel,
  title = "Renombrar actividad",
}: {
  value: string;
  onChange: (v: string) => void;
  isPending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
      if (e.key === "Enter" && !isPending && value.trim()) onConfirm();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel, onConfirm, isPending, value]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "1.5rem",
          padding: "1.75rem",
          maxWidth: "380px",
          width: "90%",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          border: "1px solid rgba(127,127,127,0.12)",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        <p style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
          {title}
        </p>
        <input
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={isPending}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            borderRadius: "0.875rem",
            border: "1.5px solid var(--outline-variant)",
            background: "var(--surface)",
            color: "var(--on-surface)",
            fontSize: "0.875rem",
            fontFamily: "var(--font-dm-sans)",
            outline: "none",
          }}
        />
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <button
            onClick={onCancel}
            disabled={isPending}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "0.875rem", border: "1.5px solid var(--outline-variant)", background: "transparent", color: "var(--on-surface-variant)", fontSize: "0.85rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer", opacity: isPending ? 0.5 : 1 }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={isPending || !value.trim()}
            className="flex items-center gap-2 transition-all active:scale-95"
            style={{ padding: "0.6rem 1.25rem", borderRadius: "0.875rem", border: "none", background: "var(--primary)", color: "#fff", fontSize: "0.85rem", fontWeight: 700, fontFamily: "var(--font-fraunces)", cursor: isPending || !value.trim() ? "not-allowed" : "pointer", opacity: isPending || !value.trim() ? 0.6 : 1 }}
          >
            {isPending ? <Spinner size="sm" color="current" /> : null}
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
