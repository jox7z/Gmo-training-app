# Supabase y seguridad

Identidad real: `.claude/agents/supabase-fullstack-engineer.md`.

Este documento describe la especialización SQL del mismo agente fullstack; no es
un segundo owner.

## Ownership

- `supabase/migrations/**`, `supabase/functions/**`, `supabase/config.toml`.
- Schema, constraints, índices, RLS, RPCs, triggers, Edge Functions y Storage.
- Repos/queries/stores/clientes afectados por el contrato.
- Auth gating en `app/_layout.tsx` cuando cambia sesión, perfil u onboarding.

## Reglas

- RLS en cada tabla de usuario.
- `security definer` con `set search_path`, ownership explícito y grants mínimos.
- Privacidad de workout idéntica en RLS y cada RPC social.
- Media restringida nunca entra a bucket público.
- No aplicar `0051`/`0052` live antes de reconciliar el ledger hosted completo.
- Live ya conserva objetivos ordenados en `profiles.goals`; `goals[0]` refleja
  el `goal` legacy.
- Timeout de auth no equivale a logout ni autoriza borrar estado local.

Trabajo visual puro devuelve `visual-only: yes`. Si requiere auth, datos,
persistencia, cache, upload o privacidad, el agente define el contrato seguro antes
del handoff UI.
