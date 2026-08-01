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
- `startWorkoutFromHistory(source)` reconstruye una sesión activa pendiente en el
  mismo store/local snapshot: asigna IDs nuevos, conserva ejercicios legacy o del
  catálogo, notas, calentamientos y superseries, y reinicia metadata derivada. No
  modifica la fuente ni crea un contrato remoto o una preferencia persistente.
- Logout y cambio de cuenta vacían perfil, workouts, rutinas, logros y Query
  cache mediante resets serializados; nunca se mezcla historial entre usuarios.
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
  El schema live ya incluye `0047`–`0050`. `0051` conserva
  `superset_group_id`/`group_rest_enabled` sin abandonar la RPC transaccional.
- `src/lib/{workoutCompare,progressInsights,exerciseProgressPicker,exerciseDetails,plateCalculator,workoutPostMetadata,postSharing,workoutPersistence}.ts`
  son lógica pura; las pantallas no duplican sus cálculos.
- La presentación del workout activo usa `WorkoutMetric` para peso, reps, tiempo
  y estadísticas, sin tocar persistencia. `RestMascotCoach` monta la mascota
  compartida una vez por fase de descanso y ejecuta solo una entrada finita en UI
  thread; Reduce Motion salta directamente al estado final. `RestRing` es factual,
  sin umbral de recuperación, gradiente ni prescripción.
- `GmoMascot`, `RestMascotCoach` y `WorkoutPrMascot` resuelven la pose base 2D y
  los recortes WebP con alfa de motivación, descanso y PR de la lámina entregada
  (`assets/brand/gmo-mascot-{motivating,rest,pr}.webp`); los call sites no añaden
  placas oscuras ni copias por pantalla. El Summary deriva el PR frente al historial
  antes de finalizar y la entrada de celebración respeta Reduce Motion.
- `numericAccessibilityValue()` construye un `accessibilityValue` exclusivamente
  textual para los inputs decimales. No incluir `now/min/max`: Fabric puede
  convertirlos a enteros nativos y fallar con valores válidos como `22.5`.
- `src/lib/muscleVolume.ts` agrega series equivalentes por músculo para rutinas
  planificadas: 1 primaria, 0.5 secundaria y overrides opcionales del catálogo.
  `MuscleVolumeMap` se usa en editor/Rutinas; ya no representa Progreso.
- `src/lib/routineQualityScore.ts` deriva un score local 0–100: cobertura 35%,
  volumen 30%, frecuencia 20% y estructura 15%. `RoutineQualityCard` lo presenta
  como `GMO Rating`, radial segmentado, desglose 2×2 y un disclaimer; no se
  persiste ni genera consejos.
- `src/lib/trainingCalendar.ts` construye 42 días civiles locales, lunes primero,
  agrupa sesiones 0/1/2/3+ y conserva los workouts exactos para el ledger. La UI
  mantiene el grid 6×7 y separa sus celdas con un gap fijo de 4 px.
- `src/lib/muscleMilestones.ts` reutiliza los cuatro tracks de fuerza de
  `ACHIEVEMENTS`. Selecciona evidencia determinista por carga, reps, fecha e IDs;
  un músculo secundario recibe un nivel menos. No duplica umbrales ni estima 1RM.
- `src/lib/rankMilestone.ts` normaliza `legend → olympus`, resuelve promociones
  sociales válidas y deriva rangos visibles desde puntos cuando están disponibles.
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
  selección, navegación, formularios y controles. La escala de radios compartida
  es casi recta; `Stat` y `WorkoutMetric` concentran métricas repetidas. Cards y
  botones ordinarios no dependen de glow para indicar jerarquía.
- `src/components/ui/Skeleton.tsx` centraliza placeholders. `SkeletonGroup` crea un
  único pulso por grupo y sus huesos son decorativos para accesibilidad. Solo
  reemplaza carga inicial sin datos; cache durante refetch, paginación, refresh y
  mutaciones conservan sus estados específicos. `AccessibilityInfo` detiene el
  pulso y deja una opacidad estática cuando Reduce Motion está activo; el estado
  desconocido inicial también es estático.
- `workouts.markWorkoutPublished(id, visibility)` y la reconciliación monotónica de
  `mergeHistory()` mantienen el estado local alineado con la publicación remota.
- La hidratación del historial valida el shape persistido y conserva un estado
  seguro ante JSON corrupto; los fallos de escritura se registran para diagnóstico.
  Cada cambio válido de serie se encola; `updateSetById` valida IDs/campos y evita
  serializar el historial en el hilo del tap antes de entrar a la cola.
- `0052` modela privacidad en `workouts.visibility`; `profiles` solo guarda el
  default. RLS y RPCs sociales deben usar la misma regla. El bucket de fotos sigue
  público, por eso publicaciones restringidas no aceptan media.
- El perfil propio usa una sola FlashList, encabezado compacto, tabs sticky y
  `FeedItem` canónico. Actividad/logros son hechos locales; el menú de tres puntos
  abre Compartir/Ajustes y Settings posee el único sign-out.
- `recentExercises.ts` y `workoutHistoryFilters.ts` son helpers puros sobre
  `Workout[]`. Los recientes solo ordenan filas existentes del catálogo; los filtros
  de Actividad (ejercicio, rutina, periodo y publicación) cambian solo la lista del
  Perfil y no afectan calendario, récords, gráficas ni el snapshot almacenado.
- El score de rutina es transparente y no prescriptivo; no incluye weak groups,
  recuperación ni consejos. El mapa de volumen estimado sigue factual e interactivo.
- En Progreso, el selector de hitos es buscable y separa `Con hitos`/`Sin hitos`
  sobre los 12 músculos. El mapa es un atajo visual, no el único target; la hoja
  conserva geometría al filtrar, se eleva sobre el teclado, enfoca la búsqueda y
  devuelve el foco al selector.
- Live persiste la selección ordenada en `profiles.goals`; `goals[0]` se refleja
  en `goal` para clientes legacy. `secondaryGoals` representa el resto de
  prioridades normalizadas. El editor abierto desde onboarding vuelve
  explícitamente al tab Rutinas.
- `src/lib/weeklyStreak.ts` deriva días y racha desde historial +
  `weeklyGoalDays`: semana local lunes–domingo, días únicos y gracia para la
  semana actual incompleta. Store, logros y UI consumen esa misma fuente; el
  layout raíz la recalcula tras hidratación, foreground, cambios de meta e
  historial local/remoto para cubrir rollover semanal y sincronización.
- El payload v2 de `gmo:achievements:v1` elimina solo tiers `streak-*` heredados
  y los re-siembra en silencio con la regla nueva; conserva fechas de otros logros.
- Los contratos puros viven en `src/lib/__tests__/` y usan Jest + `jest-expo`.
- El Feed usa `StaticPullToRefresh`: el gesto conserva la lista inmóvil y no muestra
  indicador animado;
  la FlashList mantiene offset, la activación manual cede intención horizontal
  al `PagerView`, y la propia lista expone una acción accesible `Actualizar feed`
  sin sumar un botón visual. Foreground/paginación no comparten el estado manual.
  El indicador usa `gmo-mark-transparent.png`, completa una sola vuelta aunque la
  respuesta termine antes y queda estático con Reduce Motion.
- `completeSetAndCarryWeightById` completa la serie y copia su peso a la siguiente
  serie laboral pendiente en un único snapshot persistido antes del descanso.
  `getCarriedWeightForSet` conserva el fallback de entrada. Ambos usan IDs
  estables, no cruzan ejercicios y respetan targets editados o completados.
- Riesgo live P0: `public.recalc_weekly_ranks()` es `SECURITY DEFINER`, ejecutable
  desde Data API y no idempotente; además usa seis tiers legacy. La remediación
  exige reconciliar el ledger, revocar ACLs, deduplicar por semana y alinear nueve
  umbrales antes de cualquier despliegue.
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

El routing se decide por impacto, no por una cadena fija:

| Agente | Ownership |
|---|---|
| `codebase-explorer` | Localizar contratos y consumidores; read-only |
| `gmo-visual-director` | Brief, jerarquía, estados, allowlist; read-only |
| `react-native-ui-engineer` | Presentación Expo/RN dentro de allowlist |
| `motion-performance-engineer` | Reanimated, gestos, haptics y motion medido |
| `mobile-visual-qa` | Screenshots, estados, dispositivos y accesibilidad; read-only |
| `react-native-performance-auditor` | FPS/renders/imágenes/bundle; read-only |
| `supabase-fullstack-engineer` | Auth, repos, queries, stores, Supabase y privacidad |
| `build-verify` | Gates automatizados; nunca declara smoke físico |
| `code-quality-reviewer` | Bugs, seguridad, lifecycle y arquitectura; read-only |

Skills reutilizables contienen reglas compartidas; los agentes no las copian:
`gmo-domain-guardrails`, `gmo-mobile-product-design`,
`gmo-fitness-social-art-direction`, `gmo-motion-language`,
`mobile-visual-accessibility`, `react-native-performance`,
`mobile-visual-qa` y `gmo-mobile-assets`.

## Orden de ejecución

- **Visual puro:** explorer → director → UI → motion si aporta → QA visual →
  auditor de rendimiento → build → reviewer.
- **Cross-layer:** explorer → Supabase fullstack define contrato seguro → UI →
  QA/build/reviewer.
- Visuales no editan `supabase/**`, auth, repos, queries, stores, Query keys,
  persistencia, buckets ni privacidad. Escalan con payload de boundary.

## Cuándo romper las reglas

Casi nunca. Excepciones documentadas:

- **Inicialización de Supabase client** en `src/lib/supabase.ts` —
  obvio, es donde se crea
- **Subscripción a `onAuthStateChange`** en `src/lib/auth/session.ts` —
  necesita acceso directo al cliente
- **Realtime subscriptions** (cuando se añadan) — único punto donde
  el frontend puede importar `supabase` directo, vía un hook
  específico en `src/lib/realtime/`
