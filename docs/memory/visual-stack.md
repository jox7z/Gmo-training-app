# Stack de visualización y media

> Fuente única del tooling de UI/visualización e imágenes de Gmo Training.
> `CLAUDE.md`, `README.md` y `docs/memory/overview.md` enlazan aquí en vez de
> duplicar el detalle. Última revisión: 2026-06-30.

## Estrategia de build (por fases)

La app corre hoy en **Expo Go** (iteración rápida, sin build nativo). Por eso el
tooling se divide en dos tiers:

- **Tier 1 — Expo Go:** JS puro / SVG / Reanimated 4. Se adopta **ya**, sin dev build.
- **Tier 2 — Premium (dev client):** depende de `@shopify/react-native-skia` o de
  módulos nativos → **no corre en Expo Go**. Se activa al migrar a un **development
  build** (`expo-dev-client` + `eas build --profile development`). El proyecto ya hace
  EAS preview builds, así que el salto es incremental. Ver `docs/skills/scripts/preview-build.md`.

Regla: **nada de Tier 2 entra al código mientras la app deba seguir arrancando en
Expo Go.** Documentar cada dependencia con su tier.

## Contexto de compatibilidad

Stack: **Expo SDK 54 · React Native 0.81 · React 19 · Reanimated ~4.1 ·
react-native-worklets 0.5 · New Architecture (Fabric) activada**. Ya presentes:
`expo-image`, `expo-blur`, `expo-linear-gradient`, `react-native-svg`,
`react-native-gesture-handler`, `react-native-pager-view`, `@shopify/flash-list`,
`react-native-body-highlighter`. Toda librería nueva debe verificarse compatible con
**New Arch + Reanimated 4**.

## Tier 1 — Compatible con Expo Go (adoptar ya)

| Necesidad | Librería / repo | Reemplaza / mejora |
|---|---|---|
| Iconografía | **lucide-react-native** — github.com/lucide-icons/lucide | sistema SVG custom `src/components/Icon.tsx` |
| Charts de progreso | **react-native-gifted-charts** — github.com/Abhinandan-Kushwaha/react-native-gifted-charts | `TimeSeriesChart.tsx`, `WeightChart.tsx` (SVG hand-rolled) |
| Placeholders de imagen | **ThumbHash** — github.com/evanw/thumbhash (+ wrapper RN) | placeholder de `expo-image` + `recyclingKey` en FlashList |
| Skeletons reales | **react-native-skeleton-placeholder** — github.com/chramos/react-native-skeleton-placeholder | `feed/FeedSkeleton.tsx` (opacity loop) + Progreso |
| Bottom sheets | **@gorhom/bottom-sheet** v5 — github.com/gorhom/react-native-bottom-sheet | exercise picker, filtros, detalle de logro, comment sheets |
| Carousels | **react-native-reanimated-carousel** v5 — github.com/dohooo/react-native-reanimated-carousel | onboarding, galerías de ejercicios/logros |
| Animaciones vectoriales | **lottie-react-native** (incluida en Expo Go) — github.com/lottie-react-native/lottie-react-native | empty states, onboarding, micro-celebraciones |
| Ilustraciones (CC0) | **unDraw** (undraw.co) · **Open Peeps/Doodles** (openpeeps.com) | empty states + onboarding |
| Media de ejercicios | **free-exercise-db** (ya usada) — github.com/yuhonas/free-exercise-db · **ExerciseDB** (GIFs) — github.com/ExerciseDB/exercisedb-api | enriquecer `assets/exercises/` con GIFs de forma |
| Transform de imágenes | **Supabase Storage image transforms** (resize/quality/WebP) | avatares + fotos de feed/comunidad |
| Emblemas de rank | Sets Figma **CC BY 4.0** (rank-badge packs) exportados a PNG/WebP | reemplazan placeholders de `assets/ranks/` — mismo filename, **cero cambio de código** |

## Tier 2 — Premium (requiere development build)

| Necesidad | Librería / repo |
|---|---|
| Gráficos GPU, mesh gradients, crests animados, progress rings, sparklines | **@shopify/react-native-skia** — github.com/Shopify/react-native-skia |
| Line charts 120 fps (peso, volumen) | **@shopify/react-native-graph** — github.com/margelo/react-native-graph |
| Charts altamente personalizables / progress rings | **victory-native (XL)** — github.com/FormidableLabs/victory-native-xl |
| Confetti físico (rank-up, logros) | **react-native-fast-confetti** — github.com/AlirezaHadjar/react-native-fast-confetti |
| Toasts nativos | **burnt** — github.com/nandorojo/burnt |

> `react-native-graph`, `victory-native` y `react-native-fast-confetti` **dependen de
> Skia**; `burnt` usa UI nativa. Ninguna funciona en Expo Go.

## Excluidas (NO usar — incompatibles con Reanimated 4 / New Arch)

| Librería | Motivo | Alternativa |
|---|---|---|
| `moti` | No aprovecha Reanimated 4 (issue #391); sigue en Reanimated 3 | Reanimated 4 directo |
| `react-native-wagmi-charts` | Reanimated ~3.16, sin actualizar | gifted-charts / react-native-graph |
| `react-native-confetti-cannon` | Abandonada (2021) | react-native-fast-confetti |
| `react-native-toast-message` | Animaciones rotas en Expo 54 (issue #583) | burnt (Tier 2) |
| `react-native-fast-image` | Sin soporte Fabric | expo-image (ya presente) |
| `moti/skeleton` | Requiere Reanimated 3 | react-native-skeleton-placeholder |

## Estrategia de imágenes y assets

- **expo-image:** `cachePolicy="memory-disk"`, `transition` para crossfade,
  `placeholder` con **ThumbHash** (mejor que BlurHash: alpha + aspect-ratio), y en
  listas `recyclingKey={item.id}` para no mostrar la imagen reciclada previa.
- **Avatares / fotos de feed y comunidad:** servir vía **Supabase Storage image
  transforms** (resize + quality + WebP). Requiere plan Pro.
- **Ejercicios:** `assets/exercises/<id>.webp` bundleadas siguen siendo la base
  offline (ver `scripts/fetch-exercise-images.mjs`). Enriquecer con GIFs de forma de
  **ExerciseDB** cuando haya red.
- **Ilustraciones / Lottie:** guardar SVG (unDraw/Open Peeps) y JSON de Lottie en
  `assets/illustrations/` y `assets/animations/`. Usarlas en empty states y onboarding.
- **Emblemas de rank:** reemplazar los PNG placeholder de `assets/ranks/<id>.png` por
  crests reales (sets Figma CC BY 4.0). Mantener el nombre de archivo → no cambia
  `src/theme/rankImages.ts`.

## Roadmap de adopción de código

La secuencia, prioridades y justificación (informadas por el benchmark contra
Strong/Hevy/Fitbod/Strava) viven en **`docs/roadmap-ui.md`** (Pista C, fases
C0–C3). Este documento queda como fuente única del **QUÉ**: catálogo de
librerías, tiers, compatibilidad y exclusiones; `roadmap-ui.md` decide el
**CUÁNDO y POR QUÉ**.

Cada fase cierra con `npm run typecheck` + `npm run lint` + smoke (Expo Go / dev
client) y pasa por el revisor (caveman / code-quality-reviewer).
