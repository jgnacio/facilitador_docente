"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button, Card } from "@heroui/react";
import { createAdkSession, type PdfRef } from "../../api-actions";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

type Role = "user" | "agent" | "error";

type CurriculumMatch = {
  espacio: string;
  unidad: string;
  tramo: number;
  grado: string;
  contenido: string;
  ce_codigo: string;
  ce_texto: string;
  competencias_mcn: string[];
  criterio_de_logro: string;
  metodo_ensenanza: string;
  metodo_justificacion: string;
};

type PlanificacionMomento = {
  momento: string;
  duracion: string;
  meta_aprendizaje?: string;
  actividad: string;
  rol_docente: string;
  recursos: string;
};

type SecuenciaActividad = {
  numero: number;
  recorte: string;
  meta_aprendizaje: string;
  plan_aprendizaje: string[];
  recursos?: string;
};

type SecuenciaData = {
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

type PlanificacionData = {
  titulo: string;
  grupo: string;
  justificacion: string;
  metodologia: string;
  metodologia_descripcion: string;
  momentos: PlanificacionMomento[];
  ce_codigo: string;
  ce_texto: string;
  contenido: string;
  criterio_de_logro: string;
  espacio: string;
  unidad: string;
  tramo: number;
  competencias_mcn: string[];
};

type Message = {
  id: string;
  role: Role;
  text: string;
  refs: PdfRef[];
  curriculum_match?: CurriculumMatch;
  planificacion?: PlanificacionData;
  secuencia?: SecuenciaData;
};

// ── Token parsers ─────────────────────────────────────────────────────────────
// Regex instances created per-call to avoid shared lastIndex state with /g flag
function parseOptions(text: string): string[] {
  return [...text.matchAll(/\[\[(?!REF:)([^\]]+)\]\]/g)].map((m) => m[1]);
}
function parseMultiOptions(text: string): string[] {
  return [...text.matchAll(/\(\(([^)]+)\)\)/g)].map((m) => m[1]);
}
function stripTokens(text: string): string {
  return text
    .replace(/\[\[REF:[^\]]+\]\]/g, "")
    .replace(/\[\[(?!REF:)[^\]]+\]\]/g, "")
    .replace(/\(\([^)]+\)\)/g, "")
    .replace(/BADGE_REF:.*/g, "")
    .replace(/FUENTE_PDF:.*/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const SESSION_ID = `web-${Math.random().toString(36).slice(2, 10)}`;

// Parser inline — evita importar server action en client component
function parseAgentResponse(data: unknown): {
  text: string;
  refs: PdfRef[];
  curriculum_match?: CurriculumMatch;
  planificacion?: PlanificacionData;
  secuencia?: SecuenciaData;
} {
  if (!data || typeof data !== "object") return { text: "El agente no respondió.", refs: [] };
  const d = data as Record<string, unknown>;
  const raw = typeof d.response === "string" ? d.response.trim() : "";
  if (!raw) return { text: "El agente no respondió.", refs: [] };
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === "string") {
      const refs: PdfRef[] = Array.isArray(parsed.refs)
        ? (parsed.refs as unknown[]).filter(
            (r): r is PdfRef =>
              typeof r === "object" && r !== null &&
              typeof (r as PdfRef).filename === "string" &&
              typeof (r as PdfRef).page === "number"
          )
        : [];
      return {
        text: parsed.text,
        refs,
        curriculum_match: parsed.curriculum_match ?? undefined,
        planificacion: parsed.planificacion ?? undefined,
        secuencia: parsed.secuencia ?? undefined,
      };
    }
  } catch { /* respuesta plana */ }
  return { text: raw, refs: [] };
}

const QUICK_PROMPTS = [
  { label: "Planificar una clase",        emoji: "📝" },
  { label: "Validar una actividad",       emoji: "✅" },
  { label: "Explorar el programa EBI",    emoji: "📚" },
  { label: "Sugerir criterios de logro",  emoji: "🎯" },
];

// Minimal markdown renderer (bold, italic, code, headings, bullets)
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (/^###\s/.test(line)) return <h4 key={i} className="font-bold text-sm mt-3 mb-1">{line.slice(4)}</h4>;
    if (/^##\s/.test(line))  return <h3 key={i} className="font-bold text-base mt-3 mb-1">{line.slice(3)}</h3>;
    if (/^#\s/.test(line))   return <h2 key={i} className="font-bold text-lg mt-3 mb-1">{line.slice(2)}</h2>;
    if (/^[-*]\s/.test(line)) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed">{inline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">{inline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm leading-relaxed">{inline(line)}</p>;
  });
}

function inline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`")  && p.endsWith("`"))  return <code key={i} className="bg-black/10 rounded px-1 font-mono text-xs">{p.slice(1, -1)}</code>;
    if (p.startsWith("*")  && p.endsWith("*"))  return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

export default function AsistenteTab() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [statusLabel, setStatusLabel] = useState("Pensando…");
  const [sessionReady, setReady]      = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const { getToken }                  = useAuth();

  useEffect(() => {
    createAdkSession(SESSION_ID).then(() => setReady(true));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading || !sessionReady) return;
    setInput("");
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text: t, refs: [] }]);
    setLoading(true);
    setStatusLabel("Pensando…");

    try {
      const token = await getToken();
      const res = await fetch(`${API_BASE}/agente/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: t, session_id: SESSION_ID }),
      });

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.type === "tool") {
            setStatusLabel(evt.label);
          } else if (evt.type === "done") {
            const reply = parseAgentResponse({ session_id: evt.session_id, response: evt.response });
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              role: "agent",
              text: reply.text,
              refs: reply.refs,
              curriculum_match: reply.curriculum_match,
              planificacion: reply.planificacion,
              secuencia: reply.secuencia,
            }]);
            setLoading(false);
          } else if (evt.type === "error") {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              role: "error",
              text: "Error al contactar el agente.",
              refs: [],
            }]);
            setLoading(false);
          }
        }
      }
    } catch {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "error", text: "Error de conexión.", refs: [] }]);
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([]);
    createAdkSession(`web-${Math.random().toString(36).slice(2, 10)}`);
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-danger/10 flex items-center justify-center text-danger">
            <ChatIcon />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground">Facilitador Docente EBI</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className={`w-1.5 h-1.5 rounded-full inline-block ${sessionReady ? "bg-success" : "bg-warning"}`} />
              {sessionReady ? "Agente listo" : "Conectando…"}
            </p>
          </div>
        </div>
        <Button variant="ghost" isIconOnly size="sm" onPress={reset} aria-label="Nueva sesión">
          <ResetIcon />
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6 py-12">
            <div className="w-16 h-16 rounded-2xl bg-danger/10 flex items-center justify-center text-danger">
              <ChatIcon size={32} />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground">Asistente Docente EBI</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                Preguntame sobre planificación, actividades, criterios de logro o el programa EBI.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => send(q.label)}
                  disabled={!sessionReady}
                  className="flex items-center gap-2 px-3 py-2.5 border border-border rounded-xl text-sm text-foreground hover:bg-muted disabled:opacity-50 transition-all text-left"
                >
                  <span>{q.emoji}</span>
                  <span className="text-xs font-medium">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => <Bubble key={msg.id} message={msg} onOptionClick={send} />)}
        {loading && <TypingIndicator label={statusLabel} />}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 pt-3 border-t border-border bg-[var(--surface)] flex-shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={loading || !sessionReady}
            rows={1}
            placeholder={sessionReady ? "Escribí tu consulta… (Enter para enviar)" : "Conectando con el agente…"}
            className="flex-1 border border-border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-accent/40 bg-background text-foreground disabled:opacity-60"
            style={{ maxHeight: "120px", overflowY: "auto" }}
          />
          <Button
            variant="primary"
            isIconOnly
            isDisabled={loading || !sessionReady || !input.trim()}
            onPress={() => send(input)}
            aria-label="Enviar"
          >
            <SendIcon />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 ml-1">
          Shift+Enter para nueva línea · El agente tiene acceso al programa EBI
        </p>
      </div>
    </div>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({ message, onOptionClick }: { message: Message; onOptionClick: (t: string) => void }) {
  const isUser  = message.role === "user";
  const isError = message.role === "error";
  const [copied, setCopied] = useState(false);

  const bodyText     = isUser ? message.text : stripTokens(message.text);
  const options      = isUser ? [] : parseOptions(message.text);
  const multiOptions = isUser ? [] : parseMultiOptions(message.text);

  const copy = () => {
    navigator.clipboard.writeText(bodyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-1.5 ${isUser ? "items-end" : "items-start"}`}>
        {/* Curriculum match card */}
        {!isUser && message.curriculum_match && (
          <CurriculumMatchCard data={message.curriculum_match} />
        )}

        {/* Planificacion table */}
        {!isUser && message.planificacion && (
          <PlanificacionTabla data={message.planificacion} />
        )}

        {/* Secuencia de actividades */}
        {!isUser && message.secuencia && (
          <SecuenciaTablaInline data={message.secuencia} />
        )}

        {/* Bubble body — always shown, contains conversational text */}
        {isUser ? (
          <div className="px-4 py-3 rounded-2xl rounded-br-sm bg-accent text-accent-foreground text-sm leading-relaxed">
            {message.text}
          </div>
        ) : (
          <Card
            variant={isError ? "transparent" : "secondary"}
            className={`px-4 py-3 rounded-2xl rounded-bl-sm ${isError ? "border border-danger/30 text-danger" : ""}`}
          >
            <div className="space-y-1">{renderMarkdown(bodyText)}</div>
          </Card>
        )}

        {/* Copy button */}
        {!isUser && (
          <button
            onClick={copy}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-1"
          >
            {copied ? <><span className="text-success">✓</span> Copiado</> : <><CopyIcon /> Copiar</>}
          </button>
        )}

        {/* Single-select options */}
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onOptionClick(opt)}
                className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted hover:border-accent transition-all"
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Multi-select options */}
        {multiOptions.length > 0 && (
          <MultiSelect options={multiOptions} onConfirm={onOptionClick} />
        )}

        {/* PDF reference badges */}
        {message.refs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {message.refs.map((ref, i) => (
              <a
                key={i}
                href={`${API_BASE}/pdfs/${encodeURIComponent(ref.filename)}#page=${ref.page}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors"
              >
                <PdfIcon />
                {ref.label || `${ref.filename} p.${ref.page}`}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── CurriculumMatchCard ───────────────────────────────────────────────────────

function CurriculumMatchCard({ data }: { data: CurriculumMatch }) {
  return (
    <Card variant="secondary" className="p-4 rounded-2xl space-y-3 w-full">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contenido curricular</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        <MatchField label="Espacio" value={data.espacio} />
        <MatchField label="Unidad" value={data.unidad} />
        <MatchField label="Tramo" value={`Tramo ${data.tramo}`} />
        <MatchField label="Grado" value={`${data.grado} grado`} />
      </div>

      <div className="space-y-2.5 pt-1 border-t border-border">
        <MatchField label="Contenido" value={data.contenido} />
        <div>
          <p className="text-xs text-muted-foreground font-medium mb-0.5">{data.ce_codigo}</p>
          <p className="text-sm text-foreground font-medium leading-relaxed">{data.ce_texto}</p>
        </div>
        <MatchField label="Criterio de logro" value={data.criterio_de_logro} />
      </div>

      {data.competencias_mcn.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {data.competencias_mcn.map((c, i) => (
            <span key={i} className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full font-medium">{c}</span>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <p className="text-xs font-semibold text-foreground">{data.metodo_ensenanza}</p>
        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{data.metodo_justificacion}</p>
      </div>
    </Card>
  );
}

function MatchField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <p className="text-sm text-foreground leading-relaxed">{value}</p>
    </div>
  );
}

// ── PlanificacionTabla ────────────────────────────────────────────────────────

function PlanificacionTabla({ data }: { data: PlanificacionData }) {
  const exportCSV = () => {
    const bom = "\uFEFF";
    const headers = ["Momento", "Duración", "Actividad", "Rol docente", "Recursos"];
    const rows = data.momentos.map((m) => [m.momento, m.duracion, m.actividad, m.rol_docente, m.recursos]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.titulo.replace(/\s+/g, "_").slice(0, 60)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const momentoColor: Record<string, string> = {
    Inicio:    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Desarrollo:"bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    Cierre:    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  };

  return (
    <Card variant="secondary" className="p-4 rounded-2xl space-y-4 w-full">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-snug">{data.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data.grupo}</p>
        </div>
        <button
          onClick={exportCSV}
          className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
        >
          <ExportIcon /> Exportar CSV
        </button>
      </div>

      {/* Justificación */}
      <p className="text-xs text-foreground/80 leading-relaxed">{data.justificacion}</p>

      {/* Metodología */}
      <div className="px-3 py-2.5 bg-accent/10 rounded-xl">
        <p className="text-xs font-semibold text-accent">{data.metodologia}</p>
        <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed">{data.metodologia_descripcion}</p>
      </div>

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
      <div className="pt-2 border-t border-border space-y-1 text-xs text-muted-foreground">
        <p><strong className="text-foreground">{data.ce_codigo}</strong> — {data.ce_texto}</p>
        <p><strong className="text-foreground">Contenido:</strong> {data.contenido}</p>
        <p><strong className="text-foreground">Criterio de logro:</strong> {data.criterio_de_logro}</p>
        <p className="text-foreground/50">{data.espacio} · {data.unidad} · Tramo {data.tramo}</p>
      </div>
    </Card>
  );
}

// ── SecuenciaTablaInline ──────────────────────────────────────────────────────

function SecuenciaTablaInline({ data }: { data: SecuenciaData }) {
  return (
    <Card variant="secondary" className="p-4 rounded-2xl space-y-4 w-full">
      {/* Encabezado curricular */}
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
              {data.competencias_generales.map((c, i) => <li key={i} className="text-foreground/80 list-disc">{c}</li>)}
            </ul>
          </div>
        )}
        {data.competencias_especificas.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Competencias específicas:</p>
            <ul className="space-y-0.5 pl-3">
              {data.competencias_especificas.map((c, i) => <li key={i} className="text-foreground/80 list-disc">{c}</li>)}
            </ul>
          </div>
        )}
        {data.criterios_de_logro.length > 0 && (
          <div className="px-3 py-2 border-b border-border">
            <p className="font-semibold uppercase tracking-wide text-muted-foreground mb-1">Criterios de logro:</p>
            <ul className="space-y-0.5 pl-3">
              {data.criterios_de_logro.map((c, i) => <li key={i} className="text-foreground/80 list-disc">{c}</li>)}
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
          <div className="px-3 py-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground">Contenido: </span>
            <span className="text-foreground/80">{data.contenido}</span>
          </div>
        )}
      </div>

      {/* Tabla de actividades */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[600px] border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-muted/50">
              {["ACT.", "RECORTE", "META DE APRENDIZAJE", "PLAN DE APRENDIZAJE", "RECURSOS"].map((h) => (
                <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wide border-b border-border whitespace-nowrap">{h}</th>
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

// ── MultiSelect ───────────────────────────────────────────────────────────────

function MultiSelect({ options, onConfirm }: { options: string[]; onConfirm: (t: string) => void }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = (opt: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(opt) ? next.delete(opt) : next.add(opt);
      return next;
    });

  const confirm = () => {
    if (selected.size === 0) return;
    const ordered = options.filter((o) => selected.has(o)).join(", ");
    onConfirm(ordered);
  };

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
              selected.has(opt)
                ? "border-accent bg-accent/10 text-accent"
                : "border-border text-foreground hover:bg-muted"
            }`}
          >
            {selected.has(opt) && <span className="mr-1">✓</span>}
            {opt}
          </button>
        ))}
      </div>
      {selected.size > 0 && (
        <button
          onClick={confirm}
          className="self-start px-4 py-1.5 rounded-xl bg-accent text-accent-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
        >
          Confirmar ({selected.size})
        </button>
      )}
    </div>
  );
}

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex justify-start">
      <Card variant="secondary" className="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2.5">
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{label}</span>
      </Card>
    </div>
  );
}

// ── Iconos ────────────────────────────────────────────────────────────────────
function ChatIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}
function ResetIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}
function CopyIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function PdfIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
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
