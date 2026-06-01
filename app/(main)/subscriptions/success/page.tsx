"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, Button } from "@heroui/react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { getActiveSubscription } from "@/app/api-actions";

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 20;

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "active" | "timeout">("polling");

  useEffect(() => {
    let polls = 0;
    let cancelled = false;

    const tick = async () => {
      polls += 1;
      const sub = await getActiveSubscription();
      if (cancelled) return;
      if (sub && sub.status === "authorized") {
        setStatus("active");
        return;
      }
      if (polls >= MAX_POLLS) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, POLL_INTERVAL_MS);
    };

    tick();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-6">
      <Card className="max-w-md w-full" style={{ boxShadow: "var(--shadow-ambient)" }}>
        <CardHeader className="flex flex-col items-center gap-3 pt-6">
          {status === "polling" && (
            <Loader2 size={40} className="animate-spin" style={{ color: "var(--primary)" }} />
          )}
          {status === "active" && (
            <CheckCircle2 size={40} style={{ color: "var(--success)" }} />
          )}
          <h2
            className="text-xl font-bold text-center"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            {status === "polling" && "Procesando tu pago…"}
            {status === "active" && "¡Suscripción activa!"}
            {status === "timeout" && "El pago está siendo procesado"}
          </h2>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pb-6">
          <p
            className="text-sm text-center"
            style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
          >
            {status === "polling" && "Mercado Pago está confirmando la transacción. Esto puede demorar unos segundos."}
            {status === "active" && "Ya podés usar el agente y todas las funciones."}
            {status === "timeout" && (
              <>
                ¡No te preocupes! Estamos en nuestros primeros días y a veces la confirmación tarda un poco más de lo esperado. Escribinos a{" "}
                <a
                  href="mailto:facilitadordocenteuy@gmail.com?subject=Mi%20suscripción%20no%20se%20activó"
                  style={{ color: "var(--primary)", textDecoration: "underline" }}
                >
                  facilitadordocenteuy@gmail.com
                </a>{" "}
                y te lo solucionamos enseguida 🙌
              </>
            )}
          </p>
          {status === "active" && (
            <Button variant="primary" fullWidth onPress={() => router.push("/asistente")}>
              Ir al asistente
            </Button>
          )}
          {status === "timeout" && (
            <Button variant="primary" fullWidth onPress={() => router.push("/subscriptions")}>
              Volver a mi suscripción
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
