# Gmo Training App — Checklist

> Documento de estado y roadmap. Marca los `[ ]` con `[x]` conforme vayas completando.
> **Última actualización:** 2026-05-05

---

## 📊 Resumen rápido

| Capa | Listo | Pendiente |
|---|---|---|
| Frontend (UI/UX core) | ~85% | Polish, animaciones, ilustraciones |
| Frontend (features) | ~70% | Auth real, sync, social real, GIFs, push |
| Backend (definido) | 100% | — |
| Backend (deployed) | 0% | Todo: proyecto, migrations, secrets, deploy |
| Calidad técnica | 60% | Tests, Sentry, analytics, EAS |

---

## ✅ Listo (Frontend)

### Onboarding & estado local
- [x] Onboarding 6 pasos (perfil, peso/altura, unidad KG/LB, nivel, objetivo, frecuencia)
- [x] Persistencia local con AsyncStorage (Zustand stores)
- [x] Hidratación al arrancar la app
- [x] Loader cuando el store aún no terminó de hidratar

### Workout core
- [x] Editor de sets (peso/reps editables, checkbox grande con haptics)
- [x] Cronómetro en vivo
- [x] Add/remove series sobre la marcha
- [x] Cálculo de volumen total automático
- [x] Conversión KG ↔ LB (DB siempre en KG)
- [x] Workout libre o desde día de rutina
- [x] Cancelación con confirmación

### Rutinas
- [x] Listado con rutina activa marcada
- [x] Editor con tabs por día
- [x] Picker de ejercicios filtrable por grupo muscular
- [x] Duplicar / eliminar rutinas
- [x] Generador inteligente de rutina (heurística local)
- [x] Card "¿Por qué esta rutina?" para rutinas IA

### Gamificación
- [x] Streak ring SVG con gradient naranja→rojo
- [x] 6 rangos (Bronze→Legend) con gradient + glow
- [x] Barra de progreso al siguiente rango
- [x] Logros visuales en perfil (6 badges)

### Social (mock)
- [x] Feed con posts de workouts (mocks)
- [x] Reacciones visuales (🔥 💪 👏)
- [x] Leaderboard semanal con destacado del usuario

### Coach IA
- [x] Chat completo con scroll, sugerencias rápidas, indicador "pensando"
- [x] Mock local con 6 categorías de respuesta
- [x] Cliente listo para llamar a la edge function cuando haya backend

### Diseño & DX
- [x] Sistema de tokens (colors, spacing, radii, fontSize, ranks, shadows)
- [x] 12 componentes UI base (Text, Button, Card, Input, Stat, Badge, Screen, Loader, StreakRing, RankBadge, TabIcon)
- [x] Modo oscuro premium con la paleta exacta del brief
- [x] TypeScript strict, sin errores
- [x] Path aliases `@/*`
- [x] expo-doctor 17/17
- [x] Compatible Expo Go SDK 54
- [x] Fix de fondo blanco en Android (`SystemUI.setBackgroundColorAsync`)

---

## ✅ Listo (Backend definido — falta deploy)

- [x] Schema PostgreSQL completo (18 tablas, RLS en todas)
- [x] Triggers (auto-perfil, recalc volumen)
- [x] Función `recalc_weekly_ranks()` para job semanal
- [x] Edge function `coach` con cache SHA-256 + rate limit + circuit breaker + fallback Gemini→Claude→OpenAI
- [x] Edge function `generate_routine`
- [x] Seed de 24 ejercicios
- [x] `supabase/config.toml`

---

## ⚠️ Pendiente — Backend (Supabase setup)

### Setup inicial 🔴 PRIORIDAD ALTA
- [ ] Crear proyecto en supabase.com
- [ ] Ejecutar `supabase/migrations/0001_init.sql`
- [ ] Ejecutar `supabase/migrations/0002_rank_jobs.sql`
- [ ] Cargar `supabase/seed/exercises.sql`
- [ ] Crear `.env` con `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Configurar OAuth providers (Apple, Google) en Supabase Dashboard
- [ ] Crear bucket `workout-photos` en Storage con políticas RLS
- [ ] Crear bucket `avatars` en Storage
- [ ] `supabase functions deploy coach`
- [ ] `supabase functions deploy generate_routine`
- [ ] `supabase secrets set GEMINI_API_KEY=...`
- [ ] `supabase secrets set ANTHROPIC_API_KEY=...` (fallback)
- [ ] `supabase secrets set OPENAI_API_KEY=...` (fallback secundario)
- [ ] `select cron.schedule(...)` para el job semanal de rangos

---

## 🚧 Pendiente — Frontend

### Auth real 🔴 PRIORIDAD ALTA
- [ ] Login screen (email/password + botones Apple/Google)
- [ ] Sign-up flow integrado con onboarding
- [ ] Logout + borrar cuenta (GDPR)
- [ ] Reset password
- [ ] Reemplazar `id: 'local-user'` por el id real de Supabase auth

### Sync cliente ↔ servidor 🔴 PRIORIDAD ALTA
- [ ] Capa de repositorio (`src/lib/repos/`) con CRUD por entidad
- [ ] Cola de sync para workouts hechos offline (con retry)
- [ ] React Query: hooks `useWorkouts`, `useRoutines`, `useFeed`, `useLeaderboard`
- [ ] Optimistic updates al guardar workout
- [ ] Detección de conflicto (workout editado en 2 dispositivos)

### Social real 🟡 PRIORIDAD MEDIA
- [ ] Sustituir `MOCK_FEED` y `MOCK_LEADERBOARD_WEEK` por queries
- [ ] Pantalla de perfil de otros usuarios (al tocar avatar en el feed)
- [ ] Follow/unfollow
- [ ] Comentarios en posts (UI ya tiene el contador)
- [ ] Búsqueda de usuarios

### Workout — features que faltan en UI 🟡 PRIORIDAD MEDIA
- [ ] Subir foto al terminar (la tabla `workout_photos` y el campo `photoUri` ya existen)
- [ ] Notas por ejercicio (el campo existe, falta UI)
- [ ] Ver/editar workouts pasados (solo se ven los últimos 3 en home)
- [ ] Pantalla de detalle de workout
- [ ] Pantalla "Historial completo" paginada
- [ ] Compartir workout (share sheet nativo + deep link)

### Rutinas — mejoras 🟢 PRIORIDAD BAJA
- [ ] Drag & drop para reordenar ejercicios (ahora solo permite borrar)
- [ ] Drag & drop para reordenar días
- [ ] Importar rutinas públicas de otros usuarios
- [ ] Plantillas predefinidas adicionales (5/3/1, StrongLifts, nSuns)

### Inteligencia de entrenamiento 🟡 PRIORIDAD MEDIA
- [ ] Análisis real de volumen semanal por grupo muscular
- [ ] Detección de sobreentrenamiento (lógica del job semanal)
- [ ] Pantalla de "Insights" personalizados
- [ ] Auto-fill de peso del último workout (lookup en historial)
- [ ] Detección y celebración de PRs en vivo durante el workout

### Coach IA — features faltantes 🟡 PRIORIDAD MEDIA
- [ ] Streaming de respuesta token-a-token (mejora percepción)
- [ ] Historial de conversaciones (tabla ya existe, falta UI)
- [ ] Quick actions del coach desde otros screens (ej: "explícame este ejercicio" desde el editor)
- [ ] Disclaimers visibles cuando habla de salud/lesiones

### Contenido educativo 🟡 PRIORIDAD MEDIA
- [ ] GIFs/videos de ejercicios (campo `gif_url` ya existe en schema)
- [ ] CDN para los GIFs (Supabase Storage o Cloudinary)
- [ ] Pantalla de ejercicio individual (instrucciones + GIF + músculos trabajados)

### Push notifications 🔴 PRIORIDAD ALTA
- [ ] Setup de `expo-notifications`
- [ ] Recordatorio diario de día de entreno
- [ ] Notificación al subir de rango
- [ ] Notificaciones sociales (like, follow, comentario)
- [ ] Settings de frecuencia

### Gamificación adicional 🟢 PRIORIDAD BAJA
- [ ] Animación de confetti al subir de rango
- [ ] Heatmap anual estilo GitHub
- [ ] Challenges semanales (opt-in)
- [ ] PR celebration durante workout
- [ ] Compañeros de racha ("Tú y @ana llevan 6 sem juntos")

### Monetización (fase tardía) 🟢 PRIORIDAD BAJA
- [ ] Integración con RevenueCat
- [ ] Paywall (rutinas IA ilimitadas, coach sin límite, sin anuncios)
- [ ] Trial de 7 días

### UX / Polish 🟡 PRIORIDAD MEDIA
- [ ] Splash screen con logo real (ahora hay placeholders 1×1)
- [ ] Iconos de la app reales (`assets/icon.png`, `adaptive-icon.png`, `splash.png`, `favicon.png`)
- [ ] Onboarding tour después del setup (coach marks)
- [ ] Empty states ilustrados (ya hay emojis, faltan ilustraciones)
- [ ] Pull-to-refresh en feed/leaderboard
- [ ] Skeleton loaders en lugar del spinner básico
- [ ] Haptics en más interacciones (toggle de tabs, etc.)
- [ ] Settings: cambiar peso/altura/objetivo después de onboarding (ahora son read-only)

### Calidad técnica 🟡 PRIORIDAD MEDIA
- [ ] Tests (Jest + React Native Testing Library) — 0 ahora
- [ ] Sentry para crash reporting
- [ ] PostHog / Amplitude para analytics
- [ ] EAS Build configurado
- [ ] EAS Update para OTA updates
- [ ] Environment management (dev / staging / prod)

---

## 🐛 Bugs conocidos / mejoras menores

- [ ] La generación de rutina IA usa heurística local, no llama todavía a la edge function (la lógica está, falta cambiar el import en `routines.tsx`)
- [ ] Los datos de rachas se incrementan localmente al terminar workout, pero no respetan la lógica de "1 vez por día"
- [ ] El usuario puede crear workouts inválidos (aún no hay validación de "workout válido = >3 ejercicios + >15 min")
- [ ] Si el usuario cambia de unidad (KG↔LB) durante un workout activo, los inputs se redondean — no es ideal
- [ ] El cronómetro del workout sigue corriendo si la app va a background — debería pausarse o usar timestamp diff
- [ ] La generación de rutina IA reemplaza la rutina activa silenciosamente — debería preguntar confirmación

---

## 🎯 Recomendación de prioridad para próxima sesión

Si solo puedes hacer una cosa, hazla en este orden:

1. **Conectar Supabase real** (auth + sync) → desbloquea todo lo demás
2. **GIFs de ejercicios** → mejora masiva en valor percibido
3. **Push notifications** → motor #1 de retención en apps fitness
4. **Foto al terminar workout** → cierra el social loop
5. **Detalle de workout + historial paginado** → cierra el loop de feedback

---

## 📁 Archivos clave para referencia

| Qué | Dónde |
|---|---|
| Cliente Supabase | `src/lib/supabase.ts` |
| Coach IA (cliente) | `src/lib/coach.ts` |
| Generador de rutinas | `src/lib/routineGenerator.ts` |
| Conversión de unidades | `src/lib/units.ts` |
| Tokens de diseño | `src/theme/tokens.ts` |
| Catálogo de ejercicios | `src/data/exercises.ts` |
| Mocks sociales | `src/data/mockSocial.ts` |
| Stores | `src/store/{app,workouts,routines}.ts` |
| Schema SQL | `supabase/migrations/0001_init.sql` |
| Job de rangos | `supabase/migrations/0002_rank_jobs.sql` |
| Edge function Coach | `supabase/functions/coach/index.ts` |
| Edge function Generador | `supabase/functions/generate_routine/index.ts` |

---

## 📝 Notas

- **App siempre corre en Expo Go** — cualquier feature que requiera módulo nativo personalizado obliga a EAS Dev Client.
- **Pesos siempre se almacenan en KG en DB** — la conversión a LB es solo presentación.
- **Sin Supabase configurado, la app sigue funcionando** gracias a stores locales + mock del coach.
- **El mock del Coach IA** usa palabras clave para responder; al activar Supabase + secrets, automáticamente pasa a usar Gemini real.
