# Workflow multi-agente

Cómo orquestar a los 3 agentes + el revisor en cada sprint.

## Modo permanente

Todos los prompts empiezan con `CAVEMAN`. Todos los agentes leen
`.claude/skills/caveman.md`. Acción primero, scope/ownership explícito, reporte
corto. Una fuente compartida antes que copias. Una dependencia solo entra con
beneficio medible.

## Orden duro por feature

```
Supabase  →  Backend  →  Frontend  →  Revisor caveman
```

- BD primero porque es la fuente de verdad
- Backend depende del schema
- Frontend depende de los hooks
- Revisor al final para evitar deuda acumulada

**Nunca en paralelo dentro del mismo feature.** Sí en paralelo entre
features distintos si tocan zonas distintas del repo.

## Checkpoints obligatorios entre prompts

Después de cada agente, antes de pasar al siguiente, verifica:

| Después de | Checkpoint |
|---|---|
| **Supabase** | En SQL Editor: las RPCs nuevas devuelven lo esperado con `select * from rpc_name(...)` o `select rpc_name(...)`. Las tablas nuevas existen en Table Editor |
| **Backend** | `npm run typecheck` limpio. Importa un hook nuevo en cualquier archivo de prueba — no debe romper |
| **Frontend** | La feature funciona end-to-end en la app real (no solo typecheck). Cada estado de UI tiene su captura |
| **Revisor** | Aplicas SI o SI los items de "🩸 Sangrado crítico". Los "⚠️ Cosas raras" son opcionales |

## Plantilla para invocar a cada agente

Pega esto al inicio del mensaje al agente:

```
CAVEMAN. Vas a aplicar el Prompt [ID, ej: SIMPL-1A] de docs/skills/prompts.md.

Antes de tocar nada, lee:
1. docs/skills/agents/[tu-rol].md  (tu identidad y reglas)
2. docs/memory/architecture.md     (capas y reglas duras)
3. docs/skills/prompts.md          (el bloque del prompt asignado)

Aplica EXACTAMENTE el prompt. No añadas features extra. Respeta tu scope.

Al terminar:
1. npm test + npm run typecheck deben estar limpios
2. Lista los archivos creados/modificados
3. Si encontraste algo que no estaba en el prompt y lo cambiaste, dilo
4. Si encontraste un bug fuera de tu scope, NO lo arregles — solo repórtalo
```

Esta plantilla evita que el agente "mejore" cosas que no debería tocar
— el problema más común con prompts grandes.

## Reglas de coordinación

- **Nunca dos agentes tocando el mismo archivo a la vez.** Si dos
  prompts afectan `app/_layout.tsx`, deben ir en sprints distintos
- **Cada sprint cierra con el revisor** antes de empezar el siguiente
- **El revisor NO escribe código** — sus hallazgos los aplica el agente
  correspondiente como mini-prompt
- **Si un agente reporta bloqueo** ("falta una RPC que no existe"),
  para el sprint y vuelve al agente upstream — no improvises

## Cuándo lanzar revisor caveman

- **Siempre** al final de un sprint (feature completo)
- **Opcional** después de cambios grandes en un solo agente (más de
  500 líneas tocadas)
- **No lo lances** por cada commit pequeño — su valor está en mirar
  bloques coherentes

## Actualizar memoria al terminar sprint

La documentación es parte de la definición de terminado, no una tarea opcional.

1. Marca el progreso en `docs/memory/checklist.md` con fecha, estado,
   archivos clave, verificación, riesgo restante y siguiente paso.
2. Actualiza `docs/roadmap.md` y/o `docs/roadmap-ui.md` cuando cambie una
   prioridad, dependencia, benchmark o estado de fase.
3. Si cambiaste una decisión de producto o arquitectura, actualiza
   `docs/memory/overview.md` o `docs/memory/architecture.md`.
4. **Borra los prompts aplicados de `docs/skills/prompts.md`** y deja solo
   el siguiente bloque ejecutable. El checklist conserva la traza histórica.
5. Actualiza `AGENTS.md` y la skill operativa afectada cuando el cambio
   introduzca una regla que los próximos agentes deban respetar.
6. Ejecuta `npm test` + `npm run typecheck` + `npm run lint`. No uses “completado” si
   los checks fallan; registra el bloqueo exacto.
7. Antes de cerrar, busca claims obsoletos en todos los `.md` relacionados
   (features retiradas, migraciones, versiones, siguientes sprints).
8. Si entra una fuente externa, fija commit/release, audita licencia por tipo de
   contenido y registra atribución. Metadata y media pueden tener licencias
   distintas; una licencia del repo no autoriza automáticamente sus imágenes.
