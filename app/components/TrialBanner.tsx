"use client";

import Link from "next/link";
import { Sparkles } from "lucide-react";
import type { UserTier } from "@/app/api-actions";

type Props = {
  tier: UserTier;
  /** false en /subscriptions — ya estás viendo los planes, el botón no aporta nada. */
  showCta?: boolean;
};

export function TrialBanner({ tier, showCta = true }: Props) {
  if (!tier.is_trial || !tier.trial_ends_at) return null;

  const msRemaining = new Date(tier.trial_ends_at).getTime() - Date.now();
  const daysRemaining = Math.max(0, Math.ceil(msRemaining / (1000 * 60 * 60 * 24)));

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{
        background: "var(--primary-subtle)",
        borderBottom: "1px solid var(--primary)",
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <Sparkles size={16} style={{ color: "var(--primary)", flexShrink: 0 }} />
        <p style={{ color: "var(--on-surface)", fontFamily: "var(--font-body)" }}>
          Te quedan{" "}
          <span className="font-bold" style={{ fontFamily: "var(--font-display)" }}>
            {daysRemaining} {daysRemaining === 1 ? "día" : "días"}
          </span>{" "}
          de tu prueba MAX — conocé a tus alumnos, generá secuencias y descripciones fundadas antes de que termine.
        </p>
      </div>
      {showCta && (
        <Link
          href="/subscriptions"
          className="shrink-0 text-sm font-bold rounded-lg px-3 py-1.5 transition-all active:scale-95"
          style={{
            fontFamily: "var(--font-display)",
            color: "white",
            background: "var(--primary)",
          }}
        >
          Ver planes
        </Link>
      )}
    </div>
  );
}
