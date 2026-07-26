# Prompts activos

> Última rotación: 2026-07-22.
> Q2 social cerró con metadata factual, tarjeta compositor/Feed, share externo,
> stream edge-to-edge, punto→sesión, orden temporal de PR live hasta `0046` y 66 tests puros en 11 suites. El historial vive
> en `docs/memory/checklist.md`.

## SPRINT Q2 — Smoke y observabilidad

Objetivo: convertir los cambios ya construidos en una versión operativa
verificada antes de añadir features grandes.

Todos los agentes empiezan con `CAVEMAN` y leen
`.claude/skills/caveman.md`.

### Q2-SMOKE — Lifecycle e identidad GMO

```text
CAVEMAN.
Ownership: evidencia manual; código solo para bugs reproducibles.

1. Background/reinicio durante descanso.
2. Calculadora kg/lb en pantalla pequeña.
3. Hub Información/Historial/Récords.
4. Progreso: picker con miniaturas y fallback, muchos ejercicios/variantes,
   búsqueda con/sin tildes, recientes/más entrenados, filtros músculo+equipo,
   legacy y sheet fijo con muchos/uno/cero resultados; carga/reps/tiempo,
   línea plana/descendente, peso separado y punto→sesión.
   Trabajo solo en ledger/social factual, nunca como tendencia o récord comparativo.
5. Compositor/Feed muestran la misma tarjeta factual; share nativo usa KG/LB correcto;
   doble toque no duplica publicación y un workout stale cae al primer candidato válido.
6. Retry Feed/Comunidad sin perder cache.
7. Robot GMO en launcher, adaptive mask, splash, Feed, Rutinas y Summary.
8. VoiceOver/TalkBack en tabs, gráfica, mascota decorativa y CTAs.
9. Stream social en 360/390/430 px y tablet 768 px: posts manual/workout/PR/rank_up/
   streak/achievement, fotos 4:5, 16 px internos, acciones 44 px, cero líneas/radios
   laterales y mismo ancho en loading/contenido/vacío/paginación.
10. Feed global, muro comunitario, Eventos/Comunidades, preview, posts propios y
    galería pública de 3 columnas; publicar/reaccionar/comentar/compartir/eliminar.
11. Secciones: cero bordes laterales en paneles de lectura; tiles compactos,
    inputs, botones, formularios, modales y círculos conservan su geometría.
12. Skeleton: carga inicial en Feed/conexiones/perfil/peso; refetch con cache no
    parpadea; paginación/mutaciones conservan spinner; TalkBack anuncia una carga
    por grupo y reduced-motion se verifica manualmente.

Gate: dispositivo + OS + resultado por caso + captura de cada fallo.
```

### Q2-OBS — Sentry mínimo

```text
CAVEMAN.
Ownership: configuración Sentry, boundary global y documentación.

1. Usa documentación oficial vigente para Expo SDK 54.
2. No captures PII, captions, tokens ni payloads de workouts.
3. Añade release/environment y error boundary global.
4. Conserva Expo Go si el SDK lo permite; si exige dev build, documenta el gate.
5. Mide impacto de bundle y dependencia.

Gate: npm test + typecheck + lint + evento controlado visible en entorno no productivo.
```

### Q2-EFF — Limpieza medible

```text
CAVEMAN.
Ownership: inventario reproducible; cambios mecánicos de bajo riesgo.

1. Reducir hex fuera de tokens.
2. Alias de los 3 pares WebP idénticos desde exerciseImages/generador.
3. Revisar las 3 warnings de hooks restantes; corregir solo con prueba de lifecycle.
4. Ejecutar npm audit y separar runtime de dev-only; no usar audit fix ciego.

Gate: antes/después con bytes, warnings y tests.
```

## Definición de terminado

- `npm test`
- `npm run typecheck`
- `npm run lint`
- Bundle Android
- Smoke físico documentado
- Revisión `code-quality-reviewer`
- Checklist, roadmap y prompts rotados
