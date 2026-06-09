"use client";

import { useEffect, useState } from "react";
import {
  Button, Card, Avatar, Chip, Spinner,
  TextField, Label, Input, TextArea, FieldError,
  Select, ListBox,
} from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getAlumnos, getGroups, createAlumno, updateAlumno, deleteAlumno,
  getInformesNEE, createInformeNEE, updateInformeNEE, deleteInformeNEE, uploadInformePDF,
  getDescripcionesFundadas, createDescripcionFundada, updateDescripcionFundada,
  deleteDescripcionFundada, generarDescripcionPreview,
  type Alumno, type Group, type StudentReport, type DescripcionFundada, type EspacioDesempeno,
} from "../../api-actions";
import { useConfirmModal } from "@/app/components/ui/confirm-modal";

const NIVELES = ["Inicial", "Primaria", "Secundaria"];

const TRAMO_GROUPS: { tramoKey: string; tramoLabel: string; grados: string[] }[] = [
  { tramoKey: "tramo_1", tramoLabel: "Tramo 1", grados: ["Nivel 3 años", "Nivel 4 años", "Nivel 5 años"] },
  { tramoKey: "tramo_2", tramoLabel: "Tramo 2", grados: ["1.er grado", "2.do grado"] },
  { tramoKey: "tramo_3", tramoLabel: "Tramo 3", grados: ["3.er grado", "4.to grado"] },
  { tramoKey: "tramo_4", tramoLabel: "Tramo 4", grados: ["5.to grado", "6.to grado"] },
];

const COLORS: Array<"default" | "accent" | "success" | "warning" | "danger"> = [
  "accent", "success", "warning", "danger",
];

function avatarColor(name: string): "default" | "accent" | "success" | "warning" | "danger" {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return COLORS[Math.abs(h) % COLORS.length];
}

type View = "list" | "create" | "edit";

export default function AlumnosTab() {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirmModal();
  const [view, setView]         = useState<View>("list");
  const [editing, setEditing]   = useState<Alumno | null>(null);
  const [search, setSearch]     = useState("");

  const { data: alumnos = [], isPending: loading } = useQuery({
    queryKey: ["alumnos"],
    queryFn: getAlumnos,
  });

  const { data: groups = [] } = useQuery({
    queryKey: ["groups"],
    queryFn: getGroups,
  });

  const groupMap = Object.fromEntries(groups.map((g) => [g.id, g]));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["alumnos"] });

  const [assigningAlumno, setAssigningAlumno] = useState<Alumno | null>(null);

  const filtered = alumnos.filter((a) =>
    a.nombre_completo.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (a: Alumno) => { setEditing(a); setView("edit"); };

  const handleDelete = (a: Alumno) => {
    confirm({
      title: "Eliminar alumno",
      message: `¿Estás seguro de que deseas eliminar a ${a.nombre_completo}? Esta acción no se puede deshacer.`,
      onConfirm: async () => {
        await deleteAlumno(a.id);
        refresh();
      },
    });
  };

  const assignMutation = useMutation({
    mutationFn: ({ id, group_id }: { id: number; group_id: string | null }) =>
      updateAlumno(id, { group_id }),
    onSuccess: () => {
      setAssigningAlumno(null);
      refresh();
    },
  });

  if (view === "create") {
    return (
      <AlumnoForm
        groups={groups}
        onBack={() => setView("list")}
        onSaved={() => { setView("list"); refresh(); }}
      />
    );
  }

  if (view === "edit" && editing) {
    return (
      <AlumnoForm
        alumno={editing}
        groups={groups}
        onBack={() => { setView("list"); setEditing(null); }}
        onSaved={() => { setView("list"); setEditing(null); refresh(); }}
      />
    );
  }

  return (
    <>
    {confirmModal}
    <div className="p-6 max-w-4xl w-full mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Mis Alumnos</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Cargando…" : `${alumnos.length} alumno${alumnos.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onPress={() => setView("create")}>
          <PersonAddIcon /> Agregar
        </Button>
      </div>

      {/* Search */}
      {!loading && alumnos.length > 0 && (
        <TextField fullWidth className="mb-5" value={search} onChange={setSearch}>
          <Input placeholder="Buscar alumno por nombre…" />
        </TextField>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--success, #10b981)"}}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : alumnos.length === 0 ? (
        <Card variant="transparent" className="border border-dashed border-border p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-success/10 flex items-center justify-center text-success">
            <GroupIcon size={28} />
          </div>
          <div>
            <p className="font-semibold text-foreground">No hay alumnos registrados</p>
            <p className="text-sm text-muted-foreground mt-1">Agregá tus alumnos para vincularlos a planificaciones.</p>
          </div>
          <Button variant="primary" onPress={() => setView("create")}>+ Agregar alumno</Button>
        </Card>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8 text-sm">
          No se encontraron alumnos con &quot;{search}&quot;.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((a) => (
            <AlumnoCard
              key={a.id}
              alumno={a}
              group={a.group_id ? groupMap[a.group_id] : undefined}
              onEdit={() => handleEdit(a)}
              onDelete={() => handleDelete(a)}
              onAssign={() => setAssigningAlumno(a)}
            />
          ))}
        </div>
      )}

      {/* ── Assign to group modal ───────────────────────────────────────────── */}
      {assigningAlumno && (
        <GroupAssignModal
          alumno={assigningAlumno}
          groups={groups}
          currentGroupId={assigningAlumno.group_id ?? null}
          onClose={() => setAssigningAlumno(null)}
          onAssign={(groupId) => assignMutation.mutate({ id: assigningAlumno.id, group_id: groupId })}
          isPending={assignMutation.isPending}
        />
      )}
    </div>
    </>
  );
}

// ── Alumno card ───────────────────────────────────────────────────────────────

function AlumnoCard({ alumno, group, onEdit, onDelete, onAssign }: {
  alumno: Alumno;
  group?: Group;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
}) {
  const sub = [alumno.nivel, alumno.grado].filter(Boolean).join(" · ");
  return (
    <Card variant="default" className="flex flex-row items-start gap-3 p-4">
      <Avatar size="md" color={avatarColor(alumno.nombre_completo)}>
        <Avatar.Fallback>{alumno.nombre_completo?.[0]?.toUpperCase() ?? "?"}</Avatar.Fallback>
      </Avatar>
      <div className="flex-1 min-w-0 mt-0.5">
        <p className="font-semibold text-foreground text-sm">{alumno.nombre_completo}</p>
        <div className="flex flex-wrap gap-1 mt-1">
          {sub && (
            <Chip variant="soft" color="default" size="sm">{sub}</Chip>
          )}
          {group && (
            <Chip variant="soft" color="accent" size="sm">
              <span style={{ display: "flex", alignItems: "center", gap: "3px" }}>
                <GroupIcon size={11} />
                {group.name}
              </span>
            </Chip>
          )}
        </div>
        {alumno.notas && (
          <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{alumno.notas}</p>
        )}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          onClick={onAssign}
          className={`p-1.5 rounded-lg transition-all ${group ? "text-accent hover:text-accent hover:bg-accent/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
          aria-label="Asignar a grupo"
          title={group ? `Cambiar grupo (${group.name})` : "Asignar a grupo"}
        >
          <GroupIcon size={14} />
        </button>
        <button
          onClick={onEdit}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          aria-label="Editar alumno"
        >
          <EditIcon />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
          aria-label="Eliminar alumno"
        >
          <TrashIcon />
        </button>
      </div>
    </Card>
  );
}

// ── Alumno form (create + edit) ───────────────────────────────────────────────

function AlumnoForm({ alumno, groups, onBack, onSaved }: {
  alumno?: Alumno;
  groups: Group[];
  onBack: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(alumno);
  const [nombre, setNombre]       = useState(alumno?.nombre_completo ?? "");
  const [nacimiento, setNacimiento] = useState(alumno?.fecha_nacimiento ?? "");
  const [nivel, setNivel]         = useState(alumno?.nivel ?? "");
  const [grado, setGrado]         = useState(alumno?.grado ?? "");
  const [notas, setNotas]         = useState(alumno?.notas ?? "");
  const [groupId, setGroupId]     = useState(alumno?.group_id ?? "");
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [touched, setTouched]     = useState(false);

  const save = async () => {
    setTouched(true);
    if (!nombre.trim()) return;
    setSaving(true);
    setError("");
    const data = {
      nombre_completo: nombre.trim(),
      fecha_nacimiento: nacimiento.trim() || undefined,
      nivel: nivel || undefined,
      grado: grado || undefined,
      notas: notas.trim() || undefined,
    };
    const result = isEdit && alumno
      ? await updateAlumno(alumno.id, { ...data, group_id: groupId || null })
      : await createAlumno({ ...data, group_id: groupId || undefined });
    setSaving(false);
    if (result) onSaved();
    else setError("Error al guardar. Verificá que la API esté activa.");
  };

  return (
    <div className="p-6 max-w-2xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" isIconOnly size="sm" onPress={onBack}>
          <BackIcon />
        </Button>
        <h2 className="text-xl font-bold text-foreground">
          {isEdit ? "Editar Alumno" : "Nuevo Alumno"}
        </h2>
      </div>

      <div className="space-y-4">
        <TextField
          fullWidth
          isRequired
          isInvalid={touched && !nombre.trim()}
          value={nombre}
          onChange={setNombre}
        >
          <Label>Nombre completo</Label>
          <Input placeholder="Ej: Ana García" />
          {touched && !nombre.trim() && <FieldError>El nombre es requerido.</FieldError>}
        </TextField>

        <div>
          <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
            Fecha de nacimiento
          </label>
          <input
            type="date"
            value={nacimiento}
            onChange={(e) => setNacimiento(e.target.value)}
            style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none" }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
              Nivel
            </label>
            <select
              value={nivel}
              onChange={(e) => setNivel(e.target.value)}
              style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: nivel ? "var(--on-surface)" : "var(--on-surface-variant)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", cursor: "pointer", appearance: "auto" }}
            >
              <option value="">Seleccioná el nivel</option>
              {NIVELES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
              Grado
            </label>
            <select
              value={grado}
              onChange={(e) => setGrado(e.target.value)}
              style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: grado ? "var(--on-surface)" : "var(--on-surface-variant)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", cursor: "pointer", appearance: "auto" }}
            >
              <option value="">Seleccioná el grado</option>
              {TRAMO_GROUPS.map(({ tramoKey, tramoLabel, grados }) => (
                <optgroup key={tramoKey} label={tramoLabel}>
                  {grados.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {groups.length > 0 && (
          <Select
            fullWidth
            placeholder="Sin grupo asignado"
            value={groupId || null}
            onChange={(key) => setGroupId(String(key ?? ""))}
          >
            <Label>Grupo</Label>
            <Select.Trigger>
              <Select.Value />
              <Select.Indicator />
            </Select.Trigger>
            <Select.Popover>
              <ListBox>
                <ListBox.Item key="" id="" textValue="Sin grupo">
                  Sin grupo<ListBox.ItemIndicator />
                </ListBox.Item>
                {groups.map((g) => (
                  <ListBox.Item key={g.id} id={g.id} textValue={g.name}>
                    {g.name}<ListBox.ItemIndicator />
                  </ListBox.Item>
                ))}
              </ListBox>
            </Select.Popover>
          </Select>
        )}

        <TextField fullWidth value={notas} onChange={setNotas}>
          <Label>Singularidades / Notas</Label>
          <TextArea
            placeholder="Estilos de aprendizaje, necesidades educativas específicas, fortalezas, intereses..."
            rows={4}
          />
        </TextField>

        {isEdit && alumno && (
          <InformesNEESection alumnoId={alumno.id} />
        )}

        {isEdit && alumno && (
          <DescripcionesFundasSection alumno={alumno} />
        )}

        {error && (
          <Chip color="danger" variant="soft" className="w-full justify-start px-3 py-2 text-sm rounded-xl h-auto">
            {error}
          </Chip>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="tertiary" fullWidth onPress={onBack}>Cancelar</Button>
          <Button variant="primary" fullWidth isPending={saving} onPress={save}>
            {({ isPending }) => isPending
              ? <><Spinner size="sm" color="current" /> Guardando…</>
              : isEdit ? "Guardar cambios" : "Guardar Alumno"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Group Assign Modal ─────────────────────────────────────────────────────────

function GroupAssignModal({ alumno, groups, currentGroupId, onClose, onAssign, isPending }: {
  alumno: Alumno;
  groups: Group[];
  currentGroupId: string | null;
  onClose: () => void;
  onAssign: (groupId: string | null) => void;
  isPending: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(currentGroupId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: "1.5rem",
          padding: "1.75rem",
          maxWidth: "420px",
          width: "90%",
          maxHeight: "80vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
          border: "1px solid rgba(127,127,127,0.12)",
        }}
      >
        {/* ── Header ── */}
        <div>
          <p style={{ fontWeight: 700, fontSize: "1rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)", marginBottom: "0.25rem" }}>
            Asignar a grupo
          </p>
          <p style={{ fontSize: "0.8rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
            {alumno.nombre_completo}
            {alumno.nivel && ` · ${alumno.nivel}`}
            {alumno.grado && ` · ${alumno.grado}`}
          </p>
        </div>

        {/* ── Group list ── */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {/* "Sin grupo" option (only if currently assigned) */}
          {currentGroupId && (
            <button
              onClick={() => setSelected(null)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.75rem 1rem",
                borderRadius: "1rem",
                border: selected === null ? "2px solid var(--danger)" : "1.5px solid var(--outline-variant)",
                background: selected === null ? "var(--danger)/8" : "transparent",
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <div style={{
                width: "32px", height: "32px", borderRadius: "0.75rem",
                background: "var(--danger)/10", display: "flex", alignItems: "center",
                justifyContent: "center", color: "var(--danger)", flexShrink: 0,
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--danger)", fontFamily: "var(--font-dm-sans)" }}>
                  Quitar grupo
                </p>
                <p style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
                  El alumno quedará sin grupo asignado
                </p>
              </div>
            </button>
          )}

          {groups.length === 0 ? (
            <p style={{ textAlign: "center", padding: "2rem 0", fontSize: "0.85rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
              No hay grupos disponibles. Creá grupos primero.
            </p>
          ) : (
            groups.map((g) => {
              const isSelected = selected === g.id;
              return (
                <button
                  key={g.id}
                  onClick={() => setSelected(g.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    padding: "0.75rem 1rem",
                    borderRadius: "1rem",
                    border: isSelected ? "2px solid var(--primary)" : "1.5px solid var(--outline-variant)",
                    background: isSelected ? "var(--primary-subtle)" : "transparent",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "0.75rem",
                    background: isSelected ? "var(--primary)" : "var(--primary-subtle)",
                    display: "flex", alignItems: "center",
                    justifyContent: "center", color: isSelected ? "#fff" : "var(--primary)",
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <div>
                    <p style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
                      {g.name}
                    </p>
                    {(g.stage || g.level) && (
                      <p style={{ fontSize: "0.7rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
                        {[g.stage, g.level].filter(Boolean).join(" · ")}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <span style={{ marginLeft: "auto", color: "var(--primary)" }}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "0.625rem 1.25rem",
              borderRadius: "0.875rem",
              border: "1.5px solid var(--outline-variant)",
              background: "transparent",
              color: "var(--on-surface-variant)",
              fontSize: "0.85rem",
              fontWeight: 600,
              fontFamily: "var(--font-dm-sans)",
              cursor: "pointer",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (selected !== currentGroupId) {
                onAssign(selected);
              } else {
                onClose();
              }
            }}
            disabled={isPending}
            className="flex items-center justify-center gap-2 transition-all active:scale-95"
            style={{
              flex: 1,
              padding: "0.625rem 1.5rem",
              borderRadius: "0.875rem",
              border: "none",
              background: "var(--primary)",
              color: "#fff",
              fontSize: "0.85rem",
              fontWeight: 700,
              fontFamily: "var(--font-fraunces)",
              cursor: "pointer",
              opacity: isPending || selected === currentGroupId ? 0.6 : 1,
            }}
          >
            {isPending ? (
              <><Spinner size="sm" color="current" /> Asignando…</>
            ) : selected === null ? (
              "Quitar grupo"
            ) : selected === currentGroupId ? (
              "Sin cambios"
            ) : (
              "Asignar"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Informes NEE ─────────────────────────────────────────────────────────────

type NEEView = "list" | "create" | "edit";

function InformesNEESection({ alumnoId }: { alumnoId: number }) {
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirmModal();
  const [view, setView] = useState<NEEView>("list");
  const [editing, setEditing] = useState<StudentReport | null>(null);

  const { data: informes = [], isPending } = useQuery({
    queryKey: ["informes-nee", alumnoId],
    queryFn: () => getInformesNEE(alumnoId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["informes-nee", alumnoId] });

  const deleteMutation = useMutation({
    mutationFn: (reportId: number) => deleteInformeNEE(alumnoId, reportId),
    onSuccess: refresh,
  });

  const handleDelete = (r: StudentReport) => {
    confirm({
      title: "Eliminar informe",
      message: "¿Estás seguro de que deseas eliminar este informe? Esta acción no se puede deshacer.",
      onConfirm: () => deleteMutation.mutate(r.id),
    });
  };

  if (view === "create") {
    return (
      <InformeNEEForm
        alumnoId={alumnoId}
        onBack={() => setView("list")}
        onSaved={() => { setView("list"); refresh(); }}
      />
    );
  }

  if (view === "edit" && editing) {
    return (
      <InformeNEEForm
        alumnoId={alumnoId}
        informe={editing}
        onBack={() => { setView("list"); setEditing(null); }}
        onSaved={() => { setView("list"); setEditing(null); refresh(); }}
      />
    );
  }

  return (
    <>
      {confirmModal}
      <div
        style={{
          border: "1.5px solid var(--outline-variant)",
          borderRadius: "1rem",
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
              Necesidades Educativas Especiales
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", marginTop: "0.1rem" }}>
              Informes del especialista · historial
            </p>
          </div>
          <Button variant="ghost" size="sm" onPress={() => setView("create")}>
            + Agregar informe
          </Button>
        </div>

        {isPending ? (
          <div className="flex justify-center py-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : informes.length === 0 ? (
          <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", textAlign: "center", padding: "0.5rem 0" }}>
            Sin informes NEE registrados.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {informes.map((r) => (
              <div
                key={r.id}
                style={{
                  background: "var(--surface-container-low)",
                  borderRadius: "0.875rem",
                  padding: "0.75rem 1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.4rem",
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
                      {r.diagnostico}
                    </p>
                    <p style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", marginTop: "0.25rem", lineHeight: 1.45 }}>
                      {r.recomendaciones_especialista.length > 120
                        ? r.recomendaciones_especialista.slice(0, 120) + "…"
                        : r.recomendaciones_especialista}
                    </p>
                    <p style={{ fontSize: "0.65rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", marginTop: "0.35rem", opacity: 0.6 }}>
                      {new Date(r.updated_at).toLocaleDateString("es-UY", { day: "2-digit", month: "short", year: "numeric" })}
                      {r.informe_pdf_url && " · PDF adjunto"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => { setEditing(r); setView("edit"); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                      aria-label="Editar informe"
                    >
                      <EditIcon />
                    </button>
                    <button
                      onClick={() => handleDelete(r)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all"
                      aria-label="Eliminar informe"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function InformeNEEForm({
  alumnoId,
  informe,
  onBack,
  onSaved,
}: {
  alumnoId: number;
  informe?: StudentReport;
  onBack: () => void;
  onSaved: () => void;
}) {
  const isEdit = Boolean(informe);
  const [diagnostico, setDiagnostico] = useState(informe?.diagnostico ?? "");
  const [recomendaciones, setRecomendaciones] = useState(informe?.recomendaciones_especialista ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  const save = async () => {
    setTouched(true);
    if (!diagnostico.trim() || !recomendaciones.trim()) return;
    setSaving(true);
    setError("");

    let result: StudentReport | null = null;
    if (isEdit && informe) {
      result = await updateInformeNEE(alumnoId, informe.id, {
        diagnostico: diagnostico.trim(),
        recomendaciones_especialista: recomendaciones.trim(),
      });
    } else {
      result = await createInformeNEE(alumnoId, {
        diagnostico: diagnostico.trim(),
        recomendaciones_especialista: recomendaciones.trim(),
      });
    }

    if (!result) {
      setSaving(false);
      setError("Error al guardar. Verificá que la API esté activa.");
      return;
    }

    if (pdfFile) {
      setUploadingPdf(true);
      const formData = new FormData();
      formData.append("file", pdfFile);
      await uploadInformePDF(alumnoId, result.id, formData);
      setUploadingPdf(false);
    }

    setSaving(false);
    onSaved();
  };

  return (
    <div
      style={{
        border: "1.5px solid var(--outline-variant)",
        borderRadius: "1rem",
        padding: "1rem 1.25rem",
        display: "flex",
        flexDirection: "column",
        gap: "0.875rem",
      }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--on-surface-variant)", display: "flex", alignItems: "center" }}
          aria-label="Volver"
        >
          <BackIcon />
        </button>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
          {isEdit ? "Editar informe NEE" : "Nuevo informe NEE"}
        </p>
      </div>

      <TextField
        fullWidth
        isRequired
        isInvalid={touched && !diagnostico.trim()}
        value={diagnostico}
        onChange={setDiagnostico}
      >
        <Label>Diagnóstico</Label>
        <Input placeholder="Ej: Trastorno del Espectro Autista (TEA), Dislexia, TDAH…" />
        {touched && !diagnostico.trim() && <FieldError>El diagnóstico es requerido.</FieldError>}
      </TextField>

      <TextField
        fullWidth
        isRequired
        isInvalid={touched && !recomendaciones.trim()}
        value={recomendaciones}
        onChange={setRecomendaciones}
      >
        <Label>Recomendaciones del especialista</Label>
        <TextArea
          placeholder="Ej: Usar apoyos visuales, dar tiempo extra, consignas cortas y claras, trabajo en grupos pequeños…"
          rows={4}
        />
        {touched && !recomendaciones.trim() && <FieldError>Las recomendaciones son requeridas.</FieldError>}
      </TextField>

      <div>
        <label style={{ display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" }}>
          Informe PDF <span style={{ fontWeight: 400, opacity: 0.6 }}>(opcional — solo para referencia)</span>
        </label>
        <input
          id="pdf-upload"
          type="file"
          accept="application/pdf"
          onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
          style={{ display: "none" }}
        />
        <label htmlFor="pdf-upload" style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.5rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.8rem", fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer", transition: "border-color 0.15s" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          {pdfFile ? pdfFile.name : informe?.informe_pdf_url ? "Reemplazar PDF" : "Adjuntar PDF"}
        </label>
        {pdfFile && (
          <p style={{ fontSize: "0.68rem", color: "var(--primary)", marginTop: "0.35rem", fontFamily: "var(--font-dm-sans)" }}>
            {pdfFile.name} — listo para subir
          </p>
        )}
        {informe?.informe_pdf_url && !pdfFile && (
          <p style={{ fontSize: "0.68rem", color: "var(--on-surface-variant)", marginTop: "0.35rem", fontFamily: "var(--font-dm-sans)" }}>
            PDF ya adjunto — presioná el botón para reemplazarlo.
          </p>
        )}
      </div>

      {error && (
        <Chip color="danger" variant="soft" className="w-full justify-start px-3 py-2 text-sm rounded-xl h-auto">
          {error}
        </Chip>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="tertiary" fullWidth onPress={onBack}>Cancelar</Button>
        <Button variant="primary" fullWidth isPending={saving || uploadingPdf} onPress={save}>
          {({ isPending }) => isPending
            ? <><Spinner size="sm" color="current" /> {uploadingPdf ? "Subiendo PDF…" : "Guardando…"}</>
            : isEdit ? "Guardar cambios" : "Guardar informe"}
        </Button>
      </div>
    </div>
  );
}

// ── Descripciones Fundadas ─────────────────────────────────────────────────────

const ESPACIOS = [
  { key: "espacio_comunicacion", label: "Espacio de Comunicación" },
  { key: "espacio_cientifico_matematico", label: "Espacio Científico-Matemático" },
  { key: "espacio_ciencias_sociales", label: "Espacio Ciencias Sociales y Humanidades" },
  { key: "espacio_creativo_artistico", label: "Espacio Creativo-Artístico" },
  { key: "espacio_desarrollo_personal", label: "Espacio de Desarrollo Personal y Conciencia Corporal" },
  { key: "espacio_tecnico_tecnologico", label: "Espacio Técnico-Tecnológico" },
];

const NIVELES_REDE = [
  { value: 1, label: "1 — Avance Mínimo", color: "#ef4444" },
  { value: 2, label: "2 — Avance Escaso", color: "#f97316" },
  { value: 3, label: "3 — Avance Moderado", color: "#eab308" },
  { value: 4, label: "4 — Avance Significativo", color: "#22c55e" },
  { value: 5, label: "5 — Avance Destacado", color: "#6366f1" },
];

const BIMESTRES = [
  { value: 1, label: "1° Bimestre" },
  { value: 2, label: "2° Bimestre" },
  { value: 3, label: "3° Bimestre" },
  { value: 4, label: "4° Bimestre" },
];

function nivelColor(nivel: number): string {
  return NIVELES_REDE.find((n) => n.value === nivel)?.color ?? "var(--on-surface-variant)";
}

function nivelLabel(nivel: number): string {
  return NIVELES_REDE.find((n) => n.value === nivel)?.label ?? `Nivel ${nivel}`;
}

type DescView = "list" | "create" | "edit";

function DescripcionesFundasSection({ alumno }: { alumno: Alumno }) {
  const alumnoId = alumno.id;
  const queryClient = useQueryClient();
  const { confirm, modal: confirmModal } = useConfirmModal();
  const [view, setView] = useState<DescView>("list");
  const [editing, setEditing] = useState<DescripcionFundada | null>(null);

  const { data: descripciones = [], isPending } = useQuery({
    queryKey: ["descripciones-fundadas", alumnoId],
    queryFn: () => getDescripcionesFundadas(alumnoId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["descripciones-fundadas", alumnoId] });

  const deleteMutation = useMutation({
    mutationFn: (descId: number) => deleteDescripcionFundada(alumnoId, descId),
    onSuccess: refresh,
  });

  const handleDelete = (d: DescripcionFundada) => {
    confirm({
      title: "Eliminar descripción fundada",
      message: `¿Eliminar la descripción del ${d.bimestre}° bimestre ${d.anio}? Esta acción no se puede deshacer.`,
      onConfirm: () => deleteMutation.mutate(d.id),
    });
  };

  if (view === "create") {
    return (
      <DescripcionFundadaForm
        alumno={alumno}
        onBack={() => setView("list")}
        onSaved={() => { setView("list"); refresh(); }}
      />
    );
  }

  if (view === "edit" && editing) {
    return (
      <DescripcionFundadaForm
        alumno={alumno}
        descripcion={editing}
        onBack={() => { setView("list"); setEditing(null); }}
        onSaved={() => { setView("list"); setEditing(null); refresh(); }}
      />
    );
  }

  return (
    <>
      {confirmModal}
      <div style={{ border: "1.5px solid var(--outline-variant)", borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div className="flex items-center justify-between">
          <div>
            <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
              Descripciones Fundadas
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", marginTop: "0.1rem" }}>
              Evaluación bimestral · Art. 14 REDE (ANEP 2022)
            </p>
          </div>
          <Button variant="ghost" size="sm" onPress={() => setView("create")}>
            + Nueva descripción
          </Button>
        </div>

        {isPending ? (
          <div className="flex justify-center py-2">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : descripciones.length === 0 ? (
          <p style={{ fontSize: "0.75rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", textAlign: "center", padding: "0.5rem 0" }}>
            Sin descripciones fundadas registradas.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {descripciones.map((d) => {
              const niveles = Object.values(d.espacios_desempeno).map((e) => e.nivel_avance);
              const promedio = niveles.length ? Math.round(niveles.reduce((a, b) => a + b, 0) / niveles.length) : 0;
              return (
                <div key={d.id} style={{ background: "var(--surface-container-low)", borderRadius: "0.875rem", padding: "0.75rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
                      {d.bimestre}° Bimestre {d.anio}
                    </p>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {promedio > 0 && (
                        <span style={{ fontSize: "0.68rem", fontWeight: 600, color: nivelColor(promedio), fontFamily: "var(--font-dm-sans)" }}>
                          {nivelLabel(promedio)}
                        </span>
                      )}
                      {d.descripcion_generada && (
                        <span style={{ fontSize: "0.68rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", opacity: 0.7 }}>
                          · Descripción generada
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => { setEditing(d); setView("edit"); }} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all" aria-label="Editar">
                      <EditIcon />
                    </button>
                    <button onClick={() => handleDelete(d)} className="p-1.5 rounded-lg text-muted-foreground hover:text-danger hover:bg-danger/10 transition-all" aria-label="Eliminar">
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function DescripcionFundadaForm({
  alumno,
  descripcion,
  onBack,
  onSaved,
}: {
  alumno: Alumno;
  descripcion?: DescripcionFundada;
  onBack: () => void;
  onSaved: () => void;
}) {
  const alumnoId = alumno.id;
  const isEdit = Boolean(descripcion);
  const currentYear = new Date().getFullYear();

  const defaultEspacios = (): Record<string, EspacioDesempeno> =>
    Object.fromEntries(ESPACIOS.map((e) => [e.key, { nivel_avance: 3, observacion: "" }]));

  const [bimestre, setBimestre] = useState(descripcion?.bimestre ?? 1);
  const [anio, setAnio] = useState(descripcion?.anio ?? currentYear);
  const [espacios, setEspacios] = useState<Record<string, EspacioDesempeno>>(
    descripcion?.espacios_desempeno ?? defaultEspacios()
  );
  const [relacional, setRelacional] = useState(descripcion?.desempeno_relacional ?? "");
  const [sugerencias, setSugerencias] = useState(descripcion?.sugerencias ?? "");
  const [descripcionGenerada, setDescripcionGenerada] = useState(descripcion?.descripcion_generada ?? "");
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);

  const updateEspacio = (key: string, field: "nivel_avance" | "observacion", value: number | string) => {
    setEspacios((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
  };

  const save = async () => {
    setError("");
    setConflict(false);
    setSaving(true);

    const payload = { bimestre, anio, espacios_desempeno: espacios, desempeno_relacional: relacional, sugerencias };
    let result: DescripcionFundada | null = null;

    if (isEdit && descripcion) {
      result = await updateDescripcionFundada(alumnoId, descripcion.id, {
        ...payload,
        descripcion_generada: descripcionGenerada || undefined,
      });
    } else {
      result = await createDescripcionFundada(alumnoId, payload);
      if (!result) {
        setSaving(false);
        setConflict(true);
        setError(`Ya existe una descripción para el ${bimestre}° bimestre ${anio}. Editá la existente.`);
        return;
      }
      if (descripcionGenerada && result) {
        await updateDescripcionFundada(alumnoId, result.id, { descripcion_generada: descripcionGenerada });
      }
    }

    setSaving(false);
    if (result) onSaved();
    else setError("Error al guardar. Verificá que la API esté activa.");
  };

  const generar = async () => {
    const espaciosConObservacion = Object.values(espacios).filter((e) => e.observacion.trim()).length;
    if (espaciosConObservacion < 2) {
      setError("Completá la observación de al menos 2 espacios para poder generar la descripción.");
      return;
    }
    setGenerating(true);
    setError("");
    const texto = await generarDescripcionPreview(alumnoId, {
      alumno_nombre: alumno.nombre_completo,
      alumno_nivel: alumno.nivel ?? "",
      alumno_grado: alumno.grado ?? "",
      bimestre,
      anio,
      espacios_desempeno: espacios,
      desempeno_relacional: relacional,
      sugerencias,
    });
    setGenerating(false);
    if (texto) {
      setDescripcionGenerada(texto);
    } else {
      setError("Error al generar la descripción. Intentá de nuevo.");
    }
  };

  const labelStyle = { display: "block", fontSize: "0.8rem", fontWeight: 600, color: "var(--on-surface-variant)", marginBottom: "0.4rem", fontFamily: "var(--font-dm-sans)" } as const;
  const selectStyle = { width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", cursor: "pointer", appearance: "auto" } as const;

  return (
    <div style={{ border: "1.5px solid var(--outline-variant)", borderRadius: "1rem", padding: "1rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div className="flex items-center gap-2">
        <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--on-surface-variant)", display: "flex", alignItems: "center" }} aria-label="Volver">
          <BackIcon />
        </button>
        <p style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
          {isEdit ? "Editar descripción fundada" : "Nueva descripción fundada"}
        </p>
      </div>

      {/* Bimestre + Año */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label style={labelStyle}>Bimestre</label>
          <select value={bimestre} onChange={(e) => setBimestre(Number(e.target.value))} style={selectStyle}>
            {BIMESTRES.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
          </select>
        </div>
        <div>
          <label style={labelStyle}>Año</label>
          <input
            type="number"
            value={anio}
            onChange={(e) => setAnio(Number(e.target.value))}
            min={2020}
            max={2040}
            style={{ ...selectStyle, appearance: "auto" }}
          />
        </div>
      </div>

      {/* Espacios del conocimiento */}
      <div>
        <p style={{ ...labelStyle, fontSize: "0.85rem", color: "var(--on-surface)", marginBottom: "0.75rem" }}>
          Desempeño por Espacio del conocimiento
        </p>
        <div className="flex flex-col gap-3">
          {ESPACIOS.map((espacio) => {
            const datos = espacios[espacio.key] ?? { nivel_avance: 3, observacion: "" };
            return (
              <div key={espacio.key} style={{ background: "var(--surface-container-low)", borderRadius: "0.875rem", padding: "0.875rem 1rem", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                <p style={{ fontWeight: 700, fontSize: "0.78rem", color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
                  {espacio.label}
                </p>
                <div>
                  <label style={{ ...labelStyle, fontSize: "0.72rem" }}>Nivel de avance (REDE)</label>
                  <select
                    value={datos.nivel_avance}
                    onChange={(e) => updateEspacio(espacio.key, "nivel_avance", Number(e.target.value))}
                    style={{ ...selectStyle, color: nivelColor(datos.nivel_avance), fontWeight: 600, fontSize: "0.8rem" }}
                  >
                    {NIVELES_REDE.map((n) => (
                      <option key={n.value} value={n.value} style={{ color: n.color, fontWeight: 600 }}>
                        {n.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ ...labelStyle, fontSize: "0.72rem" }}>Observación del docente</label>
                  <textarea
                    value={datos.observacion}
                    onChange={(e) => updateEspacio(espacio.key, "observacion", e.target.value)}
                    placeholder={`Ej: ${espacio.label === "Espacio de Comunicación" ? "El estudiante logra leer con apoyo docente pero no decodifica lo leído." : "Describí el desempeño del estudiante en este espacio…"}`}
                    rows={2}
                    style={{ width: "100%", padding: "0.5rem 0.875rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.8rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desempeño relacional */}
      <div>
        <label style={labelStyle}>Desempeño relacional</label>
        <textarea
          value={relacional}
          onChange={(e) => setRelacional(e.target.value)}
          placeholder="Describí cómo se relaciona el estudiante con sus pares y con los docentes…"
          rows={3}
          style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical" }}
        />
      </div>

      {/* Sugerencias */}
      <div>
        <label style={labelStyle}>Sugerencias para mejorar</label>
        <textarea
          value={sugerencias}
          onChange={(e) => setSugerencias(e.target.value)}
          placeholder="¿En qué áreas puede seguir creciendo? ¿Qué apoyos necesita?"
          rows={3}
          style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical" }}
        />
      </div>

      {/* Descripción generada */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label style={labelStyle}>Descripción fundada</label>
          <button
            onClick={generar}
            disabled={generating}
            style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.375rem 0.875rem", borderRadius: "0.75rem", border: "1.5px solid var(--primary)", background: generating ? "var(--primary-subtle)" : "var(--primary)", color: generating ? "var(--primary)" : "#fff", fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-dm-sans)", cursor: generating ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: generating ? 0.7 : 1 }}
          >
            {generating ? (
              <><svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Generando…</>
            ) : (
              <><SparklesIcon /> Generar con IA</>
            )}
          </button>
        </div>
        <textarea
          value={descripcionGenerada}
          onChange={(e) => setDescripcionGenerada(e.target.value)}
          placeholder="Completá las observaciones y presioná 'Generar con IA', o escribí la descripción manualmente…"
          rows={8}
          style={{ width: "100%", padding: "0.625rem 1rem", borderRadius: "0.75rem", border: "1.5px solid var(--outline-variant)", background: "var(--surface)", color: "var(--on-surface)", fontSize: "0.875rem", fontFamily: "var(--font-dm-sans)", outline: "none", resize: "vertical", lineHeight: 1.6 }}
        />
        <p style={{ fontSize: "0.68rem", color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", marginTop: "0.25rem", opacity: 0.7 }}>
          Podés editar el texto generado antes de guardar.
        </p>
      </div>

      {error && (
        <Chip color={conflict ? "warning" : "danger"} variant="soft" className="w-full justify-start px-3 py-2 text-sm rounded-xl h-auto">
          {error}
        </Chip>
      )}

      <div className="flex gap-3 pt-1">
        <Button variant="tertiary" fullWidth onPress={onBack}>Cancelar</Button>
        <Button variant="primary" fullWidth isPending={saving} onPress={save}>
          {({ isPending }) => isPending
            ? <><Spinner size="sm" color="current" /> Guardando…</>
            : isEdit ? "Guardar cambios" : "Guardar descripción"}
        </Button>
      </div>
    </div>
  );
}

function SparklesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
      <path d="M19 3l.75 2.25L22 6l-2.25.75L19 9l-.75-2.25L16 6l2.25-.75z" />
      <path d="M5 18l.75 2.25L8 21l-2.25.75L5 24l-.75-2.25L2 21l2.25-.75z" />
    </svg>
  );
}

// ── Iconos ────────────────────────────────────────────────────────────────────
function GroupIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function PersonAddIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 19l-7-7 7-7" />
    </svg>
  );
}
function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
