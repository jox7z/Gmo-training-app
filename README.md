# Gmo Training App

App móvil de entrenamiento de fuerza inspirada en Strava: tracking set-by-set,
rutinas, progreso, 9 rangos, logros, comunidades, eventos y feed social.

## Stack actual

- Expo SDK 54 (managed) · React Native 0.81 · React 19
- Expo Router 6 · TypeScript strict · Reanimated 4
- Zustand para estado local persistido
- TanStack React Query para estado de servidor
- Supabase: PostgreSQL, Auth, Storage, Realtime y Edge Functions
- Dark mode propio con tokens y componentes UI reutilizables

La app funciona en Expo Go. Sin Supabase configurado, el workout, historial,
rutinas, logros y generador heurístico siguen disponibles de forma local.

## Arranque

```bash
npm install
npm start
# equivalente directo: npx expo start
```

Expo Go es el target predeterminado. Si Metro conserva una caché incompatible,
usar `npm run start:clear`; para un teléfono en otra red, `npm run tunnel`.

Otros comandos:

```bash
npm run android
npm run ios
npm run web
npm run start:clear
npm run tunnel
npm test
npm run typecheck
npm run lint
npm run exercises:audit
# npm run exercises:sync  # actualiza solo matches conservadores
```

Jest cubre 146 contratos puros en 23 suites. El gate automático es test +
typecheck + lint;
el smoke de UI/lifecycle sigue en Expo Go.

## Supabase

El schema real contiene los cambios representados hasta `0050` y también las
migraciones alojadas `20260727210212`, `20260727211100` y `20260727223657`
(objetivos múltiples + grants y borrado de cuenta). `0041` instala
`sync_workout_snapshot`; `0042` limita `EXECUTE` a `authenticated` porque los
default privileges de Supabase también otorgan grants explícitos al crear RPCs.
`0043` hace monotónica la publicación: un snapshot stale nunca revierte `true`.
`0044` enriquece el post de workout con duración, series, reps, trabajo,
músculos y ejercicios reales sin cambiar la firma ni abrir la ACL.
`0045` evita que una sesión publicada tarde compare sus PR contra entrenos futuros.
`0046` desempata sesiones con la misma hora mediante creación e ID estables.
`0047`–`0050` documentan constraints y columnas de superseries ya presentes live.
`0051`/`0052` permanecen repo-only hasta reconciliar el ledger hosted completo:
preservación transaccional de superseries y privacidad
Público/Seguidores/Privado. Los objetivos ya viven en `profiles.goals`; el
contrato retirado `profiles.secondary_goals` no debe desplegarse.
Las migraciones reproducibles viven en `supabase/migrations/`.

```bash
supabase functions deploy generate_routine
```

`instagram_oauth` es legacy y no tiene entrada desde el cliente. El coach IA
conversacional fue retirado por `0040_drop_ai_coach.sql`; no reintroducirlo.
`generate_routine` solo devuelve una estructura heurística editable; no genera
reasoning, scores ni consejos automáticos y el cliente actual no la invoca.

## Arquitectura

```text
app/                     rutas y pantallas Expo Router
src/components/          UI reusable y features visuales
src/store/               Zustand: perfil, workouts, rutinas, logros
src/lib/repos/           único acceso directo a Supabase
src/lib/queries/         hooks React Query
src/data/                catálogo local de 220 ejercicios + metadata externa enlazada
src/theme/tokens.ts      colores, tipografía, spacing, rangos y gradientes
assets/exercises/        imágenes WebP disponibles offline
assets/ranks/            9 emblemas originales de rango
assets/brand/            masters, mascota WebP y atlas de rangos
supabase/migrations/     evolución del schema y RLS
supabase/functions/      generate_routine + instagram_oauth legacy
```

`app/_layout.tsx` es la única fuente de verdad para auth/onboarding/navigation.
La base de datos siempre almacena peso en kg; la unidad del usuario solo cambia
la presentación.

## Funcionalidad

- Tracking interactivo por serie con descanso persistente, duración y resumen
- Serie anterior con autofill protegido y banner de PR en vivo
- Validación defensiva antes de terminar y calculadora de discos para barra
- Reanudación de workout activo en la primera serie pendiente
- CTA persistente en Feed para empezar o continuar entrenando
- Rutinas editables, templates y generación online/offline
- Mapa interactivo de volumen semanal estimado en editor, Rutinas y Progreso
- Onboarding con objetivo principal, prioridades secundarias y rutina personalizada
- Feed realtime edge-to-edge con fotos 4:5, comentarios, follow y reacción gym
- Secciones sin bordes laterales y skeleton compartido para cargas iniciales
- Tarjeta workout compartida entre compositor/Feed + share externo con métricas reales
- Búsqueda, perfiles públicos, comunidades, eventos y leaderboards
- Progreso real por ejercicio (carga, repeticiones y tiempo), selector buscable
  con miniaturas locales por recientes/más entrenados/músculo/equipo, gráfica
  táctil con acceso a la sesión exacta y seguimiento separado del peso corporal
- Hub por ejercicio con Información, Historial y Récords
- 9 rangos: Rookie, Bronze, Silver, Gold, Platinum, Diamond, Elite, Titan, Olympus
- Logros por niveles, completamente client-side y offline
- Racha semanal derivada de historial + meta; semana local lunes–domingo
- Campo manual de Instagram; sin OAuth/verificación en UI

## Estado y roadmap

- [Checklist vivo](docs/memory/checklist.md)
- [Roadmap de producto](docs/roadmap.md)
- [Roadmap UI y benchmark](docs/roadmap-ui.md)
- [Arquitectura](docs/memory/architecture.md)
- [Stack visual](docs/memory/visual-stack.md)
- [Workflow multi-agente](docs/skills/workflow.md)

`icon.png` alimenta icono, splash y adaptive icon sin copias binarias. La mascota
GMO reutilizable pesa 25 KB y los 9 emblemas son arte real. El catálogo conserva
IDs e imágenes offline.
La integración opcional con
[hasaneyldrm/exercises-dataset](https://github.com/hasaneyldrm/exercises-dataset)
solo usa instrucciones con match conservador: su media pertenece a Gym visual
y no se redistribuye sin licencia. Ver
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) y
[la auditoría](docs/memory/exercises-dataset-audit.md).

## Reglas de contribución

Lee [AGENTS.md](AGENTS.md). Todo cambio debe:

1. respetar las capas repo/query/store;
2. usar tokens y primitivas UI existentes;
3. ejecutar `npm test`, `npm run typecheck` y `npm run lint`;
4. actualizar el checklist y los `.md` cuyo estado haya cambiado;
5. pasar revisión de calidad antes de marcarse completado.
