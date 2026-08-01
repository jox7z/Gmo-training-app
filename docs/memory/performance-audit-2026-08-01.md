# Auditoría de tamaño, duplicación y rendimiento — 2026-08-01

## Resultado ejecutivo

La auditoría conservó todas las funciones actuales y no tocó Supabase, auth,
repos, queries, stores, persistencia ni migrations. Expo Go vuelve a ser el
target predeterminado: `npx expo start` resuelve `devClient: false` y
`scheme: null`; el túnel también llegó a `Tunnel ready`.

La reducción medible del export es pequeña porque las dependencias y archivos
retirados ya estaban fuera del grafo JavaScript. El beneficio principal es un
arranque correcto de Expo Go, seis paquetes top-level menos, menos tooling
nativo de desarrollo y 26,390 bytes de fuente huérfana eliminados.

## Baseline antes/después

| Métrica | Antes | Después | Delta |
|---|---:|---:|---:|
| Assets en `assets/` | 232 / 11,767,804 B (11.22 MiB) | igual | 0 |
| Dependencias directas | 41 | 39 | -2 |
| Paquetes top-level instalados | 951 | 945 | -6 |
| Módulos Metro Android | 2073 | 2073 | 0 |
| Assets exportados | 247 | 247 | 0 |
| Bundle HBC Android | 6,208,130 B | 6,207,339 B | -791 B |
| Export Android total | 14,389,102 B | 14,388,311 B | -791 B |
| Tests | 22 suites / 136 | 23 suites / 146 | +10 contratos |
| Expo Doctor | 17/18 | 18/18 | corregido |

El baseline previo tomó 21.02 s; el posterior, con caché recién limpiada, tomó
35.60 s. Esos tiempos no son comparables como regresión de arranque.

No se obtuvo APK: `assembleRelease` no produjo salida dentro de una ventana
acotada y se detuvo sin artefacto. Tampoco hubo dispositivo ADB para medir
memoria, FPS, primera renderización o lifecycle físico.

## Top 20 assets por tamaño

| Asset | Bytes |
|---|---:|
| `assets/brand/rank-atlas-master.png` | 1,700,146 |
| `assets/brand/gmo-mark-master.png` | 886,858 |
| `assets/ranks/olympus.png` | 540,704 |
| `assets/icon.png` | 482,806 |
| `assets/brand/gmo-mascot-master.png` | 469,014 |
| `assets/ranks/titan.png` | 448,684 |
| `assets/ranks/diamond.png` | 437,381 |
| `assets/ranks/elite.png` | 427,871 |
| `assets/ranks/gold.png` | 397,444 |
| `assets/ranks/bronze.png` | 394,521 |
| `assets/ranks/silver.png` | 390,336 |
| `assets/ranks/platinum.png` | 382,630 |
| `assets/ranks/rookie.png` | 343,711 |
| `assets/brand/gmo-mascot-start.webp` | 67,342 |
| `assets/brand/gmo-mascot-pr.webp` | 63,222 |
| `assets/brand/gmo-mascot-motivating.webp` | 53,616 |
| `assets/exercises/landmine-press.webp` | 50,512 |
| `assets/exercises/bulgarian-split-squat.webp` | 43,462 |
| `assets/brand/gmo-mascot-rest.webp` | 42,888 |
| `assets/exercises/cable-russian-twist.webp` | 41,758 |

Los tres masters grandes no aparecieron en el export Metro y se conservan.
Los nueve emblemas sí aportan 3.59 MiB. Una recompresión temporal bajó ese
grupo aproximadamente 2.7 MiB, pero alteró píxeles/alpha; no se aplicó sin QA
visual Android/iOS.

Los WebP de ejercicios aportan 3.89 MiB y son el catálogo offline requerido.
Hay tres pares byte-a-byte idénticos (`barbell-row`/`pendlay-row`,
`cable-crossover`/`cable-fly`, `lat-pulldown`/`wide-grip-lat-pulldown`), con
59,182 B combinados de posible ahorro. Se mantienen porque sus IDs son distintos
y el cambio correcto exige modificar y auditar el generador.

## Top 20 archivos de código/datos

| Archivo | KiB |
|---|---:|
| `app/workout/active.tsx` | 56.4 |
| `src/data/exerciseDatasetDetails.generated.json` | 52.9 |
| `src/data/exercises.ts` | 50.8 |
| `app/(tabs)/profile.tsx` | 39.5 |
| `app/communities/[id].tsx` | 34.1 |
| `app/publish.tsx` | 32.6 |
| `src/components/feed/FeedItem.tsx` | 32.5 |
| `app/onboarding.tsx` | 28.3 |
| `app/exercise/[id].tsx` | 25.7 |
| `app/routine/[id].tsx` | 22.7 |
| `src/components/progress/ExerciseProgressPicker.tsx` | 22.1 |
| `src/components/Icon.tsx` | 21.9 |
| `app/_layout.tsx` | 21.1 |
| `app/(tabs)/index.tsx` | 18.5 |
| `app/(tabs)/gmup.tsx` | 18.2 |
| `src/store/workouts.ts` | 18.2 |
| `src/components/progress/MuscleMilestoneMap.tsx` | 17.2 |
| `src/components/WeightDetailModal.tsx` | 16.8 |
| `src/data/exerciseImages.ts` | 16.7 |
| `app/profile/edit.tsx` | 16.4 |

Tamaño por sí solo no justifica dividir estos archivos. `active.tsx`, stores,
repos y auth requieren profiling o ownership de dominio antes de refactor.

## Duplicación encontrada

| Prioridad | Hallazgo | Decisión |
|---|---|---|
| 1 | Dos `StaticPullToRefresh`; la copia UI tenía loop e indicador retirado | eliminada la copia huérfana |
| 2 | `formatRelative` repetido en Feed y comentarios | extraído; variantes larga/compacta explícitas |
| 3 | Duración idéntica en ledger y tarjeta social | extraída a `formatCompactDuration` |
| 4 | Número `es-ES` con un decimal repetido | extraído a `formatDecimal` |
| 5 | Normalización sin diacríticos repetida | extraída a `normalizeSearchText` |
| 6 | Comment sheets de posts/eventos casi idénticos | diferido; faltan tests de componente y foco |
| 7 | Formularios new/edit de eventos comparten estructura | diferido; riesgo de mutación/upload |
| 8 | `rankInfo` repetido en superficies sociales | revisión manual; toca normalización de rangos |
| 9 | Invalidaciones/rollbacks repetidos en React Query | separadas intencionalmente por mutación |
| 10 | Deduplicación de páginas repetida en Feed/Comunidad | candidata a helper puro, beneficio bajo |

## Dependencias

### Eliminadas

- `expo-dev-client`: causaba el QR `exp+gmo-training-app`; se retiraron paquete
  y plugin por decisión explícita de usar Expo Go.
- `zod`: sin imports, scripts, plugins, tests o configuración. Su carpeta local
  ocupaba 3.43 MiB; no aportaba bytes al HBC.

### Conservadas con razón

- `@expo/ngrok`: requerido por `npm run tunnel`.
- `@expo/metro-runtime`, `react-native-screens`, `react-dom` y
  `react-native-web`: peers/runtime de Expo Router y web.
- Paquetes Expo/RN con imports reales, plugins o integración nativa vigente.

### Decisión separada

- `@shopify/react-native-skia`: 817.61 MiB instalados localmente, sin imports
  actuales. SDK 54 lo incluye en Expo Go, pero retirarlo cambia autolinking/build.
- `lottie-react-native`: sin imports actuales; permanece como decisión nativa.
- `expo-web-browser`: sin imports actuales, pero ligado al futuro OAuth.

No se ejecutó `npm audit fix` ni `--force`. El árbol quedó en 22 advisories
(1 low, 15 moderate, 5 high, 1 critical); requieren revisión compatible con
Expo, no upgrades automáticos.

## Código muerto

Eliminados tras búsqueda global, grafo de imports y revisión de rutas/config:

- `ActivityCard.tsx`
- `feed/ReactionPicker.tsx`
- `Heatmap.tsx`
- `ui/index.ts`
- `ui/StaticPullToRefresh.tsx`

Total: 26,390 B de fuente. No se atribuye ahorro de bundle: Metro ya los excluía.

Se dejaron para revisión manual `RankBadge.tsx`, `StreakRing.tsx`,
`auth/session.ts` y `workoutGuards.ts`; documentación o ownership de auth/dominio
indican intención histórica y esta auditoría no autoriza decidir su retiro.

## Renderizado y memoria

- No se encontraron selectores Zustand que suscriban stores completos.
- Timers/listeners revisados tienen cleanup salvo timeouts acotados de workflow.
- El workout activo mantiene dos actualizaciones de reloj por segundo durante
  fases activas; ya era riesgo conocido y necesita React Profiler físico.
- Las cinco pantallas se importan dentro del `PagerView`; no se cambió montaje,
  deep-linking ni lazy-loading sin medición de lifecycle.
- El catálogo estático importa todas las imágenes de ejercicios para funcionar
  offline; el coste es intencional.
- Comment sheets y formularios grandes siguen siendo deuda estructural, no una
  fuga confirmada.

## Verificación

- `npm test -- --runInBand`: 23 suites / 146 tests / 0 fallos.
- `npm run typecheck`: 0 errores.
- `npm run lint`: 0 errores / 0 warnings.
- `npx expo-doctor`: 18/18.
- `npx expo start --clear`: caché reconstruida sin error de deserialización;
  `devClient: false`, `scheme: null`, host LAN.
- Túnel: `Tunnel connected` y `Tunnel ready`.
- Export Android: 2073 módulos, HBC 6,207,339 B, total 14,388,311 B.
- Smoke físico Expo Go, FPS, memoria y APK: no ejecutados por falta de dispositivo
  y build release inconcluso.

## Orden recomendado

1. Escanear el QR LAN en Expo Go; usar túnel si la red aísla el teléfono.
2. Perfilar workout y cambio entre páginas en un Android físico.
3. Decidir en un cambio aislado si retirar Skia/Lottie/web-browser.
4. Crear variantes temporales de emblemas y aprobar comparación visual antes de
   reemplazar un solo asset.
5. Extraer comment sheets únicamente al añadir pruebas de foco, teclado, delete
   y optimistic mutations.

