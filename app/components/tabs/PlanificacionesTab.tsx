"use client";

import { useEffect, useState } from "react";
import {
  Button, Card, Chip, Spinner,
  TextField, Label, Input, TextArea, FieldError,
  Select, ListBox,
} from "@heroui/react";
import {
  getPlanificaciones, getPlanificacion, createPlanificacion,
  deletePlanificacion, updatePlanificacion,
  type Planificacion,
} from "../../api-actions";
import { useQuery, useQueryClient } from "@tanstack/react-query";

type View = "list" | "detail" | "edit";

const NIVELES = [
  "Inicial - Nivel 3", "Inicial - Nivel 4", "Inicial - Nivel 5",
  "1.er grado", "2.do grado", "3.er grado",
  "4.to grado", "5.to grado", "6.to grado",
];

// ── Tipos para la planificación estructurada ──────────────────────────────────

type PlanMomento = {
  momento: string;
  duracion: string;
  actividad: string;
  rol_docente: string;
  recursos: string;
  meta_aprendizaje?: string;
};

type PlanEstructurada = {
  titulo: string;
  grupo: string;
  justificacion: string;
  metodologia: string;
  metodologia_descripcion: string;
  momentos: PlanMomento[];
  ce_codigo: string;
  ce_texto: string;
  contenido: string;
  criterio_de_logro: string;
  espacio: string;
  unidad: string;
  tramo: number;
  competencias_mcn: string[];
};

type SecuenciaActividad = {
  numero: number;
  recorte: string;
  meta_aprendizaje: string;
  plan_aprendizaje: string[];
  recursos?: string;
};

type SecuenciaEstructurada = {
  espacio: string;
  unidad_curricular: string;
  competencias_generales: string[];
  competencias_especificas: string[];
  criterios_de_logro: string[];
  meta_aprendizaje: string;
  contenido: string;
  evaluaciones?: string;
  actividades: SecuenciaActividad[];
};

type PlanParsed =
  | { kind: "planificacion"; data: PlanEstructurada }
  | { kind: "secuencia"; data: SecuenciaEstructurada };

function parseChatExportado(raw: string): PlanParsed | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    // Secuencia: tiene actividades[]
    const seq = parsed?.secuencia ?? parsed;
    if (seq && Array.isArray(seq.actividades) && seq.actividades.length > 0) {
      return { kind: "secuencia", data: seq as SecuenciaEstructurada };
    }
    // Planificación: tiene momentos[]
    const plan = parsed?.planificacion ?? parsed;
    if (plan && Array.isArray(plan.momentos) && plan.momentos.length > 0) {
      return { kind: "planificacion", data: plan as PlanEstructurada };
    }
  } catch { /* no es JSON */ }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function PlanificacionesTab({ onGoToPlanificador }: { onGoToPlanificador: () => void }) {
  const queryClient = useQueryClient();
  const [view, setView]         = useState<View>("list");
  const [selected, setSelected] = useState<Planificacion | null>(null);
  const [apiError, setApiError] = useState(false);

  const { data: plans = [], isPending: loadingPlans } = useQuery({
    queryKey: ["planificaciones"],
    queryFn: getPlanificaciones,
  });

  const loading = loadingPlans;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["planificaciones"] });

  const openDetail = async (id: number) => {
    const p = await getPlanificacion(id);
    if (p) { setSelected(p); setView("detail"); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("¿Eliminar esta planificación? Esta acción no se puede deshacer.")) return;
    await deletePlanificacion(id);
    setView("list");
    setSelected(null);
    refresh();
  };

  if (view === "edit" && selected) {
    return (
      <PlanForm
        plan={selected}
        onBack={() => setView("detail")}
        onSaved={(updated) => { setSelected(updated); setView("detail"); refresh(); }}
      />
    );
  }
  if (view === "detail" && selected) {
    return (
      <DetailView
        plan={selected}
        onBack={() => { setView("list"); setSelected(null); }}
        onEdit={() => setView("edit")}
        onDelete={() => handleDelete(selected.id)}
      />
    );
  }

  return (
    <div className="p-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Mis Planificaciones</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {loading ? "Cargando…" : `${plans.length} planificación${plans.length !== 1 ? "es" : ""} guardada${plans.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <Button variant="primary" size="sm" onPress={onGoToPlanificador}>
          <SparklesIcon /> Planificador IA
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner color="accent" /></div>
      ) : apiError ? (
        <Card variant="transparent" className="border border-dashed border-danger/40 p-10 flex flex-col items-center gap-4 text-center">
          <p className="text-sm text-danger">No se pudo conectar con la API.</p>
          <Button variant="danger" size="sm" onPress={reload}>Reintentar</Button>
        </Card>
      ) : plans.length === 0 ? (
        <Card variant="transparent" className="border border-dashed border-border p-12 flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center text-accent">
            <SparklesIcon size={28} />
          </div>
          <div>
            <p className="font-semibold text-foreground">Todavía no tenés planificaciones guardadas</p>
            <p className="text-sm text-muted-foreground mt-1">
              Usá el <strong>Planificador IA</strong> para crear tu primera planificación.<br />
              El asistente te guía paso a paso y la guarda acá automáticamente.
            </p>
          </div>
          <Button variant="primary" onPress={onGoToPlanificador}>
            <SparklesIcon /> Ir al Planificador IA
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {plans.map((p) => (
            <Card key={p.id} variant="default" className="cursor-pointer hover:shadow-md transition-shadow">
              <button onClick={() => openDetail(p.id)} className="w-full flex items-center gap-4 p-4 text-left">
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent flex-shrink-0">
                  <DocIcon />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground text-sm truncate">{p.nombre}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[p.nivel, p.periodo_inicio ? `${p.periodo_inicio}${p.periodo_fin ? ` → ${p.periodo_fin}` : ""}` : undefined]
                      .filter(Boolean).join(" · ")}
                  </p>
                  {p.descripcion && (
                    <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{p.descripcion}</p>
                  )}
                </div>
                <ChevronRightIcon />
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail ────────────────────────────────────────────────────────────────────

function DetailView({ plan, onBack, onEdit, onDelete }: {
  plan: Planificacion;
  onBack: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const parsed = plan.chat_exportado ? parseChatExportado(plan.chat_exportado) : null;

  return (
    <div className="p-6 max-w-4xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" isIconOnly size="sm" onPress={onBack}>
          <BackIcon />
        </Button>
        <h2 className="text-xl font-bold text-foreground flex-1 truncate">{plan.nombre}</h2>
        <Button variant="ghost" size="sm" onPress={onEdit}>
          <EditIcon /> Editar
        </Button>
        <Button variant="danger" size="sm" onPress={onDelete}>
          <TrashIcon /> Eliminar
        </Button>
      </div>

      <div className="space-y-3">
        {/* Metadata */}
        {(plan.nivel || plan.periodo_inicio) && (
          <div className="flex flex-wrap gap-2">
            {plan.nivel && (
              <Chip variant="soft" color="default" size="sm">{plan.nivel}</Chip>
            )}
            {plan.periodo_inicio && (
              <Chip variant="soft" color="accent" size="sm">
                {plan.periodo_inicio}{plan.periodo_fin ? ` → ${plan.periodo_fin}` : ""}
              </Chip>
            )}
          </div>
        )}

        {plan.descripcion && (
          <p className="text-sm text-muted-foreground">{plan.descripcion}</p>
        )}

        {/* Planificación estructurada */}
        {parsed?.kind === "secuencia" ? (
          <SecuenciaTabla data={parsed.data} nombre={plan.nombre} />
        ) : parsed?.kind === "planificacion" ? (
          <PlanTabla data={parsed.data} nombre={plan.nombre} />
        ) : plan.chat_exportado ? (
          <Card variant="secondary" className="p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Planificación
            </p>
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
              {plan.chat_exportado}
            </p>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

// ── PlanTabla ─────────────────────────────────────────────────────────────────

function PlanTabla({ data, nombre }: { data: PlanEstructurada; nombre: string }) {
  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { PlanificacionPDF } = await import("../pdf/PlanificacionPDF");
    const blob = await pdf(<PlanificacionPDF data={data} nombre={nombre} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre.replace(/\s+/g, "_").slice(0, 60)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const bom = "\uFEFF";
    const headers = ["Momento", "Duración", "Meta de aprendizaje", "Actividad", "Rol docente", "Recursos"];
    const rows = data.momentos.map((m) => [m.momento, m.duracion, m.meta_aprendizaje ?? "", m.actividad, m.rol_docente, m.recursos]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre.replace(/\s+/g, "_").slice(0, 60)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const momentoColor: Record<string, string> = {
    Inicio:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Desarrollo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    Cierre:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <Card variant="secondary" className="p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-snug">{data.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.grupo}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ExportIcon /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <PdfIcon /> PDF
          </button>
        </div>
      </div>

      {/* Justificación */}
      {data.justificacion && (
        <p className="text-xs text-foreground/80 leading-relaxed">{data.justificacion}</p>
      )}

      {/* Metodología */}
      {data.metodologia && (
        <div className="px-3 py-2.5 bg-accent/10 rounded-xl">
          <p className="text-xs font-semibold text-accent">{data.metodologia}</p>
          {data.metodologia_descripcion && (
            <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">{data.metodologia_descripcion}</p>
          )}
        </div>
      )}

      {/* Tabla */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              {["Momento", "Duración", "Meta de aprendizaje", "Actividad", "Rol docente", "Recursos"].map((h) => (
                <th key={h} className="text-left py-2 pr-3 first:pl-1 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.momentos.map((m, i) => (
              <tr key={i} className="border-b border-border/40 align-top">
                <td className="py-3 pr-3 pl-1 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${momentoColor[m.momento] ?? "bg-muted text-foreground"}`}>
                    {m.momento}
                  </span>
                </td>
                <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap">{m.duracion}</td>
                <td className="py-3 pr-3 leading-relaxed font-medium text-foreground/90">{m.meta_aprendizaje ?? <span className="text-muted-foreground/40 italic">—</span>}</td>
                <td className="py-3 pr-3 leading-relaxed">{m.actividad}</td>
                <td className="py-3 pr-3 leading-relaxed text-muted-foreground">{m.rol_docente}</td>
                <td className="py-3 leading-relaxed text-muted-foreground">{m.recursos}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Referencias normativas */}
      {(data.ce_codigo || data.contenido) && (
        <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
          {data.ce_codigo && (
            <p><strong className="text-foreground">{data.ce_codigo}</strong>{data.ce_texto ? ` — ${data.ce_texto}` : ""}</p>
          )}
          {data.contenido && <p><strong className="text-foreground">Contenido:</strong> {data.contenido}</p>}
          {data.criterio_de_logro && <p><strong className="text-foreground">Criterio de logro:</strong> {data.criterio_de_logro}</p>}
          {(data.espacio || data.unidad) && (
            <p className="text-foreground/50">
              {[data.espacio, data.unidad, data.tramo ? `Tramo ${data.tramo}` : ""].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

// ── SecuenciaTabla ────────────────────────────────────────────────────────────

function SecuenciaTabla({ data, nombre }: { data: SecuenciaEstructurada; nombre: string }) {
  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { SecuenciaPDF } = await import("../pdf/SecuenciaPDF");
    const blob = await pdf(<SecuenciaPDF data={data} nombre={nombre} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre.replace(/\s+/g, "_").slice(0, 60)}_secuencia.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const bom = "\uFEFF";
    const headers = ["N°", "Recorte", "Meta de aprendizaje", "Plan de aprendizaje", "Recursos"];
    const rows = data.actividades.map((a) => [
      String(a.numero),
      a.recorte,
      a.meta_aprendizaje,
      a.plan_aprendizaje.join("\n"),
      a.recursos ?? "",
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombre.replace(/\s+/g, "_").slice(0, 60)}_secuencia.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="secondary" className="p-5 space-y-4">
      {/* Header con export */}
      <div className="flex items-start justify-between gap-3">
        <p className="font-bold text-sm text-foreground leading-snug">{nombre}</p>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <ExportIcon /> Excel
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          >
            <PdfIcon /> PDF
          </button>
        </div>
      </div>

      {/* Tabla de encabezado curricular */}
      <div className="rounded-xl border border-border overflow-hidden text-xs">
        <div className="grid grid-cols-2 border-b border-border">
          <div className="px-3 py-2 border-r border-border">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Espacio: </span>
            <span className="text-foreground">{data.espacio}</span>
          </div>
          <div className="px-3 py-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Unidad curricular: </span>
            <span className="text-foreground">{data.unidad_curricular}</span>
          </div>
        </div>
        {data.competencias_generales.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Competencias generales:</p>
            <ul className="space-y-0.5 pl-3">
              {data.competencias_generales.map((c, i) => (
                <li key={i} className="text-foreground/80 list-disc">{c}</li>
              ))}
            </ul>
          </div>
        )}
        {data.competencias_especificas.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Competencias específicas:</p>
            <ul className="space-y-0.5 pl-3">
              {data.competencias_especificas.map((c, i) => (
                <li key={i} className="text-foreground/80 list-disc">{c}</li>
              ))}
            </ul>
          </div>
        )}
        {data.criterios_de_logro.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Criterios de logro:</p>
            <ul className="space-y-0.5 pl-3">
              {data.criterios_de_logro.map((c, i) => (
                <li key={i} className="text-foreground/80 list-disc">{c}</li>
              ))}
            </ul>
          </div>
        )}
        {data.meta_aprendizaje && (
          <div className="px-3 py-2 border-b border-border bg-accent/5">
            <span className="font-semibold uppercase tracking-wide text-accent">Meta de aprendizaje: </span>
            <span className="text-foreground/90">{data.meta_aprendizaje}</span>
          </div>
        )}
        {data.contenido && (
          <div className="px-3 py-2 border-b border-border">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Contenido: </span>
            <span className="text-foreground/80">{data.contenido}</span>
          </div>
        )}
        {data.evaluaciones && (
          <div className="px-3 py-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Evaluaciones: </span>
            <span className="text-foreground/80">{data.evaluaciones}</span>
          </div>
        )}
      </div>

      {/* Tabla de actividades */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[600px] border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-muted/50">
              {["ACT.", "RECORTE", "META DE APRENDIZAJE", "PLAN DE APRENDIZAJE", "RECURSOS"].map((h) => (
                <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wide border-b border-border whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.actividades.map((act, i) => (
              <tr key={i} className="border-b border-border/40 align-top">
                <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap">{act.numero}.</td>
                <td className="py-3 px-3 text-foreground/80 leading-relaxed min-w-[120px]">{act.recorte}</td>
                <td className="py-3 px-3 text-foreground/80 leading-relaxed min-w-[160px]">{act.meta_aprendizaje}</td>
                <td className="py-3 px-3 leading-relaxed min-w-[240px]">
                  <ul className="space-y-1">
                    {act.plan_aprendizaje.map((paso, j) => (
                      <li key={j} className="flex gap-2 text-foreground/80">
                        <span className="text-muted-foreground shrink-0">-</span>
                        <span>{paso}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3 px-3 text-muted-foreground leading-relaxed min-w-[100px]">
                  {act.recursos || <span className="text-muted-foreground/30">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ── Plan form (create + edit metadata) ───────────────────────────────────────

function PlanForm({ plan, onBack, onSaved }: {
  plan?: Planificacion;
  onBack: () => void;
  onSaved: (updated: Planificacion) => void;
}) {
  const isEdit = Boolean(plan);
  const [nombre, setNombre]         = useState(plan?.nombre ?? "");
  const [descripcion, setDescripcion] = useState(plan?.descripcion ?? "");
  const [nivel, setNivel]           = useState<string>(plan?.nivel ?? "");
  const [inicio, setInicio]         = useState(plan?.periodo_inicio ?? "");
  const [fin, setFin]               = useState(plan?.periodo_fin ?? "");
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState("");
  const [touched, setTouched]       = useState(false);

  const save = async () => {
    setTouched(true);
    if (!nombre.trim()) { setError(""); return; }
    setSaving(true);
    setError("");
    const data = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || undefined,
      nivel: nivel || undefined,
      periodo_inicio: inicio.trim() || undefined,
      periodo_fin: fin.trim() || undefined,
    };
    const result = isEdit && plan
      ? await updatePlanificacion(plan.id, data)
      : await createPlanificacion(data);
    setSaving(false);
    if (result) onSaved(result);
    else setError("Error al guardar. Verificá que la API esté activa.");
  };

  return (
    <div className="p-6 max-w-2xl w-full mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" isIconOnly size="sm" onPress={onBack}>
          <BackIcon />
        </Button>
        <h2 className="text-xl font-bold text-foreground">
          {isEdit ? "Editar Planificación" : "Nueva Planificación"}
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
          <Label>Nombre</Label>
          <Input placeholder="Ej: Planificación Matemática – Tramo 2" />
          {touched && !nombre.trim() && <FieldError>El nombre es requerido.</FieldError>}
        </TextField>

        <TextField fullWidth value={descripcion} onChange={setDescripcion}>
          <Label>Descripción</Label>
          <TextArea placeholder="Descripción breve de la planificación..." rows={3} />
        </TextField>

        <Select
          fullWidth
          placeholder="Seleccionar nivel"
          value={nivel || null}
          onChange={(key) => setNivel(String(key ?? ""))}
        >
          <Label>Nivel educativo</Label>
          <Select.Trigger>
            <Select.Value />
            <Select.Indicator />
          </Select.Trigger>
          <Select.Popover>
            <ListBox>
              {NIVELES.map((n) => (
                <ListBox.Item key={n} id={n} textValue={n}>
                  {n}
                  <ListBox.ItemIndicator />
                </ListBox.Item>
              ))}
            </ListBox>
          </Select.Popover>
        </Select>

        <div className="grid grid-cols-2 gap-4">
          <TextField fullWidth value={inicio} onChange={setInicio}>
            <Label>Período inicio</Label>
            <Input placeholder="Ej: Marzo 2025" />
          </TextField>
          <TextField fullWidth value={fin} onChange={setFin}>
            <Label>Período fin</Label>
            <Input placeholder="Ej: Junio 2025" />
          </TextField>
        </div>

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
              : isEdit ? "Guardar cambios" : "Guardar Planificación"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Iconos ────────────────────────────────────────────────────────────────────
function SparklesIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      <path d="M20 3v4m2-2h-4M4 17v2m1-1H3"/>
    </svg>
  );
}
function DocIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
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
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}
function ExportIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function PdfIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
