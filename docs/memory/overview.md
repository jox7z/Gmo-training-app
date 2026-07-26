# Gmo Training App — Overview

## Qué es

App móvil de entrenamiento de fuerza estilo Strava: registro de workouts,
sistema de ranking de 9 niveles (Rookie→Olympus), feed social,
logros offline por niveles, comunidades, eventos y heatmap anual.

## Stack

- **Frontend:** React Native + Expo SDK 54, expo-router, TypeScript strict
- **Estado:** Zustand + React Query
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** `generate_routine` usa proveedores compartidos; no existe coach conversacional
- **Build/Distribución:** EAS Build (APK para preview, AAB para producción)
- **Diseño:** Modo oscuro, tokens custom, iconografía SVG propia

## Ambiente

- **App corre en Expo Go SDK 54** — features con módulo nativo custom
  obligan a EAS Dev Client
- **Pesos siempre en KG en BD** — conversión a LB es solo presentación
- **Sin Supabase configurado, la app sigue funcionando** con stores
  locales + heurística local de generación de rutinas
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
| Score optimización | `src/lib/optimizationScore.ts` |
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
| Schema y evolución BD | `supabase/migrations/0001_*.sql` → `0044_enrich_workout_post_metadata.sql` |

## Decisiones de producto vigentes

- **Tabs principales:** Feed · Rutinas · Progreso · Perfil (4 tabs)
  - Home (Feed) es la red social tipo LinkedIn de logros
  - **Progreso** muestra solo tendencias reales por ejercicio y peso corporal
  - **Perfil** concentra identidad social: avatar, rango, racha, seguidores,
    achievements y compartir
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
- **Progreso honesto:** usa únicamente series efectivas completadas. Permite ver
  mayor carga, reps o tiempo activo a través de varias sesiones; una línea plana
  o descendente es un resultado válido. No estima
  máximos, no prescribe un número de reps y no etiqueta una sesión como mejora.
- **Selección de progreso escalable:** una fila compacta abre el picker buscable
  de ejercicios realmente entrenados. Recientes muestra seis, Más entrenados
  ordena por sesiones y músculo/equipo filtran metadata local. Cada fila reutiliza
  el WebP local del ejercicio mediante `expo-image`; IDs sin imagen/legacy usan
  dumbbell y siguen disponibles en Todos/búsqueda. El sheet mantiene altura fija
  aunque queden uno o cero resultados. No hay backend ni persistencia.
- **Historial navegable:** tocar un punto de Progreso abre la sesión exacta. El
  detalle muestra duración, ejercicios, series, reps, trabajo y filas registradas;
  no incluye felicitaciones comparativas ni deltas automáticos.
- **Workout social factual:** compositor y Feed comparten una tarjeta rectangular
  con duración, series, reps, trabajo, músculos y ejercicios. La metadata remota
  se valida con fallback legacy; compartir fuera de la app incluye esas métricas.
  Una publicación exitosa marca el workout local y evita publicarlo otra vez.
- **Stream social edge-to-edge:** Feed, muro comunitario, discovery, preview y
  publicaciones propias ocupan todo el ancho móvil sin bordes/radios laterales;
  en tablet se centran a máximo 600 px. Texto y acciones conservan 16 px, fotos 4:5
  full-bleed y 44 px táctiles. El perfil público usa galería de 3 columnas con gaps
  de 1 px. Formularios, modales y superficies privadas continúan contenidos.
- **Secciones sin marco lateral:** paneles de Rutinas, Progreso, Perfil, Logros,
  workout activo, onboarding, evento y hub de ejercicio usan solo separadores
  superior/inferior. Tiles compactos, formularios y controles conservan su marco.
- **Loading consistente:** Feed, conexiones, publicaciones propias y peso corporal
  reutilizan `Skeleton`/`SkeletonGroup` sin dependencia nueva ni múltiples loops
  por hueso. Refetch con cache y paginación no se sustituyen por skeleton.
- **Backend live:** `0044_enrich_workout_post_metadata` (`20260722134052`),
  `0045_fix_workout_pr_history_cutoff` (`20260722135450`) y
  `0046_fix_workout_pr_total_order` (`20260722140530`) desplegadas;
  `publish_workout` conserva firma/ACL y usa orden temporal total para PR históricos.
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
- **Score de optimización** vive en pestaña Routines
- **Media de ejercicios:** los WebP actuales siguen siendo public-domain y
  offline. `hasaneyldrm/exercises-dataset` se usa solo para 46 matches seguros
  de instrucciones; su media de Gym visual queda excluida por licencia.
- **Personalización del perfil** consolidada en `app/profile/edit.tsx`
  (foto, nombre, username y bio). Sin pantallas duplicadas
  tipo "social" con info repetida.
- **Configuración honesta:** se retiraron switches locales de privacidad y
  notificaciones porque no controlaban RLS/feed ni entrega nativa. Solo vuelven
  con persistencia y enforcement completos.
