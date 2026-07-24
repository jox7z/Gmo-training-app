# Roadmap UI — Gmo Training App (Pista C)

> **Fecha:** 2026-07-07 · **Base:** v0.1.0, rama `feat/initial-app-foundation` · Complementa [roadmap.md](roadmap.md) (Pista C = UI/UX)
>
> **Leyenda de prioridad:** P0 (crítico) · P1 (importante) · P2 (deseable)
> **Leyenda de esfuerzo:** S (<1/2 día) · M (1–3 días) · L (1+ semana)
> **Severidad de gap:** 🔴 Alta (flujo core diario o primera impresión) · 🟡 Media (comprensión/retención) · 🟢 Baja (pulido)
>
> Catálogo de librerías, tiers y exclusiones: [memory/visual-stack.md](memory/visual-stack.md) (el QUÉ). Este documento decide el CUÁNDO y POR QUÉ.

---

## 1. Resumen ejecutivo

**Top 5 gaps** (benchmark vs Strong, Hevy, Fitbod y Strava):

1. 🔴 **Assets en blanco** — icono, splash y los 9 emblemas de rango son placeholders de 68 bytes: la primera impresión y toda la identidad de gamificación se renderizan vacías. Ninguna app líder tiene este problema; es pre-competitivo. → **C1**
2. 🔴 **Gráficas por debajo del estándar del mercado** — las 4 apps ofrecen charts con ejes, tooltips, selector de métrica/rango y drill-down (Strava permite tocar una semana y ver sus actividades; Hevy ofrece 6 métricas por ejercicio). Las nuestras son SVG a mano sin ejes X, sin tooltips, sin interacción. → **C2-4 + B1**
3. 🔴 **Logging sin herramientas de sesión** — el estándar (Strong/Hevy/Fitbod) es: rest timer que notifica fuera de la app, valores de la sesión anterior visibles y autorellenados por set, plate calculator embebido en el input de peso. Nuestro rest timer muere en background y no hay "anterior" por fila ni calculadora. → **B1 + C0/C2**
4. 🟡 **Biblioteca de ejercicios estática** — Strong/Hevy usan animación en loop por ejercicio y Fitbod video profesional; nuestro catálogo de 220 tiene imagen fija + texto. Además el detalle de ejercicio de Strong/Hevy es un hub (About/History/Charts/Records) accesible en pleno entreno; el nuestro no integra historial. → **B2 + C2**
5. 🟡 **Sistema visual inconsistente** — ~48 iconos con trazo mixto (1.3–2.5, relleno vs línea), 3 tratamientos de loading, 11 bottom-sheets improvisados, 89 colores hex fuera de tokens, sin escala de line-height. Strava demuestra el valor del sistema unificado (1.440 iconos propios, tipografía dual, dark mode sistemático). → **C0 + C2**

**Top 3 fortalezas a conservar** (ninguna migración puede degradarlas — ver §4):

1. **Celebraciones coreografiadas propias** (AchievementUnlockModal, ring burst del summary, RestRing) — el teardown de Fitbod critica su confetti como "genérico"; el nuestro está diferenciado.
2. **Gamificación multi-eje ya construida** — rangos + rachas + heatmap + retos + comunidades replican el patrón Strava de "rutas de motivación paralelas" que Strong y Fitbod no tienen.
3. **Stack social completo** (feed, reacciones, comentarios, realtime, perfiles) — equivalente al de Hevy, por delante de Strong/Fitbod.

**Lectura de fases:** C0 (quick wins sin librerías, una tarde cada uno) y C1 (assets, bloqueado por arte no por código) van primero; C2 adopta el Tier 1 del visual-stack en Expo Go en orden de impacto; C3 (Tier 2, Skia) queda gated por el mismo salto a development build que push notifications (B1).

---

## 2. Método y fuentes

- **Benchmark:** Strong, Hevy, Fitbod y Strava × 8 dimensiones (D1–D8), ejecutado el **2026-07-07** exclusivamente con **fuentes públicas** (sin acceso a las apps instaladas): store listings y changelogs, blogs/help centers oficiales, galerías de patrones (ScreensDesign, Page Flows, Mobbin), teardowns editoriales y reviews comparativas. 69 fuentes únicas (mayoría oficiales); ningún claim depende solo de comunidad.
- **Jerarquía de confiabilidad:** oficial > store > galería > teardown > review > comunidad. Cada hallazgo lleva etiqueta de confianza; los claims sin fuente se descartaron.
- **Verificación independiente:** una pasada de verificación cruzó la matriz de cobertura 4×8 (sin celdas vacías; las celdas flojas —Hevy D7, Fitbod D8, Strava D1-en-vivo— se reforzaron con una ronda de gap-fill dirigida) y spot-checkeó 8 URLs de los claims principales: 7 confirmadas textualmente, 1 parcial — la cifra "14B kudos en 2025" atribuida al case study de Trophy **no aparece en la fuente y se retiró** del benchmark.
- **Limitaciones declaradas:** (a) **D7 (estados vacíos/carga)** tiene evidencia pública débil en las 4 apps — los skeletons y empty states no se documentan públicamente; esa fila del benchmark se apoya en buenas prácticas, no en evidencia por app. (b) La **tipografía/paleta exacta** de Strong, Hevy y Fitbod no está documentada públicamente (sí la de Strava). (c) Fitbod es 100% suscripción: toda su UX descrita es de pago. (d) El teardown de Fitbod en growth.design citado en la planificación no está indexado; se sustituyó por App Fuel + ScreensDesign.
- **Marcadores:** las features de pago se marcan [PRO] en el apéndice; la fila "Gmo hoy" sale de la auditoría interna del código (2026-07-07).

---

## 3. Benchmark por dimensión

### D1 — Logging durante el entreno · Gap 🔴 Alta

| App | Qué hace |
|---|---|
| Strong | Tabla tipo planilla: checkbox por set, "previous" en gris por fila, rest timer auto-iniciado prominente, swipe para borrar, drag & drop, tipos de set (warm-up/failure/drop), RPE. Plate/warm-up calculator = Pro. |
| Hevy | Tap en checkmark = set completado + rest timer (una interacción, doble efecto). Columna "anterior" con autofill. **Plate calculator dentro del teclado de peso.** Complejidad opt-in (RPE 6–10, superset scrolling). Live Activities en lock screen. |
| Fitbod | Sets precargados por el algoritmo (loggear = confirmar). Rest timer notifica **fuera de la app** (tono/vibración/lock screen). Exertion rating post-ejercicio. Riesgo documentado: overlay del timer tapa los inputs. |
| Strava | Log de fuerza nuevo (2026-05): sets/reps/peso + muscle map automática post-registro. Verificado por gap-fill: captura **post-hoc**, sin rest timer/supersets/RPE — es capa social de agregación (importa de 14 partners: Garmin, Hevy, Fitbod…), no competidor de captura en vivo. |
| **Gmo hoy** | Tracking set-by-set interactivo con RestRing animado (ventana de recuperación verde), SetProgressPills, duración/descanso por serie, PRs detectados y comparación con sesión previa en el modal de resultados. **Falta:** rest timer muere en background y no notifica; sin "anterior" por fila ni autofill; sin plate calculator; sin supersets; RPE en schema sin UI. |

**Adoptamos:** notificación local del rest timer (ya es B1 — la evidencia de Fitbod confirma que es el estándar); columna "anterior" + autofill por set (patrón Strong/Hevy, S–M, sin librerías); plate calculator embebido en el input de peso (patrón Hevy, el mejor de los cuatro); RPE opt-in. **No adoptamos:** la densidad tipo planilla de Strong — nuestro logging "hero interactivo" es diferenciador; tampoco el overlay de timer que tape inputs (anti-patrón documentado de Fitbod).

### D2 — Home/dashboard y navegación · Gap 🟡 Media

| App | Qué hace |
|---|---|
| Strong | Abre directo en Templates para empezar a entrenar en segundos; dashboard con widgets vive en Profile; widgets de iOS (calendario, actividad). |
| Hevy | Home = feed social con toggle Discover; tab Workout dedicado a rutinas/arranque; analíticas en Profile; widgets de OS. |
| Fitbod | El home ES el workout del día ya generado: empezar = 1 tap. Gym Profiles conmutables regeneran la rutina según equipo. |
| Strava | Feed social como home; 5 tabs con **botón Record central** como CTA permanente; tab You consolida todo lo personal con tarjetas expandibles. |
| **Gmo hoy** | Home = feed social (patrón Hevy/Strava ✓) con 4 tabs swipeables. **Falta:** no hay CTA persistente de "empezar entreno" — iniciar sesión de gym exige navegar a Rutinas; sin widgets de OS. |

**Adoptamos:** CTA de inicio de entreno siempre visible (botón flotante/central estilo Record de Strava o acceso rápido en el header del feed) — es el gap de fricción diaria más barato de cerrar (S–M). **Aplazamos:** widgets de OS (requieren dev build y módulos nativos → tras C3/B1, P2).

### D3 — Progreso y gráficas · Gap 🔴 Alta

| App | Qué hace |
|---|---|
| Strong | Charts por ejercicio (best set, 1RM Brzycki/Epley, volumen) + tab Records por ejercicio; calendario de consistencia con PRs por sesión. Advanced charts = gancho del paywall. |
| Hevy | Body graph muscular de 7 días como cabecera; sets por grupo muscular con rangos 30d/3m/año; selector de métrica por ejercicio (heaviest, 1RM, volúmenes, reps); Strength Level (Beginner→Elite) comparado por edad/peso/sexo. |
| Fitbod | 7 métricas graficables por ejercicio; Strength Score 0–100 por músculo; **muscle recovery heatmap** (frescura % por músculo); renombra métricas técnicas a lenguaje llano ("Estimated Strength"). |
| Strava | Progress Summary Chart **interactiva con drill-down** (tap en semana → lista de actividades) y comparativas de rangos (1w–52w); Training Log visual; heatmaps. |
| **Gmo hoy** | Progreso por ejercicio y evolución de peso en SVG propio **sin ejes X, sin tooltips, sin interacción ni animación**; heatmap anual estático (sin press por celda); escalera de rangos; composición corporal. Sin pantalla Records ni 1RM estimado (ya planificado en B1). |

**Adoptamos:** gifted-charts con ejes/tooltips/selector de rango (C2 §5); pantalla Records + 1RM (B1, patrón Strong); selector de métrica por ejercicio (patrón Hevy); press por celda en heatmap; **heatmap muscular semanal reutilizando `react-native-body-highlighter` ya instalada** (patrón body graph de Hevy / recovery de Fitbod — diferenciador barato). **No adoptamos:** Strength Level social comparado por demografía (requiere masa de usuarios; P2 en Pista B si acaso).

### D4 — Biblioteca de ejercicios · Gap 🟡 Media-Alta

| App | Qué hace |
|---|---|
| Strong | Animación en loop por ejercicio; detalle en 4 tabs (About/History/Charts/Records) **accesible tocando el nombre en pleno workout**; custom exercises al vuelo. |
| Hevy | 400+ ejercicios con animación demo + instrucciones paso a paso; filtros duales equipo+músculo; el detalle fusiona documentación con historial personal; custom con cap de 7 en free. |
| Fitbod | 1.000+ videos HD profesionales multi-ángulo; filtro por equipo del Gym Profile; detalle = hub (video + cues + score + trends). |
| Strava | Mínima: búsqueda para etiquetar, sin media ni custom; muscle map automática como valor. |
| **Gmo hoy** | 220 ejercicios con **imagen estática** webp + instrucciones de texto; `gif_url` en schema vacío y sin UI; ejercicios custom en schema sin UI; sin historial integrado en el detalle. |

**Adoptamos:** GIFs/animaciones en loop (B2; formato loop tipo Strong/Hevy — no video profesional tipo Fitbod, que es pipeline de contenido L); detalle de ejercicio como hub con historial/records accesible durante el entreno (patrón Strong, M); custom exercises UI (B2); filtros equipo+músculo. **No adoptamos:** producción de video profesional (coste desproporcionado a nuestra etapa).

### D5 — Celebraciones y gamificación · Gap 🟢 Baja (mecánicas) / 🔴 Alta (assets)

| App | Qué hace |
|---|---|
| Strong | Anti-gamificación deliberada; PR sobrio en tiempo real con trofeo. |
| Hevy | Live PR banner al completar el set; streak **semanal** (anti-burnout); **shareables autogenerados customizables** para IG Stories (PRs, streaks, year in review). |
| Fitbod | Records celebrando PRs/milestones + Milestones para veteranos (100+ workouts); su celebración post-entreno es criticada como "genérica" (fuente única: teardown de ScreensDesign). |
| Strava | Kudos como validación social de un tap; ejes de logro paralelos (velocidad/consistencia/participación); Trophy Case de badges permanentes; challenges mensuales; streaks semanales anti-burnout. |
| **Gmo hoy** | **Fortaleza:** 9 rangos + racha + heatmap + logros con medallas y celebración coreografiada + eventos con leaderboard + comunidades (= patrón multi-eje de Strava). **Pero** los 9 emblemas de rango son PNG en blanco, y el share no genera imágenes ricas. |

**Adoptamos:** emblemas reales (C1 — sin esto la fortaleza no se ve); **shareables autogenerados** estilo Hevy como motor de viralidad (M, patrón de mayor ROI social); banner de PR en vivo al completar el set (ya detectamos PRs — solo falta el banner in-workout, S). **Conservamos:** streak semanal basada en `weekly_goal_days` (validada por Hevy y Strava como el diseño correcto para gym; arreglar la deuda "racha no estricta" sin pasarla a diaria). **No adoptamos:** kudos como mecánica separada (nuestras reacciones ya lo cubren).

### D6 — Onboarding · Gap 🟢 Baja-Media

| App | Qué hace |
|---|---|
| Strong | 2 pasos + onboarding contextual just-in-time (modales al primer uso de cada feature); crítica: signup antes de valor. |
| Hevy | Log-first: primer set en <90s sin quiz; routine library (25+ programas) como arranque guiado opcional. |
| Fitbod | 14–20 pasos que empiezan por la **motivación** (no edad/peso); selección granular de equipo → confianza en la primera rutina; permiso de notificaciones **contextual con beneficio concreto**; tooltips progresivos por pantalla. |
| Strava | ~20 pantallas con find-friends (el grafo social es su time-to-value); paywall al final saltable; trial sin tarjeta. |
| **Gmo hoy** | 7 pasos (welcome→profile→level→goal→frequency→routine→final) con gating server-driven — bien posicionado entre los extremos. **Falta:** tooltips just-in-time tras el onboarding; permiso de notificaciones contextual (aplicará con B1). |

**Adoptamos:** permiso de notificaciones contextual con beneficio explícito cuando llegue push (patrón Fitbod, S — anotado como requisito de B1); tooltips progresivos en el primer workout (patrón Fitbod/Strong, M); carousel visual del onboarding (C2, reanimated-carousel). **No adoptamos:** alargar el quiz (Fitbod lo justifica porque su generador lo consume; el nuestro ya pregunta lo que usa).

### D7 — Estados vacíos/carga/errores · Gap 🟡 Media

**Honestidad metodológica:** ninguna de las 4 apps documenta públicamente sus **skeletons** ni ilustraciones de vacíos — esa parte se apoya en buenas prácticas. El gap-fill sí encontró evidencia de sus estrategias de **empty state y offline**:

| App | Qué hace |
|---|---|
| Strong | Cada pantalla vacía tiene **una acción primaria clara** (CTAs oficiales: "Start with an Empty Workout" / "Use a Template"); aun así el teardown critica que el home puede quedar vacío para usuarios nuevos. |
| Hevy | Offline **silencioso y no bloqueante**: se entrena sin red y sincroniza solo al reconectar; criticado el sign-up wall que esconde todo (incluido el primer empty state) tras el registro. |
| Fitbod | **Evita el empty state generando contenido**: el onboarding alimenta al generador y el home aterriza en un workout ya creado, nunca en una pantalla vacía. |
| Strava | Grabación offline-first con cola de subida; **degradación explícita** — las features online se deshabilitan con mensaje claro sin bloquear el core. |

| | Gmo hoy |
|---|---|
| Loading | 3 tratamientos distintos (shimmer a mano en feed, cajas grises estáticas en progreso, texto plano/spinner en el resto). |
| Empty states | Icono en círculo + texto + botón; sin ilustración. |
| Offline | Stores locales persistidos (logging funciona offline ✓, patrón validado por las 4). |

**Adoptamos:** skeleton unificado (C2-1, primera librería por ratio esfuerzo/impacto); ilustraciones unDraw/Lottie en empty states (C1/C2); **una acción primaria clara en cada pantalla vacía** (patrón Strong — auditar nuestros empty states para que todos tengan CTA); degradación offline explícita en features sociales (patrón Strava — mensaje claro en vez de spinner infinito, S). **No adoptamos:** sign-up wall antes de valor (anti-patrón criticado en Hevy; nuestro onboarding ya muestra valor antes).

### D8 — Lenguaje visual · Gap 🟡 Media

| App | Qué hace |
|---|---|
| Strong | Utilitario de alta densidad, "superclean"; dark + multi-tema; iconografía semántica mínima (checkbox/trofeo/corona); motion solo en demos. |
| Hevy | "Clean/modern", 3 temas (dark/light/auto); body diagram como gráfico identitario; adopción rápida del lenguaje de plataforma (liquid glass iOS 26, Live Activities). |
| Fitbod | Refresh de branding 2024; denso pero jerárquico; video/foto real como lenguaje dominante. |
| Strava | Sistema ejemplar: dark mode global 2024 (3 opciones), tipografía dual (Boathouse marca / Inter datos), Strava Orange + acentos, **sistema propio de 1.440 iconos**. |
| **Gmo hoy** | Paleta dark roja sólida y distintiva; botones 3D chunky (identitarios); tab bar con blur. **Falta:** iconos con trazo inconsistente (1.3–2.5, relleno vs línea, 3 sistemas — Icon/TabIcon/BicepIcon), sin lineHeight/letterSpacing en tokens, 89 hex hardcodeados, gold/plata/bronce sin tokenizar. |

**Adoptamos:** sistema de iconos unificado vía lucide (C2-3, la lección del sistema Strava a coste cero); tokens de line-height/letter-spacing y limpieza de hex (C0); mapa muscular como gráfico identitario nuestro (ya tenemos la librería — reforzarlo en stats/shareables, patrón Hevy). **No adoptamos:** tema claro (dark-only es decisión de identidad; Strava tardó una década — reevaluar solo si el mercado lo exige) ni tipografía custom de marca (coste/beneficio prematuro).

---

## 4. Fortalezas propias a conservar (lista de no-regresión)

Vinculante para C2/C3: ninguna adopción de librería puede degradar esto.

1. **AchievementUnlockModal** — confeti coreografiado, anillo expansivo, rebote, brillo. Si C3 introduce fast-confetti, debe **reemplazar partículas manteniendo la coreografía** (secuencia, timing, haptics).
2. **Summary del workout** (ring burst, frases motivadoras, gold de PR) y **RestRing** con ventana de recuperación verde.
3. **SetProgressPills** y micro-interacciones con haptics extendidos (`PressableScale`).
4. **Botones 3D chunky** (`Button` con edge/pressTravel) — identidad propia; no sustituir por botones planos de ninguna librería.
5. **Tab bar con blur** (expo-blur) y pull-to-refresh consistente.
6. **Racha semanal** basada en objetivo (`weekly_goal_days`) — validada como el diseño correcto por Hevy y Strava; no convertirla en racha diaria.

---

## 5. Roadmap de UI por fases

### C0 — Quick wins sin librerías (P0–P1, S/M)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| Tokenizar gold/plata/bronce + gradientes reutilizables en `src/theme/tokens.ts` | P0 | S | — | D8 · ✅ 2026-07-11 (`colors.medal` + `podiumColor()`; los gradientes metálicos siguen en `RANKS[].gradient`) |
| Añadir lineHeight/letterSpacing a tokens y a `Text.tsx`; migrar tipografía inline de `active.tsx` | P1 | M | — | D8 · ✅ 2026-07-13 (escala `letterSpacing` de 8 pasos + `fontSize.timer` 64; Text gana variants `overline`/`timer`, prop `tracking` y lineHeight SOLO en display-class; active.tsx y workout limpios de letterSpacing/fontSize inline) |
| Matar los 89 hex hardcodeados (32 en `src/`, 57 en `app/`) → tokens | P1 | M | tokens de gradiente | D8 · ✅ 2026-07-13 (quedaban 62; `app/` a CERO, `src/` solo excepciones documentadas: logos OAuth, PLATE_COLORS IWF, SVG de BicepIcon, paleta avatarColor, shadows. Tokens nuevos: `social.instagram(+Soft/Border)`, `decorative.violet/pink`, `successSoft`, `dangerSoft`) |
| Extraer `SegmentedControl`, `IconButton`, `Chip` a `src/components/ui/` (hoy reimplementados ≥4 veces) | P1 | M | — | D8 · ✅ 2026-07-13 (censo real: 9 toggles, ~24 botones circulares, ~5 chips; los 3 primitivos creados sobre PressableScale y todos los duplicados migrados. Exclusiones deliberadas: DayChip con spring propio, StepperButton chunky, bare-icons sin círculo) |
| Columna "anterior" + autofill por set en workout activo | P0 | M | — | D1 · ✅ 2026-07-11 (`previousExerciseSets` en `workoutCompare.ts`; autofill en warmup + línea "Anterior" en LogPhase) |
| Banner de PR en vivo al completar set (la detección ya existe en `workoutCompare.ts`) | P1 | S | — | D5 · ✅ 2026-07-11 (`historicMaxWeight` + `playSplash`, 1 vez por ejercicio/sesión) |
| CTA persistente "empezar entreno" (header del feed o botón flotante) | P0 | S–M | — | D2 · ✅ 2026-07-11 (FAB `StartWorkoutFab` en el feed: reanuda/empieza siguiente día/salta a Rutinas vía `tabsNav`) |
| Degradación offline explícita en features sociales (mensaje, no spinner) | P2 | S | — | D7 · ✅ 2026-07-17 (onlineManager cableado a NetInfo + `networkMode 'offlineFirst'` con `retry 0`; primitivos `EmptyState`/`ErrorState` en ui/ y auditoría completa: feed, discover ×4 tabs, notificaciones —antes pantalla en blanco—, progreso —antes skeleton infinito—, perfil/evento/comunidad separan error de "no existe", records, rutinas, connections; CTAs añadidos: Empezar entreno, Descubrir atletas, Publicar, Crear evento) · ✅ 2026-07-23 (revisión de sprint 5 encontró 6 pantallas donde el `isError` seguía sin comprobarse pese a la auditoría anterior: perfil propio y perfil público —tab Publicaciones—, connections —seguidores/seguidos y conflación con "usuario no encontrado"—, progress —timeline y leaderboard, este último además tapaba el leaderboard ya cacheado en vez de solo el vacío—, y las 3 sub-tabs de `communities/[id].tsx` —Muro/Eventos/Miembros, solo el guard de pantalla completa lo tenía—; nuevo hook compartido `src/lib/queryState.ts` (`useQueryState`, con tests) consolida el triage loading/error/empty en las ~12 pantallas para que este patrón no se repita ad-hoc por pantalla) |

### C1 — Assets críticos (P0 — bloqueado por ARTE, no por código)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| Icono de app + splash + adaptive-icon reales (hoy 68 bytes) | P0 | S código / arte externo | arte | D8 (primera impresión) |
| 9 emblemas de rango en `assets/ranks/` (sets Figma CC BY 4.0; mismo filename → cero cambio de código) | P0 | S código / arte externo | arte | D5 |
| Ilustraciones de empty states (unDraw/Open Peeps, CC0) en `assets/illustrations/` | P1 | S | — | D7 · ✅ 2026-07-24 (decisión de scope: en vez de descargar assets externos CC0 —riesgo de licencia/formato no verificable en este flujo—, 4 ilustraciones SVG propias con `react-native-svg` en `src/components/illustrations/`, sobre el slot `illustration` que `EmptyState.tsx` ya tenía listo. Wireadas en feed/rutinas/progreso/records vacíos. Mismo precedente que los emblemas de rango: reemplazables por arte real después sin tocar código) |

### C2 — Tier 1 Expo Go (orden recomendado)

| # | Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|---|
| 1 | ~~`react-native-skeleton-placeholder`~~ → primitivo propio `src/components/ui/Skeleton.tsx` — unificar los 3 tratamientos de loading | P1 | S | — | D7 · ✅ 2026-07-12 (la librería exige el peer nativo `react-native-linear-gradient`, que NO está en Expo Go → shimmer propio con Reanimated 4 + expo-linear-gradient; aplicado en feed, progreso, discover, comunidades, notificaciones y perfiles) |
| 2 | `@gorhom/bottom-sheet` v5 — consolidar los 11 modales improvisados (mayor impacto UX) | P0 | M–L | — | D1/D4/D8 · ✅ 2026-07-12 (wrapper `AppBottomSheet` + migrados: action sheet de FeedItem, ExercisePickerSheet ×3 pantallas, CommentSheet unificado posts/eventos, WeightDetail, ExerciseProgress con picker apilado. Exclusiones deliberadas como `Modal`: AchievementUnlockModal, WorkoutResultsModal, confirm-delete de FeedItem, ReactionPicker popover. Rutas modales nativas montan `BottomSheetModalProvider` local) |
| 3 | `lucide-react-native` — migración incremental vía fachada `Icon.tsx` (~48 iconos, 3 sistemas → 1) | P1 | M | — | D8 · ✅ 2026-07-12 (`lucide-react-native@1.24.0`; `Icon.tsx` = registry lucide con strokeWidth por icono y `filled`→fill; TabIcon y el EyeIcon de PasswordInput delegan en la fachada. Custom conservados: `scale` sin equivalente, `instagram` porque lucide removió marcas, `BicepIcon` dos tonos, logos OAuth) |
| 4 | `react-native-gifted-charts` — ejes, tooltips y selector de rango en TimeSeriesChart/WeightChart/barras de progreso | P0 | M | — | D3 · ✅ 2026-07-12 (TimeSeriesChart sobre `LineChart` con tooltip por long-press; barras de actividad de Progreso sobre `BarChart` con labels de día. Divergencia aceptada: gifted espacia por índice, no proporcional al timestamp) |
| 5 | `lottie-react-native` + ilustraciones en empty states y onboarding | P1 | S–M | C1 ilustraciones | D7/D6 · nota 2026-07-24: la dependencia C1 se cerró con SVG estático propio (`src/components/illustrations/`), no con animaciones Lottie — este ítem sigue pendiente tal cual si se quiere el salto a ilustración animada |
| 6 | ~~`react-native-reanimated-carousel`~~ → `react-native-pager-view` — onboarding visual | P2 | S–M | — | D6 · ✅ 2026-07-24 (`react-native-pager-view` YA era dependencia, usada en `app/(tabs)/_layout.tsx` — se reusó en vez de sumar una librería nueva. Los 7 pasos de `app/onboarding.tsx` viven en un `PagerView` con `scrollEnabled={false}`; el botón "Continuar" sigue siendo el único gate de validación, el pager solo aporta la transición nativa vía `setPage()`) |
| 7 | ThumbHash en `expo-image` + `recyclingKey` en FlashList (feed) | P2 | S | — | D7 · ✅ PARCIAL 2026-07-17 (`expo-image` en FeedItem ×3 fotos + Avatar con `cachePolicy memory-disk`/`transition`/placeholder `bg.elevated` y `recyclingKey` por post. PENDIENTE: thumbhash real — requiere columna en DB + hash al subir la imagen) · ✅ 2026-07-23 (la revisión encontró que Avatar en realidad NO reenviaba `recyclingKey` a su Image interno pese a lo que decía esta misma fila — corregido: prop `recyclingKey` añadida y pasada desde FeedItem; migradas también las 2 pantallas de perfil que seguían en `Image` de react-native — `PublicationCard` en profile.tsx y `PostCell` en profile/[username].tsx —, y extraído el bloque repetido de props expo-image de FeedItem a un `PostPhoto` compartido) |
| 8 | Plate calculator embebido en el input de peso (patrón Hevy; usa `@gorhom/bottom-sheet`) | P1 | M | C2-2 | D1 · ✅ 2026-07-12 (`src/lib/plates.ts` + `PlateCalculatorSheet` sobre AppBottomSheet; botón "Discos" en LogPhase solo para equipment barbell/smith; barra elegible 20/15/10 kg — 45/35/25 lb, sin persistir) |
| 9 | Heatmap muscular semanal con `react-native-body-highlighter` (ya instalada) en Progreso | P1 | M | — | D3 · ✅ 2026-07-12 (`WeeklyMuscleHeatmapCard` sobre el wrapper `MuscleMap`; datos reales vía `weeklySetsByMuscle` — semana actual corte lunes, fraccional 0.5; colores `STATUS_COLOR`, semanal fijo independiente del selector de período) |
| 10 | Shareables autogenerados (imagen de PR/racha/mes para IG Stories; ViewShot + plantillas) | P1 | M | C1 emblemas | D5 |
| 11 | Detalle de ejercicio como hub (tabs About/Historial/Records, accesible en pleno workout) | P1 | M | — | D4 · ✅ 2026-07-13 (`ExerciseDetailSheet` sobre AppBottomSheet — sin ruta nueva, cero cambios en el gate de navegación. Tabs Ficha/Historial/Récords; absorbe `ExerciseProgressModal` (eliminado). Entradas: hero pulsable en pleno workout, RecordCards de Récords, y Progreso) |

### C3 — Tier 2 (GATE: el mismo salto a development build que push B1 — no antes)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| `@shopify/react-native-skia` (base del tier) | P1 | L | dev build (B1) | D3/D5 |
| `react-native-graph` **o** `victory-native-xl` (elegir 1: graph si prima el line-chart 120fps de peso/1RM; victory si priman rings/tipos variados) | P1 | M | Skia | D3 |
| `react-native-fast-confetti` — sustituir partículas manuales **conservando la coreografía** (§4.1) | P2 | S–M | Skia | D5 |
| `burnt` (toasts nativos) — evaluar contra nuestro Toast propio; adoptar solo si mejora | P2 | S | dev build | D8 |
| Live Activities / lock screen del rest timer (patrón Hevy/Fitbod) | P1 | M–L | dev build + B1 push | D1 |
| Widgets de OS (calendario/actividad, patrón Strong/Hevy) | P2 | M–L | dev build | D2 |

---

## 6. Relación con visual-stack.md

- [memory/visual-stack.md](memory/visual-stack.md) es la **fuente única del QUÉ**: catálogo de librerías, tiers, compatibilidad New Arch/Reanimated 4 y la tabla de **exclusiones** (moti, wagmi-charts, confetti-cannon, toast-message, fast-image, moti/skeleton — ninguna aparece en este roadmap).
- Este documento es la **fuente única del CUÁNDO y POR QUÉ**: la antigua sección "Roadmap de adopción" de visual-stack.md (fases A/B) queda reemplazada por las fases C2/C3 de aquí, priorizadas por el benchmark.
- Cada fase cierra con `npm run typecheck` + `npm run lint` + smoke en Expo Go (o dev client en C3) + revisión del code-quality-reviewer.

## 7. Riesgos y supuestos

- **Benchmark por fuentes públicas:** sin acceso a las apps, los detalles finos (paletas exactas, microinteracciones) pueden estar desactualizados; los store listings (siempre vigentes) anclan lo esencial. Fecha de corte 2026-07-07.
- **D7 se apoya en buenas prácticas**, no en evidencia por app (declarado en §2).
- **Fitbod es 100% suscripción:** sus patrones describen una UX de pago; adoptarlos no implica adoptar su modelo.
- **gorhom/bottom-sheet (C2-2) es la migración más invasiva** (11 modales): hacerla incremental, un sheet por PR, empezando por ExercisePickerModal.
- **C3 no debe adelantarse:** ninguna dependencia de Skia entra mientras la app deba arrancar en Expo Go (regla de visual-stack.md).
- Los emblemas y el icono (C1) son el mayor ROI del roadmap y no dependen de ingeniería: encargar el arte es el paso crítico.

## 8. Apéndice — Fuentes del benchmark

Etiquetas: tipo de fuente según jerarquía de §2 · App(s) que respalda · Dimensiones donde se cita.

| Fuente | Tipo | Fecha | App(s) | Dimensiones |
|---|---|---|---|---|
| [About Fitbod Exercises – Fitbod](https://fitbod.me/about-fitbod-exercises/) | blog_oficial | s/f | Fitbod | D8 |
| [New And Improved Exercise History & Records – Fitbod Blog](https://fitbod.me/blog/exercise-history-and-records/) | blog_oficial | 2023-04-16 | Fitbod | D2 D3 D4 D5 |
| [Fitbod's 2024 Product Roundup – Fitbod Blog](https://fitbod.me/blog/fitbod-2024-product-roundup/) | blog_oficial | 2024-12-16 | Fitbod | D3 D4 D5 D8 |
| [Muscle Recovery – Fitbod's Help Center](https://fitbod.zendesk.com/hc/en-us/articles/360006269014-Muscle-Recovery) | blog_oficial | s/f | Fitbod | D3 |
| [Rest Timer – Fitbod's Help Center](https://fitbod.zendesk.com/hc/en-us/articles/360006340194-Rest-Timer) | blog_oficial | s/f | Fitbod | D1 |
| [Sharing a Workout & Gym Profile Settings – Fitbod Help Center](https://fitbod.zendesk.com/hc/en-us/articles/360006427453-Sharing-a-Workout-Gym-Profile-Settings) | blog_oficial | s/f | Fitbod | D2 D5 |
| [Can I use Fitbod without an internet connection? – Fitbod Help Center](https://fitbod.zendesk.com/hc/en-us/articles/360006572594-Can-I-use-Fitbod-without-an-internet-connection) | blog_oficial | s/f | Fitbod | D7 |
| [Everything You Need to Know About the Hevy App (2025 Features Guide)](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2025-Features-Guide) | blog_oficial | 2025 | Hevy | D3 D6 |
| [How to use the Plate Calculator? Logging and Adding Custom Plates and Bars](https://help.hevyapp.com/hc/en-us/articles/34518876511383) | blog_oficial | 2025 | Hevy | D1 |
| [How do I perform a workout with Strong? - Strong Help Center](https://help.strongapp.io/article/229-my-first-workout) | blog_oficial | s/f (vigente 2026) | Strong | D1 |
| [Strava Overhauls Strength Experience with Expanded Partner Ecosystem, New Workou](https://press.strava.com/articles/strava-overhauls-strength-experience-with-expanded-partner-ecosystem-new-workout-log-and-muscle-maps) | blog_oficial | 2026-05-21 | Strava | D1 |
| [Hello, Dark Mode - Strava Stories](https://stories.strava.com/articles/hello-dark-mode) | blog_oficial | 2024-06-26 | Strava | D8 |
| [Personal Heatmaps · Strava Help Center](https://support.strava.com/en-us/articles/15402028-personal-heatmaps) | blog_oficial | 2026 | Strava | D3 |
| [Training Log - Strava Support](https://support.strava.com/hc/en-us/articles/206535704-Training-Log) | blog_oficial | 2026 | Strava | D3 |
| [Recording an Activity · Strava Help Center](https://support.strava.com/hc/en-us/articles/216917397-Recording-an-Activity) | blog_oficial | 2026 | Strava | D7 |
| [The Strava Trophy Case - Strava Support](https://support.strava.com/hc/en-us/articles/216918557-The-Strava-Trophy-Case) | blog_oficial | 2026 | Strava | D5 |
| [Progress Summary Chart - Strava Support](https://support.strava.com/hc/en-us/articles/28437860016141-Progress-Summary-Chart) | blog_oficial | 2026 | Strava | D3 |
| [Fitness - Strava Support](https://support.strava.com/hc/en-us/articles/360032451811-Fitness) | blog_oficial | 2026 | Strava | D3 |
| [Strava Subscription Preview - Strava Support](https://support.strava.com/hc/en-us/articles/39188221577741-Strava-Subscription-Preview) | blog_oficial | 2026 | Strava | D6 |
| [Strength Training · Strava Help Center](https://support.strava.com/hc/en-us/articles/45450432871693-Strength-Training) | blog_oficial | 2026 | Strava | D1 D4 |
| [Hevy App Feature List](https://www.hevyapp.com/features/) | blog_oficial | 2025 | Hevy | D5 |
| [Create and Store Custom Exercises in Your Library - Hevy App](https://www.hevyapp.com/features/custom-exercises/) | blog_oficial | 2025 | Hevy | D4 |
| [Use the Discovery Feed to Find New Users - Hevy App](https://www.hevyapp.com/features/discovery-feed/) | blog_oficial | 2025 | Hevy | D2 |
| [Explore and Use the Exercise Library to Build Workouts - Hevy App](https://www.hevyapp.com/features/exercise-library/) | blog_oficial | 2025 | Hevy | D4 |
| [How to Track Gym and Exercise Performance - Hevy App](https://www.hevyapp.com/features/exercise-performance/) | blog_oficial | 2025 | Hevy | D3 D4 |
| [Track Your Gym Consistency & Streak With the Hevy Calendar](https://www.hevyapp.com/features/gym-consistency/) | blog_oficial | 2025 | Hevy | D5 |
| [Gym Performance Tracking (Tools, Graphs & Statistics) - Hevy App](https://www.hevyapp.com/features/gym-performance/) | blog_oficial | 2025 | Hevy | D3 |
| [Explore the Gym Workout Routine Library (25+ Programs) - Hevy App](https://www.hevyapp.com/features/gym-workout-routines/) | blog_oficial | 2025 | Hevy | D6 |
| [Hevy's Home Screen Widgets: Log Workouts & Track Progress](https://www.hevyapp.com/features/home-screen-widgets/) | blog_oficial | 2025 | Hevy | D2 |
| [Live Personal Record Notification (How it Works) - Hevy App](https://www.hevyapp.com/features/live-pr/) | blog_oficial | 2025 | Hevy | D5 |
| [Social Media Shareables - Show off Your Gym Progress With Hevy](https://www.hevyapp.com/features/shareable/) | blog_oficial | 2025 | Hevy | D5 |
| [Learn How to Use the Automatic Workout Rest Timer - Hevy App](https://www.hevyapp.com/features/workout-rest-timer/) | blog_oficial | 2025 | Hevy | D1 |
| [Explore 12 Workout Settings for Better Training - Hevy App](https://www.hevyapp.com/features/workout-settings/) | blog_oficial | 2025 | Hevy | D1 |
| [How to change the theme (light or dark)? (Android/iOS) - Hevy app](https://www.hevyapp.com/help/change-the-theme-android-ios/) | blog_oficial | 2025 | Hevy | D8 |
| [How to Use Hevy: Log Workouts, Track Progress & Socialize](https://www.hevyapp.com/hevy-tutorial/) | blog_oficial | 2025 | Hevy | D1 D2 |
| [Strong - Workout Tracker & Gym Log (web oficial)](https://www.strong.app/) | blog_oficial | 2026 | Strong | D3 D5 |
| [Fitbod: Gym & Fitness Planner - App Store](https://apps.apple.com/us/app/fitbod-gym-fitness-planner/id1041517543) | store | 2026 | Fitbod | D4 |
| [Hevy - Workout Tracker Gym Log - App Store](https://apps.apple.com/us/app/hevy-workout-tracker-gym-log/id1458862350) | store | 2026-07 | Hevy | D2 D8 |
| [Strava: Run, Bike, Hike - App Store](https://apps.apple.com/us/app/strava-run-bike-hike/id426826309) | store | 2026-07 | Strava | D2 |
| [Strong Workout Tracker Gym Log - App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577) | store | 2026 | Strong | D1 D2 D3 D4 D8 |
| [Strava - Kristopher Boyce (icon system)](https://kristopherboyce.com/work/strava/) | galeria | 2024 (aprox) | Strava | D8 |
| [Strava iOS Onboarding Flow · Mobbin](https://mobbin.com/explore/flows/a1cc2697-2224-4e70-b255-75b38a1748d9) | galeria | 2025 (aprox) | Strava | D6 |
| [Onboarding on Strava (Android) · Page Flows](https://pageflows.com/post/android/onboarding/strava/) | galeria | 2024-11 | Strava | D6 |
| [Fitbod: Gym & Fitness Planner · ScreensDesign](https://screensdesign.com/showcase/fitbod-gym-fitness-planner) | galeria | s/f | Fitbod | D1 D5 D6 D8 |
| [Strong Workout Tracker Gym Log · ScreensDesign](https://screensdesign.com/showcase/strong-workout-tracker-gym-log) | galeria | 2025 (aprox.) | Strong | D1 D2 D4 D6 D7 D8 |
| [Case Study: Hevy's New User Onboarding UX](https://himanshuprodesign.medium.com/new-user-onboarding-ux-hevys-activity-tracker-teardown-7b796b912636) | teardown | 2024-01 | Hevy | D6 |
| [Strava Gamification Strategy: How It Drives Retention (2026) - Trophy](https://trophy.so/blog/strava-gamification-case-study) | teardown | 2026-03-06 | Strava | D5 |
| [Fitbod - Onboarding flow · App Fuel](https://www.theappfuel.com/examples/fitbod_onboarding) | teardown | s/f | Fitbod | D6 |
| [Fitbod Review 2026 - Fitness Drum](https://fitnessdrum.com/fitbod-review/) | review | 2026-01-05 | Fitbod | D1 D3 |
| [Best Fitness Apps That Work Offline (2026 Guide) — FitCraft](https://getfitcraft.com/blog/best-fitness-apps-offline) | review | 2026 | Strong | D7 |
| [Strava for Strength Training - Why Gym Work Gets Ignored · Motion](https://motion-app.com/strava-for-strength-training/) | review | 2025 (aprox) | Strava | D1 |
| [Hevy vs Strong (2026): We Tested Both, One Pulled Ahead · PRPath](https://prpath.app/blog/strong-vs-hevy-2026.html) | review | 2026-06-10 | Strong | D1 D5 D6 D8 |
| [Hevy App Review: Best Free Strength Tracker? · RepReturn](https://repreturn.com/hevy-app-review/) | review | 2026-03 | Hevy | D6 D7 D8 |
| [What Font Does Strava Use in 2026? - Sensatype](https://sensatype.com/what-font-does-strava-use-in-2026) | review | 2026 | Strava | D8 |
| [Hevy vs Strong: Which Workout App Fits Your Training Style? - Setgraph](https://setgraph.app/ai-blog/hevy-vs-strong) | review | 2025 | Hevy | D8 |
| [Does Strava Work on Airplane Mode? - Spincyclehub](https://spincyclehub.com/does-strava-work-on-airplane-mode/) | review | 2025 (aprox) | Strava | D7 |
| [New Strava update makes big changes to layout, organization, and navigation - Ve](https://velo.outsideonline.com/road/road-racing/new-strava-update-makes-big-changes-to-layout-organization-and-navigation/) | review | 2024 | Strava | D2 |
| [Strava finally launches long-awaited dark mode · Advnture](https://www.advnture.com/news/strava-dark-mode) | review | 2024 | Strava | D8 |
| [Fitbod App Review - Autonomous](https://www.autonomous.ai/ourblog/fitbod-app-review) | review | 2025-06-13 | Fitbod | D2 |
| [Strava beta tests new app layout · You tab puts all your stats in one place · Bi](https://www.bikeradar.com/news/strava-beta-test-layout) | review | 2024 | Strava | D2 |
| [Strong App Review (2026): Minimalist Workout Logger · Cora App](https://www.corahealth.app/compare/strong) | review | 2026-04-18 | Strong | D5 |
| [Strong · Garage Gym Reviews](https://www.garagegymreviews.com/equipment/strong) | review | 2025 (aprox.) | Strong | D4 D7 |
| [Strong Review - Workout Tracker – The Nerdy Student](https://www.thenerdystudent.com/2021/08/strong-review/) | review | 2021-08-02 | Strong | D2 D3 D4 D5 |
| [Hevy Workout Tracker Gym Log · ScreensDesign (gap-fill)](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log) | galeria | 2025-2026 | Hevy | D7 |
| [Client App – Hevy Coach (gap-fill)](https://hevycoach.com/features/client-app/) | blog_oficial | 2026 | Hevy | D7 |
| [Strength Training – Strava Support (gap-fill)](https://support.strava.com/en-us/articles/15401547-strength-training) | blog_oficial | 2026 | Strava | D1 |
| [Strava Strength Training Features 2026 – GymLog (gap-fill)](https://gymlog.eu/en/blog/strava-strength-training-features-2026) | review | 2026-05-23 | Strava | D1 |
| [UI/UX Case Study: Fitbod Redesign – Medium (gap-fill)](https://medium.com/@yingshue/ui-ux-case-study-fitbod-fitness-application-redesign-942424ea4d93) | teardown | 2023-09-19 | Fitbod | D8 |
| [UI/UX Case Study: Strong Redesign – Medium (gap-fill)](https://medium.com/@hwaijunyap/ui-ux-case-study-strong-workout-app-redesign-fc22afbada65) | teardown | 2023-09-19 | Strong | D8 |
