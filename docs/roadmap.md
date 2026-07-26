# Roadmap — Gmo Training App

> **Fecha base:** 2026-07-07 · **Última revisión:** 2026-07-22 · **Base:** v0.1.0, rama `feat/initial-app-foundation`
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
- Feed social completo: stream edge-to-edge, fotos 4:5, reacciones, comentarios, realtime y follow
- Ranking con 9 rangos + rachas + heatmap anual
- Comunidades con roles
- Eventos/retos con leaderboard
- Generador de rutinas
- Logros offline por niveles con celebraciones

### Limitaciones transversales

- **Tests puros iniciales** — Jest/Expo, 49 contratos en 7 suites; falta UI/integración
- **Español hardcodeado** — sin i18n
- **Corre en Expo Go** — limita push notifications y módulos nativos

---

## 2. Pista A — Tooling de agentes

| Fase | Prioridad | Esfuerzo | Estado |
|---|---|---|---|
| A1 — Higiene de nombres | P0 | S | ✅ Aplicada 2026-07-07 |
| A2 — Permisos y tools | P0 | S | ✅ Aplicada 2026-07-07 |
| A3 — Consolidación | P1 | M | Pendiente |
| A4 — Skills y agentes nuevos | P1–P2 | M | En curso: testing base listo; preview/migraciones pendientes |

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
- ✅ Caveman permanente y centralizado en `.claude/skills/caveman.md`; prompts y
  workflow solo lo referencian
- Reconciliar `docs/skills/agents/` (describe 4 roles Supabase/Backend/Frontend/Revisor) con los 4 agentes reales (`build-verify`, `codebase-explorer`, `code-quality-reviewer`, `supabase-fullstack-engineer`)

### Fase A4 — Skills y agentes nuevos (P1–P2, M)

- Crear `.claude/launch.json` + skill de preview/verificación visual de Expo
- Skill de migraciones Supabase orquestada (`apply_migration` → `get_advisors` → `generate_typescript_types` vía MCP)
- Skill de testing — desbloqueada: Jest/Expo ya existe con 49 contratos puros en 7 suites
- Agentes sonnet backend/frontend para paralelizar features (ya especificados en `docs/skills/agents/`)
- Retirar o adaptar `.claude/skills/frontend-design.md` (está escrita para web HTML/CSS, no aplica a RN)

---

## 3. Pista B — Producto

Priorizada por **retención**, comparado con Strong/Hevy/Fitbod/Strava.

### Fase B1 — Quick wins de retención (Sprint 1–2)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Push notifications (expo-notifications) | P0 | L | Desbloquea re-engagement social (likes/comentarios/seguidores) y el rest timer con notificación. **OJO:** desde SDK 53 el push remoto NO funciona en Expo Go → requiere development build (EAS); planificar ese salto aquí y alinearlo con Sentry y OAuth. El mismo salto desbloquea el Tier 2 visual (fase C3 de la Pista C). |
| 🟡 Rest timer que sobrevive background + notificación local | P0 | M | Timestamp ISO persistido y restauración completados 2026-07-19. Falta notificación local/lock screen con development build. |
| ✅ Rendimiento real por ejercicio + historial navegable | P0 | M | Completado 2026-07-22 con carga, repeticiones y tiempo reales; cada punto abre la sesión exacta. Trabajo queda solo en ledger/social factual. Se retiraron máximos estimados, prescripciones, deltas y veredictos automáticos. |
| Sentry (crash reporting) mínimo | P1 | S | Instrumentar antes de crecer. |

### Fase B2 — Diferenciadores (Sprint 3–5)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| GIFs/videos de ejercicios | P1 | M (UI) + L (contenido/licencia) | `hasaneyldrm/exercises-dataset` fue auditado: metadata MIT, media Gym visual excluida. No copiar imágenes/GIFs sin licencia propia. |
| Ejercicios personalizados | P1 | M | `exercises.is_custom`/`created_by` ya en schema, sin flujo de creación en UI. |
| 🟡 Plate calculator, supersets, warm-up sets automáticos | P1 | S/M cada uno | Plate calculator completado 2026-07-19; faltan supersets y warm-up automático. |
| 🟡 Tarjeta social factual de workout | P0 | M | Compositor/Feed, texto externo y metadata real completados 2026-07-22. Falta plantilla exportable como imagen con mapa muscular. |
| Rutinas públicas / compartibles | P1 | M–L | `routines.is_public` existe sin UI; marketplace de rutinas después (P2). |
| Exportación detallada a Strava | P1 | M–L | Desde 2026 Strava recibe ejercicios/series/reps/peso, genera muscle map y shareables. Hevy ya sincroniza el detalle completo; es un canal de distribución, no solo una integración decorativa. Requiere validar API y privacidad antes de implementar. |
| OAuth Apple/Google real | P1 | M | Hoy es placeholder "Próximamente". Nota App Store: si hay login con Google, Apple exige Sign in with Apple. |

### Fase B3 — Plataforma y escala (Sprint 6+)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Analytics de producto (PostHog) | P1 | M | Necesario antes de decidir paywall. |
| ✅ Tests Jest/Expo | P1 | M inicial, continuo | Base ampliada 2026-07-22: 11 suites/66 contratos puros. Siguiente: integración de stores y componentes críticos. |
| Monetización (RevenueCat/IAP) | P1–P2 | L | Tras analytics; Strong/Hevy/Fitbod monetizan con Pro. |
| i18n (extraer strings) | P2 | M–L | Hacerlo antes de que crezca la superficie abarata el costo. |
| Wearables / HealthKit / Google Fit | P2 | L | Requiere dev build; diferenciador de Strava. |
| OTA updates (EAS Update) | P1 | S/M | Ya previsto en sprint 7 de docs. Splash/iconos reales y skeletons pasan a la **Pista C** (fases C1/C2 de [roadmap-ui.md](roadmap-ui.md)) — no trackear doble. |

### Deuda conocida (relleno de sprint, S cada una)

De `docs/memory/checklist.md`:

- Generador de rutinas cae a la heurística local si la edge function falla o no está configurada
- ✅ Racha semanal derivada de días locales únicos + meta
- ✅ Validación de workout antes de guardar
- Redondeo KG↔LB en workout activo
- El generador reemplaza la rutina activa sin confirmar

### Coach IA — ✅ RETIRADO

- La migración `0040_drop_ai_coach.sql` eliminó los objetos `ai_*`
- Se retiraron pantalla, cliente, repos/queries y edge function del coach
- Los secretos de proveedores se conservan porque `generate_routine` los comparte
- La dirección actual es registrar historial/progreso y facilitar interacción social;
  no añadir guía de mejora, prescripción ni chat de coach

---

## 4. Pista C — UI/UX

Estudio comparativo de UI/UX contra Strong, Hevy, Fitbod y Strava (benchmark de 8 dimensiones por fuentes públicas) + roadmap visual en 4 fases: **C0** quick wins, **C1** assets críticos (icono/splash/emblemas completados 2026-07-19), **C2** adopción Tier 1 compatible con Expo Go, **C3** Tier 2 (gated por el mismo salto a dev build que push B1).

**Detalle completo: [roadmap-ui.md](roadmap-ui.md).** Catálogo de librerías y exclusiones: [memory/visual-stack.md](memory/visual-stack.md).

---

## 5. Secuencia sugerida y dependencias cruzadas

- **Sprint 0 (hecho 2026-07-07):** quitar animaciones de perfil (logros/entrenamientos), este roadmap, fases A1+A2.
- **Sprint C0 moderno (2026-07-19):** tokens tipográficos y de metales, primitivas UI, tab bar con feedback consistente y CTA de entreno desde Feed. Estado y verificación viven en [memory/checklist.md](memory/checklist.md).
- **Sprint social factual (2026-07-22):** tarjeta compartida compositor/Feed,
  metadata tipada, share externo con datos reales, publicación local monotónica y
  puntos de Progreso conectados al historial. La revisión endureció publicación
  contra doble toque, IDs stale, entradas parciales, almacenamiento corrupto y PR
  históricos comparados con sesiones futuras o timestamps empatados.
- **Sprint C2 stream social (2026-07-22):** Feed, compositor, muro comunitario,
  Eventos/Comunidades, preview y posts propios usan columna edge-to-edge; móvil
  ocupa todo el ancho, tablet centra a 600 px, fotos son 4:5 y el perfil público
  usa galería de 3 columnas. Sin dependencias ni cambios Supabase.
- **Sprint C2 secciones/skeleton (2026-07-22):** paneles informativos sin bordes
  laterales mediante `Card section`; Skeleton/SkeletonGroup interno adoptado en
  Feed, conexiones, publicaciones propias y peso. Sin dependencia ni cambio DB.
- **Sprint C2 selector de progreso (2026-07-22):** el carrusel plano fue sustituido
  por una fila compacta y picker buscable de ejercicios entrenados, con miniaturas
  WebP locales, recientes, más entrenados y filtros músculo/equipo. Las tendencias
  quedan en carga/reps/tiempo; Trabajo permanece solo en ledger/social factual.
  El sheet permanece fijo mientras solo cambia la lista filtrada. Sin dependencia
  ni cambio DB.
- **Push es la dependencia raíz:** desbloquea rest timer background y re-engagement, y fuerza el salto Expo Go → development build, que conviene aprovechar para Sentry y OAuth en el mismo salto. **Dev build es dependencia compartida de B1-push y C3-Tier 2 visual.**
- **Strava cambió el mercado de fuerza en 2026:** tratar exportación detallada + muscle-map/shareables como distribución orgánica; antes de construirla, completar shareables propios y definir privacidad por campo.
- **No copiamos la prescripción de Fitbod:** su progresión guiada no entra en el
  alcance actual; GMO registra datos y deja que el usuario interprete su historial.
- **Tests B3 ya desbloquearon la skill de testing A4.** `launch.json` (A4)
  sigue pendiente para verificación visual asistida.
- **Regla de oro:** cada feature social nueva debe alimentar el loop de retención (notificación → volver a la app → registrar entreno → compartir).
