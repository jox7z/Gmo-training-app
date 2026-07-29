# Gmo Training App — Overview

## Qué es

App móvil de entrenamiento de fuerza estilo Strava: registro de workouts,
sistema de ranking de 9 niveles (Rookie→Olympus), feed social,
logros offline por niveles, comunidades, eventos y heatmap anual.

## Stack

- **Frontend:** React Native + Expo SDK 54, expo-router, TypeScript strict
- **Estado:** Zustand + React Query
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Generación:** estructura heurística local; sin reasoning, score ni coach
- **Build/Distribución:** EAS Build (APK para preview, AAB para producción)
- **Diseño:** Modo oscuro, tokens custom, iconografía SVG propia

## Sistema visual y agentes

- Dirección: `gym editorial industrial` para adultos jóvenes gym-first; negro,
  crema GMO y rojo, métricas protagonistas, superficies rectas y social 4:5.
- `gmo-visual-director` define brief/allowlist; `react-native-ui-engineer`
  implementa presentación; `motion-performance-engineer` añade motion medido.
- `mobile-visual-qa` y `react-native-performance-auditor` son read-only.
- Agentes visuales consumen skills compartidas y no modifican auth, repos,
  queries, stores, persistencia, Storage, privacidad ni Supabase.
- `supabase-fullstack-engineer` entra solo cuando el cambio es cross-layer.

## Ambiente

- **App corre en Expo Go SDK 54** — features con módulo nativo custom
  obligan a EAS Dev Client
- **Pesos siempre en KG en BD** — conversión a LB es solo presentación
- **Sin Supabase configurado, la app sigue funcionando** con stores
  locales + estructura heurística local de rutinas
- **Build de prueba:** `eas build --profile preview --platform android`

## Archivos clave del código

| Qué | Dónde |
|---|---|
| Cliente Supabase | `src/lib/supabase.ts` |
| Capa de auth | `src/lib/auth/index.ts` + `session.ts` |
| Repos (sync BD) | `src/lib/repos/{workouts,routines,profile}.ts` |
| Generador rutinas | `src/lib/routineGenerator.ts` |
| Motor de logros | `src/lib/achievements.ts` + `src/store/achievements.ts` |
| Racha semanal | `src/lib/weeklyStreak.ts` |
| Privacidad de workouts | `src/lib/workoutVisibility.ts` + migración `0052` |
| Volumen muscular estimado | `src/lib/muscleVolume.ts` + `MuscleVolumeMap.tsx` |
| Calendario mensual | `src/lib/trainingCalendar.ts` + `MonthlyTrainingCalendar.tsx` |
| Hitos musculares | `src/lib/muscleMilestones.ts` + `MuscleMilestoneMap.tsx` |
| Rangos sociales | `src/lib/rankMilestone.ts` + `RankEmblem.tsx` |
| Editor numérico de series | `src/lib/numericInput.ts` + `BigStepperInput.tsx` |
| Métricas del workout | `WorkoutMetric.tsx` + `RestRing.tsx` |
| Compañero de descanso | `RestMascotCoach.tsx` + `GmoMascot.tsx` |
| Objetivos del perfil | `profiles.goals` ordenado + espejo legacy `goal` |
| Iconografía | `src/components/Icon.tsx` |
| Tokens diseño | `src/theme/tokens.ts` |
| Progreso real por ejercicio | `src/lib/progressInsights.ts` + `exerciseProgressPicker.ts` + `ProgressInsightsSection.tsx` |
| Metadata/tarjeta social de workout | `src/lib/workoutPostMetadata.ts` + `WorkoutShareCard.tsx` |
| Columna social edge-to-edge | `src/components/social/SocialStreamColumn.tsx` + `Card variant="stream"` |
| Secciones y carga | `Card variant="section"` + `src/components/ui/Skeleton.tsx` |
| Hub del ejercicio | `app/exercise/[id].tsx` + `src/lib/exerciseDetails.ts` |
| Puente de tabs externas | `src/store/mainTabs.ts` |
| Mascota reutilizable | `src/components/GmoMascot.tsx` + `assets/brand/gmo-mascot.webp` |
| Metadata exercise-dataset | `scripts/sync-exercises-dataset.mjs` + `src/data/exerciseDatasetDetails.generated.json` |
| Schema y evolución BD | `supabase/migrations/` + ledger timestamped recuperado |

## Decisiones de producto vigentes

- **Tabs principales:** Feed · Rutinas · Progreso · Perfil (4 tabs)
  - Home (Feed) es la red social tipo LinkedIn de logros
  - **Progreso** muestra solo tendencias reales por ejercicio y peso corporal
- **Perfil** concentra identidad social en un encabezado compacto: avatar, rango,
  racha, seguidores, publicaciones paginadas, actividad y logros. Su menú de tres
  puntos abre Compartir perfil o Ajustes; no existe bloque Cuenta duplicado.
- **Trabajo factual:** carga × repeticiones permanece en ledgers de sesión y
  resúmenes sociales como `kg·rep`/`lb·rep`; no es tendencia seleccionable,
  récord comparativo, puntuación, diagnóstico ni total vitalicio
- **Coach IA retirado:** no reintroducir pantalla, repos, queries ni edge function
- **Workout es interactivo set-by-set** estilo Strava (no formulario)
- **Feed ofrece un CTA persistente de entreno:** continúa la sesión activa,
  propone el próximo día de la rutina o abre plantillas si no existe rutina
- **Tracking granular por serie:** duración de la serie + descanso
  posterior, se guarda en `workout_sets.duration_seconds` y
  `rest_after_seconds`. Alimenta la pantalla Progreso.
- **Descanso resistente a lifecycle:** mientras una serie descansa,
  `SetEntry.restStartedAt` se persiste localmente. Al volver de background o
  reiniciar, se calcula con `Date.now()` y se limpia al avanzar/finalizar. Ese
  timestamp no se sincroniza a Supabase.
- **Logging competitivo:** cada serie puede mostrar/autorrellenar su equivalente
  previo sin pisar ediciones; los PR aparecen en vivo y los ejercicios con barra
  ofrecen calculadora de discos.
- **Ritmo visual del workout:** peso, reps, tiempo y resumen reutilizan
  `WorkoutMetric`: dato principal en crema y metadata secundaria sin marcos
  completos. El rojo queda para el CTA de fase, PR y estados relevantes; progreso
  normal es neutral. Cada descanso monta `RestMascotCoach` con una frase estable y
  entrada finita; Reduce Motion lo deja estático. `RestRing` muestra tiempo
  transcurrido sin decir si el usuario está recuperado ni recomendar minutos.
- **Progreso honesto:** usa únicamente series efectivas completadas. Permite ver
  mayor carga, reps o tiempo activo a través de varias sesiones; una línea plana
  o descendente es un resultado válido. No estima
  máximos, no prescribe un número de reps y no etiqueta una sesión como mejora.
- **Mapa de volumen muscular:** editor y Rutinas muestran la semana planificada.
  Usa series equivalentes estimadas (1 primaria, 0.5 secundaria), cinco bandas
  de referencia y detalle por toque.
  No es una medición exacta de estímulo, recuperación ni calidad global.
- **GMO Rating transparente:** radial `/100` con cobertura, volumen, frecuencia y
  estructura visibles. Se calcula localmente, no se guarda, no recomienda cambios
  y no predice resultados.
- **Calendario e hitos en Progreso:** calendario local fijo 6×7, lunes primero,
  intensidad 0/1/2/3+ y ledger exacto por día. El mapa reutiliza los umbrales de
  los cuatro tracks de fuerza de `ACHIEVEMENTS`; muestra carga, reps, fecha, sesión
  y rol muscular, sin 1RM estimado ni comparación poblacional.
- **Selección de progreso escalable:** una fila compacta abre el picker buscable
  de ejercicios realmente entrenados. Recientes muestra seis, Más entrenados
  ordena por sesiones y músculo/equipo filtran metadata local. Cada fila reutiliza
  el WebP local del ejercicio mediante `expo-image`; el músculo se escoge en una
  cuadrícula interna de dos columnas con opción Todos. IDs sin imagen/legacy usan
  dumbbell y siguen disponibles en Todos/búsqueda. El sheet mantiene altura fija
  aunque queden uno o cero resultados. No hay backend ni persistencia.
- **Historial navegable:** tocar un punto de Progreso abre la sesión exacta. El
  detalle muestra duración, ejercicios, series, reps, trabajo y filas registradas;
  no incluye felicitaciones comparativas ni deltas automáticos.
- **Workout social factual:** compositor y Feed comparten una tarjeta rectangular
  con duración, series, reps, trabajo, músculos y ejercicios. La metadata remota
  se valida con fallback legacy; compartir fuera de la app incluye esas métricas.
  Una publicación exitosa marca el workout local y evita publicarlo otra vez.
- **Privacidad por workout:** el contrato repo-only contempla Público, Seguidores
  y Privado, pero el compositor expone solo Público hasta reconciliar y desplegar
  `0052`. Legacy permanece público. `post-photos` sigue siendo un bucket público.
- **Stream social edge-to-edge:** Feed, muro comunitario, discovery, preview y
  publicaciones propias ocupan todo el ancho móvil sin bordes/radios laterales;
  en tablet se centran a máximo 600 px. Texto y acciones conservan 16 px, fotos 4:5
  full-bleed y 44 px táctiles. El perfil público usa galería de 3 columnas con gaps
  de 1 px. Formularios, modales y superficies privadas continúan contenidos.
- **Refresh fijo del Feed:** un gesto vertical de 72 px mueve solo el indicador
  GMO; la FlashList no se arrastra y el gesto horizontal se entrega a `PagerView`.
  Un control visible `Actualizar feed` ofrece la misma acción a teclado y lector.
- **Secciones sin marco lateral:** paneles de Rutinas, Progreso, Perfil, Logros,
  workout activo, onboarding, evento y hub de ejercicio usan solo separadores
  superior/inferior. Tiles compactos, formularios y controles conservan su marco.
- **Loading consistente:** Feed, conexiones, publicaciones propias y peso corporal
  reutilizan `Skeleton`/`SkeletonGroup` sin dependencia nueva ni múltiples loops
  por hueso. Refetch con cache y paginación no se sustituyen por skeleton.
- **Backend live:** schema equivalente a `0044`–`0050`; `0044` (`20260722134052`),
  `0045_fix_workout_pr_history_cutoff` (`20260722135450`) y
  `0046_fix_workout_pr_total_order` (`20260722140530`) desplegadas;
  `publish_workout` conserva firma/ACL y usa orden temporal total para PR históricos.
  después incluye `20260727210212`/`20260727211100` para
  `profiles.goals` y `20260727223657` para borrado de cuenta. Su SQL exacto está
  recuperado localmente. `0051`/`0052` permanecen repo-only hasta reconciliar el
  ledger hosted completo.
- **Bloqueador de rangos live:** `recalc_weekly_ranks()` sigue expuesta a
  `PUBLIC`/`anon`/`authenticated`, no es idempotente y usa seis umbrales legacy.
  No desplegar un parche aislado: primero reconciliar el ledger alojado completo.
- **Detalle de ejercicio:** `/exercise/[id]` reúne Información, Historial y
  Récords y es accesible desde el workout y Progreso. Su CTA solicita el tab de
  Rutinas explícitamente al `PagerView`.
- **Sync reparable:** guardar/publicar un workout reconstruye su árbol remoto
  completo y serializa intentos concurrentes; un parent parcial nunca se toma
  como sincronización válida.
- **Racha semanal correcta:** historial terminado + `weeklyGoalDays`; lunes a
  domingo en la zona local, refresh al volver a foreground y semana actual
  incompleta sin romper antes de tiempo. La migración v2 re-siembra tiers
  antiguos de racha sin borrar otros logros.
- **Identidad GMO:** rostro-robot crema/negro/rojo como icono y una sola mascota
  WebP transparente compartida por vacíos y celebración. Icono/splash/adaptive
  apuntan al mismo archivo para evitar copias.
- **Composición corporal:** registro opcional en el bloque Peso corporal. Peso
  siempre visible, % grasa/músculo/agua bajo toggle "avanzado".
  Tabla `body_measurements`, RLS solo own.
- **Bucket `post-photos` es PÚBLICO** (lectura). La escritura está
  protegida por RLS basada en prefijo `{uid}/`. Las URLs guardadas
  en `posts.photo_url` son públicas, no signed (evita expiración).
- **Búsqueda de usuarios** vía RPC `search_users` accesible desde
  el icono de lupa en el header del Feed.
- **Reacciones a posts:** la UI activa usa una sola reacción gym `muscle` (💪).
- **Navegación entre tabs:** swipe horizontal habilitado vía
  `react-native-pager-view`. Las 4 tabs (Feed/Rutinas/Progreso/
  Perfil) se pueden recorrer deslizando o tocando.
- **Feedback UX:** todo botón importante (Seguir, reacciones,
  publicar, comentar) usa optimistic update + haptics + micro
  animación de scale para sentirse como Instagram/Strava.
- **Anti-spam:** máximo 2 workouts/día y mínimo 3h entre sesiones
- **Rutinas con GMO Rating explicable:** existe nota `/100` con cuatro componentes
  visibles. No existen weak groups, consejo automático ni promesas.
  El mapa de volumen conserva su referencia estimada y contribuciones.
- **Onboarding flexible:** `profiles.goals` conserva la selección ordenada; el
  primer objetivo estructura la rutina y los demás describen prioridades. La
  rutina personalizada vuelve explícitamente a Rutinas después de guardar o cerrar.
- **Media de ejercicios:** los WebP actuales siguen siendo public-domain y
  offline. `hasaneyldrm/exercises-dataset` se usa solo para 46 matches seguros
  de instrucciones; su media de Gym visual queda excluida por licencia.
- **Personalización del perfil** consolidada en `app/profile/edit.tsx`
  (foto, nombre, username y bio). Sin pantallas duplicadas
  tipo "social" con info repetida.
- **Configuración honesta:** privacidad solo se activa cuando `0052` esté aplicada
  con RLS/RPC completos. Notificaciones siguen fuera hasta entrega nativa real.
