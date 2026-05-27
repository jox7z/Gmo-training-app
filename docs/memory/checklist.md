# Checklist de avance

> Bitácora de estado del proyecto. Última actualización: 2026-05-26.
> Sprint 4 + 4.1 completados ✅ — Sprint 4.2 (polish de red social)
> en progreso. Siguiente: Sprint 5 (Coach IA).

## 📊 Resumen ejecutivo

| Capa | Estado | Comentario |
|---|---|---|
| Auth (login + registro) | ✅ | Email-only signup, redirect basado en `is_profile_complete`, no más loop de onboarding |
| Base de datos Supabase | ✅ | Migrations 0001-0009 aplicadas, BD en producción |
| Frontend UI core | ✅ ~92% | 4 tabs (Feed/Rutinas/Progreso/Perfil), tracking granular por serie |
| Sync cliente ↔ servidor | ✅ ~85% | Repos cableados + storage de fotos |
| Feed social | ✅ v2 | Posts manuales con foto, comentarios, share, reacciones, follow |
| Body tracking | ✅ | body_measurements + gráfico SVG de peso en Progreso |
| User search | ✅ | RPC search_users + pantalla Discover + lupa en Feed |
| Fotos públicas | ✅ | post-photos bucket público + fix FileSystem upload |
| Coach IA | 🟡 | Mock local funcional; pendiente desplegar edge function |
| Build distribución | 🟡 | EAS preview probado; falta production AAB |
| Calidad técnica | 🔴 | Sin tests, sin Sentry, sin analytics |

## ✅ Hitos completados

### Auth & Registro
- [x] Login, signup, forgot-password, check-email, reset-password
- [x] Capa `src/lib/auth/` con AuthError tipado + mapping en español
- [x] Hook `useSession()` suscrito a `onAuthStateChange`
- [x] Redirect centralizado en `app/_layout.tsx`
- [x] RPC `complete_signup` + `check_username_available`
- [x] Sign out desde Profile
- [x] Signup email-only (SIMPL-1B)
- [x] RPC `is_profile_complete` + redirect basado en backend (SIMPL-1B)
- [x] `markOnboarded()` sincroniza el flag local con el backend (Sprint N)
- [x] Loop de onboarding post-login corregido (Sprint N)

### Base de datos
- [x] Proyecto Supabase creado y desplegado
- [x] Migrations 0001-0007 aplicadas
- [x] Seed de 24 ejercicios
- [x] `.env` configurado
- [x] Email auth habilitado
- [x] Bucket `post-photos` privado + RLS por prefijo de uid (SOCIAL-V2)

### Frontend core
- [x] Onboarding 6 pasos
- [x] Workout interactivo set-by-set con cronómetro de descanso
- [x] Editor de rutinas con tabs por día
- [x] Score de optimización (5 métricas) en Routines
- [x] Heatmap anual estilo GitHub en Profile
- [x] Sistema de iconografía SVG custom
- [x] Tokens consistentes (modo oscuro)
- [x] Safe area en iPhone

### Sync cliente ↔ servidor
- [x] Repos workouts, profile, routines
- [x] Wiring: workout/active → saveWorkout
- [x] Wiring: routines → saveRoutine/deleteRoutineRemote
- [x] Wiring: onboarding → completeSignup (RPC)
- [x] Login carga perfil remoto

### Distribución
- [x] EAS preview build APK probado en Android
- [x] `app.config.js` lee env vars

## 🚧 Próximos cambios (en orden)

### Sprint 1 — Simplificar registro ✅
Signup reducido a email + password. Backend (`is_profile_complete`)
decide si forzar onboarding. Loop post-login eliminado en Sprint N.

### Sprint 2 — Feed social v2 estilo LinkedIn ✅
Posts manuales con foto + texto, comentarios, share sheet, reacciones,
follow, perfiles públicos. Migración 0007 + storage `post-photos`.

### Sprint 3 — Progreso & restructura de Perfil ✅
4 tabs (Feed/Rutinas/Progreso/Perfil), tracking granular por serie
(duración + descanso posterior), pantalla Progreso con summary +
timeline (gráfico de barras), Perfil enfocado en identidad social.
Migración 0008 + RPCs `progress_summary`/`progress_timeline`.

### Sprint 3.1 — Cleanup post-revisión Sprint 3 ✅
Bucket `avatars` separado de `post-photos`. RPC `profile_counters`
consolida 3 round-trips en 1. `aggregateLocal` borrado. Magic strings
y casts dobles eliminados. Migración 0009.

### Sprint 3.2 — Invalidación de profileCounters ✅
6 hooks de mutación (follow, unfollow, publishWorkout, publishPR,
publishManualPost, deletePost) invalidan `['profileCounters']` por
prefix. Counters se refrescan al instante tras la acción.

### Sprint 3.3 — Centralizar profileCountersKey ✅
`profileCountersKey` exportada desde `queries/profile.ts` y reusada
en `feed.ts`. Fuente única, sin riesgo de divergencia.

### Sprint 4 — Red social completa + Body tracking ✅
- [x] Migration 0010: post-photos público, body_measurements, body_timeline, search_users, list_followers, list_following, list_user_posts
- [x] photos.ts arreglado: expo-file-system + base64-arraybuffer + getPublicUrl (no más signed URLs)
- [x] repos/body.ts + queries/body.ts (listMeasurements, addMeasurement, deleteMeasurement)
- [x] queries/search.ts: useSearchUsers (debounce 30s stale)
- [x] queries/social.ts: useFollow/useUnfollow con optimistic update en profileCounters
- [x] discover.tsx: búsqueda con debounce 350ms, follow/unfollow, → /profile/[username]
- [x] body/new.tsx: modal peso + avanzado (grasa/músculo/agua) con validación
- [x] profile/[username].tsx: followers/following/posts cableados, botón follow/unfollow
- [x] profile/connections.tsx: lista con avatar + rango + botón seguir
- [x] progress.tsx: BodySection + WeightTimelineCard SVG (≥2 puntos)
- [x] _layout.tsx: body/new (modal) + discover + inAllowedAuthedRoute actualizados
- [x] Feed header: lupa arriba-derecha → /discover; CoachFab arriba-izquierda
- [x] TypeScript: 0 errores

### Sprint 4.1 — Bugfixes post-S4 ✅
- [x] **BUG-1** `useFollow`/`useUnfollow` invalidan `['search','users']` → botón Seguir reacciona al instante en Discover
- [x] **BUG-2** Migration 0011: `list_followers`/`list_following` devuelven `rank_points`; `repos/social.ts` mapea `row.rank_points`
- [x] **BUG-3** `profile/[username].tsx`: `isSelf` usa `me.id` directo; `useSearchUsers('')` deshabilitado cuando isSelf
- [x] **BUG-4** `ConnectionRow`: eliminado `useIsFollowing` por fila; usa `user.isFollowing` del RPC
- [x] TypeScript: 0 errores

### Sprint 4.2 — Polish de red social 🚧 EN PROGRESO
Que se sienta como Instagram/Strava. Reportado por el usuario:
botón Seguir no cambia al pulsar, no hay swipe entre tabs, las 3
reacciones (fire/muscle/clap) confunden — reducir a 2 (muscle+heart).
- Migration 0012: post_reactions con CHECK (type in 'muscle','heart')
- Optimistic update real en useFollow/useUnfollow/useToggleReaction
- react-native-pager-view para swipe entre las 4 tabs
- FeedItem con 2 botones (muscle outline/filled + heart outline/filled)
- FollowButton reusable con haptics + scale animation
- Haptics en reacciones, comments, publicar, navegación
→ Prompts SP4.2-SB, SP4.2-BE, SP4.2-FE en `docs/skills/prompts.md`

### Sprint 5 — Coach IA en la nube 🟡
- [ ] `supabase functions deploy coach`
- [ ] Configurar `GEMINI_API_KEY`
- [ ] Verificar logs

### Sprint 6 — Push notifications 🟡
- [ ] Setup expo-notifications
- [ ] Recordatorio diario
- [ ] Notificación al subir de rango
- [ ] Notificaciones sociales

### Sprint 7 — Polish UX 🟢
- [ ] Splash screen + íconos reales
- [ ] Skeleton loaders en feed
- [ ] Onboarding tour con coach marks
- [ ] Settings editar peso/altura post-onboarding
- [ ] Confetti al subir de rango

### Sprint 8 — Calidad técnica 🟡
- [ ] Tests (Jest + RNTL)
- [ ] Sentry crash reporting
- [ ] PostHog / Amplitude analytics
- [ ] EAS Update OTA

## 🐛 Bugs conocidos

- [x] S4.1-BUG-1 → S4.1 ✅
- [x] S4.1-BUG-2 → S4.1 ✅
- [x] S4.1-BUG-3 → S4.1 ✅
- [x] S4.1-BUG-4 → S4.1 ✅
- [x] **Loop de bienvenida post-signup** — `profileComplete` en `_layout.tsx` no se
  actualizaba tras `completeSignup()` (no hay SIGNED_IN event nuevo). CASE 3 veía
  `profileComplete===false && !inOnboarding` y mandaba a `/onboarding` → loop.
  Fix: condición ahora es `profileComplete===false && !onboarded`. Effect 3b
  re-sincroniza `profileComplete` cuando `onboarded` pasa a `true`. Sprint 4.2 ✅
- [ ] Generador IA de rutinas usa heurística local, no edge function
- [ ] Racha se incrementa local sin respetar "1 vez por día" estricto
- [ ] Sin validación "workout válido" antes de guardar
- [ ] Cambiar KG↔LB en workout activo redondea inputs
- [ ] Cronómetro no se pausa al ir a background
- [ ] Generador IA reemplaza rutina activa sin confirmar
