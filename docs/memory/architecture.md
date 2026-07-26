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

## Núcleo local y lifecycle

- Workout/rutinas/perfil local viven en Zustand + AsyncStorage aunque no exista
  sesión. Las mutaciones del workout se escriben con cola serializada.
- `SetEntry.restStartedAt` es metadata local de workflow: reanuda el descanso
  con tiempo real tras background/remount y nunca se mapea a Supabase.
- Antes de finalizar, `src/lib/workoutValidation.ts` valida series completas.
- Snapshots antiguos con una serie completa inválida reabren esa serie en `log`
  para poder corregirla; nunca deben dejar el finish bloqueado sin salida.
- `repos/workouts.ts` envía el árbol completo a `sync_workout_snapshot` (migración
  `0041`). La RPC usa lock transaccional por workout, valida ownership y reconstruye
  parent/hijos atómicamente; el cliente además serializa sus propios intentos. No
  se considera éxito la mera existencia del parent. `0042` revoca grants
  automáticos y deja `EXECUTE` solo a `authenticated`. `0043` hace monotónica
  `is_published`: un snapshot local stale no puede despublicar un workout. `0044`
  conserva la firma/ACL de `publish_workout`, bloquea la fila y genera metadata
  social factual desde series efectivas plausibles. `0045` limita la comparación
  de PR a workouts anteriores a la sesión publicada. `0046` completa el orden con
  `created_at` e `id` para que timestamps iguales tengan un único baseline.
- `src/lib/{workoutCompare,progressInsights,exerciseProgressPicker,exerciseDetails,plateCalculator,workoutPostMetadata,postSharing,workoutPersistence}.ts`
  son lógica pura; las pantallas no duplican sus cálculos.
- `ExerciseProgressPicker` recibe el resultado local de `buildExercisePerformance`.
  Su helper ordena copias, busca sin diacríticos y cruza metadata del catálogo para
  filtros; no muta historial, no lista ejercicios nunca entrenados y no toca Supabase.
  Las miniaturas provienen del mapa Metro `exerciseImage(id)` y se renderizan con
  `expo-image`; IDs sin asset usan fallback local, nunca una URL remota. El sheet
  conserva altura fija; búsqueda y filtros solo cambian la lista desplazable.
- El timeline de progreso expone `weight | reps | duration`; el hub usa tendencia
  `weight | reps`. El trabajo derivado se conserva solo en ledgers/social, separado
  del selector y de los récords comparativos.
- `TimeSeriesChart` conserva el `workoutId` en cada punto y delega la apertura del
  ledger real al padre. `WorkoutResultsModal` no calcula comparaciones ni veredictos.
- `WorkoutShareCard` consume únicamente el parser tipado de metadata. Los posts
  anteriores a `0044` usan `duration_min`/`muscle_group` como fallback.
- La presentación social se separa del modelo: `Card variant="stream"` dibuja solo
  separadores superior/inferior y `SocialStreamColumn` controla ancho completo en
  móvil + columna centrada de máximo 600 px. `FeedItem`, `EventCard` y
  `CommunityCard` conservan `contained` por defecto y cada feed público pasa
  `layout="stream"` explícitamente. Texto/acciones usan 16 px, fotos 4:5 full-bleed
  y el perfil público usa galería 3×N sin margen exterior, con gaps de 1 px.
- Las secciones informativas usan `Card variant="section"`: radio 0 y separadores
  superior/inferior sin líneas laterales. `raised` queda para tiles compactos,
  selección, navegación, formularios y controles; no se cambió el default global.
- `src/components/ui/Skeleton.tsx` centraliza placeholders. `SkeletonGroup` crea un
  único pulso por grupo y sus huesos son decorativos para accesibilidad. Solo
  reemplaza carga inicial sin datos; cache durante refetch, paginación, refresh y
  mutaciones conservan sus estados específicos. `AccessibilityInfo` detiene el
  pulso y deja una opacidad estática cuando Reduce Motion está activo.
- `workouts.markWorkoutPublished()` y la reconciliación monotónica de
  `mergeHistory()` mantienen el estado local alineado con la publicación remota.
- La hidratación del historial valida el shape persistido y conserva un estado
  seguro ante JSON corrupto; los fallos de escritura se registran para diagnóstico.
- No hay controles de privacidad/notificaciones en UI mientras no exista
  enforcement completo en servidor/módulo nativo.
- `src/lib/weeklyStreak.ts` deriva días y racha desde historial +
  `weeklyGoalDays`: semana local lunes–domingo, días únicos y gracia para la
  semana actual incompleta. Store, logros y UI consumen esa misma fuente; el
  snapshot se refresca al volver a foreground para cubrir el rollover semanal.
- El payload v2 de `gmo:achievements:v1` elimina solo tiers `streak-*` heredados
  y los re-siembra en silencio con la regla nueva; conserva fechas de otros logros.
- Los contratos puros viven en `src/lib/__tests__/` y usan Jest + `jest-expo`.
- `/exercise/[id]` es ruta autenticada top-level y debe estar en
  `inAllowedAuthedRoute`.
- Los CTAs externos al `PagerView` solicitan su destino con
  `src/store/mainTabs.ts` antes de volver a `/(tabs)`.

## Datos externos de ejercicios

- Los 220 IDs de `src/data/exercises.ts` son estables y autoritativos para
  historial, rutinas e imágenes offline.
- `scripts/sync-exercises-dataset.mjs` solo genera metadata secundaria enlazada
  con score conservador y commit fijado.
- No se incorporan imágenes/GIFs de `hasaneyldrm/exercises-dataset`: la licencia
  MIT excluye expresamente media Gym visual. El límite está registrado en
  `THIRD_PARTY_NOTICES.md`.

## Modelo multi-agente

Todos los roles usan Caveman permanentemente desde
`.claude/skills/caveman.md`: acción primero, ownership estricto, sin relleno.

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
