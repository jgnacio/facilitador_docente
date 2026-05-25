"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Spinner,
} from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, CheckCircle2, ExternalLink } from "lucide-react";
import {
  getSubscriptionPlans,
  getActiveSubscription,
  createSubscriptionCheckout,
  type SubscriptionPlan,
} from "@/app/api-actions";

const PERIOD_LABEL: Record<string, string> = {
  monthly:   "Mensual",
  quarterly: "Trimestral",
  yearly:    "Anual",
};

const STATUS_COLOR: Record<string, "success" | "warning" | "danger" | "default"> = {
  active:    "success",
  pending:   "warning",
  cancelled: "danger",
  inactive:  "default",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" });
}

export default function SubscriptionsPage() {
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const { data: subscription, isPending: loadingSub } = useQuery({
    queryKey: ["active-subscription"],
    queryFn: getActiveSubscription,
  });

  const { data: plans = [], isPending: loadingPlans } = useQuery({
    queryKey: ["subscription-plans"],
    queryFn: getSubscriptionPlans,
    enabled: !subscription,
  });

  const handleCheckout = async (plan: SubscriptionPlan) => {
    setCheckingOut(plan.id);
    setCheckoutError(null);
    const result = await createSubscriptionCheckout(plan.id);
    setCheckingOut(null);
    if (result?.init_point) {
      window.location.href = result.init_point;
    } else {
      setCheckoutError("No se pudo iniciar el pago. Intentá de nuevo.");
    }
  };

  return (
    <div className="p-6 max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--primary-subtle)" }}
        >
          <Sparkles size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Suscripción
          </h1>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
            Gestioná tu plan activo o suscribite a uno nuevo
          </p>
        </div>
      </div>

      {loadingSub ? (
        <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--on-surface-variant)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : subscription ? (
        /* Active subscription */
        <Card style={{ boxShadow: "var(--shadow-ambient)" }}>
          <CardHeader className="flex items-center gap-3">
            <CheckCircle2 size={20} style={{ color: "var(--success)" }} />
            <h2
              className="text-base font-semibold"
              style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
            >
              Suscripción activa
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                  Plan
                </p>
                <p className="text-base font-semibold" style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}>
                  {subscription.plan_name}
                </p>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                  Estado
                </p>
                <Chip size="sm" color={STATUS_COLOR[subscription.status] ?? "default"} variant="soft">
                  {subscription.status}
                </Chip>
              </div>
              <div>
                <p className="text-xs mb-1" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                  Período
                </p>
                <p className="text-sm" style={{ color: "var(--on-surface)", fontFamily: "var(--font-body)" }}>
                  {formatDate(subscription.period_start)} — {formatDate(subscription.period_end)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Plan list */
        <div>
          <p className="text-sm mb-4" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
            No tenés una suscripción activa. Elegí el plan que mejor se adapte a tus necesidades:
          </p>

          {loadingPlans ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--on-surface-variant)"}}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : plans.length === 0 ? (
            <Card>
              <CardContent>
                <p className="text-center text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                  No hay planes disponibles en este momento.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <Card
                  key={plan.id}
                  style={{ boxShadow: "var(--shadow-ambient)", border: "1px solid var(--border)" }}
                >
                  <CardHeader>
                    <div>
                      <h3
                        className="text-base font-bold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
                      >
                        {plan.name}
                      </h3>
                      {plan.description && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                          {plan.description}
                        </p>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-4">
                    <div>
                      <span
                        className="text-3xl font-bold"
                        style={{ fontFamily: "var(--font-display)", color: "var(--primary)" }}
                      >
                        ${plan.price_usd.toFixed(2)}
                      </span>
                      <span className="text-sm ml-1" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                        USD / {PERIOD_LABEL[plan.billing_period] ?? plan.billing_period}
                      </span>
                    </div>
                    <Button
                      variant="primary"
                      fullWidth
                      isDisabled={checkingOut === plan.id}
                      onPress={() => handleCheckout(plan)}
                    >
                      <ExternalLink size={14} />
                      Suscribirse
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {checkoutError && (
            <p className="text-sm mt-4" style={{ color: "var(--destructive)", fontFamily: "var(--font-body)" }}>
              {checkoutError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
