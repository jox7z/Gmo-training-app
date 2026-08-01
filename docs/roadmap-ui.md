# Roadmap UI — Gmo Training App (Pista C)

> **Fecha base:** 2026-07-07 · **Revisión incremental:** 2026-08-01 · **Base:** v0.1.0, rama `feat/initial-app-foundation` · Complementa [roadmap.md](roadmap.md) (Pista C = UI/UX)
>
> **Leyenda de prioridad:** P0 (crítico) · P1 (importante) · P2 (deseable)
> **Leyenda de esfuerzo:** S (<1/2 día) · M (1–3 días) · L (1+ semana)
> **Severidad de gap:** 🔴 Alta (flujo core diario o primera impresión) · 🟡 Media (comprensión/retención) · 🟢 Baja (pulido)
>
> Catálogo de librerías, tiers y exclusiones: [memory/visual-stack.md](memory/visual-stack.md) (el QUÉ). Este documento decide el CUÁNDO y POR QUÉ.

---

## 1. Resumen ejecutivo

**Top 5 gaps** (benchmark vs Strong, Hevy, Fitbod y Strava):

1. 🔴 **Smoke pre-release pendiente** — los flujos críticos y layouts necesitan validación física en Expo Go: 360/390/430/768 px, lifecycle, publicación, privacidad y paginación. → **B1**
2. 🟡 **Shareables visuales incompletos** — la tarjeta social factual y el share
   externo de texto ya usan duración/series/reps/trabajo/músculos/ejercicios;
   faltan plantillas de imagen para PR/racha/mes y mapa muscular. → **C2-10**
3. 🟡 **Logging competitivo con profundidad pendiente** — anterior/autofill, PR en vivo, validación, plate calculator y supersets ya están; faltan RPE opt-in y warm-up automático. → **B2**
4. 🟡 **Biblioteca sin media animada licenciable** — el hub Información/Historial/Récords ya es accesible en pleno entreno. El catálogo conserva 220 IDs e imágenes offline; exercises-dataset aporta 46 instrucciones, pero sus GIF/thumbnail pertenecen a Gym visual y no se pueden reutilizar sin licencia. → **B2**
5. 🟡 **Sistema visual todavía inconsistente** — C0/C1 ya añadió tipografía,
   primitivas, robot GMO, mascota compartida y crests; C2 convirtió las superficies
   sociales en stream edge-to-edge. Siguen pendientes la fachada única de iconos,
   bottom sheets y limpieza de hex; el skeleton compartido ya está aplicado. Perfil propio ya usa
   dashboard virtualizado con tabs sticky y `FeedItem` compartido.

**Top 3 fortalezas a conservar** (ninguna migración puede degradarlas — ver §4):

1. **Celebraciones coreografiadas propias** (AchievementUnlockModal, mascota del summary, RestRing) — el teardown de Fitbod critica su confetti como "genérico"; el nuestro está diferenciado.
2. **Gamificación multi-eje ya construida** — rangos + rachas + heatmap + retos + comunidades replican el patrón Strava de "rutas de motivación paralelas" que Strong y Fitbod no tienen.
3. **Stack social completo** (feed, reacciones, comentarios, realtime, perfiles) — equivalente al de Hevy, por delante de Strong/Fitbod.

**Lectura de fases:** C0 y los assets críticos de C1 quedaron mayormente resueltos
el 2026-07-19; C2 continúa incremental en Expo Go. Skia 2.2.12 está incluida en
Expo Go SDK 54, pero hoy no tiene imports; C4 sigue aplazada hasta medir su valor y
verificar individualmente cualquier otro módulo nativo.

**Delta de producto 2026-07-22:** Strava y Hevy validan que convertir el log en
contenido compartible sí distribuye la app. GMO adopta esa parte. No adopta Focus
Exercises ni ciclos prescritos de Fitbod: el alcance actual es registro, historial,
progreso factual y red social, sin guía automática.

**Delta 2026-07-26:** prioridad pre-release. Rutinas dejan de mostrar score `/100`,
mapa óptimo/bajo/exceso y consejos automáticos. Perfil propio funciona como dashboard
personal. Se mantiene Expo Go; C4 nativo y notificaciones quedan aplazados.

**Delta Sprint C3 2026-07-28:** `GMO Rating` radial reemplaza el score verboso;
Progreso usa calendario mensual 6×7 y mapa de hitos con evidencia real en cuatro
levantamientos, no volumen ni 1RM estimado. Feed celebra rangos con crests y se
actualiza sin mover la lista. Perfil propio es compacto y el editor numérico usa
IDs estables. Gates automáticos pasan; smoke físico sigue pendiente.

**Recuperación 2026-07-29:** C3 fue reconstruido desde 285 ediciones exactas;
la regresión Fabric eleva la base a 20 suites/122 tests con typecheck/lint limpios.

**Delta workout visual 2026-07-29:** el registro activo adopta ritmo abierto:
menos contenedores/bordes, datos principales dominantes, progreso neutro y rojo
reservado al CTA/PR/estado. `WorkoutMetric` unifica peso, reps, tiempo y resumen.
Cada descanso muestra al robot GMO con una entrada finita y frase estable;
`RestRing` deja de afirmar recuperación o prescribir minutos. Se retiraron splash,
glow, gradiente de descanso, pulso y copy rotatorio. El editor anuncia pesos
decimales como texto accesible para evitar la conversión entera de Fabric.

**Delta visual general 2026-07-29:** la navegación visible pasa a
`Social · Comunidad · Ejercicio · Progreso · Perfil` sin alterar keys ni orden del
PagerView. Social conserva solo título, búsqueda y notificaciones; el refresh usa
el mark PNG transparente, sin botón robot. La escala compartida vuelve a radios
casi rectos, cards/botones ordinarios pierden glow, `Stat` concentra datos
repetidos y el rojo queda para acciones, récords y estados. El calendario mensual
mantiene 6×7 con separación GitHub de 4 px.

**Refinamiento visual 2026-08-01:** targets compartidos suben a 44 px y la tab bar
consume `glass.tabBar`. Entrenamiento activo elimina transiciones decorativas y
copy rotatorio; Summary usa entradas declarativas que obedecen Reduce Motion.
Progreso prioriza ejercicio+métrica sin ampliar la superficie de datos. Rutinas,
Perfil y ledgers sustituyen decoración repetida por secciones abiertas. Gates
automáticos pasan; smoke físico Expo Go sigue pendiente.

**Delta historial local 2026-08-01:** el ledger permite repetir una sesión con
confirmación ante una activa; los selectores priorizan ejercicios recientes sin
preferencias guardadas y Actividad abre una hoja estable de filtros locales. No hay
cambio de Supabase, gráficas, calendario ni persistencia nueva.

**Delta navegación 2026-08-01:** la sesión arranca en Entreno; el pull-to-refresh
de Social, Perfil y Progreso usa el mark GMO transparente sin traducir el contenido
y una sola vuelta de 540 ms. El rebote vertical queda desactivado en las listas
principales; el smoke físico sigue pendiente.

**Delta Rutinas 2026-08-01:** el inicio de entreno usa una tarjeta plana con la
mascota GMO 2D transparente y nombres de rutina/día; no hay shell oscuro cuadrado
alrededor de ella. Cambiar rutina abre una hoja dark coherente y el volumen semanal
lista músculos individuales en cuadrícula, sin buscador. Gates automáticos pasan;
falta smoke físico.

**Ajuste CTA 2026-08-01:** `Empezar entreno` usa el segundo GMO de “Mascota
principal” de la lámina, sobre fondo oscuro con texto y chevron naranja.

**Delta 2D 2026-08-01:** `Button` deja el relieve chunky y conserva una sola
superficie plana con targets de 44 px. `Registrar peso` usa una báscula analógica
2D. GMO usa los recortes transparentes de la lámina entregada para motivar durante
una serie, descansar y celebrar PR: la primera es estática con Reduce Motion y la
última brota una vez al cerrar una sesión que realmente supera el historial previo.
`Registrar peso` muestra GMO señalando una tabla corporal sin alterar su formulario.
El encabezado del ejercicio seleccionado suma una variante plana con diadema y
cuaderno, situada a la derecha sin competir con la tendencia real.

**Delta agentes visuales 2026-07-26:** dirección `gym editorial industrial` para
adultos jóvenes gym-first. MotionSites aporta composición/coreografía, nunca
cursores/WebGL/scroll web; Hevy aporta logging+progreso+social; Nike aporta lenguaje
editorial deportivo. Gymshark se usa solo como referencia cultural/brand porque su
Training App dejó de recibir actualizaciones. Cinco agentes separan dirección,
implementación RN, motion, QA visual y auditoría de rendimiento; las reglas
reutilizables viven en skills y los cambios cross-layer escalan a Supabase.

---

## 2. Método y fuentes

- **Benchmark:** Strong, Hevy, Fitbod y Strava × 8 dimensiones (D1–D8), ejecutado el **2026-07-07** y revisado el **2026-07-19** exclusivamente con **fuentes públicas** (sin acceso a las apps instaladas): store listings y changelogs, blogs/help centers oficiales, galerías de patrones (ScreensDesign, Page Flows, Mobbin), teardowns editoriales y reviews comparativas. La revisión incremental priorizó fuentes oficiales y añadió los lanzamientos de fuerza de Strava, el sync de Hevy y Focus Exercises de Fitbod.
- **Jerarquía de confiabilidad:** oficial > store > galería > teardown > review > comunidad. Cada hallazgo lleva etiqueta de confianza; los claims sin fuente se descartaron.
- **Verificación independiente:** una pasada de verificación cruzó la matriz de cobertura 4×8 (sin celdas vacías; las celdas flojas —Hevy D7, Fitbod D8, Strava D1-en-vivo— se reforzaron con una ronda de gap-fill dirigida) y spot-checkeó 8 URLs de los claims principales: 7 confirmadas textualmente, 1 parcial — la cifra "14B kudos en 2025" atribuida al case study de Trophy **no aparece en la fuente y se retiró** del benchmark.
- **Limitaciones declaradas:** (a) **D7 (estados vacíos/carga)** tiene evidencia pública débil en las 4 apps — los skeletons y empty states no se documentan públicamente; esa fila del benchmark se apoya en buenas prácticas, no en evidencia por app. (b) La **tipografía/paleta exacta** de Strong, Hevy y Fitbod no está documentada públicamente (sí la de Strava). (c) Fitbod es 100% suscripción: toda su UX descrita es de pago. (d) El teardown de Fitbod en growth.design citado en la planificación no está indexado; se sustituyó por App Fuel + ScreensDesign.
- **Marcadores:** las features de pago se marcan [PRO] en el apéndice; la fila "Gmo hoy" sale de la auditoría interna del código, repetida el 2026-07-19 para assets y deuda visual.

---

## 3. Benchmark por dimensión

### D1 — Logging durante el entreno · Gap 🔴 Alta

| App | Qué hace |
|---|---|
| Strong | Tabla tipo planilla: checkbox por set, "previous" en gris por fila, rest timer auto-iniciado prominente, swipe para borrar, drag & drop, tipos de set (warm-up/failure/drop), RPE. Plate/warm-up calculator = Pro. |
| Hevy | Tap en checkmark = set completado + rest timer (una interacción, doble efecto). Columna "anterior" con autofill. **Plate calculator dentro del teclado de peso.** Complejidad opt-in (RPE 6–10, superset scrolling). Live Activities en lock screen. |
| Fitbod | Sets precargados por el algoritmo (loggear = confirmar). Rest timer notifica **fuera de la app** (tono/vibración/lock screen). Exertion rating post-ejercicio. Desde 2026, Focus Exercises fija lifts prioritarios en ciclos progresivos de 4 semanas. Riesgo documentado: overlay del timer tapa los inputs. |
| Strava | Log de fuerza renovado (2026-05): importa detalle desde 14 partners o permite añadirlo manualmente; se pueden editar ejercicios, series, reps, peso y tiempo. Recalcula sets/volumen y muscle map. Sigue sin ser captura en vivo especializada: no documenta rest timer, supersets ni RPE por serie. |
| **Gmo hoy** | Tracking set-by-set con RestRing, SetProgressPills, timestamp de descanso persistido, serie anterior/autofill protegido, PR en vivo, validación, plate calculator métrica/imperial y supersets. **Falta:** notificación fuera de la app, warm-up automático y RPE opt-in. |

**Adoptamos:** notificación local del rest timer (ya es B1 — la evidencia de Fitbod confirma que es el estándar); columna "anterior" + autofill por set (patrón Strong/Hevy, S–M, sin librerías); plate calculator embebido en el input de peso (patrón Hevy, el mejor de los cuatro); RPE opt-in. **No adoptamos:** la densidad tipo planilla de Strong — nuestro logging "hero interactivo" es diferenciador; tampoco el overlay de timer que tape inputs (anti-patrón documentado de Fitbod).

### D2 — Home/dashboard y navegación · Gap 🟡 Media

| App | Qué hace |
|---|---|
| Strong | Abre directo en Templates para empezar a entrenar en segundos; dashboard con widgets vive en Profile; widgets de iOS (calendario, actividad). |
| Hevy | Home = feed social con toggle Discover; tab Workout dedicado a rutinas/arranque; analíticas en Profile; widgets de OS. |
| Fitbod | El home ES el workout del día ya generado: empezar = 1 tap. Gym Profiles conmutables regeneran la rutina según equipo. |
| Strava | Feed social como home; 5 tabs con **botón Record central** como CTA permanente; tab You consolida todo lo personal con tarjetas expandibles. |
| **Gmo hoy** | Social = feed principal (patrón Hevy/Strava ✓) con 5 tabs swipeables: Social, Comunidad, Ejercicio, Progreso y Perfil. El CTA persistente inicia el próximo día o reanuda una sesión activa. **Falta:** widgets de OS y calendario real para sugerir el día. |

**Adoptado 2026-07-19:** CTA de inicio/continuación siempre visible sobre el Feed, sin alterar la tab bar ni el recycler. **Aplazamos:** widgets de OS (requieren dev build y módulos nativos → tras C4/B1, P2).

### D3 — Progreso y gráficas · Gap 🔴 Alta

| App | Qué hace |
|---|---|
| Strong | Charts por ejercicio (mejor serie, fuerza estimada y trabajo) + tab Records por ejercicio; calendario de consistencia con PRs por sesión. Advanced charts = gancho del paywall. |
| Hevy | Body graph muscular de 7 días como cabecera; sets por grupo muscular con rangos 30d/3m/año; selector de carga, fuerza estimada, trabajo y reps; Strength Level comparado por edad/peso/sexo. |
| Fitbod | 7 métricas graficables por ejercicio; Strength Score 0–100 por músculo; **muscle recovery heatmap** (frescura % por músculo); Focus Exercises usa estimaciones, PRs y promedios dentro de un ciclo de 4 semanas. |
| Strava | Progress Summary Chart **interactiva con drill-down** (tap en semana → lista de actividades) y comparativas de rangos (1w–52w); Training Log visual; heatmaps. |
| **Gmo hoy** | Tendencia por ejercicio con carga, repeticiones o tiempo registrado; picker buscable con miniaturas locales; calendario mensual 6×7 con ledger por día; mapa de hitos de banca/sentadilla/peso muerto/press militar con carga, reps, fecha y sesión. El peso corporal vive separado. No diagnostica, estima 1RM ni compara población. |

**Adoptamos:** gráfica con ejes/tooltips/selector de rango; Records basados en
series completadas; selector visual/buscable del historial real; selector de
carga/reps/tiempo y lenguaje llano. Trabajo queda solo como dato de ledger/social.
**No adoptamos:** fuerza estimada, fórmulas opacas, diagnósticos automáticos por
una sola sesión ni Strength Level social por demografía. El mapa de hitos es una
lectura del propio historial y sus cuatro tracks existentes, nunca “élite”.

### D4 — Biblioteca de ejercicios · Gap 🟡 Media-Alta

| App | Qué hace |
|---|---|
| Strong | Animación en loop por ejercicio; detalle en 4 tabs (About/History/Charts/Records) **accesible tocando el nombre en pleno workout**; custom exercises al vuelo. |
| Hevy | 400+ ejercicios con animación demo + instrucciones paso a paso; filtros duales equipo+músculo; el detalle fusiona documentación con historial personal; custom con cap de 7 en free. |
| Fitbod | 1.000+ videos HD profesionales multi-ángulo; filtro por equipo del Gym Profile; detalle = hub (video + cues + score + trends). |
| Strava | Biblioteca para añadir/cambiar ejercicios y editar series después de la actividad; sin media instructiva ni ejercicios custom documentados. El valor diferencial es convertir esos datos en muscle map, feed y shareables. |
| **Gmo hoy** | 220 ejercicios con WebP offline y hub Información/Historial/Récords accesible desde workout/Progreso. 46 instrucciones se amplían desde exercises-dataset con commit fijado; su media no se usa por licencia. `gif_url` sigue vacío y ejercicios custom no tienen UI. |

**Adoptamos:** GIFs/animaciones en loop (B2; formato loop tipo Strong/Hevy — no video profesional tipo Fitbod, que es pipeline de contenido L); detalle de ejercicio como hub con historial/records accesible durante el entreno (patrón Strong, M); custom exercises UI (B2); filtros equipo+músculo. **No adoptamos:** producción de video profesional (coste desproporcionado a nuestra etapa).

### D5 — Celebraciones y gamificación · Gap 🟢 Baja (mecánicas) / 🔴 Alta (assets)

| App | Qué hace |
|---|---|
| Strong | Anti-gamificación deliberada; PR sobrio en tiempo real con trofeo. |
| Hevy | Live PR banner al completar el set; streak **semanal** (anti-burnout); **shareables autogenerados customizables** para IG Stories (PRs, streaks, year in review). |
| Fitbod | Records celebrando PRs/milestones + Milestones para veteranos (100+ workouts); su celebración post-entreno es criticada como "genérica" (fuente única: teardown de ScreensDesign). |
| Strava | Kudos como validación social de un tap; ejes de logro paralelos; Trophy Case, challenges y streaks semanales. En fuerza genera cinco shareables (stats + muscle map, vistas frontal/trasera y variantes transparentes/compactas). |
| **Gmo hoy** | **Fortaleza:** 9 rangos con crests originales + racha + heatmap + logros + PR en vivo + eventos/comunidades. El workout ya tiene tarjeta social compartida y texto externo con métricas reales; faltan plantillas exportables como imagen. |

**Adoptado 2026-07-22:** tarjeta factual común en compositor/Feed y share externo
con datos reales. **Siguiente:** imagen autogenerada con mapa muscular como motor de
viralidad. **Conservamos:** streak semanal basada en `weekly_goal_days`. **No
adoptamos:** kudos separado ni consejos automáticos.

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

**Adoptado:** skeleton compartido propio sin dependencia nueva (C2-1) y **una acción primaria clara en cada pantalla vacía**. **Pendiente:** degradación offline explícita en superficies sociales. **No adoptamos:** sign-up wall antes de valor ni librerías de skeleton/empty state redundantes.

### D8 — Lenguaje visual · Gap 🟡 Media

| App | Qué hace |
|---|---|
| Strong | Utilitario de alta densidad, "superclean"; dark + multi-tema; iconografía semántica mínima (checkbox/trofeo/corona); motion solo en demos. |
| Hevy | "Clean/modern", 3 temas (dark/light/auto); body diagram como gráfico identitario; adopción rápida del lenguaje de plataforma (liquid glass iOS 26, Live Activities). |
| Fitbod | Refresh de branding 2024; denso pero jerárquico; video/foto real como lenguaje dominante. |
| Strava | Sistema ejemplar: dark mode global 2024 (3 opciones), tipografía dual (Boathouse marca / Inter datos), Strava Orange + acentos, **sistema propio de 1.440 iconos**. |
| **Gmo hoy** | Paleta dark roja, botones 2D planos y tab bar con blur/scale/haptics. C0 añadió tipografía con line-height/letter-spacing, metales/gradientes y `Chip`/`IconButton`/`SegmentedControl`. **Falta:** migrar usos duplicados, unificar 3 sistemas de iconos y eliminar 88 hex fuera de tokens. |

**Adoptamos:** fachada interna de iconos, tokens de line-height/letter-spacing y
limpieza gradual de hex. El mapa de volumen queda como referencia factual de series
equivalentes en planificación y puede reutilizarse en shareables; Progreso usa
hitos de fuerza propios. Ninguno se convierte en recuperación o diagnóstico.
**No adoptamos:** tema claro
ni tipografía custom.

---

## 4. Fortalezas propias a conservar (lista de no-regresión)

Vinculante para C2/C4: ninguna adopción de librería puede degradar esto.

1. **AchievementUnlockModal** — confeti coreografiado, anillo expansivo, rebote, brillo. Si C4 introduce fast-confetti, debe **reemplazar partículas manteniendo la coreografía** (secuencia, timing, haptics).
2. **Summary del workout** (mascota + registro factual) y **RestRing** como tiempo
   transcurrido neutral. No afirmar recuperación ni reintroducir comparativas.
3. **SetProgressPills** estable y neutral; sin loop decorativo. Haptics solo en
   acciones mediante `PressableScale`.
4. **Botones 2D planos** (`Button` compartido) — conservan contraste, haptic y targets sin edge ni pressTravel.
5. **Tab bar con blur** (expo-blur) y pull-to-refresh inmóvil con el mark GMO:
   una vuelta por actualización, sin loop.
6. **Racha semanal** basada en objetivo (`weekly_goal_days`) — validada como el diseño correcto por Hevy y Strava; no convertirla en racha diaria.

---

## 5. Roadmap de UI por fases

### C0 — Quick wins sin librerías (P0–P1, S/M)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| ✅ Tokenizar gold/plata/bronce + gradientes reutilizables en `src/theme/tokens.ts` (2026-07-19) | P0 | S | — | D8 |
| ✅ Añadir lineHeight/letterSpacing a tokens y a `Text.tsx`; migrar tipografía crítica de `active.tsx` (2026-07-19) | P1 | M | — | D8 |
| Matar las 88 ocurrencias hex fuera de tokens (`rg -o` en `src/` + `app/`) | P1 | M | tokens de gradiente | D8 |
| ✅ Crear y migrar `SegmentedControl`, `IconButton`, `Chip` en Discover/Eventos (2026-07-19; migración restante incremental) | P1 | M | — | D8 |
| ✅ Columna "anterior" + autofill protegido por set (2026-07-19) | P0 | M | — | D1 |
| ✅ Banner de PR en vivo al completar set (2026-07-19) | P1 | S | — | D5 |
| ✅ CTA persistente “empezar/continuar entreno” sobre el Feed (2026-07-19) | P0 | S–M | — | D2 |
| ✅ Degradación de error/red explícita en Feed, Buscar, Eventos, Ranking y Comunidades (2026-07-19) | P2 | S | — | D7 |

### C1 — Assets críticos (P0 — identidad base completada)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| ✅ Robot GMO como icono/splash/adaptive/fav + pose base 2D y recortes transparentes de la lámina para motivación, descanso y PR (2026-08-01) | P0 | S | — | D8 |
| ✅ 9 emblemas de rango originales con alpha (2026-07-19) | P0 | S | — | D5 |
| Ilustraciones de empty states (unDraw/Open Peeps, CC0) en `assets/illustrations/` | P1 | S | — | D7 |

### C2 — Tier 1 Expo Go (orden recomendado)

| # | Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|---|
| 1 | 🟡 `Skeleton`/`SkeletonGroup` interno: Feed, conexiones, posts propios y peso listos; faltan notificaciones/discovery/comunidades (2026-07-22) | P1 | S | — | D7 |
| 2 | `@gorhom/bottom-sheet` v5 — consolidar los 11 modales improvisados (mayor impacto UX) | P0 | M–L | — | D1/D4/D8 |
| 3 | `lucide-react-native` — migración incremental vía fachada `Icon.tsx` (~48 iconos, 3 sistemas → 1) | P1 | M | — | D8 |
| 4 | ✅ `TimeSeriesChart`: ejes, tooltip, accesibilidad, selector y apertura de la sesión exacta (2026-07-22) | P0 | M | — | D3 |
| 5 | `lottie-react-native` + ilustraciones en empty states y onboarding | P1 | S–M | C1 ilustraciones | D7/D6 |
| 6 | `react-native-reanimated-carousel` — onboarding visual | P2 | S–M | — | D6 |
| 7 | ThumbHash en `expo-image` + `recyclingKey` en FlashList (feed) | P2 | S | — | D7 |
| 8 | ✅ Plate calculator embebido para barra, kg/lb y discos configurables (2026-07-19; Modal nativo) | P1 | M | — | D1 |
| 9 | ✅ Score prescriptivo retirado y reemplazado por score transparente; mapa factual compartido + selector muscular en grid (2026-07-27) | P0 | M | — | D3 |
| 10 | 🟡 Tarjeta workout + texto externo listos y endurecidos (2026-07-22); faltan imágenes PR/racha/mes + mapa muscular y privacidad real | P0 | M | C1 emblemas | D5 |
| 11 | ✅ Hub Información/Historial/Récords accesible desde workout y Progreso (2026-07-19) | P1 | M | — | D4 |
| 12 | ✅ Stream social edge-to-edge: móvil full width, tablet 600 px, fotos 4:5 y galería pública 3 columnas (2026-07-22) | P0 | M | — | D2/D5/D7 |
| 13 | ✅ Secciones informativas sin bordes laterales vía `Card section`; controles conservan marco (2026-07-22) | P0 | S | — | D8 |
| 14 | ✅ Selector de progreso escalable: sheet fijo, miniaturas locales, recientes, más entrenados, búsqueda y filtros músculo/equipo; tendencias sin métrica Trabajo (2026-07-24) | P0 | S | — | D3/D4 |
| 15 | ✅ Repetición desde ledger, recientes en cambio/editor y filtros locales de Actividad (2026-08-01); sin favoritos ni backend | P0 | S | — | D1/D2/D4 |

### C3 — Tier 2 (GATE: evaluación de valor, compatibilidad y profiling físico)

| Item | Prioridad | Esfuerzo | Depende de | Dimensión |
|---|---|---|---|---|
| `@shopify/react-native-skia` (base del tier) | P1 | L | Expo Go SDK 54 + profiling físico | D3/D5 |
| `react-native-graph` **o** `victory-native-xl` (elegir 1: graph si prima el line-chart 120fps de peso/trabajo; victory si priman rings/tipos variados) | P1 | M | Skia | D3 |
| `react-native-fast-confetti` — sustituir partículas manuales **conservando la coreografía** (§4.1) | P2 | S–M | Skia | D5 |
| `burnt` (toasts nativos) — evaluar contra nuestro Toast propio; adoptar solo si mejora | P2 | S | dev build | D8 |
| Live Activities / lock screen del rest timer (patrón Hevy/Fitbod) | P1 | M–L | dev build + B1 push | D1 |
| Widgets de OS (calendario/actividad, patrón Strong/Hevy) | P2 | M–L | dev build | D2 |

---

## 6. Relación con visual-stack.md

- [memory/visual-stack.md](memory/visual-stack.md) es la **fuente única del QUÉ**: catálogo de librerías, tiers, compatibilidad New Arch/Reanimated 4 y la tabla de **exclusiones** (moti, wagmi-charts, confetti-cannon, toast-message, fast-image, moti/skeleton — ninguna aparece en este roadmap).
- Este documento es la **fuente única del CUÁNDO y POR QUÉ**: la antigua sección "Roadmap de adopción" de visual-stack.md (fases A/B) queda reemplazada por las fases C2/C3 de aquí, priorizadas por el benchmark.
- Cada fase cierra con `npm run typecheck` + `npm run lint` + smoke en Expo Go (o development build solo si una dependencia lo exige) + revisión del code-quality-reviewer.

## 7. Riesgos y supuestos

- **Benchmark por fuentes públicas:** sin acceso a las apps, los detalles finos (paletas exactas, microinteracciones) pueden estar desactualizados. Última revisión incremental: 2026-07-19.
- **D7 se apoya en buenas prácticas**, no en evidencia por app (declarado en §2).
- **Fitbod es 100% suscripción:** sus patrones describen una UX de pago; adoptarlos no implica adoptar su modelo.
- **gorhom/bottom-sheet (C2-2) es la migración más invasiva**: recalcular el
  inventario después de retirar los modales antiguos de Progreso y migrar un
  sheet vivo por PR, empezando por comentarios.
- **C3 no debe adelantarse:** Skia puede correr en Expo Go SDK 54, pero no se adopta
  sin imports reales, beneficio medido y profiling físico; otras dependencias nativas
  se verifican individualmente (regla de visual-stack.md).
- Robot GMO, mascota de vacíos y emblemas C1 ya no bloquean. El riesgo visual
  inmediato pasa a validar safe-area/máscaras y Summary en dispositivos.

## 8. Apéndice — Fuentes del benchmark

Etiquetas: tipo de fuente según jerarquía de §2 · App(s) que respalda · Dimensiones donde se cita.

| Fuente | Tipo | Fecha | App(s) | Dimensiones |
|---|---|---|---|---|
| [MotionSites Templates](https://motionsites.ai/templates) | galería_oficial | 2026 | Dirección web/motion | D8 |
| [Nike Training Club](https://www.nike.com/help/a/ntc-info) | blog_oficial | 2026 | Nike | D6 D8 |
| [Gymshark Training App](https://support.gymshark.com/en/articles/11185911-the-gymshark-training-app) | blog_oficial | 2026-03-17 | Gymshark, referencia brand; producto retirado | D6 D8 |
| [Hevy UI Breakdown](https://screensdesign.com/showcase/hevy-workout-tracker-gym-log) | galería | 2026 (consulta) | Hevy | D1 D2 D6 D7 D8 |
| [Tailored Campaigns — Meta for Business](https://www.facebook.com/business/ads/automation/tailored-campaigns) | blog_oficial | 2026 (consulta) | Instagram/Meta | D2 D5 D7 |
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
| [Strength Training · Strava Help Center](https://support.strava.com/hc/en-us/articles/45450432871693-Strength-Training) | blog_oficial | 2026-05-21 | Strava | D1 D3 D4 D5 |
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
| [Muscle Map for Strength Activities – Strava Support](https://support.strava.com/en-us/articles/15401529-muscle-map-for-strength-activities) | blog_oficial | 2026-07 | Strava | D3 D5 |
| [Hevy Community Update: July 2026](https://www.hevyapp.com/community-updates/july-26/) | blog_oficial | 2026-07 | Hevy | D1 D5 |
| [Focus Exercises – Fitbod Help Center](https://help.fitbod.me/hc/en-us/articles/35301260960663-Focus-Exercises) | blog_oficial | 2026-06-02 | Fitbod | D1 D3 D6 |
