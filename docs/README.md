# Documentación del proyecto

Mapa de qué hay en `docs/` y para qué sirve cada cosa.

## 📂 Estructura

```
docs/
├── README.md                   # este archivo
├── memory/                      # contexto vivo — qué hay y qué falta
│   ├── overview.md             # qué es la app, stack, ambiente
│   ├── checklist.md            # bitácora de avance
│   ├── exercises-dataset-audit.md # cobertura, commit y límite de licencia
│   └── architecture.md         # diseño de capas + modelo multi-agente
└── skills/                      # capacidades reusables para agentes
    ├── agents/                  # rol e identidad de cada agente
    │   ├── supabase.md
    │   ├── backend.md
    │   ├── frontend.md
    │   └── reviewer.md         # caveman read-only
    ├── workflow.md              # orden de sprints + checkpoints + plantillas
    ├── prompts.md               # prompts ACTIVOS (se rotan al aplicarse)
    └── scripts/                 # playbooks operativos
        ├── typecheck.md
        ├── preview-build.md
        └── supabase-migration.md
```

## 🧭 Cómo usar esta documentación

### Si vas a darle trabajo a un agente
1. Empieza con `CAVEMAN` y `.claude/skills/caveman.md`
2. Pásale su archivo de identidad: `skills/agents/<agente>.md`
3. Luego el prompt específico que vive en `skills/prompts.md`
4. Cuando termine, corre tests y el revisor

### Si vas a entender el estado del proyecto
1. Empieza en `memory/checklist.md` (qué está hecho, qué falta)
2. Si no conoces el proyecto, lee `memory/overview.md` primero
3. Si vas a cambiar arquitectura, lee `memory/architecture.md`

### Si vas a operar (build, deploy, migration)
1. Ve directo a `skills/scripts/<tarea>.md`

## 🔄 Reglas de mantenimiento

- **`memory/checklist.md`** se actualiza al terminar cada request que cambie código,
  producto, datos u operación; incluye fecha, checks, riesgo y siguiente paso
- **`roadmap*.md`** se actualiza cuando cambia prioridad, benchmark, dependencia o estado
- **`skills/prompts.md`** se rota: lo aplicado se borra o se resume en una línea del checklist
- **`skills/agents/*.md`** son estables, solo cambian si redefines roles
- **`skills/scripts/*.md`** se actualizan cuando cambia el proceso operativo
- No se cierra trabajo con claims obsoletos en otros `.md` relacionados

No se acumulan markdowns. Si un archivo crece más de 300 líneas, partir o resumir.
