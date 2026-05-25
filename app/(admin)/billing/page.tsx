"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Label,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
  TextField,
} from "@heroui/react";
import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, RefreshCw } from "lucide-react";
import {
  getBillingCycles,
  generateBillingCycle,
  type BillingCycle,
} from "@/app/api-actions";

type ChipColor = "success" | "warning" | "danger" | "default";

const STATUS_LABEL: Record<string, string> = {
  paid:    "Pagado",
  pending: "Pendiente",
  overdue: "Vencido",
};

const STATUS_COLOR: Record<string, ChipColor> = {
  paid:    "success",
  pending: "warning",
  overdue: "danger",
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function BillingPage() {
  const { sessionClaims } = useAuth();
  const institutionId = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)
    ?.institution_tenant_id as string | undefined;

  const queryClient = useQueryClient();
  const [mpPlanId, setMpPlanId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const { data: cycles = [], isPending } = useQuery({
    queryKey: ["admin-billing", institutionId],
    queryFn: () => (institutionId ? getBillingCycles(institutionId) : Promise.resolve([])),
    enabled: !!institutionId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-billing", institutionId] });

  const handleGenerate = async () => {
    if (!institutionId || !mpPlanId.trim()) return;
    setGenerating(true);
    setGenError(null);
    const result = await generateBillingCycle(institutionId, mpPlanId.trim());
    setGenerating(false);
    if (result?.checkout_url) {
      window.location.href = result.checkout_url;
    } else {
      setGenError("No se pudo generar el ciclo. Verificá el MP Plan ID e intentá de nuevo.");
    }
  };

  if (!institutionId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent>
            <p style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
              No se encontró un ID de institución en tu cuenta.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center"
          style={{ background: "var(--primary-subtle)" }}
        >
          <CreditCard size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Facturación
          </h1>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
            Ciclos de facturación de tu institución
          </p>
        </div>
      </div>

      {/* Generate cycle */}
      <Card className="mb-6" style={{ boxShadow: "var(--shadow-ambient)" }}>
        <CardHeader>
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Generar ciclo de facturación
          </h2>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-3 flex-wrap">
            <TextField value={mpPlanId} onChange={setMpPlanId} className="max-w-xs">
              <Label>MP Plan ID</Label>
              <Input placeholder="plan_xxxxxxxx" />
            </TextField>
            <div className="flex flex-col gap-2 mt-6">
              <Button
                variant="primary"
                isDisabled={generating || !mpPlanId.trim()}
                onPress={handleGenerate}
              >
                {generating ? "Generando..." : "Generar ciclo"}
              </Button>
            </div>
          </div>
          {genError && (
            <p className="text-sm mt-3" style={{ color: "var(--destructive)", fontFamily: "var(--font-body)" }}>
              {genError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cycles table */}
      <Card style={{ boxShadow: "var(--shadow-ambient)" }}>
        <CardHeader className="flex items-center justify-between">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Historial de ciclos
          </h2>
           <Button size="sm" variant="secondary" onPress={refresh}>
            <RefreshCw size={14} />
            Actualizar
          </Button>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--on-surface-variant)"}}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : cycles.length === 0 ? (
            <p
              className="text-center py-12 text-sm"
              style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
            >
              No hay ciclos de facturación registrados.
            </p>
          ) : (
            <Table aria-label="Historial de facturación">
              <TableHeader>
                <TableColumn>Período</TableColumn>
                <TableColumn>Licencias</TableColumn>
                <TableColumn>Monto (USD)</TableColumn>
                <TableColumn>Estado</TableColumn>
                <TableColumn>Pagado el</TableColumn>
              </TableHeader>
              <TableBody>
                {cycles.map((cycle: BillingCycle) => (
                  <TableRow key={cycle.id}>
                    <TableCell>
                      <span className="text-sm" style={{ color: "var(--on-surface)", fontFamily: "var(--font-body)" }}>
                        {formatDate(cycle.period_start)} — {formatDate(cycle.period_end)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                        {cycle.license_count}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-semibold" style={{ color: "var(--on-surface)" }}>
                        ${cycle.total_amount_usd.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={STATUS_COLOR[cycle.status] ?? "default"}
                        variant="soft"
                      >
                        {STATUS_LABEL[cycle.status] ?? cycle.status}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                        {formatDate(cycle.paid_at)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
