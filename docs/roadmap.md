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
| Ejercicios personalizados | P1 | M | ✅ Aplicada 2026-07-24 — migración con policies UPDATE/DELETE (INSERT/SELECT ya existían), `src/lib/repos/queries/exercises.ts`, `CreateExerciseSheet` wireado en el editor de rutina, `ExercisePickerSheet` mezcla catálogo estático + custom con badge "Tuyo". `updateCustomExercise`/`deleteCustomExercise` están en el repo pero sin UI de edición/borrado todavía — pendiente. |
| Plate calculator, supersets, warm-up sets automáticos | P1 | S/M cada uno | Plate calculator ✅ 2026-07-12 (ver C2-8 de roadmap-ui.md); supersets y warm-up automáticos siguen pendientes. |
| Rutinas públicas / compartibles | P1 | M–L | ✅ Aplicada 2026-07-24 — toggle Privada/Pública + explorador de solo lectura (`app/routine/explore.tsx`, `app/routine/public/[id].tsx`); RLS de lectura cruzada ya estaba completa en `0001_init.sql`, sin migración nueva. Deliberadamente sin "adoptar/guardar" una rutina ajena — el store local sigue asumiendo una sola rutina activa por usuario (`upsertRoutine` reemplaza el array si el id es nuevo); resolver eso queda como deuda para un sprint futuro antes de poder ofrecer un marketplace real. |
| OAuth Apple/Google real | P1 | M | Hoy es placeholder "Próximamente". Nota App Store: si hay login con Google, Apple exige Sign in with Apple. |

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
