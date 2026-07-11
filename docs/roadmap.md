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
- Generador de rutinas

### Limitaciones transversales

- **Cero tests** — sin test runner ni cobertura alguna
- **Español hardcodeado** — sin i18n
- **Corre en Expo Go** — limita push notifications y módulos nativos

---

## 2. Pista A — Tooling de agentes

| Fase | Prioridad | Esfuerzo | Estado |
|---|---|---|---|
| A1 — Higiene de nombres | P0 | S | ✅ Aplicada 2026-07-07 |
| A2 — Permisos y tools | P0 | S | ✅ Aplicada 2026-07-07 |
| A3 — Consolidación | P1 | M | Pendiente |
| A4 — Skills y agentes nuevos | P1–P2 | M | Pendiente (testing bloqueada por B3) |

### Fase A1 — Higiene de nombres (P0, S) — ✅ APLICADA 2026-07-07

- `CLAUDE.md` referenciaba agentes inexistentes (`fullstack-supabase`, `code-reviewer`)
- `codebase-navigator.md` renombrado a `codebase-explorer.md`

### Fase A2 — Permisos y tools (P0, S) — ✅ APLICADA 2026-07-07

- `code-quality-reviewer` recortado a Glob/Grep/Read/Bash (llevaba Gmail/Calendar/Drive/Cron/PowerShell sin usarlos)
- `supabase-fullstack-engineer` con `tools:` explícito (heredaba TODO)
- `build-verify` con PowerShell
- `settings.local.json` sin permisos MCP Supabase stale

### Fase A3 — Consolidación (P1, M)

- Reescribir la metodología de `codebase-explorer` en términos de Glob/Grep (hoy cita `grep -rn`/`find` sin tener shell)
- Extraer el bloque "Persistent Agent Memory" (~130 líneas duplicadas en 2 agentes) a doc única referenciada
- Consolidar el estilo caveman (copiado en 4 agentes + skill + 4 docs de rol) en una sola fuente: `.claude/skills/caveman.md`
- Reconciliar `docs/skills/agents/` (describe 4 roles Supabase/Backend/Frontend/Revisor) con los 4 agentes reales (`build-verify`, `codebase-explorer`, `code-quality-reviewer`, `supabase-fullstack-engineer`)

### Fase A4 — Skills y agentes nuevos (P1–P2, M)

- Crear `.claude/launch.json` + skill de preview/verificación visual de Expo
- Skill de migraciones Supabase orquestada (`apply_migration` → `get_advisors` → `generate_typescript_types` vía MCP)
- Skill de testing — **BLOQUEADA por B3**: primero debe existir test runner
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
| Ejercicios personalizados | P1 | M | `exercises.is_custom`/`created_by` ya en schema, sin flujo de creación en UI. |
| Plate calculator, supersets, warm-up sets automáticos | P1 | S/M cada uno | Detalles que Strong/Hevy tienen y fidelizan. |
| Rutinas públicas / compartibles | P1 | M–L | `routines.is_public` existe sin UI; marketplace de rutinas después (P2). |
| OAuth Apple/Google real | P1 | M | Hoy es placeholder "Próximamente". Nota App Store: si hay login con Google, Apple exige Sign in with Apple. |

### Fase B3 — Plataforma y escala (Sprint 6+)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Analytics de producto (PostHog) | P1 | M | Necesario antes de decidir paywall. |
| Tests (Jest + RN Testing Library) | P1 | M inicial, continuo | Empezar por lib pura: `src/lib/workoutCompare.ts`, `src/lib/units.ts`. Desbloquea la skill de testing (A4). |
| Monetización (RevenueCat/IAP) | P1–P2 | L | Tras analytics; Strong/Hevy/Fitbod monetizan con Pro. |
| i18n (extraer strings) | P2 | M–L | Hacerlo antes de que crezca la superficie abarata el costo. |
| Wearables / HealthKit / Google Fit | P2 | L | Requiere dev build; diferenciador de Strava. |
| OTA updates (EAS Update) | P1 | S/M | Ya previsto en sprint 7 de docs. Splash/iconos reales y skeletons pasan a la **Pista C** (fases C1/C2 de [roadmap-ui.md](roadmap-ui.md)) — no trackear doble. |

### Deuda conocida (relleno de sprint, S cada una)

De `docs/memory/checklist.md`:

- Generador IA usa heurística local en vez de la edge function
- Racha no estricta 1x día
- Sin validación de "workout válido" antes de guardar
- Redondeo KG↔LB en workout activo
- El generador reemplaza la rutina activa sin confirmar

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
