"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Spinner } from "@heroui/react";
import { getCurriculumEstructura } from "../../api-actions";

// ─── Types ────────────────────────────────────────────────────────────────────

type CE = { codigo: string; texto: string; mcn: string[] };
type Materia = {
  nombre: string;
  competencias_especificas: CE[];
  contenidos: Record<string, string[]>;
  criterios: Record<string, string[]>;
};
type FlatEntry = {
  tramoKey: string;
  tramoLabel: string;
  espacioNombre: string;
  materiaKey: string;
  materia: Materia;
};

// ─── Grade config ─────────────────────────────────────────────────────────────

const GRADES: { key: string; label: string }[] = [
  { key: "nivel_3_anios", label: "Nivel 3 años" },
  { key: "nivel_4_anios", label: "Nivel 4 años" },
  { key: "nivel_5_anios", label: "Nivel 5 años" },
  { key: "1er_grado",     label: "1.er grado" },
  { key: "2do_grado",     label: "2.do grado" },
  { key: "3er_grado",     label: "3.er grado" },
  { key: "4to_grado",     label: "4.to grado" },
  { key: "5to_grado",     label: "5.to grado" },
  { key: "6to_grado",     label: "6.to grado" },
];
const GRADE_LABEL = Object.fromEntries(GRADES.map((g) => [g.key, g.label]));

// ─── Build flat index ─────────────────────────────────────────────────────────

function buildIndex(tramos: Record<string, any>): FlatEntry[] {
  const out: FlatEntry[] = [];
  for (const [tramoKey, tramo] of Object.entries(tramos)) {
    for (const [, espacio] of Object.entries(tramo.espacios ?? {})) {
      for (const [materiaKey, materia] of Object.entries((espacio as any).materias ?? {})) {
        out.push({
          tramoKey,
          tramoLabel: tramo.label,
          espacioNombre: (espacio as any).nombre,
          materiaKey,
          materia: materia as Materia,
        });
      }
    }
  }
  return out;
}

function entryId(e: FlatEntry) { return `${e.tramoKey}/${e.materiaKey}`; }

function snip(text: string, q: string): string {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  const start = Math.max(0, i - 15);
  return (start > 0 ? "…" : "") + text.slice(start, start + 90) + (start + 90 < text.length ? "…" : "");
}

// ─── Micro-components ─────────────────────────────────────────────────────────

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className={[
        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border whitespace-nowrap",
        active
          ? "bg-accent/10 text-accent border-accent/30"
          : "text-muted-foreground border-border hover:bg-muted hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function TabBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <button
      onClick={onPress}
      className={[
        "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
        active ? "border-accent text-accent" : "border-transparent text-muted-foreground hover:text-foreground",
      ].join(" ")}
    >
      {label}
    </button>
  );
}

function CEAccordion({ ces }: { ces: CE[] }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (code: string) =>
    setOpen((p) => { const n = new Set(p); n.has(code) ? n.delete(code) : n.add(code); return n; });

  if (!ces?.length)
    return <p className="text-sm text-muted-foreground py-4">No hay competencias registradas.</p>;

  return (
    <div className="space-y-2">
      {ces.map((ce) => (
        <div key={ce.codigo} className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => toggle(ce.codigo)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
          >
            <Chip size="sm" className="bg-accent/10 text-accent flex-shrink-0">{ce.codigo}</Chip>
            <span className="text-sm text-foreground flex-1 min-w-0 line-clamp-1">
              {ce.texto}
            </span>
            <svg className={["w-4 h-4 flex-shrink-0 transition-transform text-muted-foreground", open.has(ce.codigo) ? "rotate-180" : ""].join(" ")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {open.has(ce.codigo) && (
            <div className="px-4 pb-4 bg-muted/20 space-y-3">
              <p className="text-sm text-foreground leading-relaxed pt-2">{ce.texto}</p>
              {(ce.mcn?.length ?? 0) > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {ce.mcn.map((m) => <Chip key={m} size="sm" className="bg-success/10 text-success text-xs">{m}</Chip>)}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function StringList({ items, emptyMsg }: { items: string[]; emptyMsg: string }) {
  if (!items?.length) return <p className="text-sm text-muted-foreground py-4">{emptyMsg}</p>;
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="border border-border rounded-lg px-4 py-3 text-sm text-foreground leading-relaxed">{item}</li>
      ))}
    </ul>
  );
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function ProgramaTab() {
  const [rawTramos, setRawTramos] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  const [query, setQuery] = useState("");
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"ces" | "contenidos" | "criterios">("ces");

  useEffect(() => {
    getCurriculumEstructura()
      .then((d) => {
        if (!d?.tramos || !Object.keys(d.tramos).length) setLoadError(true);
        else setRawTramos(d.tramos as any);
        setLoading(false);
      })
      .catch(() => { setLoadError(true); setLoading(false); });
  }, []);

  const entries = useMemo<FlatEntry[]>(() => rawTramos ? buildIndex(rawTramos) : [], [rawTramos]);

  // Grades that actually have data
  const availableGrades = useMemo(() => {
    const found = new Set<string>();
    for (const e of entries) for (const k of Object.keys(e.materia.contenidos ?? {})) found.add(k);
    return GRADES.filter((g) => found.has(g.key));
  }, [entries]);

  // Unidades curriculares for selected grade
  const materiasForGrade = useMemo<FlatEntry[]>(
    () => selectedGrade ? entries.filter((e) => selectedGrade in (e.materia.contenidos ?? {})) : [],
    [entries, selectedGrade]
  );

  const currentEntry = useMemo<FlatEntry | null>(
    () => entries.find((e) => entryId(e) === selectedId) ?? null,
    [entries, selectedId]
  );

  // Grades the current materia has (for inline switcher)
  const materiaGrades = useMemo(() => {
    if (!currentEntry) return [];
    return GRADES.filter((g) => g.key in (currentEntry.materia.contenidos ?? {}));
  }, [currentEntry]);

  // Active grade for content — default to selectedGrade if valid
  const [contentGrade, setContentGrade] = useState<string | null>(null);
  const effectiveGrade = contentGrade ?? selectedGrade ?? materiaGrades[0]?.key ?? null;

  // ── Search ────────────────────────────────────────────────────────────────

  type SResult = { entry: FlatEntry; gradeKey: string; snip: string };
  const searchResults = useMemo<SResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    const results: SResult[] = [];
    const seen = new Set<string>();

    for (const entry of entries) {
      const add = (gk: string, s: string) => {
        const k = `${entryId(entry)}/${gk}`;
        if (seen.has(k)) return;
        seen.add(k);
        results.push({ entry, gradeKey: gk, snip: s });
      };

      const firstGrade = Object.keys(entry.materia.contenidos ?? {})[0] ?? "";

      if (entry.materia.nombre.toLowerCase().includes(q)) {
        add(firstGrade, `Unidad curricular: ${entry.materia.nombre}`);
        continue;
      }
      for (const ce of entry.materia.competencias_especificas ?? []) {
        if (ce.texto?.toLowerCase().includes(q) || ce.codigo?.toLowerCase() === q) {
          add(firstGrade, `CE ${ce.codigo}: ${snip(ce.texto ?? "", q)}`);
          break;
        }
      }
      for (const [gk, items] of Object.entries(entry.materia.contenidos ?? {})) {
        for (const c of items) {
          if (c.toLowerCase().includes(q)) { add(gk, snip(c, q)); break; }
        }
      }
      for (const [gk, items] of Object.entries(entry.materia.criterios ?? {})) {
        for (const c of items) {
          if (c.toLowerCase().includes(q)) { add(gk, `Criterio: ${snip(c, q)}`); break; }
        }
      }
    }
    return results.slice(0, 10);
  }, [query, entries]);

  const openFromSearch = (r: SResult) => {
    setSelectedGrade(r.gradeKey);
    setSelectedId(entryId(r.entry));
    setContentGrade(r.gradeKey);
    setQuery("");
    setActiveTab("ces");
  };

  const pickGrade = (g: string) => {
    setSelectedGrade(g);
    setSelectedId(null);
    setContentGrade(g);
  };

  const pickMateria = (e: FlatEntry) => {
    setSelectedId(entryId(e));
    setContentGrade(selectedGrade);
    setActiveTab("ces");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading)
    return (
      <div className="flex flex-col items-center justify-center py-4 gap-2">
        <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{color: "var(--accent, #06b6d4)"}}>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-muted-foreground">Cargando programa…</p>
      </div>
    );

  if (loadError)
    return (
      <div className="p-6 max-w-3xl mx-auto border border-dashed border-danger/40 rounded-xl p-10 text-center">
        <p className="text-sm text-danger">No se pudo cargar el programa curricular.</p>
      </div>
    );

  const searching = query.trim().length >= 2;
  const items = effectiveGrade
    ? (activeTab === "contenidos"
        ? currentEntry?.materia.contenidos[effectiveGrade] ?? []
        : currentEntry?.materia.criterios[effectiveGrade] ?? [])
    : [];

  return (
    <div className="p-6 max-w-3xl w-full mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-foreground">Programa EBI</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Buscá o seleccioná tu grado y unidad curricular.</p>
      </div>

      {/* Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="11" cy="11" r="8" /><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscá un contenido, CE, criterio o unidad curricular…"
          className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute inset-y-0 right-3 flex items-center text-xl text-muted-foreground hover:text-foreground leading-none">×</button>
        )}
      </div>

      {/* Search results */}
      {searching ? (
        <div className="space-y-2">
          {!searchResults.length
            ? <p className="text-sm text-muted-foreground px-1">Sin resultados para "{query}".</p>
            : searchResults.map((r, i) => (
              <button key={i} onClick={() => openFromSearch(r)}
                className="w-full text-left border border-border rounded-xl px-4 py-3 hover:bg-muted/40 hover:border-accent/30 transition-all"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-foreground">{r.entry.materia.nombre}</span>
                  <Chip size="sm" className="bg-accent/10 text-accent">{GRADE_LABEL[r.gradeKey] ?? r.gradeKey}</Chip>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{r.entry.tramoLabel}</p>
                <p className="text-xs text-foreground/60 mt-1 line-clamp-1">{r.snip}</p>
              </button>
            ))
          }
        </div>
      ) : (
        <>
          {/* Grade selector */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Grado</p>
            <div className="flex flex-wrap gap-2">
              {availableGrades.map((g) => (
                <Pill key={g.key} label={g.label} active={selectedGrade === g.key} onPress={() => pickGrade(g.key)} />
              ))}
            </div>
          </div>

          {/* Unidad curricular selector */}
          {selectedGrade && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unidad curricular</p>
              <div className="flex flex-wrap gap-2">
                {materiasForGrade.map((e) => (
                  <Pill key={entryId(e)} label={e.materia.nombre} active={selectedId === entryId(e)} onPress={() => pickMateria(e)} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Content panel */}
      {currentEntry ? (
        <div className="border border-border rounded-xl overflow-hidden">
          {/* Panel header */}
          <div className="px-5 pt-4 pb-0">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h3 className="text-base font-bold text-foreground">{currentEntry.materia.nombre}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{currentEntry.tramoLabel} · {currentEntry.espacioNombre}</p>
              </div>
              {/* Inline grade switcher — only when contenidos/criterios and multiple grades */}
              {activeTab !== "ces" && materiaGrades.length > 1 && (
                <div className="flex gap-1.5 flex-wrap">
                  {materiaGrades.map((g) => (
                    <button
                      key={g.key}
                      onClick={() => setContentGrade(g.key)}
                      className={[
                        "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
                        effectiveGrade === g.key
                          ? "bg-accent/10 text-accent border-accent/30"
                          : "text-muted-foreground border-border hover:bg-muted",
                      ].join(" ")}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border px-5 mt-3">
            <TabBtn label="Competencias" active={activeTab === "ces"} onPress={() => setActiveTab("ces")} />
            <TabBtn label="Contenidos" active={activeTab === "contenidos"} onPress={() => setActiveTab("contenidos")} />
            <TabBtn label="Criterios" active={activeTab === "criterios"} onPress={() => setActiveTab("criterios")} />
          </div>

          {/* Body */}
          <div className="p-5">
            {activeTab === "ces" && <CEAccordion ces={currentEntry.materia.competencias_especificas} />}
            {activeTab === "contenidos" && <StringList items={items} emptyMsg="No hay contenidos para este grado." />}
            {activeTab === "criterios" && <StringList items={items} emptyMsg="No hay criterios para este grado." />}
          </div>
        </div>
      ) : !searching && (
        <div className="border border-dashed border-border rounded-xl p-10 flex flex-col items-center gap-3 text-center">
          <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-foreground">
            {!selectedGrade ? "Seleccioná tu grado" : "Seleccioná una unidad curricular"}
          </p>
          <p className="text-xs text-muted-foreground">O usá el buscador para ir directo al contenido.</p>
        </div>
      )}
    </div>
  );
}
