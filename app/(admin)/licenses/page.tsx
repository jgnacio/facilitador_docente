"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Input,
  Spinner,
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell,
} from "@heroui/react";

import { useAuth } from "@clerk/nextjs";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, UserPlus, UserMinus, CheckCircle2, AlertCircle } from "lucide-react";
import {
  getInstitutionLicenses,
  assignLicense,
  revokeLicense,
  type License,
} from "@/app/api-actions";

type ChipColor = "success" | "warning" | "danger" | "default";

const STATUS_LABEL: Record<License["status"], string> = {
  available: "Disponible",
  assigned:  "Asignada",
  suspended: "Suspendida",
};

const STATUS_COLOR: Record<License["status"], ChipColor> = {
  available: "success",
  assigned:  "warning",
  suspended: "danger",
};

export default function LicensesPage() {
  const { sessionClaims } = useAuth();
  const institutionId = (sessionClaims?.publicMetadata as Record<string, unknown> | undefined)
    ?.institution_tenant_id as string | undefined;

  const queryClient = useQueryClient();
  const [assignUserId, setAssignUserId] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; ok: boolean } | null>(null);

  const { data: licenses = [], isPending } = useQuery({
    queryKey: ["admin-licenses", institutionId],
    queryFn: () => (institutionId ? getInstitutionLicenses(institutionId) : Promise.resolve([])),
    enabled: !!institutionId,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-licenses", institutionId] });

  const total     = licenses.length;
  const used      = licenses.filter((l) => l.status === "assigned").length;
  const available = licenses.filter((l) => l.status === "available").length;

  const handleAssign = async (licenseId: string) => {
    const userId = assignUserId[licenseId]?.trim();
    if (!userId || !institutionId) return;
    setLoadingId(licenseId);
    const ok = await assignLicense(institutionId, licenseId, userId);
    setFeedback({ id: licenseId, ok });
    if (ok) {
      setAssignUserId((prev) => ({ ...prev, [licenseId]: "" }));
      refresh();
    }
    setLoadingId(null);
    setTimeout(() => setFeedback(null), 3000);
  };

  const handleRevoke = async (licenseId: string) => {
    if (!institutionId) return;
    if (!confirm("¿Revocar esta licencia? El usuario perderá acceso.")) return;
    setLoadingId(licenseId);
    const ok = await revokeLicense(institutionId, licenseId);
    setFeedback({ id: licenseId, ok });
    if (ok) refresh();
    setLoadingId(null);
    setTimeout(() => setFeedback(null), 3000);
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
          <KeyRound size={20} style={{ color: "var(--primary)" }} />
        </div>
        <div>
          <h1
            className="text-xl font-bold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Gestión de Licencias
          </h1>
          <p className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
            Asigná y revocá licencias de tu institución
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total",       value: total,     color: "var(--on-surface)"        },
          { label: "Usadas",      value: used,      color: "var(--primary)"            },
          { label: "Disponibles", value: available,  color: "var(--success)"            },
        ].map(({ label, value, color }) => (
          <Card key={label} style={{ boxShadow: "var(--shadow-ambient)" }}>
            <CardContent className="text-center py-4">
              <p className="text-3xl font-bold" style={{ fontFamily: "var(--font-display)", color }}>
                {isPending ? "—" : value}
              </p>
              <p className="text-xs mt-1" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
                {label}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card style={{ boxShadow: "var(--shadow-ambient)" }}>
        <CardHeader className="pb-2">
          <h2
            className="text-base font-semibold"
            style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
          >
            Licencias
          </h2>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : licenses.length === 0 ? (
            <p
              className="text-center py-12 text-sm"
              style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
            >
              No hay licencias registradas para esta institución.
            </p>
          ) : (
            <Table aria-label="Tabla de licencias">
              <TableHeader>
                <TableColumn>ID</TableColumn>
                <TableColumn>Estado</TableColumn>
                <TableColumn>Usuario asignado</TableColumn>
                <TableColumn>Acciones</TableColumn>
              </TableHeader>
              <TableBody>
                {licenses.map((license) => (
                  <TableRow key={license.id}>
                    <TableCell>
                      <span
                        className="text-xs font-mono"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        {license.id}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Chip
                        size="sm"
                        color={STATUS_COLOR[license.status]}
                        variant="soft"
                      >
                        {STATUS_LABEL[license.status]}
                      </Chip>
                    </TableCell>
                    <TableCell>
                      {license.assigned_user_id ? (
                        <span
                          className="text-sm font-mono"
                          style={{ color: "var(--on-surface)" }}
                        >
                          {license.assigned_user_id}
                        </span>
                      ) : (
                        <span style={{ color: "var(--on-surface-variant)", fontSize: "0.8rem" }}>
                          —
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 flex-wrap">
                        {license.status === "available" && (
                          <>
                            <Input
                              placeholder="user_id"
                              value={assignUserId[license.id] ?? ""}
                              onChange={(e) =>
                                setAssignUserId((prev) => ({ ...prev, [license.id]: e.target.value }))
                              }
                              className="w-48"
                            />
                            <Button
                              size="sm"
                              variant="primary"
                              isDisabled={loadingId === license.id || !assignUserId[license.id]?.trim()}
                              onPress={() => handleAssign(license.id)}
                            >
                              {loadingId === license.id ? null : <UserPlus size={14} />}
                              Asignar
                            </Button>
                          </>
                        )}
                        {license.status === "assigned" && (
                          <Button
                            size="sm"
                            variant="danger"
                            isDisabled={loadingId === license.id}
                            onPress={() => handleRevoke(license.id)}
                          >
                            {loadingId === license.id ? null : <UserMinus size={14} />}
                            Revocar
                          </Button>
                        )}
                        {feedback?.id === license.id && (
                          <span
                            className="text-xs flex items-center gap-1"
                            style={{ color: feedback.ok ? "var(--success)" : "var(--destructive)" }}
                          >
                            {feedback.ok
                              ? <><CheckCircle2 size={12} /> OK</>
                              : <><AlertCircle size={12} /> Error</>
                            }
                          </span>
                        )}
                      </div>
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
