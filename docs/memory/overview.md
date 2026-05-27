# Gmo Training App — Overview

## Qué es

App móvil de entrenamiento de fuerza estilo Strava: registro de workouts,
sistema de ranking semanal (6 rangos Bronze→Legend), feed social de
logros, coach IA, calendario heatmap anual.

## Stack

- **Frontend:** React Native + Expo SDK 54, expo-router, TypeScript strict
- **Estado:** Zustand + React Query
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **AI:** Edge function `coach` con fallback Gemini → Claude → OpenAI
- **Build/Distribución:** EAS Build (APK para preview, AAB para producción)
- **Diseño:** Modo oscuro, tokens custom, iconografía SVG propia

## Ambiente

- **App corre en Expo Go SDK 54** — features con módulo nativo custom
  obligan a EAS Dev Client
- **Pesos siempre en KG en BD** — conversión a LB es solo presentación
- **Sin Supabase configurado, la app sigue funcionando** con stores
  locales + mock del coach
- **Build de prueba:** `eas build --profile preview --platform android`

## Archivos clave del código

| Qué | Dónde |
|---|---|
| Cliente Supabase | `src/lib/supabase.ts` |
| Capa de auth | `src/lib/auth/index.ts` + `session.ts` |
| Repos (sync BD) | `src/lib/repos/{workouts,routines,profile}.ts` |
| Coach IA cliente | `src/lib/coach.ts` |
| Generador rutinas | `src/lib/routineGenerator.ts` |
| Score optimización | `src/lib/optimizationScore.ts` |
| Iconografía | `src/components/Icon.tsx` |
| Tokens diseño | `src/theme/tokens.ts` |
| Schema BD | `supabase/migrations/0001_init.sql` |
| Job rangos | `supabase/migrations/0002_rank_jobs.sql` |
| Signup hardening | `supabase/migrations/0003_signup_hardening.sql` |

## Decisiones de producto vigentes

- **Tabs principales:** Feed · Rutinas · Progreso · Perfil (4 tabs)
  - Home (Feed) es la red social tipo LinkedIn de logros
  - **Progreso** centraliza todas las métricas numéricas
  - **Perfil** es identidad social: avatar, rango, racha, seguidores,
    achievements, compartir — SIN stats numéricas duplicadas
- **Volumen total kg NO se muestra** en UI (métrica de novato) — sigue
  en BD para análisis interno
- **Coach IA accesible desde un FAB** arriba-izquierda en todas las tabs
- **Workout es interactivo set-by-set** estilo Strava (no formulario)
- **Tracking granular por serie:** duración de la serie + descanso
  posterior, se guarda en `workout_sets.duration_seconds` y
  `rest_after_seconds`. Alimenta la pantalla Progreso.
- **Composición corporal:** registro opcional en Progreso. Peso
  siempre visible, % grasa/músculo/agua bajo toggle "avanzado".
  Tabla `body_measurements`, RLS solo own.
- **Bucket `post-photos` es PÚBLICO** (lectura). La escritura está
  protegida por RLS basada en prefijo `{uid}/`. Las URLs guardadas
  en `posts.photo_url` son públicas, no signed (evita expiración).
- **Búsqueda de usuarios** vía RPC `search_users` accesible desde
  el icono de lupa arriba-derecha del Feed (CoachFab queda arriba-izq).
- **Reacciones a posts:** solo 2 tipos — `muscle` (💪 apoyo gym,
  color primary) y `heart` (❤️ me gusta general, color danger).
  Eliminadas `fire` y `clap` (Sprint 4.2).
- **Navegación entre tabs:** swipe horizontal habilitado vía
  `react-native-pager-view`. Las 4 tabs (Feed/Rutinas/Progreso/
  Perfil) se pueden recorrer deslizando o tocando.
- **Feedback UX:** todo botón importante (Seguir, reacciones,
  publicar, comentar) usa optimistic update + haptics + micro
  animación de scale para sentirse como Instagram/Strava.
- **Anti-spam:** máximo 2 workouts/día y mínimo 3h entre sesiones
- **Score de optimización** vive en pestaña Routines
- **Personalización del perfil** consolidada en `app/profile/edit.tsx`
  (foto, nombre, username, bio, privacidad). Sin pantallas duplicadas
  tipo "social" con info repetida.
