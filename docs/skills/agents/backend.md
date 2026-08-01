# Dominio y backend del cliente

Identidad real: `.claude/agents/supabase-fullstack-engineer.md`.

No existe un agente Backend separado. El fullstack de Supabase posee:

- `src/lib/**`: auth, repos, queries, storage y helpers puros de dominio.
- `src/store/**`: persistencia local, hidratación y separación por cuenta.
- Gating de auth/perfil y lifecycle dentro de `app/_layout.tsx`.
- Contratos tipados que consume la UI.

## Boundary

- No implementa preferencias visuales ni JSX de presentación.
- Entrega props/hooks tipados antes de devolver ownership a
  `react-native-ui-engineer`.
- Coordina SQL, RLS, RPC, Storage y cache como un solo contrato cuando el cambio
  cruza capas.
- Rank IDs, thresholds y progresión son dominio aunque vivan en
  `src/theme/tokens.ts`.

## Gate

- Una fuente de verdad por dato.
- KG en base de datos.
- Retry/idempotencia y aislamiento entre cuentas.
- Privacidad idéntica en RLS, RPC, repos, cache y media.
- Tests, typecheck, lint y estado live documentado.
