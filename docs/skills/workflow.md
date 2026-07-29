# Workflow multi-agente

Todos los prompts empiezan con `CAVEMAN` y leen
`.claude/skills/caveman.md`. Ownership explícito, acción primero, reporte corto.

## Clasificar antes de delegar

- **Visual puro:** explorer → director visual → UI RN → motion si aporta →
  QA visual → auditor de rendimiento si existe evidencia → build → reviewer.
- **Cross-layer:** explorer → Supabase fullstack define/implementa contrato seguro →
  UI RN → QA/build/reviewer.
- **Verificación:** `build-verify`.
- **Revisión de bugs:** `code-quality-reviewer`.

`supabase-fullstack-engineer` posee `src/lib/**`, `src/store/**`, Supabase y el
gating auth/perfil de `app/_layout.tsx`. `react-native-ui-engineer` posee
presentación dentro de una allowlist; no inventa contratos de datos.

## Checkpoints

| Después de | Evidencia |
|---|---|
| Director visual | concepto, estados, allowlist, forbidden paths, aceptación |
| Supabase fullstack | contrato tipado, seguridad, retry/cache, estado live |
| UI RN | estados renderizados, hooks consumidos, typecheck/lint focal |
| Motion | Reduce Motion y evidencia de frame/render proporcional |
| QA visual | matriz dispositivo/estado; lo no observado queda sin verificar |
| Build | tests, typecheck, lint y build solicitado |
| Reviewer | findings High → Low o `CLEAN` |

## Coordinación

- Nunca dos agentes editan el mismo archivo a la vez.
- Visuales escalan auth, repos, queries, stores, persistencia, media o Supabase con
  el payload canónico de boundary.
- El reviewer no ejecuta ni corrige. El owner aplica sus hallazgos.
- No declarar smoke físico, SQL live, FPS ni screenshots sin evidencia observada.

## Definición de terminado

1. Actualizar `docs/memory/checklist.md` con fecha, estado, verificación, riesgo y
   siguiente paso.
2. Sincronizar roadmaps, overview/arquitectura, `AGENTS.md`, `CLAUDE.md` y skills
   cuando cambien reglas.
3. Ejecutar `npm test -- --runInBand`, `npm run typecheck`, `npm run lint` y
   `git diff --check`.
4. Registrar warning, dispositivo, SQL o deployment no verificado; no esconderlo.
