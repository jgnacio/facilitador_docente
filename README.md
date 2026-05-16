# Facilitador Docente EBI — Frontend

Frontend web del Facilitador Docente EBI: asistente pedagógico con IA para docentes de Educación Básica Integrada (ANEP, Uruguay). Genera planificaciones semanales y secuencias de actividades alineadas al currículo oficial.

---

## Stack

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 16 (App Router) |
| UI | HeroUI v3, Tailwind CSS v4 |
| Auth | Clerk (`@clerk/nextjs`) |
| Data fetching | TanStack Query v5 |
| PDF export | `@react-pdf/renderer` |
| Animaciones | Motion (Framer Motion v12) |
| Dark mode | `next-themes` |
| Linting | Biome |

---

## Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                facilitador_docente (Next.js 16)              │
│  Puerto 3000 — App Router, Clerk auth, HeroUI, dark mode     │
│                                                              │
│  app/                                                        │
│  ├── (main)/                                                 │
│  │   ├── dashboard/      → DashboardTab                      │
│  │   ├── asistente/      → AsistenteTab (chat SSE)           │
│  │   ├── planificaciones/ → PlanificacionesTab               │
│  │   ├── alumnos/        → AlumnosTab                        │
│  │   └── programa/       → ProgramaTab (currículo)           │
│  └── api-actions.ts      → Server Actions (HTTP al backend)  │
└──────────────────────────────┬───────────────────────────────┘
                               │ HTTP / SSE
                    ┌──────────▼──────────┐
                    │   FastAPI REST API   │
                    │  planificacion_v3/   │
                    │    Puerto 8001       │
                    └─────────────────────┘
```

### Flujo de chat (SSE streaming)

1. El usuario escribe en `AsistenteTab`
2. El frontend abre una conexión SSE a `POST /agente/chat/stream`
3. El backend emite eventos mientras el agente trabaja:
   - `{"type": "tool", "label": "Consultando currículo EBI…"}` — mientras ejecuta herramientas
   - `{"type": "token", "text": "..."}` — palabras de la respuesta final
   - `{"type": "done", "session_id": "...", "response": "..."}` — cierre con el JSON completo
4. El frontend renderiza el JSON estructurado: planificación en tabla, secuencia de actividades, o match curricular

---

## Estructura

```
facilitador_docente/
├── app/
│   ├── (main)/
│   │   ├── layout.tsx              # Shell con navegación lateral
│   │   ├── dashboard/page.tsx      # Dashboard principal
│   │   ├── asistente/page.tsx      # Chat con el agente (SSE)
│   │   ├── planificaciones/page.tsx # Lista y gestión de planificaciones
│   │   ├── alumnos/page.tsx        # Gestión de alumnos
│   │   └── programa/page.tsx       # Explorador del currículo estructurado
│   ├── components/
│   │   ├── tabs/
│   │   │   ├── AsistenteTab.tsx    # Chat SSE con renderers de planificación/secuencia
│   │   │   ├── PlanificacionesTab.tsx
│   │   │   ├── AlumnosTab.tsx
│   │   │   ├── ProgramaTab.tsx
│   │   │   └── DashboardTab.tsx
│   │   ├── pdf/
│   │   │   ├── PlanificacionPDF.tsx # Export PDF planificación
│   │   │   └── SecuenciaPDF.tsx     # Export PDF secuencia de actividades
│   │   └── ui/                     # Componentes base (badge, button, card…)
│   ├── api-actions.ts              # Server Actions — todas las llamadas HTTP al backend
│   ├── layout.tsx                  # Root layout con Clerk + providers
│   └── providers.tsx               # HeroUIProvider + NextThemesProvider
├── lib/utils.ts                    # cn() y utilidades
├── proxy.ts                        # Middleware Clerk auth
├── biome.json                      # Config linting/formatting
└── package.json
```

---

## Variables de entorno

```env
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# URL del backend (planificacion_curricular_v3)
API_URL=http://localhost:8001
NEXT_PUBLIC_API_URL=http://localhost:8001

# Si el agente corre en otro host/puerto (opcional, default = API_URL)
NEXT_PUBLIC_AGENT_URL=http://localhost:8001
```

---

## Instalación y ejecución

```bash
pnpm install
pnpm dev        # http://localhost:3000
```

El backend (`planificacion_curricular_v3/`) debe estar corriendo en el puerto configurado en `API_URL`.

---

## Tipos de respuesta del agente

El agente devuelve un JSON estructurado con `type`:

| `type` | Descripción | Renderizado |
|--------|-------------|-------------|
| `message` | Respuesta conversacional | Bubble Markdown |
| `curriculum_match` | Match CE + contenido + metodología | `CurriculumMatchCard` |
| `planificacion` | Planificación completa (Inicio/Desarrollo/Cierre) | `PlanificacionTabla` con export PDF/CSV |
| `secuencia` | Secuencia de 3-6 actividades numeradas | `SecuenciaTablaInline` con export PDF/CSV |

Los tokens interactivos `[[Opción]]` (selección única) y `((Opción))` (selección múltiple) se renderizan como botones clickeables que envían el texto directamente al agente.
