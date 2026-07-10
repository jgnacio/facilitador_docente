"use client";

import Link from "next/link";
import { Button, Card, CardContent, CardHeader } from "@heroui/react";
import { Lock, Sparkles, Building2, Users, ListTree, FileWarning } from "lucide-react";
import type { AgentAccess } from "@/app/api-actions";

/** Shape de los 402 de tier (max_required, tier_limit_groups, free_quota_exceeded, etc). */
export type TierBlockInfo = {
  code: "max_required" | "basic_required" | "tier_limit_groups" | "free_quota_exceeded" | string;
  message: string;
  current_tier?: string;
};

type Props = {
  access?: AgentAccess;
  blocked?: TierBlockInfo;
};

const _BLOCK_COPY: Record<string, { title: string; Icon: typeof Lock }> = {
  max_required: { title: "Esta función es parte del plan MAX", Icon: Users },
  basic_required: { title: "Necesitás un plan activo", Icon: Sparkles },
  tier_limit_groups: { title: "Límite del plan gratuito", Icon: ListTree },
  free_quota_exceeded: { title: "Alcanzaste tu límite gratuito de este mes", Icon: FileWarning },
};

export function SubscriptionPaywall({ access, blocked }: Props) {
  if (blocked) {
    const copy = _BLOCK_COPY[blocked.code] ?? { title: "Función premium", Icon: Lock };
    const { Icon } = copy;
    return (
      <div className="flex items-center justify-center min-h-[60vh] p-6">
        <Card
          className="max-w-md w-full"
          style={{ boxShadow: "var(--shadow-ambient)", border: "1px solid var(--border)" }}
        >
          <CardHeader className="flex flex-col items-center gap-3 pt-6">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: "var(--primary-subtle)" }}
            >
              <Icon size={28} style={{ color: "var(--primary)" }} />
            </div>
            <h2
              className="text-xl font-bold text-center"
              style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
            >
              {copy.title}
            </h2>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pb-6">
            <p
              className="text-sm text-center"
              style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
            >
              {blocked.message}
            </p>
            <Link href="/subscriptions">
              <Button variant="primary" fullWidth>
                <Sparkles size={16} />
                Ver planes disponibles
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!access) return null;
  const isInstitutionalIssue = access.reason === "institution_unpaid";

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card
        className="max-w-md w-full"
        style={{ boxShadow: "var(--shadow-ambient)", border: "1px solid var(--border)" }}
      >
        <CardHeader className="flex flex-col items-center gap-3 pt-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--primary-subtle)" }}
          >
            {isInstitutionalIssue ? (
              <Building2 size={28} style={{ color: "var(--primary)" }} />
            ) : (
              <Lock size={28} style={{ color: "var(--primary)" }} />
            )}
          </div>
          <h2
            className="text-xl font-bold text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            {isInstitutionalIssue ? "Tu institución no tiene un ciclo activo" : "Suscripción requerida"}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <p
            className="text-sm text-center"
            style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
          >
            {access.message ??
              "Necesitás una suscripción activa para usar el agente."}
          </p>
          {isInstitutionalIssue ? (
            <p
              className="text-xs text-center"
              style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
            >
              El administrador de tu institución debe pagar el ciclo de facturación para reactivar las licencias.
            </p>
          ) : (
            <Link href="/subscriptions">
              <Button variant="primary" fullWidth>
                <Sparkles size={16} />
                Ver planes disponibles
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
