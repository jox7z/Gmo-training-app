# Checklist de avance

> Fuente viva del estado del proyecto. Última actualización: 2026-08-01.
> No marcar un bloque como completado sin `npm test`, `npm run typecheck`,
> `npm run lint` y revisión de calidad. El smoke visual en Expo sigue siendo manual.

## Resumen ejecutivo

| Capa | Estado | Evidencia actual |
|---|---|---|
| Auth y onboarding | ✅ | Gating central en `app/_layout.tsx` con RPC `is_profile_complete` y timeouts |
| Supabase | 🟡 Ledger bloqueado | Live llega a `20260727223657`; SQL timestamped recuperado localmente. `0051`/`0052` siguen repo-only |
| Workout core | 🟡 pre-release | Flujo competitivo y sync remoto listos; falta smoke físico end-to-end |
| Rutinas | ✅ factual | CRUD, templates, mapa por series equivalentes y GMO Rating descriptivo; sin consejo automático |
| Social | ✅ factual | Stream edge-to-edge, comentarios, follow y tarjeta workout con metadata real + share externo |
| Progreso | ✅ honesto | Tendencia real, calendario mensual, hitos por cargas reales, peso separado y punto→sesión |
| Gamificación | ✅ | Racha derivada por meta, 9 rangos, logros, eventos y comunidades |
| Diseño visual | ✅ C0/C1/C2 social | Sistema dark casi rectangular, identidad GMO y stream público full-width |
| Calidad técnica | 🟡 | 136 tests puros en 22 suites y typecheck/lint limpios; falta smoke físico |

## Interfaz 2D y mascota GMO — 2026-08-01

### Implementación

- [x] `GmoMascot` conserva la pose base 2D con alfa y las poses de acción se recortan directamente de la lámina de marca entregada; no hay placa ni fondo oscuro cuadrado alrededor de GMO.
- [x] El CTA de Rutinas monta la mascota directamente y no añade un shell oscuro alrededor de ella; los demás estados reutilizan componentes y assets compartidos.
- [x] El CTA `Empezar entreno` usa el segundo GMO de “Mascota principal” de la lámina, recortado con alfa, sobre una superficie oscura con texto e icono naranja.
- [x] Todos los `Button` compartidos pasan a un solo plano 2D: se retiran edge, profundidad y recorrido vertical sin cambiar props, haptics, estados ni targets de 44 px.
- [x] `Registrar peso` conserva su acción y reemplaza el SVG genérico por una báscula analógica 2D de lectura más clara.
- [x] `Registrar peso` incorpora `gmo-body-weight.webp`: GMO plano corporativo crema/negro/ember apunta a una fila de tabla de peso resaltada; el control mantiene etiqueta y apertura del formulario.
- [x] El encabezado del ejercicio seleccionado en `Progreso por ejercicio` incorpora `gmo-exercise-progress.webp`: GMO con diadema apunta al resultado de un cuaderno, a la derecha del nombre y sin alterar métrica, gráfica ni selección.
- [x] La fase de serie usa `gmo-mascot-motivating.webp` con el globo “Tú puedes” de la lámina; descanso usa `gmo-mascot-rest.webp`, con ojos cerrados y Zs. Ambos preservan transparencia y el descanso mantiene frase estable, una entrada finita y estado estático con Reduce Motion.
- [x] El Summary deriva el PR del workout frente al historial antes de finalizar; solo entonces usa `gmo-mascot-pr.webp` de la lámina, que brota una vez con Reanimated y se vuelve estático con Reduce Motion.
- [x] La mascota 3D previa se conserva como master histórico y no se duplica ningún asset por pantalla.

### Verificación

- [x] `npm test -- --runInBand` — 22 suites / 136 tests / 0 fallos.
- [x] `npm run typecheck` — 0 errores.
- [x] `npm run lint` — 0 errores / 0 warnings.
- [x] `git diff --check` — limpio.
- [x] Inspección de assets — las tres poses de la lámina y las dos ilustraciones planas de Progreso se exportaron como WebP RGBA; el píxel de esquina `(0, 0, 0, 0)` confirma transparencia exterior.
- [ ] Smoke físico Expo Go: contraste y encuadre de GMO sobre CTA, encabezado de ejercicio, vacíos, descanso y Summary con/sin PR en 360 px/texto grande y Reduce Motion. Sin emulador ni dispositivo ADB conectado.

Riesgo restante: la transparencia, contraste y encuadre de la entrada PR necesitan validación en la composición nativa de Android/iOS.

Siguiente paso: realizar el smoke físico en Expo Go con un workout normal y otro con PR.

## P0: repetir sesiones, recientes y filtros de actividad — 2026-08-01

### Implementación

- [x] `startWorkoutFromHistory` crea una sesión pendiente nueva con IDs nuevos, conserva estructura/legacy/notas/calentamientos y no muta el ledger fuente.
- [x] La repetición descarta explícitamente una sesión activa solo tras confirmación, cierra el ledger y abre el workout activo; no copia duración, descansos, publicación, visibilidad, foto ni totales.
- [x] Ejercicios recientes se derivan del historial por última fecha válida, sin favoritos ni persistencia adicional; los selectores de cambio y editor los priorizan después de sus filtros actuales.
- [x] Actividad del Perfil filtra localmente por ejercicio, rutina, 30/90 días/todo y sesiones publicadas; las opciones incluyen nombres legacy y solo cambian las filas de FlashList.
- [x] Sin repos, queries, RPC, RLS, migraciones, Supabase ni cambios al formato `gmo:workouts:v1`.

### Verificación

- [x] `npm test -- --runInBand` — 22 suites / 136 tests / 0 fallos.
- [x] `npm run typecheck` — 0 errores.
- [x] `npm run lint` — 0 errores / 0 warnings.
- [ ] Smoke físico Expo Go: repetir con/sin sesión activa, selectores kg/lb, Actividad vacía/filtrada/publicada, teclado del sheet y 360 px. No hay emulador ni dispositivo ADB conectado.

Riesgo restante: falta validar visualmente el retorno de foco y la altura del sheet de filtros en Android/iOS.

Siguiente paso: ejecutar el smoke físico pendiente en Expo Go y registrar las incidencias, sin cambiar stores o backend.

## Navegación y actualización estática — 2026-08-01

### Implementación

- [x] El `PagerView` inicia en Entreno y la etiqueta visible `Ejercicio` pasa a `Entreno`; las keys y rutas no cambian.
- [x] Social, Perfil y Progreso actualizan con el mismo mark GMO transparente sin desplazar el contenido; su única vuelta dura 540 ms (50% más lenta).
- [x] Scrolls y listas principales bloquean rebote/overscroll vertical para no arrastrar la pantalla hacia abajo.

### Verificación

- [x] `npm test -- --runInBand` — 22 suites / 136 tests / 0 fallos.
- [x] `npm run typecheck` — 0 errores.
- [x] `npm run lint` — 0 errores / 0 warnings.
- [ ] Smoke físico Expo Go: apertura inicial en Entreno, gesto vertical en cada tab y vuelta GMO a 540 ms. Sin emulador ni dispositivo ADB conectado.

Riesgo restante: validar el gesto simultáneo con el PagerView y el comportamiento nativo de overscroll en iOS/Android.

Siguiente paso: smoke físico de navegación/refresh en Expo Go.

## Rutinas: CTA y selector muscular — 2026-08-01

### Implementación

- [x] El CTA de rutina es plano, usa la mascota GMO y muestra tanto el nombre libre de la rutina como el próximo día; no usa icono de mancuerna ni relieve 3D.
- [x] `Cambiar rutina` queda centrado y abre una hoja dark GMO para editar, elegir plantilla o crear desde cero; se retira el alerta nativo.
- [x] El volumen semanal de Rutinas muestra una cuadrícula de músculos individuales seleccionables, sin buscador ni filtros por grupo.

### Verificación

- [x] `npm test -- --runInBand` — 22 suites / 136 tests / 0 fallos.
- [x] `npm run typecheck` — 0 errores.
- [x] `npm run lint` — 0 errores / 0 warnings.
- [ ] Smoke físico Expo Go: CTA con nombres largos, hoja de cambio y selección de músculo en 360 px/texto grande. Sin emulador ni dispositivo ADB conectado.

Riesgo restante: confirmar visualmente que la mascota y nombres largos mantienen el contraste y no hacen wrap inesperado.

Siguiente paso: smoke físico de Rutinas en Expo Go.

## Refinamiento visual: entrenamiento y Progreso — 2026-08-01

### Implementación

- [x] Targets visuales de `Button`, `IconButton`, `Chip` y segmentos elevados a 44 px.
- [x] Tab bar conectada a los tokens `glass.tabBar`; conserva el PagerView y sus keys.
- [x] Entrenamiento activo sin transiciones decorativas ni frases de descanso rotatorias; Summary usa entradas declarativas de Reanimated y Reduce Motion del sistema.
- [x] Progreso prioriza el ejercicio y la métrica seleccionada; no añade gráficas, calendarios ni conclusiones nuevas.
- [x] Lectura de peso, historial de workout y rutina activa pasan a secciones más abiertas; los controles conservan sus superficies contenidas.
- [x] Perfil reduce la decoración de los ledgers y conserva rango/emblema como la única excepción ceremonial.
- [x] Sin cambios en stores, repos, queries, rutas, activos, contratos de datos ni Supabase.

### Verificación

- [x] `npm test -- --runInBand` — 20 suites / 128 tests / 0 fallos.
- [x] `npm run typecheck` — 0 errores.
- [x] `npm run lint` — 0 errores / 0 warnings.
- [x] `git diff --check` — limpio.
- [ ] Smoke físico Expo Go: no hay emulador ni dispositivo ADB conectado para revisar 360 px, texto grande, teclado, sheets y Reduce Motion.

Riesgo restante: la verificación de jerarquía, clipping y targets en Android/iOS sigue pendiente de dispositivo real.

Siguiente paso: ejecutar el smoke visual de entrenamiento activo, Progreso y Perfil en Expo Go y registrar capturas o incidencias.

## Limpieza visual general — 2026-07-29

### Implementación

- [x] Tabs visibles: Social, Comunidad, Ejercicio, Progreso y Perfil
- [x] Header Social: título corto, búsqueda y notificaciones; sin saludo ni bot naranja
- [x] Refresh inmóvil con `gmo-mark-transparent.png` y una sola vuelta
- [x] Acción `Actualizar feed` expuesta por la lista para tecnología asistiva
- [x] Radios casi rectos y glow retirado de cards/botones ordinarios
- [x] Jerarquía neutral: crema para datos, metadata muted y rojo para acción/PR/estado
- [x] `Stat` reutilizado en Perfil y peso corporal
- [x] Calendario 6×7 con gap GitHub de 4 px
- [x] AGENTS, CLAUDE, agentes/skills, overview, arquitectura y roadmaps sincronizados

### Verificación

- [x] `npm test -- --runInBand` — 20 suites / 128 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 0 warnings
- [x] Export Android final — 2063 módulos / HBC 6,19 MB
- [x] Revisión `code-quality-reviewer` — sin hallazgos accionables
- [ ] Smoke físico Expo Go: 360/390/430/768, texto grande, TalkBack y Reduce Motion

Riesgo restante: falta confirmar en dispositivo el rotor/acción accesible del
refresh, transparencia renderizada y densidad de la tab Comunidad en 360 px.

Siguiente paso: revisión final y smoke físico Expo Go.

## Continuidad de carga + refresh GMO — 2026-07-29

### Implementación

- [x] La siguiente serie laboral hereda el peso real de la última completada
- [x] Carry limitado al mismo `WorkoutExercise` y resuelto por IDs estables
- [x] Targets editados/completados quedan protegidos; calentamientos completan sin propagar peso
- [x] Las repeticiones conservan su contrato de autofill histórico independiente
- [x] Feed inmóvil con el mark GMO optimizado como indicador
- [x] Una sola vuelta de 360° por refresh; termina tras respuestas rápidas
- [x] Sin borde, glow, gradiente ni loop; Reduce Motion estático
- [x] AGENTS, CLAUDE, agentes/skills, overview, arquitectura, roadmaps y prompts sincronizados

### Verificación

- [x] Test focal de carry — 8/8
- [x] `npm test -- --runInBand` — 20 suites / 128 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 0 warnings
- [x] Export Android — 2063 módulos / HBC 6,19 MB
- [x] Revisión final `code-quality-reviewer` — sin hallazgos accionables
- [ ] Smoke físico Expo Go: carry, edición protegida, refresh corto/largo y Reduce Motion

Riesgo restante: la validación visual y táctil necesita dispositivo físico Expo Go.

Siguiente paso: ejecutar gates completos y probar el flujo en un teléfono.

## Sprint en cierre — Workout abierto + GMO en descanso (2026-07-29)

### Implementación

- [x] `WorkoutMetric` compartido para peso, reps, tiempo y resumen
- [x] `BigStepperInput` sin `Card raised`; peso/reps conservan geometría idéntica
- [x] Progreso normal crema/neutral; rojo reservado al CTA, PR y estados relevantes
- [x] Robot GMO montado después de cada serie mediante `RestMascotCoach`
- [x] Frase estable y entrada finita; Reduce Motion renderiza estado estático
- [x] `RestRing` factual, sin gradiente, juicio de recuperación ni rango 2–5 min
- [x] Splash, glow, copy rotatorio y pulso continuo retirados del workout ordinario
- [x] Descanso desplazable en pantallas cortas con CTA fijo; columna tablet 600 px
- [x] Timer ajustable, pills de hasta 20 series y cierre de PR accesibles
- [x] Crash Fabric con peso decimal `22.5` eliminado: accessibilityValue text-only
- [x] AGENTS, CLAUDE, agentes/skills, overview, arquitectura, roadmaps y prompts sincronizados

### Verificación

- [x] `npm test -- --runInBand` — 20 suites / 122 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 0 warnings
- [x] Export Android — 2062 módulos / HBC 6,19 MB
- [x] QA visual estático — overflow, texto grande, 20 series, PR y Reduce Motion cerrados
- [x] Auditoría de rendimiento — RestRing sin animación JS; mascota UI-thread finita
- [x] Regresión `numericAccessibilityValue` — sin `now/min/max` enteros
- [x] Revisión final `code-quality-reviewer` — fix Fabric sin hallazgos accionables
- [ ] Smoke físico Expo Go — 360/390/430/768, landscape, texto grande y descanso restaurado

Riesgo restante: el workout conserva dos ticks de estado por segundo durante
serie/descanso. Es comportamiento previo; medir commits/FPS con React Profiler en
dispositivo antes de justificar una refactorización de relojes.

Siguiente paso: smoke físico del workout en Expo Go y registrar capturas/fallos.

## Recuperación completa del working tree — 2026-07-29

- [x] Recuperadas 285 ediciones exactas desde transcripciones Codex del
      2026-07-26 al 2026-07-28
- [x] Restaurados C3: celebración de rango, refresh fijo, GMO Rating radial,
      calendario 6×7, mapa/selector de hitos, perfil compacto y editor numérico
- [x] Restaurados contratos anteriores: volumen muscular, objetivos múltiples,
      privacidad repo-only, auth multi-cuenta y agentes Caveman
- [x] `profiles.goals` y `complete_signup(..., goals text[])` alineados con live
- [x] SQL live ausente recuperado como `20260727210212`,
      `20260727211100` y `20260727223657`
- [x] Contrato retirado `0053_profile_goals.sql` eliminado
- [x] `npm test -- --runInBand` — 20 suites / 121 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 0 warnings
- [x] Export Android final — 2059 módulos / HBC 6,19 MB
- [ ] Smoke físico Expo Go
- [x] Revisión final `code-quality-reviewer` — cableado de Progreso y privacidad corregidos

Riesgos:

- `0051`/`0052` no están live y no se deben desplegar antes de reconciliar el
  ledger completo.
- El advisor live reporta 64 funciones `SECURITY DEFINER` ejecutables por `anon`;
  requiere auditoría ACL separada.
- No hay Edge Functions desplegadas; `generate_routine` local no está activo live.

Siguiente paso histórico: smoke físico Expo Go sobre Feed/Rutinas/Progreso/Perfil.

## Sprint en verificación — agentes visuales móviles (2026-07-26)

Objetivo: convertir `.claude` en un sistema especializado para dirección,
implementación, motion, QA y rendimiento de una app gym/social juvenil.

### Implementación

- [x] Caveman reducido a estilo, ownership y definición de terminado
- [x] Guardrails de dominio extraídos a skill propia
- [x] `frontend-design` limitado a web; Expo/RN redirigido al sistema móvil
- [x] Skills de producto móvil, arte gym/social, motion, accesibilidad, performance,
  QA visual y assets
- [x] Agentes de director visual, UI RN, motion, QA visual y performance
- [x] Agentes existentes recortados y sin boilerplate/MCP UUID obsoleto
- [x] Boundary visual→Supabase y routing por impacto documentados
- [x] AGENTS, CLAUDE, prompts, arquitectura, overview y roadmaps sincronizados

### Verificación

- [x] Frontmatter/nombres/referencias — 9 agentes, 10 skills, 9 referencias válidas
- [x] Dry-run de Feed, timer, fotos privadas y Perfil — routing/boundary PASS
- [x] `npm test -- --runInBand` — 13 suites / 85 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores; 1 warning previo en `app/workout/active.tsx:1727`
- [x] Revisión `code-quality-reviewer` — ownership, permisos read-only, memoria y
  docs legacy corregidos

### Riesgo restante

- Los agentes Markdown no controlan un dispositivo físico por sí solos.
- QA visual mantiene screenshots y smoke Expo Go como evidencia manual.
- Ningún cambio visual de producto fue incluido en este sprint.
- El dry-run de Perfil detectó deuda presentacional/accesible; queda para el
  primer piloto, sin mezclarla con este sprint de tooling.

### Siguiente paso ejecutable

1. Usar Perfil como primera pantalla piloto.
2. Corregir orden identidad→tabs sticky, semántica de tabs e iconos accesibles
   dentro de una allowlist visual.
3. Comparar screenshots 360/390/430/768 antes de extender el sistema.

## Sprint en verificación — estabilidad pre-release + dashboard + privacidad (2026-07-26)

Objetivo: cerrar deuda que rompe confianza antes de añadir features.

### Implementación

- [x] Checkpoint Git `3c6f69a`
- [x] Rescate selectivo `0047`–`0050`; sin merge de `oneRepMax` ni repos de sync regresivos
- [x] `0039` restaurada desde contrato live
- [x] `0051` conserva supersets dentro de `sync_workout_snapshot` transaccional
- [x] Perfil propio: FlashList única, tabs sticky, FeedItem canónico, paginación y cache coherente
- [x] Rutinas: score `/100`, weak groups y consejos eliminados
- [x] Mapa muscular de volumen restaurado como series equivalentes estimadas solo en editor/Rutinas
- [x] Cinco bandas gris/amarillo/lima/verde/rojo + toque factual por ejercicio
- [x] Objetivo principal + secundarios múltiples en onboarding
- [x] Objetivos pendientes aislados por cuenta; sesión inicial sin reconciliación duplicada
- [x] Logout y cambio A→B limpian perfil, historial, rutinas, logros y Query cache
- [x] Rutina personalizada retorna explícitamente al tab Rutinas
- [x] `profiles.goals` live persiste principal + secundarios
- [x] Generador estructural sin reasoning, proveedor ni copy prescriptivo
- [x] Superseries legacy inválidas se disuelven al hidratar; swap no rompe contigüidad
- [x] Rollback social revierte deltas sin borrar mutaciones concurrentes
- [x] Contrato repo-only de privacidad conservado; el compositor muestra solo Público hasta desplegar RLS/RPC
- [x] Fotos bloqueadas para Seguidores/Privado mientras `post-photos` sea público
- [x] Cliente legacy conserva publicación Pública si `0052` aún no está desplegada
- [x] AGENTS, CLAUDE, Caveman, agentes, overview, arquitectura y roadmaps sincronizados
- [ ] Reconciliar ledger hosted completo y aplicar `0051`/`0052`

### Verificación

- [x] `npm test -- --runInBand` — 13 suites / 85 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 1 warning preexistente
- [x] Bundle Android — 2034 módulos / HBC 6,05 MB
- [x] `npm run exercises:audit` — 1324 fuente / 46 matches / 0 media importada
- [x] Revisión final `code-quality-reviewer` — limpia tras corregir auth y aislamiento A→B
- [ ] Smoke físico Expo Go: 360/390/430/768 px, lifecycle, perfil, publicación y privacidad
- [ ] Matriz SQL owner/follower/stranger/anon después de desplegar `0052`
- [ ] Smoke SQL de `profiles.goals`: orden, duplicados y cliente legacy

### Riesgo restante

- `0051`/`0052` no deben desplegarse antes de reconciliar el ledger hosted completo.
- Seguidores/Privado fallan de forma explícita contra el backend actual; Público usa RPC legacy.
- El bucket público impide privacidad real de fotos; media restringida permanece bloqueada.
- El contrato live de objetivos es `profiles.goals`; no restaurar
  `profiles.secondary_goals`.
- Las bandas del mapa son referencia estimada; no miden esfuerzo, recuperación o crecimiento real.

### Siguiente paso ejecutable

1. Respaldar schema + ledger hosted, reconciliar la historia completa en una ventana única.
2. Aplicar `0051`/`0052` y ejecutar matrices SQL.
3. Smoke Expo Go: mapa interactivo, onboarding múltiple y rutina personalizada.
4. Completar smoke físico general en 360/390/430/768 px.

## Recuperación — Comunidad (`gmup`) + consistencia visual (2026-07-29)

Contexto: dos eventos destructivos el 2026-07-29 borraron trabajo sin commitear.
Hacia las 04:0x se revirtieron archivos ya trackeados (el commit `210d47b`
—"NO COMPILA"— fue un rescate parcial) y hacia las 10:5x un `git clean -fd`
eliminó los no trackeados. Comunidad/`gmup` **sí sobrevivió** en el rescate: faltaban su
cableado y 4 dependencias, y el proyecto no compilaba (17 errores de `tsc`).

### Recuperado

- [x] `SkeletonRows`, `isEventFinished`, `RankEmblem` y `bottomInset` de
      `CommunitiesExplorer` — las 4 dependencias que rompían Comunidad
- [x] `RankEmblem` extraído como fuente única; `RankBadge` lo consume
- [x] Pestaña Comunidad (`gmup`) cableada como 2ª página del PagerView (5 pestañas);
      `MainTabName` y `TabIcon` ampliados; shell del icono ajustado para que
      "Progreso" no trunque a 360 px
- [x] `/discover` reducido a búsqueda de atletas (586 → 252 líneas): Eventos,
      Comunidades y Ranking viven ahora solo en Comunidad
- [x] 14 cabeceras migradas a `ScreenHeader`, incluidos los `Header` locales de
      `publish.tsx` y `profile/[username].tsx`
- [x] `Stat` unificado, `Badge` con borde/icono/`warning`, `Button` con
      `accessibilityRole`/`State` en ambas ramas, `Input` con label asociado +
      `required` + contador, `Toast` con iconografía semántica y live region
- [x] `Icon` 43 → 49 (`alert`, `info`, `trash`, `filter`, `more`, `wifi-off`)
- [x] `ConfirmProvider` montado; cierre de sesión migrado a `useConfirm()`
- [x] `EmptyState` + `SkeletonRows` en Notificaciones y Discover
- [x] `RankProgress` en el héroe de perfil y `StreakRing` en Progreso
      (`daysThisWeek` deja de ser invisible)
- [x] Barrel `ui/index.ts` exporta las 6 primitivas que faltaban
- [x] `TabIcon.focused` engrosa el trazo; tabs de perfil con `tab`/`tablist`

### Eliminado

- `src/components/MuscleVolumeMap.tsx` — huérfano (ninguna pantalla lo
  importaba) y causante de 12 de los 17 errores. Su dependencia
  `src/lib/muscleVolume.ts` se perdió sin fuente recuperable. Reversible con
  `git show 210d47b:src/components/MuscleVolumeMap.tsx`.

### Verificación

- [x] `npm test` — 11 suites / 66 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores (partía de 17)
- [x] `npm run lint` — 0 errores; 2 warnings previos (`_layout.tsx:214`,
      `workout/active.tsx:1727`)
- [x] `expo export --platform android` — bundle completo, 6.08 MB
- [ ] Smoke Expo Go — **no ejecutado**

### Riesgo restante

- Perdidos sin recuperación: `src/lib/muscleVolume.ts`, `routineQualityScore.ts`,
  `workoutVisibility.ts` y sus 3 suites de test (90 → 66 tests). Ninguno tiene
  ya consumidores, así que no rompen el build.
- Sin runtime observado: `ConfirmProvider`, la 5ª pestaña y las 14 cabeceras no
  se han visto en dispositivo.
- Los 11 `<Modal>` siguen con chrome propio; `Sheet` solo lo usa `ConfirmDialog`.

### Siguiente paso ejecutable

1. Smoke en Expo Go: pestaña GMUP, sus 4 vistas y los enlaces a `/discover`.
2. Decidir si el mapa de volumen muscular vuelve como feature nueva.
3. Migrar los 11 modales a `Sheet`, empezando por `CommentSheet`.

## Corrección — Selector de progreso con altura estable (2026-07-24)

Objetivo: mantener cabecera, buscador y filtros en una posición fija aunque la
consulta deje muchos, uno o cero ejercicios.

### Implementación

- [x] Sheet del picker con altura explícita de 90 % del viewport disponible
- [x] `FlatList` limitada al espacio interior; resultados ya no definen el alto del modal
- [x] Estado vacío centrado dentro de la misma superficie
- [x] Sin cambio en selección, filtros, historial, persistencia o Supabase
- [x] AGENTS, CLAUDE, Caveman, agentes, memoria, arquitectura y roadmaps actualizados

### Verificación

- [x] Suite completa — 11 suites / 66 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 2 warnings preexistentes
- [x] Bundle Android — 2033 módulos / HBC 6,03 MB
- [x] Revisión `code-quality-reviewer` — sin hallazgos P0–P3
- [ ] Smoke físico Android/iOS: muchos, uno y cero resultados; teclado abierto/cerrado

### Riesgo restante

- El layout visual necesita confirmación física con teclado y safe areas reales.
- Landscape y Dynamic Type máximo siguen sin validación física.

### Siguiente paso ejecutable

1. Smoke físico en 360/390/430/768 px con filtros combinados.
2. Validar teclado, landscape y Dynamic Type máximo.
3. Continuar C2-1 después del smoke sin mezclar alcance.

## Sprint en cierre — Picker visual + progreso sin Trabajo (2026-07-22)

Objetivo: reconocer variantes por imagen y simplificar la comparación a señales
directas: carga, repeticiones y tiempo registrado.

### Implementación

- [x] Miniatura WebP local en ejercicio seleccionado y filas del picker
- [x] `expo-image` con cache/recycling y fallback dumbbell para asset/ID ausente
- [x] `Trabajo` retirado del selector y timeline principal de Progreso
- [x] Hub: tendencia carga/reps y récord secundario de reps; sin comparación por trabajo
- [x] Trabajo conservado como dato factual en ledgers y tarjeta/share social
- [x] Campos/cálculos de volumen muertos retirados de helpers de progreso
- [x] Sin dependencia ni cambio Supabase/RLS/RPC/Storage/migraciones
- [x] AGENTS, CLAUDE, Caveman, agentes, overview, arquitectura y roadmaps actualizados

### Verificación

- [x] Suite completa — 11 suites / 66 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 2 warnings preexistentes
- [x] Bundle Android — 2033 módulos / HBC 6,03 MB
- [x] Revisión `code-quality-reviewer` — limpia tras corregir fallback métrico, campos muertos y accesibilidad
- [ ] Smoke físico: thumbnails, fallback, Carga/Reps/Tiempo, hub y ledger

### Riesgo restante

- Las imágenes son decorativas; identificación textual y accesibilidad siguen mandando.
- Sin dispositivo conectado no puede cerrarse recycling, memoria ni lectura visual real.

### Siguiente paso ejecutable

1. Smoke físico con ejercicios con/sin asset y varias densidades.
2. Continuar C2-1 después del smoke sin mezclar alcance.
3. Auditar C2-2 después del smoke sin ampliar el alcance de Progreso.

## Sprint en cierre — Selector de progreso escalable (2026-07-22)

Objetivo: encontrar rápidamente un ejercicio entrenado aunque existan muchas
variantes, sin convertir Progreso en guía ni añadir estado remoto.

### Implementación

- [x] Carrusel horizontal retirado de `Progreso por ejercicio`
- [x] Fila compacta muestra ejercicio, metadata, sesiones, fecha y acceso al picker
- [x] Modal buscable con Recientes, Más entrenados y Todos
- [x] Búsqueda sin diacríticos sobre la lista completa entrenada
- [x] Filtros combinables por músculo primario y equipo
- [x] IDs legacy sin catálogo permanecen disponibles en Todos/búsqueda
- [x] Selección conserva métricas factuales, rango, punto→sesión y hub del ejercicio
- [x] Sin dependencia, persistencia, recomendación ni cambio Supabase/RLS/RPC/migración
- [x] AGENTS, CLAUDE, Caveman, agentes, overview, arquitectura y roadmaps actualizados

### Verificación

- [x] Tests del picker y suite completa — 11 suites / 66 tests / 0 fallos
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 2 warnings preexistentes
- [x] Bundle Android — 2033 módulos / HBC 6,03 MB
- [x] Revisión `code-quality-reviewer` — limpia tras bloquear hub legacy y completar etiquetas accesibles
- [ ] Smoke físico: muchos ejercicios, teclado, Back, TalkBack y filtros combinados

### Riesgo restante

- El historial remoto de un dispositivo nuevo conserva el límite actual de 100 workouts.
- No hay infraestructura de tests de componentes RN; interacción queda cubierta por smoke.
- Sin dispositivo conectado no puede cerrarse teclado, foco, safe-area ni TalkBack.

### Siguiente paso ejecutable

1. Smoke físico del picker en 360/390/430/768 px.
2. Continuar C2-1 en loaders restantes sin mezclar alcance.
3. Auditar C2-2 después del smoke; el Modal nativo actual no completa la consolidación.

## Sprint en cierre — Secciones sin bordes laterales + Skeleton C2-1 (2026-07-22)

Objetivo: eliminar marcos laterales de paneles informativos en toda la app y
unificar cargas iniciales sin añadir dependencia ni alterar estados de datos.

### Implementación

- [x] `Card variant="section"`: radio 0, solo separadores superior/inferior
- [x] `stream`, defaults y tiles `raised` compactos permanecen intactos
- [x] Secciones migradas en Rutinas, Progreso, Perfil, Logros y hub de ejercicio
- [x] Secciones migradas en workout activo, onboarding, evento y rutina vacía
- [x] Formularios, controles, botones, inputs, modales, estados y círculos conservan borde
- [x] `Skeleton` + `SkeletonGroup` compartidos; un pulso por grupo
- [x] Reduce Motion detiene el pulso y conserva skeleton estático
- [x] Feed, conexiones, posts propios, peso principal y detalle de peso migrados
- [x] Skeleton solo en carga inicial vacía; cache/refetch/paginación/mutación intactos
- [x] Sin dependencia nueva ni cambios en Supabase/Post/RLS/RPC/migraciones
- [x] AGENTS, CLAUDE, Caveman, agentes, arquitectura, overview y roadmaps actualizados

### Verificación

- [x] `npm test -- --runInBand` — 10 suites / 58 tests / 0 snapshots
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 2 warnings preexistentes
- [x] Bundle Android — 2031 módulos / HBC 6,01 MB
- [x] Revisión `code-quality-reviewer` — limpia tras corregir carga cacheada, reduced-motion y cierre lateral inmutable
- [ ] Smoke físico: secciones, carga inicial, refetch con cache y reduced-motion

### Riesgo restante

- Notificaciones, discovery y comunidades conservan loaders anteriores; C2-1 sigue parcial.
- Sin dispositivo conectado no puede cerrarse inspección visual ni reduced-motion.

### Siguiente paso ejecutable

1. Smoke físico de secciones y loaders en 360/390/430/768 px.
2. Continuar C2-1 en notificaciones/discovery/comunidades sin tocar paginación.
3. Auditar el siguiente bloque C2 después del smoke, sin ampliar alcance de producto.

## Sprint en cierre — Stream social edge-to-edge (2026-07-22)

Objetivo: usar el ancho de pantalla en superficies públicas tipo Instagram sin
degradar legibilidad, controles contenidos ni contratos sociales existentes.

### Implementación

- [x] `Card variant="stream"`: radio 0 y solo separadores superior/inferior
- [x] `SocialStreamColumn`: ancho móvil completo y máximo 600 px centrado
- [x] Feed/FlashList sin padding lateral; compositor, skeleton y estados alineados
- [x] `FeedItem` stream para manual, workout, PR, rank_up, streak y achievement
- [x] Copy/metadata/reacciones/acciones a 16 px y targets táctiles de 44 px
- [x] Fotos manual/workout/PR 4:5 full-bleed sin radio
- [x] PR dorado sin doble marco; animación limitada a líneas superior/inferior
- [x] `WorkoutShareCard` conserva rail/divisor y elimina marco estadístico lateral
- [x] Muro comunitario reutiliza `FeedItem layout="stream"`
- [x] `CommunityCard` y `EventCard` exponen `layout` con default `contained`
- [x] Preview y publicaciones propias edge-to-edge; formularios siguen contenidos
- [x] Perfil público: galería 3 columnas, gap 1 px, sin margen/radio/borde exterior
- [x] Sin dependencias ni cambios en `Post`, Supabase, RLS, RPC o migraciones
- [x] AGENTS, CLAUDE, Caveman, agentes, overview, arquitectura, roadmaps y prompts actualizados

### Verificación

- [x] `npm test -- --runInBand` — 10 suites / 58 tests / 0 snapshots
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 3 warnings preexistentes
- [x] Bundle Android — 2030 módulos / HBC 6,01 MB
- [x] Revisión `code-quality-reviewer` — limpia tras corregir targets 44 px, padding y footer
- [x] Expo Web diagnosticado — bloqueado por import nativo de `react-native-pager-view`; no valida UI
- [ ] Smoke físico Expo Go/Android: 360/390/430/768 px y acciones sociales

### Riesgo restante

- Falta inspección física en los cuatro anchos, incluyendo reciclado/paginación y
  todos los tipos de post con contenido real.
- Expo Web no sirve como sustituto: Metro falla al importar
  `react-native/Libraries/Utilities/codegenNativeCommands` desde PagerView.

### Siguiente paso ejecutable

1. Smoke físico en 360/390/430 px y tablet 768 px con capturas.
2. Continuar con una plantilla exportable de workout + mapa muscular.

## Sprint en cierre — Social factual e historial navegable (2026-07-22)

Objetivo: convertir el entrenamiento guardado en contenido social útil y conectar
Progreso con el historial real, sin añadir guía automática ni controles ficticios.

### Implementación

- [x] `WorkoutShareCard` rectangular compartida por compositor y Feed
- [x] Metadata tipada/legacy-safe para duración, series, reps, `kg·rep`, músculos y ejercicios
- [x] Migración `0044` conserva firma, lock, publicación monotónica y ACL authenticated-only
- [x] Migración `0045` evita comparar PR históricos contra sesiones futuras
- [x] Migración `0046` desempata PR por `started_at`, `created_at` e ID
- [x] Share nativo desde Feed y Comunidad solo incrementa contador tras compartir
- [x] Texto externo incluye métricas reales en KG/LB y grupos musculares traducidos
- [x] Publicación exitosa marca `isPublished` local y excluye el workout del compositor
- [x] `mergeHistory` reconcilia `isPublished` de forma monotónica entre dispositivos
- [x] Cada punto de Progreso conserva `workoutId` y abre el registro exacto
- [x] `WorkoutResultsModal` muestra un ledger factual; sin deltas ni felicitaciones comparativas
- [x] Summary post-workout deja de declarar mejoras o caídas automáticamente
- [x] Helpers comparativos muertos retirados junto con sus contratos redundantes
- [x] Switches locales sin efecto de privacidad/notificaciones retirados de Configuración
- [x] Publicación bloquea doble toque, recupera un ID de workout stale y rechaza números parciales
- [x] Hidratación local tolera JSON corrupto y registra fallos de persistencia
- [x] AGENTS, CLAUDE, skill Caveman, memorias de agentes, overview, arquitectura y roadmaps actualizados

### Verificación

- [x] `npm test -- --runInBand` — 10 suites / 58 tests / 0 snapshots
- [x] `npm run typecheck` — 0 errores
- [x] `npm run lint` — 0 errores / 3 warnings preexistentes
- [x] Bundle Android — 2029 módulos / HBC 6,00 MB
- [x] Revisión `code-quality-reviewer` — cierre limpio tras corregir P1/P2/P3
- [x] `git diff --check` — limpio
- [x] `0044`/`0045`/`0046` live; última versión `20260722140530`: firma/ACL/search_path/contrato verificados; 0 datos mutados
- [ ] Smoke visual en Expo Go/Android: compositor, Feed, share nativo y punto→sesión

### Riesgo restante

- La plantilla externa aún es texto; falta exportar imagen PR/racha/mes con mapa muscular.
- La privacidad social sigue siendo pública para usuarios autenticados; no hay switches
  hasta que existan columnas, RPC/RLS y reglas de feed completas.
- Las notificaciones siguen fuera de alcance hasta el salto a development build.
- Posts anteriores a `0044` muestran solo las claves legacy disponibles.
- El ledger de migraciones live usa timestamps y no alinea con los archivos
  numéricos `0001–0046`; un `db push` futuro queda bloqueado hasta reconciliarlo.

### Siguiente paso ejecutable

1. Link/auth de Supabase CLI, auditoría del schema live y reparación del ledger
   completo; no usar `--include-all` ni reparar solo `0044`/`0045`/`0046`.
2. Smoke físico de tarjeta social, share y navegación desde la gráfica.
3. Diseñar una sola plantilla de imagen de workout con mapa muscular antes de
   multiplicarla a PR/racha/mes.

## Sprint completado — Roadmap visual y workout competitivo (2026-07-19)

Objetivo: reducir fricción para entrenar y convertir el sistema visual en una
base reutilizable sin añadir dependencias ni romper Expo Go.

### Implementación

- [x] Tokens de metales y gradientes reutilizables
- [x] Escala tipográfica con `lineHeight` y `letterSpacing` por variante
- [x] `Text.tsx` usa los tokens tipográficos como fuente única
- [x] Tipografía crítica del workout activo migrada a variantes
- [x] Primitivas nuevas: `IconButton`, `Chip`, `SegmentedControl`
- [x] Tab bar con `PressableScale`, accesibilidad y haptics sin duplicar
- [x] CTA persistente en Feed para empezar o continuar entrenamiento
- [x] CTA muestra rutina/día y progreso de series cuando hay sesión activa
- [x] Reanudación segura en la primera serie pendiente; no reemplaza el workout activo
- [x] Workout activo persistido en AsyncStorage con cola serializada de escrituras
- [x] Reanudación funciona aunque la rutina fuente haya sido eliminada
- [x] Benchmark incremental: Strava strength 2026, Hevy sync y Fitbod Focus Exercises
- [x] Regla de documentación obligatoria añadida a AGENTS, workflow y skill caveman
- [x] Serie anterior por posición + fallback y autofill que no pisa ediciones
- [x] Banner de PR en vivo con detección histórica conservadora
- [x] Descanso persistido por timestamp; reanuda tras background/remount
- [x] Validación previa al finish; pendiente avisa y datos inválidos bloquean
- [x] Calculadora de discos para barra 20/15 kg, discos configurables y kg/lb
- [x] Records por ejercicio basados solo en series efectivas completadas
- [x] Gráfica con ejes mínimos, tooltip táctil y accesibilidad ajustable
- [x] Tendencias de carga, reps y tiempo sin estimaciones de fuerza; trabajo solo en ledger/social
- [x] Estancamiento y caída permanecen visibles sin corregirse ni calificarse
- [x] Comparación redundante “última vs anterior” retirada
- [x] Peso corporal separado del rendimiento de ejercicios
- [x] Racha, rangos, leaderboard y volumen semanal retirados de Progreso; calendario + hitos usan evidencia factual
- [x] Datos legacy fuera de 1–999 reps o 0–1000 kg excluidos con predicado compartido
- [x] Trabajo usa unidad explícita `kg·rep`/`lb·rep`; carga conserva `kg`/`lb`
- [x] Tendencia mixta con lastre/peso corporal cambia a reps comparables
- [x] Selector de peso y borrado de medición accesibles por tap/lector de pantalla
- [x] Modales, query, helper y estado fijado del Progreso anterior eliminados
- [x] Hub `/exercise/[id]`: Información · Historial · Récords
- [x] Estados de error/refetch preservando cache en toda Comunidad
- [x] Primitivas migradas en Discover y formularios de Eventos
- [x] Icono, splash, adaptive icon, favicon y nueve emblemas reales
- [x] Rutinas y Feed comparten `nextRoutineDay`; templates confirman reemplazo
- [x] exercises-dataset auditado e integrado solo para 46 instrucciones seguras
- [x] Media Gym visual excluida; commit/licencias documentados
- [x] Edición de evento persiste fecha/hora y ofrece error con retry
- [x] RPC `0041` sincroniza el workout completo con transacción + advisory lock
- [x] `0042` revoca grants automáticos; RPC ejecutable solo por `authenticated`
- [x] `0043` evita que retry stale despublique un workout ya publicado
- [x] `Text` evita line-height heredado al sobrescribir font-size
- [x] CTA del hub selecciona Rutinas mediante request explícito al PagerView
- [x] Snapshot legado con serie inválida reabre el editor y se puede reparar
- [x] Nuevo icono GMO de rostro-robot crema/negro/rojo
- [x] Una mascota WebP de 25 KB reutilizada en Feed, Rutinas y Summary
- [x] Icono, splash y adaptive config comparten `assets/icon.png`; dos copias eliminadas
- [x] Caveman permanente para root, agentes y workflow
- [x] Sistema visual casi rectangular: superficies 2–4 px y círculos solo semánticos
- [x] Racha semanal desde historial + `weeklyGoalDays`, lunes–domingo local
- [x] Racha se refresca al volver a foreground o cruzar de semana
- [x] Migración v2 re-siembra tiers de racha antiguos sin borrar otros logros
- [x] Runner Jest/Expo y 49 contratos puros en 7 suites

### Verificación

- [x] `npm run typecheck` final integrado — 2026-07-19, 0 errores
- [x] `npm run lint` integrado — 2026-07-19, 0 errores / 3 warnings preexistentes
- [x] `npm test` — 2026-07-19, 7 suites / 49 tests / 0 snapshots
- [x] Bundle Android (`expo export`) — 2026-07-19, 2025 módulos / HBC 5,99 MB
- [x] `npm run exercises:audit` — 1324 fuente / 46 matches / 0 media importada
- [x] `npm audit` diagnóstico — 22 vulnerabilidades en árbol de producción /
  23 totales; sin `--force` porque las remediaciones propuestas cambian Expo
- [x] Revisión `code-quality-reviewer` — hallazgos P1/P2/P3 corregidos;
  cierre final con 0 hallazgos P0–P3
- [x] Desplegar/verificar `0041`–`0043`: atomicidad, ACL y publicación monotónica
- [x] Smoke SQL `true → snapshot false → true`; rollback dejó 0 filas — 2026-07-19
- [ ] Smoke manual en Expo Go:
  - Feed sin rutina → abre plantillas
  - Feed con rutina → abre el día sugerido
  - Feed con sesión activa → reanuda primera serie pendiente
  - Swipe y tap entre las 4 tabs
  - Progreso muestra carga/reps/tiempo, conserva líneas planas/descendentes y cada punto abre su sesión
  - Picker muestra WebP local/fallback; ledger y tarjeta social conservan Trabajo factual
  - Peso corporal no se mezcla con la carga del entrenamiento
  - VoiceOver/TalkBack anuncia tabs y CTA
  - Verificar robot GMO en máscaras de launcher, splash, Feed, Rutinas y Summary
  - Editar fecha/hora de evento, guardar y volver a abrir
  - Forzar retry de sync parcial y confirmar árbol completo en servidor

### Riesgo restante

- La sugerencia de “próximo día” sigue siendo cíclica; falta calendario real.
- Las primitivas existen y ya se migraron en Comunidad/Eventos; otras pantallas
  aún usan Pressable/hex locales.
- Falta smoke físico de background/reinicio, modal de discos y máscaras de icono.
- Expo web no permite el smoke visual porque `react-native-pager-view` importa un
  módulo nativo; validar Progreso en Expo Go/Android.
- RPC `0041` ya está desplegada; falta smoke físico con retry concurrente desde
  dos clientes y confirmación visual del árbol remoto.
- La media de exercises-dataset requiere licencia propia de Gym visual.
- El árbol npm aún reporta 1 vulnerabilidad crítica y 2 altas; clasificar cada
  advisory y actualizar dentro de la versión de Expo compatible, sin aplicar
  upgrades mayores automáticos.

## Siguiente secuencia ejecutable

### 1. C0 — cerrar logging y consistencia visual

- [x] Columna “anterior” + autofill por serie
- [x] Banner de PR en vivo al completar set
- [x] Migrar Discover/Eventos a `Chip`, `IconButton` y `SegmentedControl`
- [ ] Reducir hex fuera de tokens con inventario reproducible
- [x] Degradación/error explícito en Feed y Comunidad

### 2. C1 — identidad visual crítica

- [x] Reemplazar identidad launcher/splash/favicon con una sola fuente optimizada
- [x] Reemplazar los 9 emblemas de `assets/ranks/`
- [x] Añadir mascota propia compartida a estados vacíos y celebración

### 3. B1 — fiabilidad y retención

- [x] Rest timer basado en timestamps y resistente a background/remount
- [ ] Notificación local de descanso; salto coordinado a development build
- [x] Rendimiento real por ejercicio + Records/PRs sin fuerza estimada
- [ ] Sentry mínimo
- [x] Validar workout antes de guardar

### 4. C2 — progreso moderno

- [x] Charts con ejes, tooltip, selector de rango y drill-down a la sesión real
- [x] Score y mapa prescriptivo retirados; mapa factual de volumen compartido restaurado
- [x] Detalle de ejercicio: Información · Historial · Records
- [x] Tarjeta factual workout + share externo de texto
- [ ] Imágenes shareables de PR/racha/mes + mapa muscular con privacidad real

### 5. B2 — diferenciación validada por benchmark

- [ ] Evaluar exportación detallada a Strava (API, permisos y privacidad)
- [ ] Supersets, warm-up automático y RPE (plate calculator ya completado)
- [ ] Ejercicios personalizados

## Deuda conocida

- [x] Generador estructural local sin reasoning ni dependencia de proveedor
- [x] Racha local derivada de historial + meta semanal
- [ ] Cambio KG↔LB en workout activo puede redondear inputs
- [x] Templates confirman antes de reemplazar la rutina activa
- [ ] Algunas pantallas aún usan `Pressable` directo y estilos/hex inline
- [x] `README.md` sincronizado con SDK, catálogo, assets y features actuales
- [ ] 163 ejercicios del dataset externo requieren mapeo manual conservador

## Hitos cerrados

- [x] Auth email, recuperación y onboarding server-driven
- [x] Feed social v2, búsqueda, followers/following y perfiles públicos
- [x] Body measurements y timeline de peso
- [x] Comunidades, roles, eventos y leaderboards
- [x] Catálogo local de 220 ejercicios con imágenes offline
- [x] Logros offline por niveles con backfill silencioso y modal de celebración
- [x] Instagram OAuth y coach IA retirados del cliente
- [x] Migración `0040_drop_ai_coach.sql`

## Protocolo de cierre

Seguir [workflow.md](../skills/workflow.md): actualizar este archivo en cada
request con cambios, rotar [prompts.md](../skills/prompts.md), sincronizar los
roadmaps afectados y registrar checks, riesgo y siguiente paso.
