"use client";

import { useEffect, useRef, useState, memo } from "react";
import { flushSync } from "react-dom";

import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useAuth, useUser } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { useQuery } from "@tanstack/react-query";
import { Button, Card } from "@heroui/react";
import { getChatSessions, deleteChatSession, getSessionMessages, getProject, getGroup, getSequences, getActivities, getAlumnosByGroup, type ChatSession, type PdfRef } from "../../api-actions";
import { BookOpen, HeartHandshake, Layers, Lightbulb, Sparkles, Plus, Mic, Hammer, SendHorizontal, RotateCcw, ChevronDown, ChevronRight, FolderOpen, FileText, X, PanelLeftOpen, Users } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useShowWatermark } from "../use-show-watermark";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";
const AGENT_BASE = API_BASE;

type Role = "user" | "agent" | "error";

type CurriculumMatch = {
  espacio: string; unidad: string; tramo: number; grado: string;
  contenido: string; ce_codigo: string; ce_texto: string;
  criterio_de_logro: string; meta_aprendizaje: string;
  competencias_mcn: string[];
  metodo_ensenanza: string; metodo_justificacion: string;
};
type PlanificacionMomento = {
  momento: string; duracion: string; meta_aprendizaje?: string;
  actividad: string; rol_docente: string; recursos: string;
};
type SecuenciaActividad = {
  // Nuevo formato (PlanificacionTable con momentos)
  titulo?: string; grupo?: string; justificacion?: string;
  metodologia?: string; metodologia_descripcion?: string;
  momentos?: PlanificacionMomento[];
  ce_codigo?: string; ce_texto?: string; contenido?: string;
  criterio_de_logro?: string; espacio?: string; unidad?: string;
  tramo?: number; competencias_mcn?: string[];
  // Formato legacy
  numero?: number; recorte?: string; meta_aprendizaje?: string;
  plan_aprendizaje?: string[]; recursos?: string;
};
type SecuenciaData = {
  espacio: string; unidad_curricular: string;
  competencias_generales: string[]; competencias_especificas: string[];
  criterios_de_logro: string[]; meta_aprendizaje: string;
  contenido: string; evaluaciones?: string; actividades: SecuenciaActividad[];
};
type PlanificacionData = {
  titulo: string; grupo: string; justificacion: string;
  metodologia: string; metodologia_descripcion: string;
  momentos: PlanificacionMomento[]; ce_codigo: string; ce_texto: string;
  contenido: string; criterio_de_logro: string; espacio: string;
  unidad: string; tramo: number; competencias_mcn: string[];
};
type Message = {
  id: string; role: Role; text: string; refs: PdfRef[];
  curriculum_match?: CurriculumMatch;
  planificacion?: PlanificacionData;
  secuencia?: SecuenciaData;
};

// ── Token parsers ─────────────────────────────────────────────────────────────
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

const generateId = () => {
  if (typeof window !== "undefined" && window.crypto && window.crypto.randomUUID) {
    return window.crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2, 11);
};

function parseAgentResponse(data: unknown): {
  text: string; refs: PdfRef[];
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
        text: parsed.text, refs,
        curriculum_match: parsed.curriculum_match ?? undefined,
        planificacion: parsed.planificacion ?? undefined,
        secuencia: parsed.secuencia ?? undefined,
      };
    }
  } catch { /* respuesta plana */ }
  return { text: raw, refs: [] };
}

// ── Sugerencias reales de las maestras ────────────────────────────────────────
const QUICK_PROMPTS = [
  {
    label: "Quiero planificar una clase para esta semana",
    subtext: "Te genero una planificación lista para usar",
    icon: <Sparkles size={18} />,
    featured: true,
  },
  {
    label: "Planificación para estudiantes con dificultades especiales",
    subtext: "Adaptaciones e inclusión",
    icon: <HeartHandshake size={18} />,
    featured: false,
  },
  {
    label: "Planificación diversificada para multigrado",
    subtext: "Varios grados, una sola clase",
    icon: <Layers size={18} />,
    featured: false,
  },
  {
    label: "Ideas creativas para el contexto de mis alumnos",
    subtext: "Actividades reales y aplicables",
    icon: <Lightbulb size={18} />,
    featured: false,
  },
  {
    label: "Explorar el programa EBI",
    subtext: "Contenidos, competencias y criterios",
    icon: <BookOpen size={18} />,
    featured: false,
  },
];

// ── Markdown renderer — react-markdown + remark-gfm ──────────────────────────
function MarkdownContent({ text, onSurface, onVariant }: { text: string; onSurface: string; onVariant: string }) {
  const displayFont = "var(--font-fraunces)";
  const bodyFont    = "var(--font-dm-sans)";

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h2 className="font-bold text-lg mt-3 mb-1" style={{ color: onSurface, letterSpacing: "-0.02em", fontFamily: displayFont }}>{children}</h2>,
        h2: ({ children }) => <h3 className="font-bold text-base mt-3 mb-1" style={{ color: onSurface, letterSpacing: "-0.02em", fontFamily: displayFont }}>{children}</h3>,
        h3: ({ children }) => <h4 className="font-bold text-sm mt-3 mb-1" style={{ color: onSurface, letterSpacing: "-0.01em", fontFamily: displayFont }}>{children}</h4>,
        p:  ({ children }) => <p className="text-sm leading-relaxed mb-2" style={{ color: onSurface, fontFamily: "var(--font-fraunces)", fontSize: "1rem", letterSpacing: "-0.01em" }}>{children}</p>,
        ul: ({ children }) => <ul className="mb-2 space-y-1" style={{ fontFamily: bodyFont }}>{children}</ul>,
        ol: ({ children }) => <ol className="mb-2 space-y-1 list-decimal ml-4" style={{ fontFamily: bodyFont }}>{children}</ol>,
        li: ({ children }) => <li className="text-sm leading-relaxed ml-4 list-disc" style={{ color: onSurface, fontFamily: bodyFont }}>{children}</li>,
        strong: ({ children }) => <strong style={{ color: "var(--primary)", fontWeight: 700, fontFamily: displayFont, fontStyle: "italic" }}>{children}</strong>,
        em: ({ children }) => <em style={{ color: "var(--primary)", fontFamily: displayFont, fontStyle: "italic", opacity: 0.9 }}>{children}</em>,
        code: ({ children }) => <code className="rounded px-1 font-mono text-xs" style={{ background: "var(--surface-container-high)", color: onSurface }}>{children}</code>,
        hr: () => <hr className="my-3 border-t" style={{ borderColor: "rgba(127, 127, 127, 0.15)" }} />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border" style={{ borderColor: "rgba(127, 127, 127, 0.15)", background: "var(--surface-container-lowest)" }}>
            <table className="w-full text-sm border-collapse" style={{ fontFamily: bodyFont }}>{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead style={{ background: "var(--surface-container-low)" }}>{children}</thead>,
        tr: ({ children }) => <tr className="border-t" style={{ borderColor: "rgba(127, 127, 127, 0.1)" }}>{children}</tr>,
        th: ({ children }) => <th className="px-3 py-2 text-left font-bold text-xs" style={{ color: onSurface, fontFamily: displayFont }}>{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-xs" style={{ color: onSurface, fontFamily: bodyFont }}>{children}</td>,
        blockquote: ({ children }) => <blockquote className="border-l-4 pl-3 my-2 italic" style={{ borderColor: "var(--primary)", color: onVariant, fontFamily: bodyFont }}>{children}</blockquote>,
      }}
    >
      {text}
    </ReactMarkdown>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AsistenteTab({ contextMessage, contextLabel }: { contextMessage?: string; contextLabel?: string }) {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [statusLabel, setStatusLabel] = useState("Pensando…");
  const [sessionReady, setReady]      = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sessions, setSessions]       = useState<ChatSession[]>([]);
  const [showSidebar, setShowSidebar] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Parse group_id and project_id from context message
  const ctxMatch = contextMessage?.match(/group_id=([^,\]\s]+)[^[]*project_id=([^,\]\s]+)/);
  const ctxGroupId = ctxMatch?.[1]?.trim();
  const ctxProjectId = ctxMatch?.[2]?.trim();
  const hasProjectCtx = Boolean(ctxGroupId && ctxProjectId);

  const [showProjectPanel, setShowProjectPanel] = useState(hasProjectCtx);
  const [showGroupPanel, setShowGroupPanel]     = useState(false);

  const bottomRef                     = useRef<HTMLDivElement>(null);
  const scrollContainerRef            = useRef<HTMLDivElement>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const contextUsed                   = useRef(false);
  const { getToken }                  = useAuth();
  const { user }                      = useUser();
  const { resolvedTheme }             = useTheme();
  const router                        = useRouter();


  const primaryColor  = "var(--primary)";
  const surfaceLow    = "var(--surface-container-low)";
  const surfaceLowest = "var(--surface-container-lowest)";
  const onSurface     = "var(--on-surface)";
  const onVariant     = "var(--on-surface-variant)";
  const shadowCard    = "var(--shadow-ambient)";

  useEffect(() => {
    getChatSessions().then(setSessions).finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || loading || !sessionReady) return;
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    setMessages((prev) => [...prev, { id: generateId(), role: "user", text: t, refs: [] }]);
    setLoading(true);
    setStatusLabel("Pensando…");
    setStreamingText("");

    // Prepend context to first message only — invisible en UI, visible al agente
    let agentMessage = t;
    if (contextMessage && !contextUsed.current) {
      contextUsed.current = true;
      agentMessage = `${contextMessage} ${t}`;
    }

    const controller = new AbortController();
    // 240s: la generación final del LLM sola puede tardar ~60s, y sumada a varias tool calls
    // un turno legítimo supera fácil el minuto; Cloud Run corta a los 300s, dejamos margen debajo de eso
    const timeoutId = setTimeout(() => controller.abort(), 240_000);

    try {
      const token = await getToken();
      const res = await fetch(`${AGENT_BASE}/agente/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: agentMessage, session_id: currentSessionId }),
        signal: controller.signal,
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
          } else if (evt.type === "token") {
            setStreamingText((prev) => prev + evt.text);
          } else if (evt.type === "done") {
            clearTimeout(timeoutId);
            setStreamingText("");
            if (evt.session_id && evt.session_id !== currentSessionId) {
              setCurrentSessionId(evt.session_id);
              getChatSessions().then(setSessions);
            }
            const reply = parseAgentResponse({ session_id: evt.session_id, response: evt.response });
            setMessages((prev) => [...prev, {
              id: generateId(), role: "agent",
              text: reply.text, refs: reply.refs,
              curriculum_match: reply.curriculum_match,
              planificacion: reply.planificacion,
              secuencia: reply.secuencia,
            }]);
            setLoading(false);
          }
        }
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "AbortError";
      const text = isTimeout
        ? "El agente está tardando más de lo esperado. Intentá de nuevo en unos segundos."
        : "Error de conexión.";
      setMessages((prev) => [...prev, { id: generateId(), role: "error", text, refs: [] }]);
      setLoading(false);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const reset = () => {
    setMessages([]);
    setCurrentSessionId(null);
  };

  const selectSession = async (session: ChatSession) => {
    setCurrentSessionId(session.ap_session_id);
    setMessages([]);
    setShowSidebar(false);
    setLoadingHistory(true);
    const raw = await getSessionMessages(session.ap_session_id);
    const converted: Message[] = raw.map((m) => {
      if (m.role === "user") {
        return { id: generateId(), role: "user" as const, text: m.text, refs: [] };
      }
      const parsed = parseAgentResponse({ response: m.text });
      return {
        id: generateId(), role: "agent" as const,
        text: parsed.text, refs: parsed.refs,
        curriculum_match: parsed.curriculum_match,
        planificacion: parsed.planificacion,
        secuencia: parsed.secuencia,
      };
    });
    flushSync(() => {
      setMessages(converted);
      setLoadingHistory(false);
    });
    const el = scrollContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  const deleteSession = async (id: string) => {
    const deleted = sessions.find((s) => s.id === id);
    const ok = await deleteChatSession(id);
    if (!ok) return;
    setSessions((prev) => prev.filter((s) => s.id !== id));
    if (deleted && deleted.ap_session_id === currentSessionId) {
      setCurrentSessionId(null);
      setMessages([]);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
  };

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex h-full min-h-0 relative">

      {/* ── Session Sidebar ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <SessionSidebar
            sessions={sessions}
            currentApSessionId={currentSessionId}
            onSelect={selectSession}
            onDelete={deleteSession}
            onNewChat={reset}
            onClose={() => setShowSidebar(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Left Rail ───────────────────────────────────────────────────── */}
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "row", borderRight: "1px solid var(--border-subtle)" }}>
        {/* Icon column */}
        <div
          style={{
            width: "48px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            paddingTop: "12px",
            gap: "4px",
            background: "var(--surface-container-low)",
          }}
        >
          <button
            onClick={() => setShowSidebar((v) => !v)}
            title="Historial de conversaciones"
            className="flex items-center justify-center rounded-xl transition-all active:scale-95"
            style={{ width: "36px", height: "36px", color: "var(--on-surface-variant)", background: "transparent", border: "none", cursor: "pointer" }}
          >
            <HistoryIcon />
          </button>
          {hasProjectCtx && (
            <button
              onClick={() => { setShowProjectPanel((v) => !v); setShowGroupPanel(false); }}
              title="Panel de proyecto"
              className="flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{
                width: "36px", height: "36px",
                color: showProjectPanel ? "var(--primary)" : "var(--on-surface-variant)",
                background: showProjectPanel ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                border: "none", cursor: "pointer",
              }}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}
          {hasProjectCtx && (
            <button
              onClick={() => { setShowGroupPanel((v) => !v); setShowProjectPanel(false); }}
              title="Ver grupo y alumnos"
              className="flex items-center justify-center rounded-xl transition-all active:scale-95"
              style={{
                width: "36px", height: "36px",
                color: showGroupPanel ? "var(--primary)" : "var(--on-surface-variant)",
                background: showGroupPanel ? "color-mix(in srgb, var(--primary) 12%, transparent)" : "transparent",
                border: "none", cursor: "pointer",
              }}
            >
              <Users size={16} />
            </button>
          )}
        </div>

        {/* Expanded project panel */}
        <AnimatePresence>
          {showProjectPanel && hasProjectCtx && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 252, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{ overflow: "hidden", borderLeft: "1px solid var(--border-subtle)", background: "var(--surface-container-low)" }}
            >
              <div style={{ width: "252px", height: "100%", display: "flex", flexDirection: "column" }}>
                <div
                  className="flex items-center justify-between px-3 flex-shrink-0"
                  style={{ height: "40px", borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-display)" }}>
                    Contexto del proyecto
                  </span>
                  <button
                    onClick={() => setShowProjectPanel(false)}
                    style={{ color: "var(--on-surface-variant)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <ProjectContextContent groupId={ctxGroupId!} projectId={ctxProjectId!} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expanded group panel */}
        <AnimatePresence>
          {showGroupPanel && hasProjectCtx && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 252, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              style={{ overflow: "hidden", borderLeft: "1px solid var(--border-subtle)", background: "var(--surface-container-low)" }}
            >
              <div style={{ width: "252px", height: "100%", display: "flex", flexDirection: "column" }}>
                <div
                  className="flex items-center justify-between px-3 flex-shrink-0"
                  style={{ height: "40px", borderBottom: "1px solid var(--border-subtle)" }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-display)" }}>
                    Grupo
                  </span>
                  <button
                    onClick={() => setShowGroupPanel(false)}
                    style={{ color: "var(--on-surface-variant)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </div>
                <GroupContextContent groupId={ctxGroupId!} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main Chat Area ──────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">


        {/* Messages / Welcome */}
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-y-auto w-full min-h-0 flex flex-col items-center"
          style={{ padding: "1.5rem 1.25rem", gap: "1rem" }}
        >
        <AnimatePresence mode="wait">
          {messages.length === 0 ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex-1 flex flex-col items-center justify-center w-full"
            >
              <WelcomeScreen
                sessionReady={sessionReady}
                onSend={send}
                primaryColor={primaryColor}
                surfaceLowest={surfaceLowest}
                onSurface={onSurface}
                onVariant={onVariant}
                shadowCard={shadowCard}
              />
            </motion.div>
          ) : (
            <motion.div
              key="chat"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-4xl flex flex-col gap-4"
            >
              {messages.map((msg) => (
                <Bubble
                  key={msg.id}
                  message={msg}
                  onOptionClick={send}
                  primaryColor={primaryColor}
                  surfaceLow={surfaceLow}
                  onSurface={onSurface}
                  onVariant={onVariant}
                  shadowCard={shadowCard}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {loadingHistory && (
          <div className="flex justify-center py-6" style={{ color: "var(--on-surface-variant)" }}>
            <span className="text-sm animate-pulse">Cargando conversación…</span>
          </div>
        )}
        {loading && !streamingText && <TypingIndicator label={statusLabel} surfaceLow={surfaceLow} onVariant={onVariant} />}
        {streamingText && (
          <div className="w-full max-w-4xl flex justify-start px-2">
            <div
              className="max-w-[85%] rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed"
              style={{ background: surfaceLow, color: onSurface, fontFamily: "var(--font-body)" }}
            >
              <MarkdownContent text={stripTokens(streamingText)} onSurface={onSurface} onVariant={onVariant} />
              <span
                className="inline-block w-2 h-4 ml-0.5 rounded-sm animate-pulse"
                style={{ background: primaryColor, verticalAlign: "text-bottom", opacity: 0.8 }}
              />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <motion.div
        layout
        className="flex-shrink-0 w-full px-4 pb-6 pt-2 flex flex-col items-center"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <motion.div
          layout
          className="flex flex-col gap-2 rounded-[32px] p-2 transition-all duration-300 group focus-within:ring-1 focus-within:ring-accent/20"
          style={{
            background: "var(--input-bg)",
            boxShadow: "var(--shadow-ambient)",
            width: "100%",
            maxWidth: messages.length === 0 ? "768px" : "100%",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={onKey}
            disabled={loading || !sessionReady}
            rows={1}
            placeholder={sessionReady ? "Preguntarle al Facilitador Docente…" : "Conectando…"}
            className="w-full resize-none focus:outline-none disabled:opacity-60 px-4 pt-3 pb-1"
            style={{
              background: "transparent",
              border: "none",
              fontSize: "1rem",
              lineHeight: "1.5",
              color: onSurface,
              fontFamily: "var(--font-fraunces)",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          />
          <div className="flex items-center justify-between px-2 pb-1">
            <div className="flex items-center gap-1">
              <Button
                isIconOnly
                variant="ghost"
                isDisabled
                size="sm"
                className="opacity-30 cursor-not-allowed text-muted-foreground"
              >
                <Plus size={20} />
              </Button>
              <Button
                isIconOnly
                variant="ghost"
                isDisabled
                size="sm"
                className="opacity-30 cursor-not-allowed text-muted-foreground"
              >
                <Hammer size={18} />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                isIconOnly
                variant="ghost"
                isDisabled
                size="sm"
                className="opacity-30 cursor-not-allowed text-muted-foreground"
              >
                <Mic size={20} />
              </Button>

              <button
                onClick={() => send(input)}
                disabled={loading || !sessionReady || !input.trim()}
                className="p-2.5 rounded-full transition-all active:scale-90 disabled:opacity-20 bg-accent text-white"
                style={{
                  background: input.trim() ? primaryColor : "transparent",
                  color: input.trim() ? "#fff" : onVariant,
                }}
              >
                <SendHorizontal size={20} />
              </button>
            </div>
          </div>

        </motion.div>


        <AnimatePresence>
          {messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="flex flex-wrap justify-center gap-2 mt-8"
            >
              {QUICK_PROMPTS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => send(q.label)}
                  disabled={!sessionReady}
                  className="flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all active:scale-95 text-xs font-medium"
                  style={{
                    color: "var(--on-surface-variant)",
                    background: "transparent",
                    borderColor: "rgba(120, 120, 120, 0.15)"
                  }}
                >
                  <span style={{ color: "var(--primary)", opacity: 0.6 }}>{q.icon}</span>
                  {q.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      </div>
    </div>
  );
}


// ── Welcome screen ────────────────────────────────────────────────────────────

const WelcomeScreen = memo(({
  sessionReady, onSend, primaryColor, surfaceLowest,
  onSurface, onVariant, shadowCard,
}: {
  sessionReady: boolean; onSend: (t: string) => void;
  primaryColor: string; surfaceLowest: string;
  onSurface: string; onVariant: string; shadowCard: string;
}) => {

  const { user, isLoaded } = useUser();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-4 py-8 px-2">
      <div className="flex flex-col items-center gap-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000">
        <h2
          className="text-4xl md:text-5xl font-medium tracking-tight mb-2"
          style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
        >
          Hola, <span style={{ color: "var(--primary)" }}>{(mounted && isLoaded) ? (user?.firstName || "Colega") : "Colega"}</span>
        </h2>
        <h3
          className="text-3xl md:text-4xl font-light tracking-tight opacity-30"
          style={{ fontFamily: "var(--font-display)", color: "var(--on-surface)" }}
        >
          ¿Por dónde empezamos?
        </h3>
      </div>
    </div>
  );
});


// ── Bubble ────────────────────────────────────────────────────────────────────

const Bubble = memo(({
  message, onOptionClick, primaryColor, surfaceLow, onSurface, onVariant, shadowCard,
}: {
  message: Message; onOptionClick: (t: string) => void;
  primaryColor: string; surfaceLow: string;
  onSurface: string; onVariant: string; shadowCard: string;
}) => {

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
      <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>

        {!isUser && message.curriculum_match && message.curriculum_match.espacio && (
          <CurriculumMatchCard data={message.curriculum_match} onSurface={onSurface} onVariant={onVariant} primaryColor={primaryColor} />
        )}
        {!isUser && message.planificacion && message.planificacion.momentos.length > 0 && (
          <PlanificacionTabla data={message.planificacion} />
        )}
        {!isUser && message.secuencia && message.secuencia.actividades.length > 0 && (
          <SecuenciaTablaInline data={message.secuencia} />
        )}

        {/* Bubble body */}
        {isUser ? (
          <div
            className="rounded-2xl rounded-br-sm"
            style={{
              background: primaryColor,
              color: "#ffffff",
              padding: "0.75rem 1rem",
              fontSize: "0.9375rem",
              lineHeight: 1.5,
              fontFamily: "var(--font-fraunces)",
              letterSpacing: "-0.01em",
            }}
          >
            {message.text}
          </div>
        ) : (
          <div
            className={`rounded-2xl rounded-bl-sm ${isError ? "border border-red-400/30" : ""}`}
            style={{
              background: isError
                ? "var(--error-bg)"
                : surfaceLow,
              padding: "0.875rem 1rem",
              boxShadow: isError ? "none" : shadowCard,
              color: isError ? "#dc2626" : onSurface,
              fontFamily: "var(--font-fraunces)",
              letterSpacing: "-0.01em",
            }}
          >
            <MarkdownContent text={bodyText} onSurface={onSurface} onVariant={onVariant} />
          </div>
        )}

        {/* Copy */}
        {!isUser && (
          <button
            onClick={copy}
            className="flex items-center gap-1 transition-opacity hover:opacity-100"
            style={{
              fontSize: "0.7rem",
              color: onVariant,
              opacity: 0.6,
              background: "none",
              border: "none",
              cursor: "pointer",
              fontFamily: "var(--font-body)",
              padding: "0 0.25rem",
            }}
          >
            {copied
              ? <><span style={{ color: "#16a34a" }}>✓</span> Copiado</>
              : <><CopyIcon /> Copiar</>}
          </button>
        )}

        {/* Single-select options */}
        {options.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => onOptionClick(opt)}
                className="rounded-xl transition-all active:scale-95"
                style={{
                  padding: "0.375rem 0.875rem",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-display)",
                  color: onSurface,
                  background: surfaceLow,
                  border: "none",
                  cursor: "pointer",
                  boxShadow: shadowCard,
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = primaryColor; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = onSurface; }}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {/* Multi-select options */}
        {multiOptions.length > 0 && (
          <MultiSelect
            options={multiOptions}
            onConfirm={onOptionClick}
            primaryColor={primaryColor}
            surfaceLow={surfaceLow}
            onSurface={onSurface}
            shadowCard={shadowCard}
          />
        )}

        {/* PDF refs */}
        {message.refs.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-1">
            {message.refs.map((ref, i) => (
              <a
                key={i}
                href={`${API_BASE}/pdfs/${encodeURIComponent(ref.filename)}#page=${ref.page}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl transition-opacity hover:opacity-80"
                style={{
                  padding: "0.25rem 0.75rem",
                  background: "var(--tertiary-subtle)",
                  color: "var(--tertiary)",
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  fontFamily: "var(--font-body)",
                  textDecoration: "none",
                }}
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
});


// ── CurriculumMatchCard ───────────────────────────────────────────────────────

function CurriculumMatchCard({
  data, onSurface, onVariant, primaryColor,
}: {
  data: CurriculumMatch;
  onSurface: string; onVariant: string; primaryColor: string;
}) {
  const surfaceLow = "var(--surface-container-low)";
  const shadow     = "var(--shadow-ambient)";


  return (
    <div
      className="rounded-2xl p-4 w-full"
      style={{ background: surfaceLow, boxShadow: shadow }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: primaryColor, fontFamily: "var(--font-display)" }}
      >
        Contenido curricular
      </p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 mb-3">
        <MatchField label="Espacio" value={data.espacio} onSurface={onSurface} onVariant={onVariant} />
        <MatchField label="Unidad" value={data.unidad} onSurface={onSurface} onVariant={onVariant} />
        <MatchField label="Tramo" value={`Tramo ${data.tramo}`} onSurface={onSurface} onVariant={onVariant} />
        <MatchField label="Grado" value={`${data.grado} grado`} onSurface={onSurface} onVariant={onVariant} />
      </div>
      <div className="space-y-2.5 pt-3" style={{ borderTop: `1px solid var(--border-subtle)` }}>
        <MatchField label="Contenido" value={data.contenido} onSurface={onSurface} onVariant={onVariant} />
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>{data.ce_codigo}</p>
          <p className="text-sm font-medium leading-relaxed" style={{ color: onSurface, fontFamily: "var(--font-body)" }}>{data.ce_texto}</p>
        </div>
        <MatchField label="Criterio de logro" value={data.criterio_de_logro} onSurface={onSurface} onVariant={onVariant} />
        {data.meta_aprendizaje && (
          <div className="pt-2 mt-1" style={{ borderTop: "1px solid var(--border-subtle)" }}>
            <p className="text-xs font-medium mb-0.5" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>Meta de Aprendizaje</p>
            <p className="text-sm font-semibold leading-relaxed" style={{ color: onSurface, fontFamily: "var(--font-body)" }}>{data.meta_aprendizaje}</p>
          </div>
        )}
      </div>
      {data.competencias_mcn.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.competencias_mcn.map((c, i) => (
            <span
              key={i}
              className="rounded-full text-xs font-semibold"
              style={{
                padding: "0.2rem 0.6rem",
                background: "var(--brand-subtle)",
                color: primaryColor,
                fontFamily: "var(--font-display)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3" style={{ borderTop: `1px solid var(--border-subtle)` }}>
        <p className="text-xs font-semibold" style={{ color: onSurface, fontFamily: "var(--font-display)" }}>{data.metodo_ensenanza}</p>
        <p className="text-xs mt-0.5 leading-relaxed" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>{data.metodo_justificacion}</p>
      </div>
    </div>
  );
}

function MatchField({ label, value, onSurface, onVariant }: { label: string; value: string; onSurface: string; onVariant: string }) {
  return (
    <div>
      <p className="text-xs font-medium" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>{label}</p>
      <p className="text-sm leading-relaxed" style={{ color: onSurface, fontFamily: "var(--font-body)" }}>{value}</p>
    </div>
  );
}

// ── PlanificacionTabla ────────────────────────────────────────────────────────

function PlanificacionTabla({ data }: { data: PlanificacionData }) {
  const showWatermark = useShowWatermark();
  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { PlanificacionPDF } = await import("../pdf/PlanificacionPDF");
    const blob = await pdf(<PlanificacionPDF data={data} nombre={data.titulo} showWatermark={showWatermark} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.titulo.replace(/\s+/g, "_").slice(0, 60)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const bom = "﻿";
    const headers = ["Momento", "Duración", "Actividad", "Rol docente", "Recursos"];
    const rows = data.momentos.map((m) => [m.momento, m.duracion, m.actividad, m.rol_docente, m.recursos]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.titulo.replace(/\s+/g, "_").slice(0, 60)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const momentoColor: Record<string, { bg: string; text: string }> = {
    Inicio:     { bg: "var(--tertiary-subtle)", text: "var(--tertiary)" },
    Desarrollo: { bg: "rgba(22, 163, 74, 0.1)", text: "var(--success)" },
    Cierre:     { bg: "var(--primary-subtle)", text: "var(--primary)" },
  };
  return (
    <Card variant="secondary" className="p-4 rounded-2xl space-y-4 w-full">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-bold text-sm text-foreground leading-snug" style={{ fontFamily: "var(--font-display)" }}>{data.titulo}</p>
          <p className="text-xs text-muted-foreground mt-0.5" style={{ fontFamily: "var(--font-body)" }}>{data.grupo}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <ExportBtn onClick={exportCSV} label="Excel" icon={<ExportIcon />} />
          <ExportBtn onClick={handleExportPDF} label="PDF" icon={<PdfIcon />} />
        </div>
      </div>
      {data.justificacion && <p className="text-xs text-foreground/80 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{data.justificacion}</p>}
      {data.metodologia && (
        <div className="px-3 py-2.5 rounded-xl" style={{ background: "var(--primary-subtle)" }}>
          <p className="text-xs font-bold" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>{data.metodologia}</p>
          {data.metodologia_descripcion && <p className="text-xs text-foreground/70 mt-0.5 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{data.metodologia_descripcion}</p>}
        </div>
      )}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[480px]">
          <thead>
            <tr className="border-b border-border">
              {["Momento", "Duración", "Meta de aprendizaje", "Actividad", "Rol docente", "Recursos"].map((h) => (
                <th key={h} className="text-left py-2 pr-3 first:pl-1 font-semibold text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
              {data.momentos.map((m, i) => {
                const colors = momentoColor[m.momento] || { bg: "var(--surface-container-low)", text: "var(--on-surface)" };
                return (
                  <tr key={i} className="border-b border-border/40 align-top">
                    <td className="py-3 pr-3 pl-1 whitespace-nowrap">
                      <span
                        className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider"
                        style={{
                          background: colors.bg,
                          color: colors.text,
                          fontFamily: "var(--font-display)",
                        }}
                      >
                        {m.momento}
                      </span>
                    </td>
                    <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-body)" }}>{m.duracion}</td>
                    <td className="py-3 pr-3 leading-relaxed font-medium text-foreground/90" style={{ fontFamily: "var(--font-body)" }}>{m.meta_aprendizaje ?? <span className="text-muted-foreground/40 italic">—</span>}</td>
                    <td className="py-3 pr-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{m.actividad}</td>
                    <td className="py-3 pr-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.rol_docente}</td>
                    <td className="py-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.recursos}</td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      <div className="pt-2 space-y-1 text-xs text-muted-foreground" style={{ borderTop: "1px solid rgba(25,28,30,0.06)" }}>
        <p style={{ fontFamily: "var(--font-body)" }}><strong className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>{data.ce_codigo}</strong> — {data.ce_texto}</p>
        <p style={{ fontFamily: "var(--font-body)" }}><strong className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>Contenido:</strong> {data.contenido}</p>
        <p style={{ fontFamily: "var(--font-body)" }}><strong className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>Criterio de logro:</strong> {data.criterio_de_logro}</p>
        <p className="text-foreground/50" style={{ fontFamily: "var(--font-body)" }}>{data.espacio} · {data.unidad} · Tramo {data.tramo}</p>
      </div>
    </Card>
  );
}

// ── SecuenciaTablaInline ──────────────────────────────────────────────────────

const secuenciaMomentoColor: Record<string, { bg: string; text: string }> = {
  Inicio:     { bg: "var(--tertiary-subtle)", text: "var(--tertiary)" },
  Desarrollo: { bg: "rgba(22, 163, 74, 0.1)", text: "var(--success)" },
  Cierre:     { bg: "var(--primary-subtle)", text: "var(--primary)" },
};

function SecuenciaTablaInline({ data }: { data: SecuenciaData }) {
  const showWatermark = useShowWatermark();
  const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
  const toggleCollapsed = (i: number) =>
    setCollapsed((prev) => ({ ...prev, [i]: !prev[i] }));
  const handleExportPDF = async () => {
    const titulo = `${data.espacio} — ${data.unidad_curricular}`;
    const { pdf } = await import("@react-pdf/renderer");
    const { SecuenciaPDF } = await import("../pdf/SecuenciaPDF");
    const blob = await pdf(<SecuenciaPDF data={data} nombre={titulo} showWatermark={showWatermark} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${titulo.replace(/\s+/g, "_").slice(0, 60)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    const bom = "﻿";
    const isNew = data.actividades.some((a) => Array.isArray(a.momentos) && a.momentos.length > 0);
    let csv: string;
    if (isNew) {
      const headers = ["N°", "Título", "Metodología", "Momento", "Duración", "Meta aprendizaje", "Actividad", "Rol docente", "Recursos"];
      const rows: string[][] = [];
      data.actividades.forEach((act, idx) => {
        (act.momentos ?? []).forEach((m) => {
          rows.push([String(idx + 1), act.titulo ?? "", act.metodologia ?? "", m.momento, m.duracion, m.meta_aprendizaje ?? "", m.actividad, m.rol_docente, m.recursos]);
        });
      });
      csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    } else {
      const headers = ["N°", "Recorte", "Meta de aprendizaje", "Plan de aprendizaje", "Recursos"];
      const rows = data.actividades.map((a) => [String(a.numero ?? ""), a.recorte ?? "", a.meta_aprendizaje ?? "", (a.plan_aprendizaje ?? []).join("\n"), a.recursos ?? ""]);
      csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    }
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "secuencia.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card variant="secondary" className="p-4 rounded-2xl space-y-4 w-full">
      <div className="flex justify-end gap-2">
        <ExportBtn onClick={exportCSV} label="Excel" icon={<ExportIcon />} />
        <ExportBtn onClick={handleExportPDF} label="PDF" icon={<PdfIcon />} />
      </div>

      {/* Header curricular */}
      <div className="rounded-xl border border-border overflow-hidden text-xs">
        <div className="grid grid-cols-2 border-b border-border">
          <div className="px-3 py-2 border-r border-border">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>Espacio: </span>
            <span className="text-foreground" style={{ fontFamily: "var(--font-body)" }}>{data.espacio}</span>
          </div>
          <div className="px-3 py-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>Unidad curricular: </span>
            <span className="text-foreground" style={{ fontFamily: "var(--font-body)" }}>{data.unidad_curricular}</span>
          </div>
        </div>
        {data.meta_aprendizaje && (
          <div className="px-3 py-2 border-b border-border" style={{ background: "var(--primary-subtle)" }}>
            <span className="font-bold uppercase tracking-wide" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>Meta de aprendizaje: </span>
            <span className="text-foreground/90" style={{ fontFamily: "var(--font-body)" }}>{data.meta_aprendizaje}</span>
          </div>
        )}
        {data.contenido && (
          <div className="px-3 py-2">
            <span className="font-semibold uppercase tracking-wide text-muted-foreground" style={{ fontFamily: "var(--font-display)" }}>Contenido: </span>
            <span className="text-foreground/80" style={{ fontFamily: "var(--font-body)" }}>{data.contenido}</span>
          </div>
        )}
      </div>

      {/* Actividades */}
      <div className="space-y-4">
        {data.actividades.map((act, i) => {
          const isNewFormat = Array.isArray(act.momentos) && act.momentos.length > 0;
          const isCollapsed = !!collapsed[i];
          return (
            <div key={i} className="rounded-xl border border-border overflow-hidden text-xs">
              {/* Activity header */}
              <button
                type="button"
                onClick={() => toggleCollapsed(i)}
                className="w-full flex items-start gap-3 px-3 py-2.5 border-b border-border text-left transition-colors"
                style={{ background: "var(--surface-container-low)" }}
              >
                <span className="font-bold text-foreground shrink-0" style={{ fontFamily: "var(--font-display)" }}>
                  {isNewFormat ? `${i + 1}.` : `${act.numero ?? i + 1}.`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-foreground leading-snug" style={{ fontFamily: "var(--font-display)" }}>
                    {isNewFormat ? (act.titulo ?? "") : (act.recorte ?? "")}
                  </p>
                  {isNewFormat && act.metodologia && (
                    <span
                      className="inline-block mt-1 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider"
                      style={{ background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "var(--font-display)" }}
                    >
                      {act.metodologia}
                    </span>
                  )}
                  {!isNewFormat && act.meta_aprendizaje && (
                    <p className="text-foreground/70 mt-0.5 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{act.meta_aprendizaje}</p>
                  )}
                </div>
                <ChevronRight className={`w-4 h-4 shrink-0 mt-0.5 text-muted-foreground transition-transform ${!isCollapsed ? "rotate-90" : ""}`} />
              </button>

              {/* Nuevo formato: tabla de momentos */}
              {isNewFormat && !isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse min-w-[480px]">
                    <thead>
                      <tr className="border-b border-border">
                        {["Momento", "Dur.", "Meta", "Actividad", "Rol docente", "Recursos"].map((h) => (
                          <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {act.momentos!.map((m, j) => {
                        const colors = secuenciaMomentoColor[m.momento] || { bg: "var(--surface-container-low)", text: "var(--on-surface)" };
                        return (
                          <tr key={j} className="border-b border-border/40 align-top last:border-0">
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded-full font-bold text-[10px] uppercase tracking-wider" style={{ background: colors.bg, color: colors.text, fontFamily: "var(--font-display)" }}>
                                {m.momento}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-body)" }}>{m.duracion}</td>
                            <td className="py-2.5 px-3 leading-relaxed text-foreground/80" style={{ fontFamily: "var(--font-body)" }}>{m.meta_aprendizaje ?? <span className="opacity-30">—</span>}</td>
                            <td className="py-2.5 px-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{m.actividad}</td>
                            <td className="py-2.5 px-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.rol_docente}</td>
                            <td className="py-2.5 px-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.recursos}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Formato legacy: bullets de plan_aprendizaje */}
              {!isNewFormat && !isCollapsed && Array.isArray(act.plan_aprendizaje) && act.plan_aprendizaje.length > 0 && (
                <ul className="px-3 py-2.5 space-y-1">
                  {act.plan_aprendizaje.map((paso, j) => (
                    <li key={j} className="flex gap-2 text-foreground/80" style={{ fontFamily: "var(--font-body)" }}>
                      <span className="text-muted-foreground shrink-0">–</span><span>{paso}</span>
                    </li>
                  ))}
                </ul>
              )}

              {/* Footer nuevo formato: CE + criterio */}
              {isNewFormat && (act.ce_codigo || act.criterio_de_logro) && (
                <div className="px-3 py-2 space-y-0.5 border-t border-border" style={{ background: "var(--surface-container-lowest)" }}>
                  {act.ce_codigo && <p style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}><strong style={{ fontFamily: "var(--font-display)" }}>{act.ce_codigo}</strong>{act.ce_texto ? ` — ${act.ce_texto}` : ""}</p>}
                  {act.criterio_de_logro && <p className="text-muted-foreground" style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem" }}><strong className="text-foreground" style={{ fontFamily: "var(--font-display)" }}>Criterio:</strong> {act.criterio_de_logro}</p>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── MultiSelect ───────────────────────────────────────────────────────────────

function MultiSelect({
  options, onConfirm, primaryColor, surfaceLow, onSurface, shadowCard,
}: {
  options: string[]; onConfirm: (t: string) => void;
  primaryColor: string; surfaceLow: string;
  onSurface: string; shadowCard: string;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (opt: string) =>
    setSelected((prev) => { const next = new Set(prev); next.has(opt) ? next.delete(opt) : next.add(opt); return next; });
  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(options.filter((o) => selected.has(o)).join(", "));
  };
  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="flex flex-wrap gap-2">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => toggle(opt)}
            className="rounded-xl transition-all"
            style={{
              padding: "0.375rem 0.875rem",
              fontSize: "0.75rem",
              fontWeight: 600,
              fontFamily: "var(--font-display)",
              background: selected.has(opt)
                ? "var(--brand-subtle)"
                : surfaceLow,
              color: selected.has(opt) ? primaryColor : onSurface,
              border: "none",
              cursor: "pointer",
              boxShadow: shadowCard,
            }}
          >
            {selected.has(opt) && <span className="mr-1">✓</span>}
            {opt}
          </button>
        ))}
      </div>
      {selected.size > 0 && (
        <button
          onClick={confirm}
          className="self-start rounded-xl transition-all active:scale-95"
          style={{
            padding: "0.375rem 1rem",
            fontSize: "0.75rem",
            fontWeight: 700,
            fontFamily: "var(--font-display)",
            background: primaryColor,
            color: "#ffffff",
            border: "none",
            cursor: "pointer",
          }}
        >
          Confirmar ({selected.size})
        </button>
      )}
    </div>
  );
}

// ── Honeycomb Loader (Dynamic Hash-based) ──────────────────────────────────

function HoneycombLoader({ label }: { label: string }) {
  // Deterministic hash function
  const getHash = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return Math.abs(hash);
  };

  const hash = getHash(label);

  // Rule: "Pensando..." is ALWAYS brand orange
  const isThinking = label.toLowerCase().includes("pensando");

  // Calculate dynamic color:
  // If thinking, use brand orange.
  // Otherwise, generate a "tint" of the brand orange (Hue around 28)
  const hue = isThinking ? 28 : (20 + (hash % 25)); // Stay between 20 and 45 (Orange/Amber)
  const saturation = isThinking ? 96 : (70 + (hash % 25));
  const lightness = isThinking ? 48 : (50 + (hash % 15));
  const dynamicColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;

  // Available patterns
  const patterns = ["wave", "spiral", "pulse", "zigzag", "random", "alternate"];
  const pattern = isThinking ? "random" : patterns[hash % patterns.length];


  // Hexagon grid positions (3-1-3) - Compact
  const hexes = [
    { x: 0,  y: 0,  i: 0 }, { x: 8.5, y: 0,  i: 1 }, { x: 17, y: 0,  i: 2 },
    { x: 8.5, y: 7,  i: 3 },
    { x: 0,  y: 14, i: 4 }, { x: 8.5, y: 14, i: 5 }, { x: 17, y: 14, i: 6 }
  ];

  const getDelay = (idx: number) => {
    if (pattern === "wave")      return idx * 0.08;
    if (pattern === "pulse")     return 0;
    if (pattern === "spiral")    { const s = [0, 1, 2, 6, 5, 4, 3]; return s.indexOf(idx) * 0.08; }
    if (pattern === "zigzag")    { const z = [0, 4, 1, 3, 5, 2, 6]; return z.indexOf(idx) * 0.08; }
    if (pattern === "alternate") return idx % 2 === 0 ? 0 : 0.3;
    return (hash + idx) % 7 * 0.1; // "random" based on hash
  };

  return (
    <div className="flex items-center">
      <svg width="24" height="22" viewBox="0 0 25 22" fill="none" className="flex-shrink-0">
        <AnimatePresence>
          {hexes.map((h, i) => (
            <motion.path
              key={`${label}-${i}`} // Force re-mount on label change for fresh animation
              d={`M${h.x + 4} ${h.y}L${h.x + 7.46} ${h.y + 2}V${h.y + 6}L${h.x + 4} ${h.y + 8}L${h.x + 0.54} ${h.y + 6}V${h.y + 2}L${h.x + 4} ${h.y}Z`}
              fill={dynamicColor}
              initial={{ opacity: 0.1, scale: 0.5 }}
              animate={{
                opacity: [0.1, 1, 0.1],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 0.7,
                repeat: Infinity,
                delay: getDelay(i),
                ease: "circOut"
              }}
            />
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}



function TypingIndicator({ label, surfaceLow, onVariant }: { label: string; surfaceLow: string; onVariant: string }) {
  const shadow = "var(--shadow-ambient)";
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-bl-sm flex items-center gap-3"
        style={{
          background: surfaceLow,
          padding: "0.75rem 1.25rem",
          boxShadow: shadow,
          border: "1px solid rgba(127,127,127,0.1)"
        }}
      >
        <HoneycombLoader label={label} />
        <span style={{ fontSize: "0.75rem", fontWeight: 600, color: onVariant, fontFamily: "var(--font-body)" }}>{label}</span>
      </div>
    </div>
  );
}


// ── ExportBtn helper ──────────────────────────────────────────────────────────

function ExportBtn({ onClick, label, icon }: { onClick: () => void; label: string; icon: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-xl transition-all hover:opacity-80"
      style={{
        padding: "0.375rem 0.75rem",
        fontSize: "0.72rem",
        fontFamily: "var(--font-display)",
        background: "transparent",
        border: "1px solid rgba(25,28,30,0.10)",
        color: "var(--muted-foreground)",
        cursor: "pointer",
      }}
    >
      {icon} {label}
    </button>
  );
}

// ── Iconos ────────────────────────────────────────────────────────────────────
function SparkleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
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
function ExportIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}
function PdfIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="15" y2="17" />
    </svg>
  );
}
function HistoryIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </svg>
  );
}

// ── Chat History helpers ───────────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} día${days !== 1 ? "s" : ""}`;
}

function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── ProjectContextContent ─────────────────────────────────────────────────────

function ProjectContextContent({ groupId, projectId }: { groupId: string; projectId: string }) {
  const [expandedSeqs, setExpandedSeqs] = useState<Set<string>>(new Set());

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });
  const { data: project } = useQuery({
    queryKey: ["project", groupId, projectId],
    queryFn: () => getProject(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });
  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences", groupId, projectId],
    queryFn: () => getSequences(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  const toggleSeq = (id: string) =>
    setExpandedSeqs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {project ? (
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
            Proyecto
          </p>
          <p className="font-bold text-sm leading-snug" style={{ color: "var(--on-surface)", fontFamily: "var(--font-display)" }}>
            {project.name}
          </p>
          {group && (
            <p className="text-xs" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
              {group.name} · {group.stage} · Nivel {group.level}
            </p>
          )}
          {project.purpose && (
            <p className="text-xs leading-relaxed" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", opacity: 0.85 }}>
              {project.purpose}
            </p>
          )}
          {project.duration_weeks && (
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "var(--font-dm-sans)" }}>
              {project.duration_weeks} semanas
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center py-4">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
      )}

      {sequences.length > 0 && <div style={{ height: "1px", background: "var(--border-subtle)" }} />}

      {sequences.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
            Secuencias ({sequences.length})
          </p>
          {sequences.map((seq) => (
            <SequenceCollapsible
              key={seq.id}
              seq={seq}
              groupId={groupId}
              projectId={projectId}
              expanded={expandedSeqs.has(seq.id)}
              onToggle={() => toggleSeq(seq.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── ProjectContextPanel ───────────────────────────────────────────────────────

function ProjectContextPanel({ groupId, projectId, onClose }: {
  groupId: string;
  projectId: string;
  onClose: () => void;
}) {
  const [expandedSeqs, setExpandedSeqs] = useState<Set<string>>(new Set());

  const { data: group } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });
  const { data: project } = useQuery({
    queryKey: ["project", groupId, projectId],
    queryFn: () => getProject(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });
  const { data: sequences = [] } = useQuery({
    queryKey: ["sequences", groupId, projectId],
    queryFn: () => getSequences(groupId, projectId),
    enabled: Boolean(groupId) && Boolean(projectId),
  });

  const toggleSeq = (id: string) =>
    setExpandedSeqs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  return (
    <motion.div
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="absolute inset-y-0 left-0 z-20 flex flex-col"
      style={{
        width: "300px",
        background: "var(--surface-container-low)",
        boxShadow: "2px 0 16px rgba(0,0,0,0.10)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="font-bold text-sm" style={{ color: "var(--on-surface)", fontFamily: "var(--font-display)" }}>
          Contexto del proyecto
        </span>
        <button onClick={onClose} style={{ color: "var(--on-surface-variant)", background: "none", border: "none", cursor: "pointer", lineHeight: 1 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Project info */}
        {project ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
              Proyecto
            </p>
            <p className="font-bold text-sm leading-snug" style={{ color: "var(--on-surface)", fontFamily: "var(--font-display)" }}>
              {project.name}
            </p>
            {group && (
              <p className="text-xs" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
                {group.name} · {group.stage} · Nivel {group.level}
              </p>
            )}
            {project.purpose && (
              <p className="text-xs leading-relaxed" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", opacity: 0.85 }}>
                {project.purpose}
              </p>
            )}
            {project.duration_weeks && (
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "var(--font-dm-sans)" }}>
                {project.duration_weeks} semanas
              </div>
            )}
          </div>
        ) : (
          <div className="flex justify-center py-4">
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
          </div>
        )}

        {/* Divider */}
        {sequences.length > 0 && <div style={{ height: "1px", background: "var(--border-subtle)" }} />}

        {/* Sequences */}
        {sequences.length > 0 && (
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
              Secuencias ({sequences.length})
            </p>
            {sequences.map((seq) => (
              <SequenceCollapsible
                key={seq.id}
                seq={seq}
                groupId={groupId}
                projectId={projectId}
                expanded={expandedSeqs.has(seq.id)}
                onToggle={() => toggleSeq(seq.id)}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function SequenceCollapsible({ seq, groupId, projectId, expanded, onToggle }: {
  seq: { id: string; name: string; learning_goal?: string };
  groupId: string;
  projectId: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { data: activities = [], isFetching } = useQuery({
    queryKey: ["activities", groupId, projectId, seq.id],
    queryFn: () => getActivities(groupId, projectId, seq.id),
    enabled: expanded,
  });

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid rgba(127,127,127,0.1)" }}>
      {/* Sequence header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left transition-colors"
        style={{
          background: expanded ? "color-mix(in srgb, var(--primary) 6%, var(--surface-container-low))" : "var(--surface-container-low)",
          border: "none",
          cursor: "pointer",
        }}
      >
        <span style={{ color: "var(--primary)", flexShrink: 0 }}>
          {expanded
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          }
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate" style={{ color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
            {seq.name}
          </p>
          {seq.learning_goal && (
            <p className="text-xs truncate mt-0.5" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", opacity: 0.7, fontSize: "0.68rem" }}>
              {seq.learning_goal}
            </p>
          )}
        </div>
      </button>

      {/* Activities */}
      {expanded && (
        <div style={{ background: "var(--surface)", borderTop: "1px solid rgba(127,127,127,0.08)" }}>
          {isFetching ? (
            <div className="flex justify-center py-3">
              <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            </div>
          ) : activities.length === 0 ? (
            <p className="px-3 py-2 text-xs" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", opacity: 0.6 }}>Sin actividades</p>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="flex items-start gap-2 px-3 py-2" style={{ borderTop: "1px solid rgba(127,127,127,0.06)" }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "2px", opacity: 0.6 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                </svg>
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-snug" style={{ color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)" }}>
                    {act.title}
                  </p>
                  {act.learning_goal && (
                    <p className="text-xs mt-0.5 leading-relaxed" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)", fontSize: "0.68rem", opacity: 0.75 }}>
                      {act.learning_goal}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SessionSidebar({
  sessions,
  currentApSessionId,
  onSelect,
  onDelete,
  onNewChat,
  onClose,
}: {
  sessions: ChatSession[];
  currentApSessionId: string | null;
  onSelect: (s: ChatSession) => void;
  onDelete: (id: string) => void;
  onNewChat: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ x: "-100%", opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: "-100%", opacity: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 30 }}
      className="absolute inset-y-0 left-0 z-10 w-72 flex flex-col"
      style={{
        background: "var(--surface-container-low)",
        boxShadow: "2px 0 16px rgba(0,0,0,0.10)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span
          className="font-bold text-sm"
          style={{ color: "var(--on-surface)", fontFamily: "var(--font-display)" }}
        >
          Conversaciones
        </span>
        <button
          onClick={onClose}
          aria-label="Cerrar historial"
          className="rounded-lg p-1 transition-opacity hover:opacity-70"
          style={{ color: "var(--on-surface-variant)", background: "none", border: "none", cursor: "pointer" }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* New conversation button */}
      <div className="px-3 pt-3 pb-2 flex-shrink-0">
        <button
          onClick={() => { onNewChat(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl transition-all active:scale-95"
          style={{
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--font-display)",
            fontWeight: 600,
            fontSize: "0.8rem",
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Nueva conversación
        </button>
      </div>

      {/* Session list */}
      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {sessions.length === 0 ? (
          <p
            className="text-center py-8 text-xs"
            style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
          >
            Sin conversaciones aún
          </p>
        ) : (
          sessions.map((session) => {
            const isActive = session.ap_session_id === currentApSessionId;
            return (
              <div
                key={session.id}
                className="group flex items-center gap-2 rounded-xl px-3 py-2.5 mb-1 cursor-pointer transition-all"
                style={{
                  background: isActive
                    ? "color-mix(in srgb, var(--primary) 14%, transparent)"
                    : "transparent",
                  border: isActive
                    ? "1px solid color-mix(in srgb, var(--primary) 25%, transparent)"
                    : "1px solid transparent",
                }}
                onClick={() => onSelect(session)}
              >
                <div className="flex-1 min-w-0">
                  <p
                    className="truncate text-sm font-medium"
                    style={{
                      color: isActive ? "var(--primary)" : "var(--on-surface)",
                      fontFamily: "var(--font-display)",
                    }}
                  >
                    {session.title}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-body)" }}
                  >
                    {relativeDate(session.updated_at)}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(session.id); }}
                  aria-label="Eliminar conversación"
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 rounded-lg p-1 transition-all hover:opacity-70"
                  style={{ color: "var(--on-surface-variant)", background: "none", border: "none", cursor: "pointer" }}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ── GroupContextContent ───────────────────────────────────────────────────────

function GroupContextContent({ groupId }: { groupId: string }) {
  const { data: group, isPending: loadingGroup } = useQuery({
    queryKey: ["group", groupId],
    queryFn: () => getGroup(groupId),
    enabled: Boolean(groupId),
  });
  const { data: alumnos = [], isPending: loadingAlumnos } = useQuery({
    queryKey: ["alumnos-by-group", groupId],
    queryFn: () => getAlumnosByGroup(groupId),
    enabled: Boolean(groupId),
  });

  const loading = loadingGroup || loadingAlumnos;

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {loading ? (
        <div className="flex justify-center py-6">
          <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: "var(--primary)" }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      ) : (
        <>
          {group && (
            <div className="space-y-1">
              <p className="font-bold text-sm leading-snug" style={{ color: "var(--on-surface)", fontFamily: "var(--font-display)" }}>
                {group.name}
              </p>
              <p className="text-xs" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
                {group.stage} · Nivel {group.level}
              </p>
            </div>
          )}

          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "var(--primary)", fontFamily: "var(--font-display)" }}>
              Alumnos ({alumnos.length})
            </p>
            {alumnos.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--on-surface-variant)", fontFamily: "var(--font-dm-sans)" }}>
                Sin alumnos asignados
              </p>
            ) : (
              <div className="space-y-1.5">
                {alumnos.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-2 rounded-xl px-2.5 py-2"
                    style={{ background: "var(--surface-container)", border: "1px solid rgba(127,127,127,0.08)" }}
                  >
                    <div
                      className="flex items-center justify-center rounded-full flex-shrink-0 text-xs font-bold"
                      style={{ width: "26px", height: "26px", background: "var(--primary-subtle)", color: "var(--primary)", fontFamily: "var(--font-display)" }}
                    >
                      {a.nombre_completo.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs leading-snug truncate" style={{ color: "var(--on-surface)", fontFamily: "var(--font-dm-sans)", fontWeight: 500 }}>
                      {a.nombre_completo}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
