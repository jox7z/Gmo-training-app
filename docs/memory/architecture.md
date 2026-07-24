# Arquitectura

## Capas

```
┌──────────────────────────────────────────────────────┐
│  app/  +  src/components/                            │
│  Frontend: JSX, navegación, UX                       │
│  └─ Consume hooks de src/lib/queries/                │
└──────────────────────────────────────────────────────┘
                       ▲
                       │ hooks, NUNCA supabase.* directo
                       ▼
┌──────────────────────────────────────────────────────┐
│  src/lib/                                            │
│  Backend de cliente: auth, repos, queries, storage   │
│  └─ Único punto que toca supabase-js                 │
└──────────────────────────────────────────────────────┘
                       ▲
                       │ rpc, from, auth
                       ▼
┌──────────────────────────────────────────────────────┐
│  supabase/                                           │
│  BD, RLS, RPCs, triggers, edge functions             │
│  └─ Fuente de verdad                                 │
└──────────────────────────────────────────────────────┘
```

## Reglas duras (no negociables)

1. **Frontend NUNCA llama `supabase.*` directo.** Todo pasa por
   `src/lib/auth/`, `src/lib/repos/` o `src/lib/queries/`.
2. **Backend (src/lib/) NUNCA importa JSX ni hace renders.**
3. **Supabase (carpeta) NUNCA toca código TS.** Es solo SQL.
4. **RLS es la última línea de defensa.** No confíes solo en validación
   de cliente — las políticas RLS deben proteger cada tabla.
5. **RPCs antes que queries directas** cuando hay lógica de negocio.
   Las queries directas son OK para CRUD trivial.

## Modelo multi-agente

Tres agentes especializados con scope estricto, más un revisor:

### 🗄️ Agente Supabase
- **Toca:** solo `supabase/`
- **Hace:** schema, RLS, RPCs, triggers, índices, edge functions
- **Prohibido:** tocar cualquier `.ts` / `.tsx`
- **Identidad completa:** `skills/agents/supabase.md`

### ⚙️ Agente Backend
- **Toca:** solo `src/lib/`
- **Hace:** capa de auth, repos, hooks de React Query, storage helpers
- **Prohibido:** tocar JSX, componentes, pantallas
- **Identidad completa:** `skills/agents/backend.md`

### 🎨 Agente Frontend
- **Toca:** `app/`, `src/components/`, `src/theme/`
- **Hace:** pantallas, componentes UI, navegación, estilos
- **Prohibido:** llamar `supabase.*` directo, modificar SQL
- **Identidad completa:** `skills/agents/frontend.md`

### 🦴 Agente Revisor (caveman)
- **Toca:** nada (solo lectura)
- **Hace:** señala bugs, sobre-ingeniería, duplicación, inconsistencias
- **Prohibido:** escribir código de fix
- **Identidad completa:** `skills/agents/reviewer.md`

## Orden de ejecución

Por feature siempre: **Supabase → Backend → Frontend → Revisor**.

- BD primero porque es la fuente de verdad
- Backend depende del schema
- Frontend depende de los hooks
- Revisor al final de cada sprint para evitar deuda acumulada

## Cuándo romper las reglas

Casi nunca. Excepciones documentadas:

- **Inicialización de Supabase client** en `src/lib/supabase.ts` —
  obvio, es donde se crea
- **Subscripción a `onAuthStateChange`** en `src/lib/auth/session.ts` —
  necesita acceso directo al cliente
- **Realtime subscriptions** (cuando se añadan) — único punto donde
  el frontend puede importar `supabase` directo, vía un hook
  específico en `src/lib/realtime/`
