"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { Button, Card } from "@heroui/react";
import { createAdkSession, type PdfRef } from "../../api-actions";
import { BookOpen, HeartHandshake, Layers, Lightbulb, Sparkles } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8001";

type Role = "user" | "agent" | "error";

type CurriculumMatch = {
  espacio: string; unidad: string; tramo: number; grado: string;
  contenido: string; ce_codigo: string; ce_texto: string;
  competencias_mcn: string[]; criterio_de_logro: string;
  metodo_ensenanza: string; metodo_justificacion: string;
};
type PlanificacionMomento = {
  momento: string; duracion: string; meta_aprendizaje?: string;
  actividad: string; rol_docente: string; recursos: string;
};
type SecuenciaActividad = {
  numero: number; recorte: string; meta_aprendizaje: string;
  plan_aprendizaje: string[]; recursos?: string;
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

const SESSION_ID = `web-${Math.random().toString(36).slice(2, 10)}`;

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
    icon: <Sparkles size={18} color="white" />,
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

// ── Minimal markdown renderer ─────────────────────────────────────────────────
function renderMarkdown(text: string): React.ReactNode[] {
  return text.split("\n").map((line, i) => {
    if (/^###\s/.test(line)) return <h4 key={i} className="font-bold text-sm mt-3 mb-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>{line.slice(4)}</h4>;
    if (/^##\s/.test(line))  return <h3 key={i} className="font-bold text-base mt-3 mb-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{line.slice(3)}</h3>;
    if (/^#\s/.test(line))   return <h2 key={i} className="font-bold text-lg mt-3 mb-1" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>{line.slice(2)}</h2>;
    if (/^[-*]\s/.test(line)) return <li key={i} className="ml-4 list-disc text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{inline(line.slice(2))}</li>;
    if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{inline(line.replace(/^\d+\.\s/, ""))}</li>;
    if (line.trim() === "") return <br key={i} />;
    return <p key={i} className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{inline(line)}</p>;
  });
}

function inline(text: string): React.ReactNode {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g).map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) return <strong key={i} style={{ fontFamily: "var(--font-display)" }}>{p.slice(2, -2)}</strong>;
    if (p.startsWith("`")  && p.endsWith("`"))  return <code key={i} className="rounded px-1 font-mono text-xs" style={{ background: "rgba(0,0,0,0.08)" }}>{p.slice(1, -1)}</code>;
    if (p.startsWith("*")  && p.endsWith("*"))  return <em key={i}>{p.slice(1, -1)}</em>;
    return p;
  });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function AsistenteTab() {
  const [messages, setMessages]       = useState<Message[]>([]);
  const [input, setInput]             = useState("");
  const [loading, setLoading]         = useState(false);
  const [statusLabel, setStatusLabel] = useState("Pensando…");
  const [sessionReady, setReady]      = useState(false);
  const bottomRef                     = useRef<HTMLDivElement>(null);
  const textareaRef                   = useRef<HTMLTextAreaElement>(null);
  const { getToken }                  = useAuth();
  const { resolvedTheme }             = useTheme();
  const [mounted, setMounted]         = useState(false);
  useEffect(() => setMounted(true), []);

  const isDark = mounted && resolvedTheme === "dark";

  // ── Tokens ──────────────────────────────────────────────────────────────────
  const primaryColor  = isDark ? "oklch(0.72 0.16 38)" : "#F27405";
  const surfaceLow    = isDark ? "#191c1e" : "#f3f3f7";
  const surfaceLowest = isDark ? "#0b0d0f" : "#ffffff";
  const onSurface     = isDark ? "#e2e0dd" : "#191c1e";
  const onVariant     = isDark ? "#d3bcaf" : "#6b7280";
  const shadowCard    = isDark
    ? "0 12px 32px -4px rgba(0,0,0,0.28)"
    : "0 12px 32px -4px rgba(25,28,30,0.06)";

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
    if (textareaRef.current) textareaRef.current.style.height = "auto";
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
              id: crypto.randomUUID(), role: "agent",
              text: reply.text, refs: reply.refs,
              curriculum_match: reply.curriculum_match,
              planificacion: reply.planificacion,
              secuencia: reply.secuencia,
            }]);
            setLoading(false);
          } else if (evt.type === "error") {
            setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "error", text: "Error al contactar el agente.", refs: [] }]);
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

  const autoResize = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
  };

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-6 py-4 flex-shrink-0"
        style={{
          background: isDark ? "rgba(16,18,19,0.80)" : "rgba(255,255,255,0.80)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isDark
            ? "0 1px 0 rgba(255,255,255,0.04)"
            : "0 1px 0 rgba(25,28,30,0.06)",
        }}
      >
        <div className="flex items-center gap-3">
          {/* Sparkle icon con el naranja nuevo */}
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center"
            style={{ background: isDark ? "rgba(200,100,50,0.16)" : "rgba(242,116,5,0.10)", color: primaryColor }}
          >
            <SparkleIcon />
          </div>
          <div>
            <p
              className="text-sm font-bold"
              style={{ fontFamily: "var(--font-display)", color: onSurface, letterSpacing: "-0.01em" }}
            >
              Planificador IA
            </p>
            <p className="text-xs flex items-center gap-1.5" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>
              <span
                className="w-1.5 h-1.5 rounded-full inline-block"
                style={{ background: sessionReady ? "#16a34a" : "#d97706" }}
              />
              {sessionReady ? "Listo para ayudarte" : "Conectando…"}
            </p>
          </div>
        </div>
        <button
          onClick={reset}
          aria-label="Nueva sesión"
          className="rounded-xl transition-all active:scale-95"
          style={{
            padding: "0.5rem",
            color: onVariant,
            background: "transparent",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(25,28,30,0.05)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          <ResetIcon />
        </button>
      </div>

      {/* ── Messages ────────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{ padding: "1.5rem 1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}
      >
        {messages.length === 0 && (
          <WelcomeScreen
            sessionReady={sessionReady}
            onSend={send}
            isDark={isDark}
            primaryColor={primaryColor}
            surfaceLowest={surfaceLowest}
            onSurface={onSurface}
            onVariant={onVariant}
            shadowCard={shadowCard}
          />
        )}

        {messages.map((msg) => (
          <Bubble
            key={msg.id}
            message={msg}
            onOptionClick={send}
            isDark={isDark}
            primaryColor={primaryColor}
            surfaceLow={surfaceLow}
            onSurface={onSurface}
            onVariant={onVariant}
            shadowCard={shadowCard}
          />
        ))}
        {loading && <TypingIndicator label={statusLabel} isDark={isDark} surfaceLow={surfaceLow} onVariant={onVariant} />}
        <div ref={bottomRef} />
      </div>

      {/* ── Input ───────────────────────────────────────────────────────── */}
      <div
        className="flex-shrink-0 px-4 pb-4 pt-3"
        style={{
          background: isDark ? "rgba(16,18,19,0.80)" : "rgba(255,255,255,0.80)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: isDark
            ? "0 -1px 0 rgba(255,255,255,0.04)"
            : "0 -1px 0 rgba(25,28,30,0.06)",
        }}
      >
        <div
          className="flex items-end gap-2 rounded-2xl p-1.5"
          style={{
            background: surfaceLowest,
            boxShadow: shadowCard,
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={autoResize}
            onKeyDown={onKey}
            disabled={loading || !sessionReady}
            rows={1}
            placeholder={sessionReady ? "Escribí tu consulta…" : "Conectando con el agente…"}
            className="flex-1 resize-none focus:outline-none disabled:opacity-60"
            style={{
              background: "transparent",
              border: "none",
              padding: "0.625rem 0.75rem",
              fontSize: "0.875rem",
              lineHeight: "1.5",
              color: onSurface,
              fontFamily: "var(--font-body)",
              maxHeight: "140px",
              overflowY: "auto",
            }}
          />
          <button
            onClick={() => send(input)}
            disabled={loading || !sessionReady || !input.trim()}
            aria-label="Enviar"
            className="rounded-xl transition-all active:scale-90 disabled:opacity-40 flex-shrink-0"
            style={{
              background: input.trim() ? primaryColor : (isDark ? "rgba(255,255,255,0.08)" : "rgba(25,28,30,0.06)"),
              color: input.trim() ? "#ffffff" : onVariant,
              padding: "0.625rem",
              border: "none",
              cursor: input.trim() ? "pointer" : "not-allowed",
              transition: "all 0.18s ease",
              marginBottom: "0.125rem",
            }}
          >
            <SendIcon />
          </button>
        </div>
        <p
          className="hidden md:block text-xs mt-2 ml-1"
          style={{ color: onVariant, opacity: 0.6, fontFamily: "var(--font-body)" }}
        >
          Shift+Enter para nueva línea · Agente con acceso al programa EBI
        </p>
      </div>
    </div>
  );
}

// ── Welcome screen ────────────────────────────────────────────────────────────

function WelcomeScreen({
  sessionReady, onSend, isDark, primaryColor, surfaceLowest,
  onSurface, onVariant, shadowCard,
}: {
  sessionReady: boolean; onSend: (t: string) => void;
  isDark: boolean; primaryColor: string; surfaceLowest: string;
  onSurface: string; onVariant: string; shadowCard: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 gap-8 py-8 px-2">

      {/* Icon + heading */}
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="w-16 h-16 rounded-3xl flex items-center justify-center"
          style={{
            background: isDark ? "rgba(200,100,50,0.16)" : "rgba(242,116,5,0.10)",
            color: primaryColor,
            boxShadow: shadowCard,
          }}
        >
          <SparkleIcon size={32} />
        </div>
        <div>
          <h2
            className="text-xl font-black"
            style={{ fontFamily: "var(--font-display)", color: onSurface, letterSpacing: "-0.02em" }}
          >
            ¿En qué te ayudo hoy?
          </h2>
          <p
            className="text-sm mt-1 max-w-sm"
            style={{ fontFamily: "var(--font-body)", color: onVariant, lineHeight: 1.6 }}
          >
            Estoy acá para que pases menos horas planificando y más tiempo con tus alumnos.
          </p>
        </div>
      </div>

      {/* Suggestion chips */}
      <div className="w-full max-w-xl flex flex-col gap-2.5">
        {/* Featured CTA */}
        <button
          onClick={() => onSend(QUICK_PROMPTS[0].label)}
          disabled={!sessionReady}
          className="w-full text-left rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50"
          style={{
            background: primaryColor,
            padding: "1rem 1.25rem",
            border: "none",
            cursor: "pointer",
            boxShadow: isDark
              ? "0 8px 24px rgba(200,100,50,0.28)"
              : "0 8px 24px rgba(242,116,5,0.22)",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = "none"; }}
        >
          <div className="flex items-center gap-3">
            <span className="flex-shrink-0 opacity-90">{QUICK_PROMPTS[0].icon}</span>
            <div>
              <p
                className="text-sm font-bold text-white"
                style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}
              >
                {QUICK_PROMPTS[0].label}
              </p>
              <p className="text-xs text-white/70 mt-0.5" style={{ fontFamily: "var(--font-body)" }}>
                {QUICK_PROMPTS[0].subtext}
              </p>
            </div>
          </div>
        </button>

        {/* Regular chips — 2 columns */}
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_PROMPTS.slice(1).map((q) => (
            <button
              key={q.label}
              onClick={() => onSend(q.label)}
              disabled={!sessionReady}
              className="text-left rounded-2xl transition-all active:scale-[0.99] disabled:opacity-50"
              style={{
                background: surfaceLowest,
                padding: "0.875rem 1rem",
                border: "none",
                cursor: "pointer",
                boxShadow: shadowCard,
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = isDark
                  ? "0 12px 32px -4px rgba(0,0,0,0.40)"
                  : "0 12px 32px -4px rgba(25,28,30,0.12)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
                (e.currentTarget as HTMLButtonElement).style.boxShadow = shadowCard;
              }}
            >
              <div className="flex items-start gap-2.5">
                <div style={{ color: onVariant, flexShrink: 0, marginTop: "1px" }}>{q.icon}</div>
                <div>
                  <p
                    className="text-xs font-semibold leading-snug"
                    style={{ fontFamily: "var(--font-display)", color: onSurface, letterSpacing: "-0.01em" }}
                  >
                    {q.label}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ fontFamily: "var(--font-body)", color: onVariant, opacity: 0.8 }}
                  >
                    {q.subtext}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Bubble ────────────────────────────────────────────────────────────────────

function Bubble({
  message, onOptionClick, isDark, primaryColor, surfaceLow, onSurface, onVariant, shadowCard,
}: {
  message: Message; onOptionClick: (t: string) => void;
  isDark: boolean; primaryColor: string; surfaceLow: string;
  onSurface: string; onVariant: string; shadowCard: string;
}) {
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

        {!isUser && message.curriculum_match && (
          <CurriculumMatchCard data={message.curriculum_match} isDark={isDark} onSurface={onSurface} onVariant={onVariant} primaryColor={primaryColor} />
        )}
        {!isUser && message.planificacion && (
          <PlanificacionTabla data={message.planificacion} />
        )}
        {!isUser && message.secuencia && (
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
              fontSize: "0.875rem",
              lineHeight: 1.6,
              fontFamily: "var(--font-body)",
            }}
          >
            {message.text}
          </div>
        ) : (
          <div
            className={`rounded-2xl rounded-bl-sm ${isError ? "border border-red-400/30" : ""}`}
            style={{
              background: isError
                ? (isDark ? "rgba(220,38,38,0.08)" : "rgba(220,38,38,0.05)")
                : surfaceLow,
              padding: "0.875rem 1rem",
              boxShadow: isError ? "none" : shadowCard,
              color: isError ? "#dc2626" : onSurface,
            }}
          >
            <div className="space-y-1">{renderMarkdown(bodyText)}</div>
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
            isDark={isDark}
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
                  background: isDark ? "rgba(18,74,240,0.16)" : "rgba(18,74,240,0.08)",
                  color: isDark ? "#bdceff" : "#124af0",
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
}

// ── CurriculumMatchCard ───────────────────────────────────────────────────────

function CurriculumMatchCard({
  data, isDark, onSurface, onVariant, primaryColor,
}: {
  data: CurriculumMatch; isDark: boolean;
  onSurface: string; onVariant: string; primaryColor: string;
}) {
  const surfaceLow = isDark ? "#191c1e" : "#f3f3f7";
  const shadow = isDark
    ? "0 12px 32px -4px rgba(0,0,0,0.28)"
    : "0 12px 32px -4px rgba(25,28,30,0.06)";

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
      <div className="space-y-2.5 pt-3" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(25,28,30,0.06)"}` }}>
        <MatchField label="Contenido" value={data.contenido} onSurface={onSurface} onVariant={onVariant} />
        <div>
          <p className="text-xs font-medium mb-0.5" style={{ color: onVariant, fontFamily: "var(--font-body)" }}>{data.ce_codigo}</p>
          <p className="text-sm font-medium leading-relaxed" style={{ color: onSurface, fontFamily: "var(--font-body)" }}>{data.ce_texto}</p>
        </div>
        <MatchField label="Criterio de logro" value={data.criterio_de_logro} onSurface={onSurface} onVariant={onVariant} />
      </div>
      {data.competencias_mcn.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {data.competencias_mcn.map((c, i) => (
            <span
              key={i}
              className="rounded-full text-xs font-semibold"
              style={{
                padding: "0.2rem 0.6rem",
                background: isDark ? "rgba(200,100,50,0.16)" : "rgba(242,116,5,0.10)",
                color: primaryColor,
                fontFamily: "var(--font-display)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3" style={{ borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(25,28,30,0.06)"}` }}>
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
  const handleExportPDF = async () => {
    const { pdf } = await import("@react-pdf/renderer");
    const { PlanificacionPDF } = await import("../pdf/PlanificacionPDF");
    const blob = await pdf(<PlanificacionPDF data={data} nombre={data.titulo} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.titulo.replace(/\s+/g, "_").slice(0, 60)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const bom = "\uFEFF";
    const headers = ["Momento", "Duración", "Actividad", "Rol docente", "Recursos"];
    const rows = data.momentos.map((m) => [m.momento, m.duracion, m.actividad, m.rol_docente, m.recursos]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${data.titulo.replace(/\s+/g, "_").slice(0, 60)}.csv`; a.click();
    URL.revokeObjectURL(url);
  };
  const momentoColor: Record<string, string> = {
    Inicio:     "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    Desarrollo: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300",
    Cierre:     "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
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
        <div className="px-3 py-2.5 rounded-xl" style={{ background: "rgba(242,116,5,0.08)" }}>
          <p className="text-xs font-semibold text-accent" style={{ fontFamily: "var(--font-display)" }}>{data.metodologia}</p>
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
            {data.momentos.map((m, i) => (
              <tr key={i} className="border-b border-border/40 align-top">
                <td className="py-3 pr-3 pl-1 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${momentoColor[m.momento] ?? "bg-muted text-foreground"}`} style={{ fontFamily: "var(--font-display)" }}>{m.momento}</span>
                </td>
                <td className="py-3 pr-3 text-muted-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-body)" }}>{m.duracion}</td>
                <td className="py-3 pr-3 leading-relaxed font-medium text-foreground/90" style={{ fontFamily: "var(--font-body)" }}>{m.meta_aprendizaje ?? <span className="text-muted-foreground/40 italic">—</span>}</td>
                <td className="py-3 pr-3 leading-relaxed" style={{ fontFamily: "var(--font-body)" }}>{m.actividad}</td>
                <td className="py-3 pr-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.rol_docente}</td>
                <td className="py-3 leading-relaxed text-muted-foreground" style={{ fontFamily: "var(--font-body)" }}>{m.recursos}</td>
              </tr>
            ))}
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

function SecuenciaTablaInline({ data }: { data: SecuenciaData }) {
  const handleExportPDF = async () => {
    const titulo = `${data.espacio} — ${data.unidad_curricular}`;
    const { pdf } = await import("@react-pdf/renderer");
    const { SecuenciaPDF } = await import("../pdf/SecuenciaPDF");
    const blob = await pdf(<SecuenciaPDF data={data} nombre={titulo} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${titulo.replace(/\s+/g, "_").slice(0, 60)}.pdf`; a.click();
    URL.revokeObjectURL(url);
  };
  const exportCSV = () => {
    const bom = "\uFEFF";
    const headers = ["N°", "Recorte", "Meta de aprendizaje", "Plan de aprendizaje", "Recursos"];
    const rows = data.actividades.map((a) => [String(a.numero), a.recorte, a.meta_aprendizaje, a.plan_aprendizaje.join("\n"), a.recursos ?? ""]);
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
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
          <div className="px-3 py-2 border-b border-border" style={{ background: "rgba(242,116,5,0.05)" }}>
            <span className="font-semibold uppercase tracking-wide text-accent" style={{ fontFamily: "var(--font-display)" }}>Meta de aprendizaje: </span>
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
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-xs border-collapse min-w-[600px] border border-border rounded-xl overflow-hidden">
          <thead>
            <tr className="bg-muted/50">
              {["ACT.", "RECORTE", "META DE APRENDIZAJE", "PLAN DE APRENDIZAJE", "RECURSOS"].map((h) => (
                <th key={h} className="text-left py-2 px-3 font-semibold text-muted-foreground uppercase tracking-wide border-b border-border whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.actividades.map((act, i) => (
              <tr key={i} className="border-b border-border/40 align-top">
                <td className="py-3 px-3 font-bold text-foreground whitespace-nowrap" style={{ fontFamily: "var(--font-display)" }}>{act.numero}.</td>
                <td className="py-3 px-3 text-foreground/80 leading-relaxed min-w-[120px]" style={{ fontFamily: "var(--font-body)" }}>{act.recorte}</td>
                <td className="py-3 px-3 text-foreground/80 leading-relaxed min-w-[160px]" style={{ fontFamily: "var(--font-body)" }}>{act.meta_aprendizaje}</td>
                <td className="py-3 px-3 leading-relaxed min-w-[240px]">
                  <ul className="space-y-1">
                    {act.plan_aprendizaje.map((paso, j) => (
                      <li key={j} className="flex gap-2 text-foreground/80" style={{ fontFamily: "var(--font-body)" }}>
                        <span className="text-muted-foreground shrink-0">–</span><span>{paso}</span>
                      </li>
                    ))}
                  </ul>
                </td>
                <td className="py-3 px-3 text-muted-foreground leading-relaxed min-w-[100px]" style={{ fontFamily: "var(--font-body)" }}>
                  {act.recursos || <span className="opacity-30">—</span>}
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

function MultiSelect({
  options, onConfirm, isDark, primaryColor, surfaceLow, onSurface, shadowCard,
}: {
  options: string[]; onConfirm: (t: string) => void;
  isDark: boolean; primaryColor: string; surfaceLow: string;
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
                ? (isDark ? "rgba(200,100,50,0.20)" : "rgba(242,116,5,0.10)")
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

// ── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ label, isDark, surfaceLow, onVariant }: { label: string; isDark: boolean; surfaceLow: string; onVariant: string }) {
  const shadow = isDark ? "0 12px 32px -4px rgba(0,0,0,0.28)" : "0 12px 32px -4px rgba(25,28,30,0.06)";
  return (
    <div className="flex justify-start">
      <div
        className="rounded-2xl rounded-bl-sm flex items-center gap-2.5"
        style={{ background: surfaceLow, padding: "0.75rem 1rem", boxShadow: shadow }}
      >
        <div className="flex items-center gap-1">
          {[0, 150, 300].map((delay, i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full animate-bounce"
              style={{ background: onVariant, animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <span style={{ fontSize: "0.75rem", color: onVariant, fontFamily: "var(--font-body)" }}>{label}</span>
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
