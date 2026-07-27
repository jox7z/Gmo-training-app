# Roadmap — Gmo Training App

> **Fecha:** 2026-07-07 · **Base:** v0.1.0, rama `feat/initial-app-foundation`
>
> **Leyenda de prioridad:** P0 (crítico) · P1 (importante) · P2 (deseable)
> **Leyenda de esfuerzo:** S (<1/2 día) · M (1–3 días) · L (1+ semana)
>
> Tres pistas paralelas: **Pista A** = tooling de agentes Claude Code · **Pista B** = producto · **Pista C** = UI/UX (ver [roadmap-ui.md](roadmap-ui.md)).

---

## 1. Estado actual (resumen)

### Fortalezas ya cubiertas

- Tracking set-by-set con rest timer y detección de PRs
- Historial de entrenamientos
- Body tracking (peso + composición corporal)
- Gráficas SVG propias
- Plantillas de rutinas famosas
- 220 ejercicios con imágenes
- Feed social completo: posts con foto, reacciones, comentarios, realtime, follow
- Ranking con 9 rangos + rachas + heatmap anual
- Comunidades con roles
- Eventos/retos con leaderboard

### Limitaciones transversales

- ~~**Cero tests** — sin test runner ni cobertura alguna~~ → ✅ 2026-07-17: runner jest-expo + 7 suites de lib pura (54 tests); componentes/stores/repos siguen sin cubrir. + ✅ 2026-07-23: 8ª suite (`queryState.test.ts`, 5 tests) para el nuevo hook `useQueryState` — 59 tests en total
- **Español hardcodeado** — sin i18n
- **Corre en Expo Go** — limita push notifications y módulos nativos
- ~~Dependencias y código sin usar~~ → ✅ 2026-07-23: `zod` (sin ninguna referencia) quitado de `dependencies`, `@expo/ngrok` movido a `devDependencies`; módulo `src/lib/routineGenerator.ts` y componente `src/components/ActivityCard.tsx` eliminados (huérfanos, sin call sites); `console.log` de depuración retirados de `app/_layout.tsx`, `src/store/app.ts`, `app/(tabs)/_layout.tsx` y `app/index.tsx`; `FIXES_ROUND_2.md` (documento de trabajo ya completado) eliminado

---

## 2. Pista A — Tooling de agentes

| Fase | Prioridad | Esfuerzo | Estado |
|---|---|---|---|
| A1 — Higiene de nombres | P0 | S | ✅ Aplicada 2026-07-07 |
| A2 — Permisos y tools | P0 | S | ✅ Aplicada 2026-07-07 |
| A3 — Consolidación | P1 | M | ✅ Aplicada 2026-07-24 |
| A4 — Skills y agentes nuevos | P1–P2 | M | Pendiente (la skill de testing quedó DESBLOQUEADA por el runner de B3, 2026-07-17) |

### Fase A1 — Higiene de nombres (P0, S) — ✅ APLICADA 2026-07-07

- `CLAUDE.md` referenciaba agentes inexistentes (`fullstack-supabase`, `code-reviewer`)
- `codebase-navigator.md` renombrado a `codebase-explorer.md`

### Fase A2 — Permisos y tools (P0, S) — ✅ APLICADA 2026-07-07

- `code-quality-reviewer` recortado a Glob/Grep/Read/Bash (llevaba Gmail/Calendar/Drive/Cron/PowerShell sin usarlos)
- `supabase-fullstack-engineer` con `tools:` explícito (heredaba TODO)
- `build-verify` con PowerShell
- `settings.local.json` sin permisos MCP Supabase stale

### Fase A3 — Consolidación (P1, M) — ✅ APLICADA 2026-07-24

- Metodología de `codebase-explorer` reescrita en términos de Glob/Grep reales (citaba `grep -rn`/`find` sin tener shell)
- Bloque "Persistent Agent Memory" (137 líneas casi idénticas en `code-quality-reviewer` y `supabase-fullstack-engineer`) extraído a `.claude/agent-memory/PROTOCOL.md`, referenciado desde ambos
- `.claude/skills/caveman.md` canonizado con el texto real de 6 líneas que ya usan los 4 agentes (antes tenía una versión genérica distinta, huérfana); cada agente sigue con el bloque inlineado (no todos tienen la tool `Skill`) más una nota de sincronización
- `docs/skills/agents/{backend,frontend,reviewer,supabase}.md` + `docs/skills/workflow.md` marcados como legado (banner + cross-reference a los 4 agentes reales); `docs/README.md` actualizado para no seguir apuntando a la identidad vieja

### Fase A4 — Skills y agentes nuevos (P1–P2, M)

- Crear `.claude/launch.json` + skill de preview/verificación visual de Expo
- Skill de migraciones Supabase orquestada (`apply_migration` → `get_advisors` → `generate_typescript_types` vía MCP)
- Skill de testing — ~~BLOQUEADA por B3~~ **DESBLOQUEADA 2026-07-17**: ya existe runner (jest-expo, `npm test`, convención `src/lib/__tests__/` + `fixtures.ts`)
- Agentes sonnet backend/frontend para paralelizar features (ya especificados en `docs/skills/agents/`)
- Retirar o adaptar `.claude/skills/frontend-design.md` (está escrita para web HTML/CSS, no aplica a RN)

---

## 3. Pista B — Producto

Priorizada por **retención**, comparado con Strong/Hevy/Fitbod/Strava.

### Fase B1 — Quick wins de retención (Sprint 1–2)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Push notifications (expo-notifications) | P0 | L | Desbloquea re-engagement social (likes/comentarios/seguidores) y el rest timer con notificación. **OJO:** desde SDK 53 el push remoto NO funciona en Expo Go → requiere development build (EAS); planificar ese salto aquí y alinearlo con Sentry y OAuth. El mismo salto desbloquea el Tier 2 visual (fase C3 de la Pista C). |
| Rest timer que sobrevive background + notificación local | P0 | M | Cambiar tick por timestamps; depende de expo-notifications. Bug conocido: el cronómetro actual no se pausa al ir a background. |
| Pantalla Records/PRs dedicada + 1RM estimado (Epley/Brzycki) | P0 | M | ✅ Aplicada 2026-07-11 — `src/lib/oneRepMax.ts` (Epley/Brzycki) + `app/records.tsx` (toggle de fórmula, unidades del perfil), enlazada desde el tab Logros del perfil. |
| Sentry (crash reporting) mínimo | P1 | S | Instrumentar antes de crecer. |

### Fase B2 — Diferenciadores (Sprint 3–5)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| GIFs/videos de ejercicios | P1 | M (UI) + L (contenido) | Columna `exercises.gif_url` ya en schema, vacía y sin UI; poblar 220 ejercicios es pipeline de contenido. |
| Ejercicios personalizados | P1 | M | ✅ Aplicada 2026-07-24 — migración con policies UPDATE/DELETE (INSERT/SELECT ya existían), `src/lib/repos/queries/exercises.ts`, `CreateExerciseSheet` wireado en el editor de rutina, `ExercisePickerSheet` mezcla catálogo estático + custom con badge "Tuyo". · ✅ 2026-07-24 (sprint 8) — UI de editar/borrar: `useUpdateCustomExercise` nuevo en `queries/exercises.ts`, `CreateExerciseSheet` gana modo edición (prop `exercise`), long-press en `ExercisePickerSheet` sobre ítems propios abre action sheet (Editar/Eliminar/Cancelar) con confirm modal para borrar; cache de módulo (`data/exercises.ts`) gana `updateCustomExerciseInCache`/`removeCustomExerciseFromCache` para no quedar desincronizado. |
| Plate calculator, supersets, warm-up sets automáticos | P1 | S/M cada uno | Plate calculator ✅ 2026-07-12 (ver C2-8 de roadmap-ui.md). Warm-up sets automáticos ✅ 2026-07-24 (sprint 8) — `src/lib/warmupSets.ts` (`suggestWarmupSets`, rampa 40/60/80% del peso previo, 6 tests), método `addWarmupSets` en el store de workouts (prepend `isWarmup:true`), chip "Calentamiento" en `SetPhase` (solo antes de la 1ª serie, oculto en `bodyweight`) que abre `WarmupSuggestionSheet`. Supersets ✅ MVP 2026-07-24 (sprint 8) — pares de 2: columna `superset_group_id` en `routine_day_exercises`+`workout_exercises` (migración `0049_supersets.sql`, **aplicada al remoto**, índices parciales, sin cambio RLS — `get_advisors` limpio salvo INFO "unused_index" esperado sin datos aún), `supersetGroupId` en ambos stores + repos. Máquina de avance reescrita como secuencia de pasos pura (`src/lib/supersets.ts`, `buildStepSequence`/`findStepIndex`, 8 tests) que intercala rondas A1→B1→A2→B2 sin descanso intra-ronda. Editor de rutina: modo "Agrupar ejercicios" (selección de 2, mueve a contiguo, chip "Superset", desagrupar), `dissolveOrphanGroups` al borrar Y al re-agrupar (revisión de `code-quality-reviewer` encontró que re-emparejar un ejercicio que ya tenía pareja dejaba a la pareja vieja huérfana — arreglado). Entreno activo: `SupersetBadge` en SetPhase/LogPhase; `canAddWarmup` excluye miembros de superset (el algoritmo de rondas intercala por índice de set sin distinguir `isWarmup`, así que calentamiento + superset se desalineaban — diferido, no arreglado, mismo scope MVP); `swapExercise` limpia `supersetGroupId` del remanente completado al sustituir un ejercicio en vivo (evitaba fusionar 3 ejercicios en un solo grupo, otro hallazgo de la revisión). · ✅ 2026-07-24 (sprint 8) — **Trisets/circuitos (2–4 miembros)** + **warm-ups dentro de un superset**, 100% frontend (schema sin cambios: `superset_group_id` ya admite N filas): editor `app/routine/[id].tsx` con `MAX_GROUP_SIZE=4`, `groupSelected` reescrito para N (ancla + reinserción contigua del resto), chip dinámico Superset/Triset/Circuito vía `supersetLabel(size)` nuevo en `src/lib/supersets.ts`. Entreno activo: `partnerExercises[]` (filter, no find), `SupersetBadge` recibe `partnerNames: string[]` y adapta la etiqueta (lista acotada a 2 nombres + "y N más" para no desbordar el Chip con un circuito de 4). `buildStepSequence` reescrito: cada miembro hace sus propias series `isWarmup` primero (descanso normal, orden de miembro) y luego el round-robin sobre las series reales, con `setIdx` = índice REAL en `sets[]` (no nº de ronda) — desbloquea `canAddWarmup` para miembros de grupo (quitada la exclusión). 7 tests nuevos en `supersets.test.ts` (15 total: 3 de la fase de calentamiento + 4 de `dissolveNonContiguousGroups` en el fix de revisión de abajo; 84 tests en total del repo). Segunda revisión de `code-quality-reviewer` sobre este tramo encontró 4 hallazgos, los 4 arreglados antes de mergear: **(1) crítico** — agregar calentamiento a un miembro DESPUÉS de que el grupo ya avanzó recalcula `steps` desde cero y reordena pasos ya completados a una posición posterior (el usuario puede volver a una serie que ya registró); `canAddWarmup` ahora exige que TODO el grupo tenga cero progreso (`groupHasProgress`), no solo el ejercicio actual. **(2)** `dissolveOrphanGroups` (contaba ocurrencias globales de un `groupId`) no detectaba grupos que quedan con el mismo id pero YA NO contiguos al reagrupar un subconjunto de un grupo de 3+ — reemplazada por `dissolveNonContiguousGroups` (escanea corridas contiguas), compartida vía `src/lib/supersets.ts` entre el editor y el store. **(3)** `swapExercise` sobre un miembro DEL MEDIO de un grupo de 3-4 partía la corrida contigua en dos con el mismo id (el badge mostraba "compañeros" que ya no compartían round-robin) — ahora corre el resultado por `dissolveNonContiguousGroups` también. **(4)** `SupersetBadge` sin tope de nombres — arreglado (ver arriba). · ✅ 2026-07-24 (sprint 8) — **Descanso intra-grupo + editar membresía sin deshacer + bracket en header** (migración `0050_superset_group_rest.sql`: columna `group_rest_enabled boolean not null default false` en `routine_day_exercises`+`workout_exercises`, **aplicada al remoto** — confirmada vía `list_migrations`, `get_advisors` sin hallazgos nuevos). **(F) Descanso intra-grupo medido, no prescrito:** `groupRestEnabled` en ambos stores + repos (mapeo `group_rest_enabled`), `buildStepSequence` fuerza `closesRound:true` en TODAS las series del round-robin cuando el flag del grupo está activo (dispara el mismo flujo de descanso autopausado entre miembros; no es un temporizador — nunca se prescribe/recomienda un valor, se sigue midiendo `restAfterSeconds` como siempre). Chip entre miembros ahora pulsable (`toggleGroupRest`): etiqueta "· con descanso" + icono `clock`/`link` + variante solid/outline (con `selected` para que el estado sea visible, no solo el fondo gris casi imperceptible). `swapExercise` y `handleWarmupDone` heredan el flag. **(G) Editar membresía sin deshacer:** `ungroupPair` reemplazado por `removeFromGroup(exId)` (saca SOLO ese ejercicio, `dissolveNonContiguousGroups` disuelve al compañero restante si el par queda en <2) y `addToGroup` (botón "+" en el último miembro de un grupo sub-tope; reusa el mismo `ExercisePickerSheet` vía `handlePickerSelect`, hereda `groupRestEnabled`, inserta contiguo al último miembro). **(H) Bracket en header:** `WorkoutHeader.segments` gana `groupId?`; `computeGroupBrackets` escanea corridas contiguas y dibuja una franja fina bajo la barra por cada superset. 5 tests nuevos en `supersets.test.ts` (89 total del repo). Tercera revisión de `code-quality-reviewer` sobre este tramo encontró 3 hallazgos reales (más una falsa alarma de migración "sin aplicar" causada por texto de docs desactualizado — sí estaba aplicada), los 3 arreglados: `toggleGroupRest`/`groupSelected`/`dissolveNonContiguousGroups` podían dejar `groupRestEnabled` divergente entre miembros del mismo grupo (yo mismo lo encontré y arreglé antes de despachar la revisión: dissolve limpia también el flag, `groupSelected` lo resetea a `false` explícito, `toggleGroupRest` fija un valor único en vez de negar por miembro); `swapExercise` no limpiaba `groupRestEnabled` del remanente completado (mismo patrón, arreglado); Chip de "con descanso" sin prop `selected` (arreglado, ver arriba). Además: pasada de saneo defensivo (`dissolveNonContiguousGroups`) al cargar una rutina en el editor y al construir una sesión activa, por si datos guardados antes de estos fixes quedaron con un `supersetGroupId` no-contiguo. · ✅ **Drag & drop** 2026-07-24 — reordenar libremente los ejercicios del día en el editor (`app/routine/[id].tsx`), 100% frontend, sin cambio de schema (el orden es el índice del array al guardar). Spike de compatibilidad OK: **react-native-reorderable-list** `0.18.1` (Tier 1 Expo Go, ver `docs/memory/visual-stack.md`) — peers cubiertos por Reanimated 4 + gesture-handler 2.28, sin config babel/metro. `NestedReorderableList scrollable={false}` dentro de `ScrollViewContainer` (reemplaza el `ScrollView` del formulario, un solo scroll compartido, sin conflicto de gestos), `ExerciseRow` extraído con handle `grip` a la izquierda (único elemento arrastrable, `useReorderableDrag` vía long-press) oculto en modo agrupar (`dragEnabled={!groupMode}`), `entering`/`layout` de Reanimated quitados de la fila (para no competir con el motor de drag). `handleReorder` pasa `reorderItems(...)` por `dissolveNonContiguousGroups` (si el drag separa a un miembro de su grupo, se disuelve solo, sin confirm). Icono `grip`→`GripVertical` añadido a `src/components/Icon.tsx`. Cuarta revisión de `code-quality-reviewer` sobre este tramo encontró 1 hallazgo crítico nuevo, específico del drag (ninguna vía previa —agrupar/quitar/swap— podía producirlo): `dissolveNonContiguousGroups` solo chequeaba longitud de corrida, no si un `groupId` ya había sido "cerrado" por una corrida anterior — arrastrar un ejercicio ajeno justo al MEDIO de un circuito de 4 lo parte en dos pares de 2 que sobreviven el chequeo (≥2 cada uno) pero siguen compartiendo id, así que `toggleGroupRest`/`groupSizes`/el chip (que matchean por VALOR, no por contigüidad) tratarían dos grupos visualmente separados como uno solo. La mecánica del entreno activo NO se veía afectada (`buildStepSequence` ya re-escanea por contigüidad desde cero, trata cada corrida como grupo independiente sin importar el id) — el bug era puramente del editor. Arreglado: `dissolveNonContiguousGroups` ahora lleva un `Set` de ids ya vistos y reasigna un `uuidv4()` nuevo a cualquier corrida ≥2 que reutilice un id de una corrida anterior no contigua. 1 test nuevo (90 total del repo). Verificado: typecheck/lint/90 tests verdes + `expo export` (bundle Android OK); el gesto de arrastre en sí NO se pudo verificar en dispositivo real. Con esto se cierran los **6 ítems diferidos originales** de todo el sistema de supersets — no queda ningún diferido pendiente en esta fila. |
| Rutinas públicas / compartibles | P1 | M–L | ✅ Aplicada 2026-07-24 — toggle Privada/Pública + explorador de solo lectura (`app/routine/explore.tsx`, `app/routine/public/[id].tsx`); RLS de lectura cruzada ya estaba completa en `0001_init.sql`, sin migración nueva. Deliberadamente sin "adoptar/guardar" una rutina ajena — el store local sigue asumiendo una sola rutina activa por usuario (`upsertRoutine` reemplaza el array si el id es nuevo); resolver eso queda como deuda para un sprint futuro antes de poder ofrecer un marketplace real. |
| OAuth Apple/Google real | P1 | M | ✅ CÓDIGO LISTO 2026-07-26 (sprint 9) — activación pendiente de consolas externas, ver nota. Flujo **web-based** (no SDKs nativos, sigue en Expo Go): `signInWithOAuth` (Supabase) + `expo-web-browser` `openAuthSessionAsync` abre el consent screen en navegador embebido; cliente Supabase pasa a `flowType:'pkce'` (`src/lib/supabase.ts`) porque `detectSessionInUrl:false` ya existente exige intercambio manual — `src/lib/auth/oauth.ts` nuevo (`signInWithOAuth(provider)`) extrae `code`/`error` del redirect vía `Linking.parse` y llama `exchangeCodeForSession`; polyfill de `crypto.getRandomValues` (expo-crypto) porque Hermes no trae `crypto` global y supabase-js lo necesita para el verifier PKCE. `OAuthButtons.tsx` reemplaza el `Alert.alert` placeholder por loading por botón + `onError` hacia `login.tsx`/`signup.tsx` (mismo mecanismo de error que ya usaban para email/password). Sin cambios en `app/_layout.tsx` (el listener `onAuthStateChange` ya redirige por `is_profile_complete` sin importar el provider) ni en `profiles` (no se agrega `authProvider` — Supabase ya lo trackea server-side en `auth.identities`, sin uso de UI que lo requiera hoy). `supabase/config.toml`: `auth.external.{apple,google}.enabled=true` + `gmo://auth/callback` en `additional_redirect_urls` (paridad de docs, el proyecto remoto real se configura aparte). Nuevas deps `expo-auth-session`/`expo-crypto` (JS puras, Expo Go OK). Verificado: typecheck/lint/90 tests verdes (sin tests nuevos — código de red/UI, no lib pura). **Bloqueo real, no de código:** requiere que el usuario complete Google Cloud Console + Apple Developer (cuenta paga) + pegar credenciales en el Dashboard de Supabase (guía paso a paso entregada aparte) — sin eso, tocar un botón produce un error "provider is not enabled" ya humanizado (`humanizeAuthError`), no un crash. No es un ✅ completo hasta verificar un login real end-to-end. Nota App Store: Apple guideline 4.8 (login con Google exige ofrecer Sign in with Apple) ya cubierta — Apple solo se renderiza en iOS. Revisión adversarial vía `Workflow` (3 revisores por dimensión + verificación independiente de cada hallazgo) encontró **7 hallazgos reales, ninguno refutado** — los 7 arreglados antes de commitear: **(1) crítico** — Expo Go no soporta de forma fiable el redirect OAuth de scheme personalizado (`Linking.createURL` devuelve `exp://<ip-lan>:<puerto>` dinámico, que el allow-list de Supabase no matchea de forma confiable ni con wildcards — confirmado por docs oficiales de Expo + issue conocido de `supabase/auth`); en vez de un "cancelado" mudo, `signInWithOAuth` ahora detecta Expo Go (`Constants.executionEnvironment === ExecutionEnvironment.StoreClient`) y lanza un error claro pidiendo una development build. **(2)** errores de provider (`access_denied` al rechazar consentimiento, u otros códigos OAuth2 crudos) pasaban sin traducir por `humanizeAuthError` — ahora `access_denied` se trata como cancelación silenciosa (igual que cerrar el navegador) y cualquier otro error usa un mensaje genérico fijo en español (`OAUTH_GENERIC_ERROR`). **(3)** faltaba `WebBrowser.maybeCompleteAuthSession()` (requerido por Expo para el target web, `npm run web`) — sin él el popup no se autocierra y la promesa de `openAuthSessionAsync` no resuelve. **(4)** `redirectTo` apuntaba a `/auth/callback`, ruta inexistente en el router — si el redirect no era interceptado por `openAuthSessionAsync` (ej. Android mata el proceso durante el salto al navegador), el `code` se perdía en la pantalla "unmatched route" sin aviso; se agregó `app/auth/callback.tsx` como red de seguridad (canjea el `code` vía `exchangeOAuthCode`, extraído de `oauth.ts`; la navegación post-éxito la sigue haciendo el gating centralizado de `_layout.tsx`, sin duplicarla). **(5)** comentario agregado documentando que `gmo://` no es un scheme exclusivo en Android pero el robo de sesión ya está mitigado por PKCE. **(6)** `OAuthButton` usaba `Pressable` desnudo sin encajar en ninguna excepción documentada de la convención de `PressableScale` — reemplazado. **(7)** el estado "OAuth en curso" no llegaba al padre, dejando el botón de submit de email/password habilitado durante el canje PKCE en vuelo (dos flujos de auth concurrentes) — `OAuthButtons` gana `onBusyChange`, incorporado a `canSubmit` en `login.tsx`/`signup.tsx`. **Decisión explícita del usuario:** verificar el login end-to-end en dispositivo real no es posible hoy (bloqueado por la limitación de Expo Go del hallazgo #1, no solo por faltar credenciales) — queda diferido al salto a development build (mismo salto ya previsto para push notifications, ver nota de Fase B3 más abajo); esto no bloquea dar el tramo por cerrado a nivel de código. |

### Fase B3 — Plataforma y escala (Sprint 6+)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Analytics de producto (PostHog) | P1 | M | Necesario antes de decidir paywall. |
| Tests (Jest + RN Testing Library) | P1 | M inicial, continuo | ✅ PARCIAL 2026-07-17 — runner jest-expo (config en bloque `"jest"` de package.json, alias `@/*`, `testMatch` solo `__tests__/*.test.ts`) + 7 suites de lib pura (units, oneRepMax, plates, workoutCompare, optimizationScore, achievements, exerciseProgress — 54 tests) con `fixtures.ts` compartido. Desbloquea la skill de testing (A4). PENDIENTE: RN Testing Library para componentes; stores/repos. |
| Monetización (RevenueCat/IAP) | P1–P2 | L | Tras analytics; Strong/Hevy/Fitbod monetizan con Pro. |
| i18n (extraer strings) | P2 | M–L | Hacerlo antes de que crezca la superficie abarata el costo. |
| Wearables / HealthKit / Google Fit | P2 | L | Requiere dev build; diferenciador de Strava. |
| OTA updates (EAS Update) | P1 | S/M | Ya previsto en sprint 7 de docs. Splash/iconos reales y skeletons pasan a la **Pista C** (fases C1/C2 de [roadmap-ui.md](roadmap-ui.md)) — no trackear doble. |

### Deuda conocida (relleno de sprint, S cada una)

De `docs/memory/checklist.md`:

- ~~Generador IA usa heurística local en vez de la edge function~~ → ✅ 2026-07-23: `src/lib/routineGenerator.ts` no tenía ningún call site en `app/` ni `src/` (ni tampoco la edge function `generate_routine` desde el cliente) — era código huérfano, no una feature wireada con una limitación conocida; se eliminó. Las plantillas de rutina (`app/routine/templates.tsx`, onboarding) usan `famousRoutineOptions()` de `src/data/routineTemplates.ts`, que no dependía del generador.
- ~~Racha no estricta 1x día~~ → ✅ 2026-07-24: `streakWeeks`/`daysThisWeek` (contador congelado desde onboarding, nunca se recalculaba) eliminados de `src/store/app.ts`; la racha se deriva siempre desde el historial vía `weekStreakFromHistory`/`daysThisWeekFromHistory` en `src/lib/achievements.ts` — dedup automático por fecha calendario, sin contador redundante que desincronizar.
- ~~Sin validación de "workout válido" antes de guardar~~ → ✅ 2026-07-24: `isValidWorkout` en `src/lib/workoutGuards.ts` (≥1 set completado no-warmup, sin reps≤0 ni peso negativo) bloquea el cierre del entreno en `app/workout/active.tsx` con un `Alert`; CHECK constraints espejo en DB (migración `0047_workout_sets_check_constraints.sql`, aplicada).
- ~~Redondeo KG↔LB en workout activo~~ → ✅ 2026-07-24: `fromDisplay` en `src/lib/units.ts` redondea a 2 decimales (precisión `numeric(6,2)` de la DB), eliminando el ruido de float del round-trip kg↔lb.
- ~~El generador reemplaza la rutina activa sin confirmar~~ → ✅ 2026-07-23: moot, ver nota anterior (el generador nunca estuvo conectado a ninguna pantalla)

**⚠️ Nota operativa 2026-07-24 — drift de migraciones:** al aplicar la migración de este sprint se encontró que el proyecto Supabase vivo (`fonaipdjgiahypcittxo`) ya tenía las migraciones `0041_sync_workout_snapshot` a `0046_fix_workout_pr_total_order` aplicadas, sin que sus archivos `.sql` estuvieran commiteados en ningún branch de este repo — viven sin commitear en el checkout raíz (`D:\Gmo\Gmo-training-app`, rama `feat/initial-app-foundation`, trabajo ajeno a este sprint). Las migraciones nuevas de este sprint se renumeraron a `0047`/`0048` para no colisionar. Pendiente: commitear esos 6 archivos `.sql` en algún branch antes de que alguien más pierda tiempo re-descubriendo el mismo drift.

### Cierre pendiente — Coach IA (P0, S) — ✅ CERRADO 2026-07-11

- La migración `0040_drop_ai_coach` **ya está aplicada en el Supabase live** (verificado vía MCP 2026-07-07): las tablas `ai_*` ya no existen en la DB
- El borrado en código + el archivo de la migración 0040 se commitearon en `feat/initial-app-foundation` (2026-07-11); CLAUDE.md documenta la retirada

---

## 4. Pista C — UI/UX

Estudio comparativo de UI/UX contra Strong, Hevy, Fitbod y Strava (benchmark de 8 dimensiones por fuentes públicas) + roadmap visual en 4 fases: **C0** quick wins sin librerías, **C1** assets críticos (icono/splash/emblemas de rango — hoy placeholders), **C2** adopción Tier 1 compatible con Expo Go, **C3** Tier 2 (gated por el mismo salto a dev build que push B1).

**Detalle completo: [roadmap-ui.md](roadmap-ui.md).** Catálogo de librerías y exclusiones: [memory/visual-stack.md](memory/visual-stack.md).

---

## 5. Secuencia sugerida y dependencias cruzadas

- **Sprint 0 (hecho 2026-07-07):** quitar animaciones de perfil (logros/entrenamientos), este roadmap, fases A1+A2.
- **Push es la dependencia raíz:** desbloquea rest timer background y re-engagement, y fuerza el salto Expo Go → development build, que conviene aprovechar para Sentry y OAuth en el mismo salto. **Dev build es dependencia compartida de B1-push y C3-Tier 2 visual.**
- **Tests (B3) desbloquean la skill de testing (A4).** `launch.json` (A4) desbloquea verificación visual asistida.
- **Regla de oro:** cada feature social nueva debe alimentar el loop de retención (notificación → volver a la app → registrar entreno → compartir).
