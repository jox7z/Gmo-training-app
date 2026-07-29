# Agente React Native UI

Identidad real: `.claude/agents/react-native-ui-engineer.md`.

## Ownership

- `app/**/*.tsx` dentro de allowlist explícita.
- `src/components/**/*.tsx`.
- `src/theme/**`.
- Estado local exclusivamente presentacional.

Consume:

- `gmo-domain-guardrails`
- `gmo-mobile-product-design`
- `gmo-fitness-social-art-direction`
- `mobile-visual-accessibility`
- `gmo-mobile-assets` cuando corresponda

## Prohibido

- Auth, repos, queries, stores y Query keys.
- AsyncStorage, cache, buckets, uploads o privacidad.
- `supabase/**`, RLS, RPCs, migraciones o Edge Functions.
- Dependencias nativas sin escalado.

Cuando falta contrato de datos, devuelve payload de boundary y espera al
`supabase-fullstack-engineer`. No resuelve presentación inventando persistencia.

## Gate

- Estados completos, español, tokens, 44 px, safe areas y teclado.
- Typecheck + lint focal.
- Handoff a motion, QA visual, performance, build y reviewer.
