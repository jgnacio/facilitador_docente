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
// @deprecated Usar la jerarquía EBI (grupos → proyectos → secuencias → actividades).
// Mantenido por compatibilidad con la pestaña "asistente".

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

// ── Suscripciones ─────────────────────────────────────────────────────────────

export type SubscriptionPlan = {
  id: string;
  name: string;
  description?: string;
  price_usd: number;
  billing_period: string;
  mp_plan_id?: string;
};

export type Subscription = {
  id: string;
  plan_name: string;
  status: string;
  period_start?: string;
  period_end?: string;
};

export async function getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  try {
    const res = await fetch(`${API_URL}/subscriptions/plans`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getActiveSubscription(): Promise<Subscription | null> {
  try {
    const res = await fetch(`${API_URL}/subscriptions/active`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createSubscriptionCheckout(planId: string): Promise<{ init_point: string } | null> {
  try {
    const res = await fetch(`${API_URL}/subscriptions/checkout`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ plan_id: planId }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Instituciones — Licencias ─────────────────────────────────────────────────

export type License = {
  id: string;
  status: "available" | "assigned" | "suspended";
  assigned_user_id?: string;
};

export async function getInstitutionLicenses(institutionId: string): Promise<License[]> {
  try {
    const res = await fetch(`${API_URL}/institutions/${institutionId}/licenses`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function assignLicense(
  institutionId: string,
  licenseId: string,
  userId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/institutions/${institutionId}/licenses/${licenseId}/assign`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ user_id: userId }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function revokeLicense(
  institutionId: string,
  licenseId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/institutions/${institutionId}/licenses/${licenseId}/assign`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Instituciones — Facturación ───────────────────────────────────────────────

export type BillingCycle = {
  id: string;
  period_start: string;
  period_end: string;
  license_count: number;
  total_amount_usd: number;
  status: string;
  paid_at?: string;
};

export async function getBillingCycles(institutionId: string): Promise<BillingCycle[]> {
  try {
    const res = await fetch(`${API_URL}/institutions/${institutionId}/billing/cycles`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function generateBillingCycle(
  institutionId: string,
  mpPlanId: string
): Promise<{ checkout_url: string } | null> {
  try {
    const res = await fetch(`${API_URL}/institutions/${institutionId}/billing/cycle`, {
      method: "POST",
      headers: await authHeaders(),
      body: JSON.stringify({ mp_plan_id: mpPlanId }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

// ── Centros Educativos ─────────────────────────────────────────────────────────

export type EducationalCenter = {
  id: number;
  name: string;
  institution_tenant_id?: string;
};

export async function getEducationalCenters(): Promise<EducationalCenter[]> {
  try {
    const res = await fetch(`${API_URL}/educational-centers/`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function createEducationalCenter(data: {
  name: string;
  institution_tenant_id?: string;
}): Promise<EducationalCenter | null> {
  try {
    const res = await fetch(`${API_URL}/educational-centers/`, {
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

export async function updateEducationalCenter(
  id: number,
  data: { name?: string; institution_tenant_id?: string }
): Promise<EducationalCenter | null> {
  try {
    const res = await fetch(`${API_URL}/educational-centers/${id}`, {
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

export async function deleteEducationalCenter(id: number): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/educational-centers/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Jerarquía EBI: Tipos ──────────────────────────────────────────────────────

export interface Group {
  id: string;
  name: string;
  stage?: string;
  level?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  educational_center_id?: string;
  created_at: string;
  updated_at: string;
}

export interface IntegrativeProject {
  id: string;
  group_id: string;
  name: string;
  purpose?: string;
  duration_weeks?: number;
  final_product?: string;
  curriculum_space_ids: string[];
  competency_ids: string[];
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface ActivitySequence {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  learning_goal?: string;
  order: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  user_id: string;
  title: string;
  raw_content?: string;
  content?: string;
  project_id?: string;
  sequence_id?: string;
  group_id?: string;
  order: number;
  activity_type?: string;
  curriculum_space?: string;
  curriculum_unit?: string;
  stage?: number;
  specific_competency_code?: string;
  specific_competency?: string;
  curriculum_content?: string;
  achievement_criterion?: string;
  learning_goal?: string;
  methodology?: string;
  general_competencies?: string;
  period_start?: string;
  period_end?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ── Grupos ────────────────────────────────────────────────────────────────────

export async function getGroups(): Promise<Group[]> {
  try {
    const res = await fetch(`${API_URL}/groups/`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getGroup(id: string): Promise<Group | null> {
  try {
    const res = await fetch(`${API_URL}/groups/${id}`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createGroup(data: {
  name: string;
  stage?: string;
  level?: string;
  start_date?: string;
  end_date?: string;
  description?: string;
  educational_center_id?: string;
}): Promise<Group | null> {
  try {
    const res = await fetch(`${API_URL}/groups/`, {
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

export async function updateGroup(
  id: string,
  data: {
    name?: string;
    stage?: string;
    level?: string;
    start_date?: string;
    end_date?: string;
    description?: string;
    educational_center_id?: string;
  }
): Promise<Group | null> {
  try {
    const res = await fetch(`${API_URL}/groups/${id}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteGroup(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/groups/${id}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Proyectos Integrativos ────────────────────────────────────────────────────

export async function getProjects(groupId: string): Promise<IntegrativeProject[]> {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/projects/`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getProject(
  groupId: string,
  projectId: string
): Promise<IntegrativeProject | null> {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/projects/${projectId}`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createProject(
  groupId: string,
  data: {
    name: string;
    purpose?: string;
    duration_weeks?: number;
    final_product?: string;
    curriculum_space_ids?: string[];
    competency_ids?: string[];
    start_date?: string;
    end_date?: string;
  }
): Promise<IntegrativeProject | null> {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/projects/`, {
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

export async function updateProject(
  groupId: string,
  projectId: string,
  data: {
    name?: string;
    purpose?: string;
    duration_weeks?: number;
    final_product?: string;
    curriculum_space_ids?: string[];
    competency_ids?: string[];
    start_date?: string;
    end_date?: string;
  }
): Promise<IntegrativeProject | null> {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/projects/${projectId}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteProject(
  groupId: string,
  projectId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/groups/${groupId}/projects/${projectId}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// ── Secuencias de Actividades ─────────────────────────────────────────────────

export async function getSequences(
  groupId: string,
  projectId: string
): Promise<ActivitySequence[]> {
  try {
    const res = await fetch(
      `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/`,
      {
        cache: "no-store",
        headers: await authHeaders(),
      }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getSequence(
  groupId: string,
  projectId: string,
  sequenceId: string
): Promise<ActivitySequence | null> {
  try {
    const res = await fetch(
      `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/${sequenceId}`,
      {
        cache: "no-store",
        headers: await authHeaders(),
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createSequence(
  groupId: string,
  projectId: string,
  data: {
    name: string;
    learning_goal?: string;
    order?: number;
    start_date?: string;
    end_date?: string;
  }
): Promise<ActivitySequence | null> {
  try {
    const res = await fetch(
      `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/`,
      {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function updateSequence(
  groupId: string,
  projectId: string,
  sequenceId: string,
  data: {
    name?: string;
    learning_goal?: string;
    order?: number;
    start_date?: string;
    end_date?: string;
  }
): Promise<ActivitySequence | null> {
  try {
    const res = await fetch(
      `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/${sequenceId}`,
      {
        method: "PATCH",
        headers: await authHeaders(),
        body: JSON.stringify(data),
      }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteSequence(
  groupId: string,
  projectId: string,
  sequenceId: string
): Promise<boolean> {
  try {
    const res = await fetch(
      `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/${sequenceId}`,
      {
        method: "DELETE",
        headers: await authHeaders(),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

// ── Actividades ───────────────────────────────────────────────────────────────

export async function getActivities(
  groupId: string,
  projectId: string,
  sequenceId?: string
): Promise<Activity[]> {
  try {
    const url = sequenceId
      ? `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/${sequenceId}/activities/`
      : `${API_URL}/groups/${groupId}/projects/${projectId}/activities/`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return [];
  }
}

export async function getActivity(activityId: string): Promise<Activity | null> {
  try {
    const res = await fetch(`${API_URL}/activities/${activityId}`, {
      cache: "no-store",
      headers: await authHeaders(),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function createActivity(
  groupId: string,
  projectId: string,
  data: {
    title: string;
    raw_content?: string;
    order?: number;
  },
  sequenceId?: string
): Promise<Activity | null> {
  try {
    const url = sequenceId
      ? `${API_URL}/groups/${groupId}/projects/${projectId}/sequences/${sequenceId}/activities/`
      : `${API_URL}/groups/${groupId}/projects/${projectId}/activities/`;
    const res = await fetch(url, {
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

export async function updateActivity(
  activityId: string,
  data: {
    title?: string;
    raw_content?: string;
    order?: number;
  }
): Promise<Activity | null> {
  try {
    const res = await fetch(`${API_URL}/activities/${activityId}`, {
      method: "PATCH",
      headers: await authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function deleteActivity(activityId: string): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/activities/${activityId}`, {
      method: "DELETE",
      headers: await authHeaders(),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Crea una actividad huérfana (sin grupo/proyecto padre) — compatibilidad con agente */
export async function createOrphanActivity(data: {
  title: string;
  raw_content?: string;
  order?: number;
}): Promise<Activity | null> {
  try {
    const res = await fetch(`${API_URL}/activities/`, {
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
