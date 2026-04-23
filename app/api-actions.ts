"use server";

import { auth } from "@clerk/nextjs/server";

const API_URL = process.env.API_URL ?? "http://localhost:8001";

// ── Helper: headers con JWT Clerk ─────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { getToken } = await auth();
  const token = await getToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type Planificacion = {
  id: number;
  nombre: string;
  descripcion?: string;
  nivel?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
  chat_exportado?: string;
};

export type Alumno = {
  id: number;
  nombre_completo: string;
  fecha_nacimiento?: string;
  nivel?: string;
  grado?: string;
  notas?: string;
};

// ── Planificaciones ───────────────────────────────────────────────────────────

export async function getPlanificaciones(): Promise<Planificacion[]> {
  try {
    const res = await fetch(`${API_URL}/planificaciones/`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getPlanificacion(id: number): Promise<Planificacion | null> {
  try {
    const res = await fetch(`${API_URL}/planificaciones/${id}`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createPlanificacion(data: {
  nombre: string;
  descripcion?: string;
  nivel?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
}): Promise<Planificacion | null> {
  try {
    const res = await fetch(`${API_URL}/planificaciones/`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deletePlanificacion(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/planificaciones/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Alumnos ───────────────────────────────────────────────────────────────────

export async function getAlumnos(): Promise<Alumno[]> {
  try {
    const res = await fetch(`${API_URL}/alumnos/`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function createAlumno(data: {
  nombre_completo: string;
  fecha_nacimiento?: string;
  nivel?: string;
  grado?: string;
  notas?: string;
}): Promise<Alumno | null> {
  try {
    const res = await fetch(`${API_URL}/alumnos/`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function updateAlumno(id: number, data: {
  nombre_completo?: string;
  fecha_nacimiento?: string;
  nivel?: string;
  grado?: string;
  notas?: string;
}): Promise<Alumno | null> {
  try {
    const res = await fetch(`${API_URL}/alumnos/${id}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteAlumno(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/alumnos/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function updatePlanificacion(id: number, data: {
  nombre?: string;
  descripcion?: string;
  nivel?: string;
  periodo_inicio?: string;
  periodo_fin?: string;
}): Promise<Planificacion | null> {
  try {
    const res = await fetch(`${API_URL}/planificaciones/${id}`, {
      method: "PUT",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Agente chat ───────────────────────────────────────────────────────────────

export type PdfRef = { filename: string; page: number; label: string };
export type AgentResponse = { text: string; refs: PdfRef[]; session_id: string };

export async function createAdkSession(_sessionId: string): Promise<void> {
  // En prod el agente crea la sesión automáticamente en el primer mensaje
  // Esta función existe por compatibilidad con el componente chat
}

export async function sendAdkMessage(
  sessionId: string,
  text: string
): Promise<AgentResponse> {
  try {
    const res = await fetch(`${API_URL}/agente/chat`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ message: text, session_id: sessionId }),
    });
    if (!res.ok) return { text: "Error al contactar el agente.", refs: [], session_id: sessionId };
    const data = await res.json();
    return parseAgentResponse(data);
  } catch (e) {
    return { text: `Error de conexión: ${e}`, refs: [], session_id: sessionId };
  }
}

// ── Curriculum estructurado ───────────────────────────────────────────────────

export type CurriculumEstructura = { tramos: Record<string, unknown> };

export async function getCurriculumEstructura(): Promise<CurriculumEstructura> {
  try {
    const res = await fetch(`${API_URL}/curriculum/estructura`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return { tramos: {} };
  }
}

// ── Parser respuesta del agente ───────────────────────────────────────────────

function parseAgentResponse(data: unknown): AgentResponse {
  if (!data || typeof data !== "object") {
    return { text: "El agente no respondió.", refs: [], session_id: "" };
  }

  const d = data as Record<string, unknown>;
  const session_id = typeof d.session_id === "string" ? d.session_id : "";
  const raw = typeof d.response === "string" ? d.response.trim() : "";

  if (!raw) return { text: "El agente no respondió.", refs: [], session_id };

  // El agente usa output_schema → puede venir como JSON string
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.text === "string") {
      const refs: PdfRef[] = Array.isArray(parsed.refs)
        ? (parsed.refs as unknown[]).filter(
            (r): r is PdfRef =>
              typeof r === "object" &&
              r !== null &&
              typeof (r as PdfRef).filename === "string" &&
              typeof (r as PdfRef).page === "number"
          )
        : [];
      return { text: parsed.text, refs, session_id };
    }
  } catch { /* no es JSON — respuesta plana */ }

  return { text: raw, refs: [], session_id };
}
