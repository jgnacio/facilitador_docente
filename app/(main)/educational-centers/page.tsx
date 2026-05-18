"use client";

import { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  Input,
  Label,
  Spinner,
  TextField,
} from "@heroui/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import {
  getEducationalCenters,
  createEducationalCenter,
  updateEducationalCenter,
  deleteEducationalCenter,
  type EducationalCenter,
} from "@/app/api-actions";

type View = "list" | "create";

function CenterForm({
  center,
  onSaved,
  onCancel,
}: {
  center?: EducationalCenter;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(center?.name ?? "");
  const [tenantId, setTenantId] = useState(center?.institution_tenant_id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    const ok = center
      ? await updateEducationalCenter(center.id, { name: name.trim(), institution_tenant_id: tenantId.trim() || undefined })
      : await createEducationalCenter({ name: name.trim(), institution_tenant_id: tenantId.trim() || undefined });
    setSaving(false);
    if (ok) {
      onSaved();
    } else {
      setError("No se pudo guardar. Intentá de nuevo.");
    }
  };

  return (
    <Card style={{ boxShadow: "var(--shadow-ambient)" }}>
      <CardHeader>
        <h2
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
        >
          {center ? "Editar centro" : "Nuevo centro educativo"}
        </h2>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <TextField value={name} onChange={setName} isRequired>
          <Label>Nombre del centro</Label>
          <Input placeholder="Ej: Escuela N.° 42 Centenario" />
        </TextField>
        <TextField value={tenantId} onChange={setTenantId}>
          <Label>Institution Tenant ID (opcional)</Label>
          <Input placeholder="Ej: inst_abc123" />
        </TextField>
        {error && (
          <p className="text-sm" style={{ color: "var(--destructive)", fontFamily: "var(--font-body)" }}>
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="primary"
            isDisabled={saving || !name.trim()}
            onPress={handleSave}
          >
            {saving ? null : <Check size={16} />}
            Guardar
          </Button>
          <Button variant="secondary" onPress={onCancel}>
            <X size={16} />
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EducationalCentersPage() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>("list");
  const [editing, setEditing] = useState<EducationalCenter | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: centers = [], isPending } = useQuery({
    queryKey: ["educational-centers"],
    queryFn: getEducationalCenters,
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["educational-centers"] });

  const handleDelete = async (center: EducationalCenter) => {
    if (!confirm(`¿Eliminar "${center.name}"? Esta acción no se puede deshacer.`)) return;
    setDeletingId(center.id);
    await deleteEducationalCenter(center.id);
    setDeletingId(null);
    refresh();
  };

  // Edit view
  if (editing) {
    return (
      <div className="p-6 max-w-2xl w-full mx-auto">
        <CenterForm
          center={editing}
          onSaved={() => { setEditing(null); refresh(); }}
          onCancel={() => setEditing(null)}
        />
      </div>
    );
  }

  // Create view
  if (view === "create") {
    return (
      <div className="p-6 max-w-2xl w-full mx-auto">
        <CenterForm
          onSaved={() => { setView("list"); refresh(); }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "var(--primary-subtle)" }}
          >
            <Building2 size={20} style={{ color: "var(--primary)" }} />
          </div>
          <div>
            <h1
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
            >
              Centros Educativos
            </h1>
            <p className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
              Gestioná tus centros educativos asociados
            </p>
          </div>
        </div>
        <Button
          variant="primary"
          onPress={() => setView("create")}
        >
          <Plus size={16} />
          Nuevo centro
        </Button>
      </div>

      {/* List */}
      {isPending ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : centers.length === 0 ? (
        <Card style={{ boxShadow: "var(--shadow-ambient)" }}>
          <CardContent className="text-center py-12">
            <Building2 size={40} className="mx-auto mb-3" style={{ color: "var(--outline)" }} />
            <p className="text-sm" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}>
              No tenés centros educativos registrados todavía.
            </p>
            <Button
              className="mt-4"
              variant="primary"
              onPress={() => setView("create")}
            >
              <Plus size={16} />
              Agregar el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {centers.map((center) => (
            <Card key={center.id} style={{ boxShadow: "var(--shadow-ambient)" }}>
              <CardContent className="flex flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: "var(--surface-container-low)" }}
                  >
                    <Building2 size={17} style={{ color: "var(--on-surface-variant)" }} />
                  </div>
                  <div className="min-w-0">
                    <p
                      className="font-semibold truncate"
                      style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)", fontSize: "0.9375rem" }}
                    >
                      {center.name}
                    </p>
                    {center.institution_tenant_id && (
                      <p
                        className="text-xs truncate mt-0.5 font-mono"
                        style={{ color: "var(--on-surface-variant)" }}
                      >
                        {center.institution_tenant_id}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    size="sm"
                    variant="secondary"
                    isIconOnly
                    aria-label="Editar"
                    onPress={() => setEditing(center)}
                  >
                    <Pencil size={15} />
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    isIconOnly
                    aria-label="Eliminar"
                    isDisabled={deletingId === center.id}
                    onPress={() => handleDelete(center)}
                  >
                    <Trash2 size={15} />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
