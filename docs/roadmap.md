# Roadmap — Gmo Training App

> **Fecha base:** 2026-07-07 · **Última revisión:** 2026-07-29 · **Base:** v0.1.0, rama `feat/initial-app-foundation`
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
- Calendario mensual, mapa factual de hitos de fuerza y perfil compacto

### Limitaciones transversales

- **Tests puros** — Jest/Expo, 122 contratos en 20 suites; falta UI/integración
- **Español hardcodeado** — sin i18n
- **Corre en Expo Go** — limita push notifications y módulos nativos

---

## 2. Pista A — Tooling de agentes

| Fase | Prioridad | Esfuerzo | Estado |
|---|---|---|---|
| A1 — Higiene de nombres | P0 | S | ✅ Aplicada 2026-07-07 |
| A2 — Permisos y tools | P0 | S | ✅ Aplicada 2026-07-07 |
| A3 — Consolidación | P1 | M | ✅ Aplicada 2026-07-26 |
| A4 — Skills y agentes nuevos | P1–P2 | M | ✅ Sistema visual móvil aplicado; preview físico pendiente |

### Fase A1 — Higiene de nombres (P0, S) — ✅ APLICADA 2026-07-07

- `CLAUDE.md` referenciaba agentes inexistentes (`fullstack-supabase`, `code-reviewer`)
- `codebase-navigator.md` renombrado a `codebase-explorer.md`

### Fase A2 — Permisos y tools (P0, S) — ✅ APLICADA 2026-07-07

- `code-quality-reviewer` recortado a Glob/Grep/Read; ejecución pertenece a `build-verify`
- `supabase-fullstack-engineer` con `tools:` explícito (heredaba TODO)
- `build-verify` con PowerShell
- `settings.local.json` sin permisos MCP Supabase stale

### Fase A3 — Consolidación (P1, M) — ✅ APLICADA 2026-07-26

- `codebase-explorer` quedó read-only y alineado con Glob/Grep/Read.
- Boilerplate de memoria y reglas visuales duplicadas retirados de agentes.
- Caveman quedó como estilo/DoD; contratos de producto viven en skills separadas.
- `build-verify` automatiza gates; QA físico pertenece a `mobile-visual-qa`.
- `supabase-fullstack-engineer` entra por impacto real, no en cada cambio visual.

### Fase A4 — Skills y agentes nuevos (P1–P2, M) — ✅ APLICADA 2026-07-26

- Dirección visual, implementación RN, motion, QA y performance tienen ownership
  separado en cinco agentes.
- Skills móviles cubren producto, arte gym/social, motion, accesibilidad,
  rendimiento, QA, assets y guardrails de dominio.
- `frontend-design` queda limitado a web y redirige Expo/RN al contrato móvil.
- Skill de testing: Jest/Expo mantiene 122 contratos puros en 20 suites.
- Pendiente operativo: screenshots/smoke físico asistido; no existe control de
  dispositivo automatizado desde los agentes Markdown.

---

## 3. Pista B — Producto

Priorizada por **retención**, comparado con Strong/Hevy/Fitbod/Strava.

### Fase B1 — Quick wins de retención (Sprint 1–2)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Push notifications (expo-notifications) | P0 | L | Desbloquea re-engagement social (likes/comentarios/seguidores) y el rest timer con notificación. **OJO:** desde SDK 53 el push remoto NO funciona en Expo Go → requiere development build (EAS); planificar ese salto aquí y alinearlo con Sentry y OAuth. El mismo salto desbloquea el Tier 2 visual (fase C4 de la Pista C). |
| 🟡 Rest timer que sobrevive background + notificación local | P0 | M | Timestamp ISO persistido y restauración completados 2026-07-19. Falta notificación local/lock screen con development build. |
| ✅ Rendimiento real por ejercicio + historial navegable | P0 | M | Completado 2026-07-22 con carga, repeticiones y tiempo reales; cada punto abre la sesión exacta. Trabajo queda solo en ledger/social factual. Se retiraron máximos estimados, prescripciones, deltas y veredictos automáticos. |
| Sentry (crash reporting) mínimo | P1 | S | Instrumentar antes de crecer. |
| 🟡 Estabilidad pre-release | P0 | M | Checkpoint creado; perfil sin nested scroll, posts paginados y cache social coherente. Falta smoke físico, bundle final y reconciliar ledger Supabase. |
| 🟡 Privacidad de entrenos | P0 | M | Cliente y migración `0052`: Público/Seguidores/Privado con enforcement RLS/RPC. Repo-only hasta reconciliar ledger live; media restringida bloqueada mientras bucket sea público. |
| ✅ Dashboard personal | P1 | M | Perfil compacto con FlashList única, tabs sticky, FeedItem canónico, actividad factual, logros y menú Compartir/Ajustes. |
| ✅ Mapa + GMO Rating | P1 | M | Editor/Rutinas muestran radial transparente de cobertura, volumen, frecuencia y estructura; Progreso usa calendario + hitos, no volumen. |
| 🟡 Sprint C3 — hitos/perfil/crash | P0 | M | Código y gates completos: rangos reales, refresh fijo, calendario, hitos, selector, perfil compacto y editor estable. Falta smoke físico Expo Go. |
| 🟡 Workout visual abierto | P1 | S | Peso/reps/tiempo comparten `WorkoutMetric`; progreso neutral, CTA rojo único y robot GMO en cada descanso. Crash Fabric con pesos decimales corregido. Falta smoke físico 360/390/430/768. |
| 🔴 Bloqueador rangos live | P0 | M–L | `recalc_weekly_ranks()` es ejecutable desde Data API, no idempotente y usa seis tiers legacy. Reconciliar ledger antes de migrar, revocar ACLs y alinear nueve tiers. |
| ✅ Objetivos múltiples | P1 | S | Live usa `profiles.goals`; principal en `goals[0]`, secundarios opcionales y retorno estable desde rutina personalizada. |

### Fase B2 — Diferenciadores (Sprint 3–5)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| GIFs/videos de ejercicios | P1 | M (UI) + L (contenido/licencia) | `hasaneyldrm/exercises-dataset` fue auditado: metadata MIT, media Gym visual excluida. No copiar imágenes/GIFs sin licencia propia. |
| Ejercicios personalizados | P1 | M | `exercises.is_custom`/`created_by` ya en schema, sin flujo de creación en UI. |
| 🟡 Plate calculator, supersets, warm-up sets automáticos | P1 | S/M cada uno | Plate calculator y supersets completados; falta warm-up automático. |
| 🟡 Tarjeta social factual de workout | P0 | M | Compositor/Feed, texto externo y metadata real completados 2026-07-22. Falta plantilla exportable como imagen con mapa muscular. |
| Rutinas públicas / compartibles | P1 | M–L | `routines.is_public` existe sin UI; marketplace de rutinas después (P2). |
| Exportación detallada a Strava | P1 | M–L | Desde 2026 Strava recibe ejercicios/series/reps/peso, genera muscle map y shareables. Hevy ya sincroniza el detalle completo; es un canal de distribución, no solo una integración decorativa. Requiere validar API y privacidad antes de implementar. |
| OAuth Apple/Google real | P1 | M | Hoy es placeholder "Próximamente". Nota App Store: si hay login con Google, Apple exige Sign in with Apple. |

### Fase B3 — Plataforma y escala (Sprint 6+)

| Item | Prioridad | Esfuerzo | Notas y dependencias |
|---|---|---|---|
| Analytics de producto (PostHog) | P1 | M | Necesario antes de decidir paywall. |
| ✅ Tests Jest/Expo | P1 | M inicial, continuo | Base actual: 20 suites/122 contratos puros. Siguiente: integración UI y SQL privacy matrix. |
| Monetización (RevenueCat/IAP) | P1–P2 | L | Tras analytics; Strong/Hevy/Fitbod monetizan con Pro. |
| i18n (extraer strings) | P2 | M–L | Hacerlo antes de que crezca la superficie abarata el costo. |
| Wearables / HealthKit / Google Fit | P2 | L | Requiere dev build; diferenciador de Strava. |
| OTA updates (EAS Update) | P1 | S/M | Ya previsto en sprint 7. Splash/iconos y skeleton compartido están resueltos en la **Pista C**; no trackear doble. |

### Deuda conocida (relleno de sprint, S cada una)

De `docs/memory/checklist.md`:

- ✅ Generador estructural local sin reasoning ni dependencia de proveedor
- ✅ Racha semanal derivada de días locales únicos + meta
- ✅ Validación de workout antes de guardar
- Redondeo KG↔LB en workout activo
- El generador reemplaza la rutina activa sin confirmar

### Coach IA — ✅ RETIRADO

- La migración `0040_drop_ai_coach.sql` eliminó los objetos `ai_*`
- Se retiraron pantalla, cliente, repos/queries y edge function del coach
- Los secretos de proveedores pueden seguir configurados remotamente, pero el código
  actual no los consume
- La dirección actual es registrar historial/progreso y facilitar interacción social;
  no añadir guía de mejora, prescripción ni chat de coach

---

## 4. Pista C — UI/UX

Estudio comparativo de UI/UX contra Strong, Hevy, Fitbod y Strava (benchmark de 8 dimensiones por fuentes públicas) + roadmap visual: **C0** quick wins, **C1** assets, **C2** stream/sistema, **C3** logros reales y progreso factual compatible con Expo Go, **C4** Tier 2 nativo (gated por development build).

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
- **Recuperación (2026-07-29):** 285 ediciones exactas reconstruidas desde
  transcripciones; la base alcanza 20 suites/122 tests. Cliente de objetivos alineado
  con `profiles.goals`; SQL live timestamped recuperado. `0051`/`0052` siguen
  bloqueadas por reconciliación del ledger.
- **Sprint pre-release (2026-07-26):** checkpoint `3c6f69a`; rescate selectivo
  `0047`–`0050`; perfil propio convertido en dashboard virtualizado; score
  prescriptivo retirado; mapa de volumen factual compartido; onboarding con
  objetivo principal/secundarios y retorno personalizado estable; privacidad de
  workout `0052`; objetivos múltiples ya están live con contrato timestamped.
  Siguiente bloqueo: reconciliar el ledger hosted completo antes de desplegar
  `0051`/`0052`.
- **Sprint C3 (2026-07-28):** celebración de rango con emblema, refresh fijo,
  `GMO Rating`, calendario mensual, mapa de hitos con evidencia, selector muscular
  buscable, perfil compacto y editor de series por IDs. Gates: 20 suites/122 tests,
  typecheck/lint limpios y export Android; smoke físico pendiente.
- **Workout visual abierto (2026-07-29):** menos tarjetas/bordes y efectos;
  `WorkoutMetric` repite la jerarquía de peso, reps, descanso y resumen. El rojo
  queda en CTA/PR/estados, progreso normal usa crema. GMO aparece en cada descanso
  con una única entrada accesible; no hay splash, frases rotatorias ni prescripción
  de recuperación.
- **Bloqueador backend P0 — rangos semanales:** reconciliar ledger alojado; cerrar
  `recalc_weekly_ranks()` al Data API; garantizar idempotencia/concurrencia por
  semana; migrar a los 9 umbrales canónicos; backfill sin celebraciones falsas.
  Gate: ACL, doble/concurrente, límites de rangos, cron y advisors.
- **Pre-release manda ahora:** estabilidad, smoke físico Expo Go, ledger Supabase y
  privacidad verificable preceden features nuevas.
- **Expo Go se mantiene:** push/rest notifications y C4 nativo quedan aplazados; no
  forzar development build durante este cierre.
- **Strava cambió el mercado de fuerza en 2026:** tratar exportación detallada + muscle-map/shareables como distribución orgánica; antes de construirla, completar shareables propios y definir privacidad por campo.
- **No copiamos la prescripción de Fitbod:** su progresión guiada no entra en el
  alcance actual; GMO registra datos y deja que el usuario interprete su historial.
- **Tests B3 ya desbloquearon la skill de testing A4.** `launch.json` (A4)
  sigue pendiente para verificación visual asistida.
- **Regla de oro:** cada feature social nueva debe alimentar el loop de retención (notificación → volver a la app → registrar entreno → compartir).
