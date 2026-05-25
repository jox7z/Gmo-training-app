# Gmo Training App — Checklist de avance

> Bitácora de estado del proyecto. Los prompts para los agentes viven en [AGENT_PROMPTS.md](AGENT_PROMPTS.md).
> **Última actualización:** 2026-05-24

---

## 📊 Resumen ejecutivo

| Capa | Estado | Comentario |
|---|---|---|
| Auth (login + registro) | ✅ | Email/password funcional, RPC `complete_signup`, RLS en orden |
| Base de datos Supabase | ✅ | Migrations 0001-0003 aplicadas, BD en producción |
| Frontend UI core | ✅ ~90% | Tabs, screens, tokens, iconografía custom |
| Sync cliente ↔ servidor | ✅ ~80% | Repos cableados (workouts, routines, profile) |
| Feed social | 🟡 v1 | Logros mínimos funcionando — pendiente upgrade a v2 (comments, fotos, share) |
| Coach IA | 🟡 | Mock local funcional; pendiente desplegar edge function |
| Build distribución | 🟡 | EAS preview probado; falta production AAB |
| Calidad técnica | 🔴 | Sin tests, sin Sentry, sin analytics |

---

## ✅ Hitos completados

### Auth & Registro
- [x] Pantalla de login (email + password)
- [x] Pantalla de signup multi-paso
- [x] Pantallas forgot-password / check-email / reset-password
- [x] Capa `src/lib/auth/` con AuthError tipado + mapping de errores en español
- [x] Hook `useSession()` suscrito a `onAuthStateChange`
- [x] Redirect centralizado en `app/_layout.tsx` (login → onboarding → tabs)
- [x] RPC `complete_signup` + `check_username_available` (server-side validation)
- [x] Sign out desde Profile

### Base de datos
- [x] Proyecto Supabase creado y desplegado
- [x] Migration `0001_init.sql` (18 tablas + RLS)
- [x] Migration `0002_rank_jobs.sql` (job semanal de rangos)
- [x] Migration `0003_signup_hardening.sql` (trigger, RPCs, constraints)
- [x] Seed `exercises.sql` (24 ejercicios)
- [x] `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [x] Email auth habilitado en Dashboard

### Frontend core
- [x] Onboarding 6 pasos (perfil, peso/altura, unidad, nivel, objetivo, frecuencia)
- [x] Workout interactivo set-by-set con cronómetro de descanso
- [x] Editor de rutinas con tabs por día
- [x] Generador heurístico de rutinas
- [x] Score de optimización (5 métricas) en sección Rutinas
- [x] Heatmap anual estilo GitHub en Profile
- [x] Sistema de iconografía SVG custom (`src/components/Icon.tsx`)
- [x] Tokens de diseño consistentes (modo oscuro)
- [x] Path aliases `@/*` + TypeScript strict
- [x] Safe area respetada (incluido iPhone notch)

### Sync cliente ↔ servidor
- [x] `src/lib/repos/workouts.ts` — saveWorkout, getWorkouts
- [x] `src/lib/repos/profile.ts` — getProfile, upsertProfile
- [x] `src/lib/repos/routines.ts` — saveRoutine, getRoutines, deleteRoutineRemote
- [x] Wiring: workout/active llama saveWorkout al finalizar
- [x] Wiring: routines screen llama saveRoutine al crear/editar/borrar
- [x] Wiring: onboarding llama completeSignup (RPC) antes de navegar
- [x] Login carga el perfil remoto con getProfile

### Distribución
- [x] EAS preview build APK probado en Android
- [x] `app.config.js` lee env vars correctamente

---

## 🚧 Próximos cambios (en orden de prioridad)

### 1. Simplificar el flujo de registro 🔴 PRIORIDAD ALTA
Quitar nombre + username del signup. Solo pedir email + password. Forzar onboarding completo si el usuario nunca lo terminó (detección por username temporal `user_xxx` del trigger).
> 📋 Ver prompts **SIMPL-1A** y **SIMPL-1B** en AGENT_PROMPTS.md

### 2. Rediseñar Feed como red social estilo LinkedIn 🔴 PRIORIDAD ALTA
Reemplazar el "feed de logros mínimo" por feed real con:
- Posts manuales con foto + texto libre
- Logros automáticos (PR, racha, subida de rango)
- Comentarios
- Reacciones (🔥 💪 👏)
- Botón compartir (share sheet nativo)
- Follow / unfollow
> 📋 Ver prompts **SOCIAL-V2 SB3**, **SOCIAL-V2 BE3**, **SOCIAL-V2 FE3** en AGENT_PROMPTS.md

### 3. Coach IA en la nube 🟡 PRIORIDAD MEDIA
- [ ] `supabase functions deploy coach`
- [ ] Configurar secrets `GEMINI_API_KEY` (mínimo) + fallbacks
- [ ] Verificar logs de la edge function

### 4. Push notifications 🟡 PRIORIDAD MEDIA
- [ ] Setup `expo-notifications`
- [ ] Recordatorio diario de día de entreno
- [ ] Notificación al subir de rango
- [ ] Notificaciones sociales (reacción, comentario, follow)

### 5. Polish UX 🟢 PRIORIDAD BAJA
- [ ] Splash screen + íconos reales
- [ ] Skeleton loaders en feed y leaderboard
- [ ] Onboarding tour con coach marks
- [ ] Settings: editar peso/altura/objetivo post-onboarding
- [ ] Animación de confetti al subir de rango

### 6. Calidad técnica 🟡 PRIORIDAD MEDIA
- [ ] Tests (Jest + RNTL)
- [ ] Sentry para crash reporting
- [ ] PostHog / Amplitude para analytics
- [ ] EAS Update para OTA

---

## 🐛 Bugs conocidos / mejoras menores

- [ ] El generador de rutina IA usa heurística local, no llama todavía a la edge function `generate_routine`
- [ ] La racha se incrementa en local al terminar workout, no respeta "1 vez por día" estrictamente
- [ ] Sin validación de "workout válido" (>3 ejercicios + >15 min) antes de guardar
- [ ] Cambiar KG↔LB durante workout activo redondea los inputs
- [ ] Cronómetro de workout no se pausa cuando la app va a background
- [ ] Generador IA reemplaza rutina activa sin confirmar

---

## 📁 Archivos clave

| Qué | Dónde |
|---|---|
| Cliente Supabase | `src/lib/supabase.ts` |
| Capa de auth | `src/lib/auth/index.ts` + `session.ts` |
| Repos (sync) | `src/lib/repos/{workouts,routines,profile}.ts` |
| Coach IA cliente | `src/lib/coach.ts` |
| Generador rutinas | `src/lib/routineGenerator.ts` |
| Score optimización | `src/lib/optimizationScore.ts` |
| Iconografía | `src/components/Icon.tsx` |
| Tokens diseño | `src/theme/tokens.ts` |
| Schema BD | `supabase/migrations/0001_init.sql` |
| Job rangos | `supabase/migrations/0002_rank_jobs.sql` |
| Signup hardening | `supabase/migrations/0003_signup_hardening.sql` |
| Notas Supabase | `supabase/README.md` |

---

## 📝 Notas operativas

- **App corre en Expo Go SDK 54** — features con módulo nativo custom obligan a EAS Dev Client.
- **Pesos siempre en KG en BD** — conversión a LB solo presentación.
- **Sin Supabase configurado, la app sigue funcionando** con stores locales + mock del coach.
- **El mock del Coach IA** usa palabras clave para responder; al desplegar la edge function pasa a usar Gemini.
- **Build de prueba:** `eas build --profile preview --platform android`.

---

## 👥 Arquitectura multi-agente

Tres agentes con responsabilidades estrictas. **Reglas de oro:**
- **Supabase** → solo SQL en `supabase/`, NUNCA toca código TS
- **Backend** → solo `src/lib/`, NUNCA toca JSX
- **Frontend** → solo `app/` + `src/components/`, NUNCA llama `supabase.*` directo

Plus un **Revisor caveman** read-only que pasa al final de cada sprint.

Todos los prompts viven en [AGENT_PROMPTS.md](AGENT_PROMPTS.md).
