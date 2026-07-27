# Gmo Training App

App móvil de entrenamiento de gimnasio inspirada en Strava: workouts, rachas, sistema ranked, coach IA y feed social. Construida con **Expo + React Native + Supabase**.

## Stack

- **Frontend:** Expo SDK 51 (managed) · Expo Router · TypeScript · Reanimated 3 · React Query · Zustand
- **Backend:** Supabase (PostgreSQL 15 + Auth + Storage + Edge Functions Deno)
- **IA:** Gemini 2.0 Flash (primario) → Claude Haiku 4.5 → GPT-4o-mini (fallback)
- **Compatible Expo Go ✅** (no requiere builds nativos para iterar)

---

## Cómo arrancar

```bash
npm install
npm start
```

Escanea el QR con la app **Expo Go** (Android/iOS). La app funciona sin backend gracias a stores locales (AsyncStorage) y un mock del Coach IA.

### Conectar a Supabase (opcional para MVP local)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta las migraciones en orden:
   - `supabase/migrations/0001_init.sql` — schema + RLS
   - `supabase/migrations/0002_rank_jobs.sql` — job semanal de rangos
   - `supabase/seed/exercises.sql` — catálogo de ejercicios
3. Copia `.env.example` a `.env` y rellena `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
4. Despliega las edge functions:
   ```bash
   supabase functions deploy coach
   supabase functions deploy generate_routine
   supabase secrets set GEMINI_API_KEY=...  ANTHROPIC_API_KEY=... OPENAI_API_KEY=...
   ```
5. Programa el job semanal desde el SQL editor de Supabase:
   ```sql
   select cron.schedule('weekly-rank-update', '0 6 * * 1', $$ select public.recalc_weekly_ranks(); $$);
   ```

---

## Estructura

```
.
├── app/                          # Expo Router (file-based)
│   ├── _layout.tsx               # root + providers
│   ├── index.tsx                 # redirect → onboarding o tabs
│   ├── onboarding.tsx            # 6-step onboarding
│   ├── (tabs)/                   # tab navigator
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home (streak, rank, CTA)
│   │   ├── routines.tsx          # listado + AI generator
│   │   ├── train.tsx             # iniciar workout
│   │   ├── feed.tsx              # social + leaderboard
│   │   └── profile.tsx           # perfil + logros + settings
│   ├── workout/active.tsx        # ejecución de workout (modal)
│   ├── routine/[id].tsx          # editor de rutina (modal)
│   └── coach.tsx                 # chat IA (modal)
├── src/
│   ├── theme/tokens.ts           # colors, spacing, radii, ranks
│   ├── components/
│   │   ├── ui/                   # Text, Button, Card, Input, Badge, Stat, Screen
│   │   ├── StreakRing.tsx        # ring animado de racha
│   │   ├── RankBadge.tsx         # badge con gradient + progreso
│   │   └── TabIcon.tsx           # iconos SVG del tab bar
│   ├── store/                    # Zustand stores
│   │   ├── app.ts                # perfil, racha, onboarding
│   │   ├── workouts.ts           # workout activo + historial
│   │   └── routines.ts           # rutinas
│   ├── lib/
│   │   ├── supabase.ts           # cliente Supabase + edge invoker
│   │   ├── coach.ts              # askCoach() con fallback a mock
│   │   └── units.ts              # kg ↔ lb, formato duración
│   └── data/
│       ├── exercises.ts          # catálogo (24 ejercicios)
│       └── mockSocial.ts         # mock feed/leaderboard
└── supabase/
    ├── config.toml
    ├── migrations/
    │   ├── 0001_init.sql         # tablas + RLS + triggers
    │   └── 0002_rank_jobs.sql    # función weekly recalc
    ├── seed/exercises.sql
    └── functions/
        ├── coach/                # IA con cache + multi-provider fallback
        └── generate_routine/     # generador rutinas IA
```

---

## Features implementadas

### Core (MVP)
- ✅ **Onboarding** 6 pasos (perfil, nivel, objetivo, frecuencia)
- ✅ **Sistema de workouts**: ejecución con sets/reps/peso editable, cronómetro, swipe para borrar serie, haptics
- ✅ **Conversión KG ↔ LB** persistente por usuario (DB siempre en kg)
- ✅ **Rachas semanales** con ring SVG animado (gradient naranja → rojo)
- ✅ **Sistema Ranked** con 6 rangos (Bronze → Legend) y progreso visual
- ✅ **Editor de rutinas**: tabs por día, picker de ejercicios filtrable por músculo
- ✅ **Generador IA de rutinas** (heurística local + edge function que añade el "por qué")
- ✅ **Coach IA** chat con sugerencias rápidas y fallback local sin backend

### Social & Gamificación
- ✅ Feed social (mock)
- ✅ Leaderboard semanal con destacado del usuario
- ✅ Badges/logros visuales en perfil

### Backend
- ✅ Schema PostgreSQL completo con **Row Level Security**
- ✅ Triggers: auto-creación de perfil, recálculo de volumen
- ✅ Job semanal `recalc_weekly_ranks()` para puntos/rangos/streaks
- ✅ Edge function `coach` con:
  - Cache de respuestas (hash SHA-256, TTL 7 días)
  - Rate limit por usuario (30/h)
  - Circuit breaker por proveedor (3 fallos → 5 min open)
  - Fallback Gemini → Claude → OpenAI
  - Logging completo a `ai_usage_log`

---

## Pendientes / Roadmap

| Fase | Tarea | Estado |
|------|-------|--------|
| 1 | Auth real (Apple/Google con Supabase) | TODO |
| 1 | Sync cliente ↔ Supabase (workouts/routines) | TODO |
| 2 | Sustituir mocks de feed/leaderboard por queries reales | TODO |
| 2 | Subida real de fotos a Supabase Storage | TODO |
| 2 | Push notifications con Expo Notifications | TODO |
| 3 | Análisis de volumen / detección sobreentrenamiento | TODO |
| 3 | GIFs de ejercicios (CDN) | TODO |
| 3 | Compartir a redes (deep link + OG image) | TODO |
| 4 | Challenges semanales + heatmap anual | TODO |
| 5 | Suscripción Premium con RevenueCat | TODO |

---

## Reglas del sistema de rangos

- **Bronze** 0–99 · **Silver** 100–299 · **Gold** 300–699 · **Platinum** 700–1499 · **Elite** 1500–2999 · **Legend** 3000+
- Cada lunes el job `recalc_weekly_ranks()` calcula:
  - +30 por cumplir meta semanal
  - +10 por cada día extra (máx +30)
  - +15 por mantener racha ≥ 4 semanas
  - −20 por semana sin entrenar
- Workout válido: ≥ 3 ejercicios y ≥ 15 min (anti-abuso server-side).

## Diseño

Paleta:
- Base `#0B0B0B` / cards `#1C1C1E`
- Primario rojo `#FF3B3B` (CTAs)
- Acento naranja `#FF7A00` (rachas, gamificación)
- Info azul `#1E90FF` (stats, IA)
- Texto blanco con jerarquía por opacidad

Tokens centralizados en `src/theme/tokens.ts`. Componentes UI en `src/components/ui/`.

## Licencia

Privada · proyecto de portfolio.
