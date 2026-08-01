# Prompts activos

> Última rotación: 2026-07-29.
> C3 cerró celebración de rangos, refresh fijo, `GMO Rating`, calendario mensual,
> hitos musculares, perfil compacto y editor numérico estable; 128 tests en
> 20 suites. El workout activo ahora usa métricas abiertas y robot en cada
> descanso, sin splash ni prescripción de recuperación. La carga continúa entre
> series del mismo ejercicio y el refresh usa el mark GMO transparente con una
> vuelta. La navegación visible es Social, Comunidad, Ejercicio, Progreso y
> Perfil; el header Social solo conserva título, búsqueda y notificaciones. El historial vive
> en `docs/memory/checklist.md`.

## SPRINT C3 — Logros reales, progreso por hitos y perfil compacto

Objetivo: convertir los cambios ya construidos en una versión operativa
verificada antes de añadir features grandes.

Todos los agentes empiezan con `CAVEMAN` y leen
`.claude/skills/caveman.md`.

### C3-SMOKE — Expo Go físico

```text
CAVEMAN.
Ownership: evidencia manual; código solo para bugs reproducibles.

1. Feed corto/largo/vacío: pull vertical mueve solo el mark GMO transparente una
   vuelta, swipe horizontal conserva PagerView, la acción accesible de la lista
   actualiza sin botón visual y no mezcla foreground/paginación.
2. Nueve ascensos en Feed, comunidad, posts propios y galería pública; `legend`
   muestra Olympus y downgrade/metadata rota quedan neutrales.
3. `GMO Rating`: 0/medio/100, cuatro segmentos, 360/390/430/768 y texto grande.
4. Calendario: mes de seis filas con gap de 4 px, febrero bisiesto, hoy/futuros,
   mes anterior/siguiente, un workout abre ledger y varios abren selector.
5. Mapa frontal/trasero + selector buscable: 12 músculos, Con/Sin hitos, tildes,
   teclado abierto, evidencia principal/secundaria y sesión exacta.
6. Perfil compacto: identidad, tabs sticky, paginación, actividad, logros, menú
   Compartir/Ajustes y ausencia de engranaje/Cuenta duplicada.
7. Repetir `+/−`, escribir `22.5` y coma decimal, límites 0/1000 kg y 1/999 reps,
   guardar/terminar serie sin crash Fabric, cambiar ejercicio, background/reanudar
   y haptics no disponibles. Completar una serie debe conservar su peso en la
   siguiente del mismo ejercicio sin pisar una edición.
8. Workout activo: peso/reps comparten geometría, progreso normal no usa rojo,
   GMO aparece en cada descanso, frase no rota y el timer no prescribe minutos.
9. Reduce Motion: feed indicator, PR, robot de descanso, transiciones, editor de
   rutina, skeletons y sheets quedan estáticos sin perder información.
10. VoiceOver/TalkBack: acciones de post separadas, acción refresh de la lista, calendario,
   selector, galería, actividad/logros y toolbar de teclado.
11. Stream en 360/390/430/768: fotos 4:5, 16 px internos, targets 44 px y cero
    bordes/radios laterales; mapa anatómico requiere validar taps pequeños.

Gate: dispositivo + OS + resultado por caso + captura de cada fallo.
```

### C3-DB — Reconciliar ledger y cerrar rangos P0

```text
CAVEMAN.
Ownership: Supabase + evidencia. No features nuevas.

1. Backup de schema y `supabase_migrations.schema_migrations`.
2. Auditar mapa completo archivos `0001`–`0050` contra hosted timestamps.
3. Reconciliar ledger en una ventana única; nunca `db push --include-all`.
4. Auditar/aplicar `0051` y `0052`; verificar los tres archivos timestamped ya
   presentes live sin volver a ejecutarlos.
5. Revocar `recalc_weekly_ranks()` a PUBLIC/anon/authenticated/service_role.
6. Hacer el job idempotente y concurrente por semana; segunda ejecución = cero delta.
7. Alinear nueve umbrales de `tokens.ts` y backfill sin celebraciones falsas.
8. Ejecutar matriz owner/follower/stranger/anon y confirmar advisors.

Gate: migration list limpio + SQL matrix + rollback plan + smoke Expo Go.
```

### C3-EFF — Limpieza medible

```text
CAVEMAN.
Ownership: inventario reproducible; cambios mecánicos de bajo riesgo.

1. Reducir hex fuera de tokens.
2. Alias de los 3 pares WebP idénticos desde exerciseImages/generador.
3. Revisar las 3 warnings de hooks restantes; corregir solo con prueba de lifecycle.
4. Ejecutar npm audit y separar runtime de dev-only; no usar audit fix ciego.

Gate: antes/después con bytes, warnings y tests.
```

### VISUAL — Flujo móvil GMO

```text
CAVEMAN.
Lee skills GMO móviles. Ownership estricto.

1. codebase-explorer localiza contratos/consumidores.
2. gmo-visual-director entrega concepto, estados, allowlist y aceptación.
3. Si toca auth/repos/queries/stores/persistencia/media/Supabase: detener y
   escalar boundary a supabase-fullstack-engineer.
4. react-native-ui-engineer implementa presentación con tokens/primitivas.
5. motion-performance-engineer entra solo con layout estable y motion útil.
6. mobile-visual-qa prueba 360/390/430/768, estados y Reduce Motion.
7. react-native-performance-auditor exige evidencia antes/después.
8. build-verify ejecuta gates; code-quality-reviewer cierra bugs.

Prohibido: copiar MotionSites, neon/glass genérico, targets <44 px, loops
decorativos, `entering/layout` en FlashList, dependencias incompatibles con Expo Go.
```

## Definición de terminado

- `npm test`
- `npm run typecheck`
- `npm run lint`
- Bundle Android
- Smoke físico documentado
- Revisión `code-quality-reviewer`
- Checklist, roadmap y prompts rotados
