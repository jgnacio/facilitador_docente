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
  type Alumno, type Group,
} from "../../api-actions";

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

  const handleDelete = async (a: Alumno) => {
    if (!confirm(`¿Eliminar a ${a.nombre_completo}? Esta acción no se puede deshacer.`)) return;
    await deleteAlumno(a.id);
    refresh();
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
        <div className="flex justify-center py-16"><Spinner color="success" /></div>
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
