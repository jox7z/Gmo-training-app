# Script: typecheck

## Qué hace

Verifica que TypeScript compile sin errores en todo el proyecto.

## Cómo correr

```powershell
npm run typecheck
```

## Criterio de éxito

- Salida vacía después de `> tsc --noEmit`
- Exit code 0

## Errores comunes y solución

| Error | Causa | Solución |
|---|---|---|
| `'/path' is not assignable to RelativePathString` | expo-router no regeneró tipos de rutas | `npx expo start --clear` y dejar que arranque 1 min |
| `Cannot find module '@/...'` | Path alias roto | Verificar `tsconfig.json` tiene `paths: { "@/*": ["src/*"] }` |
| `Property 'X' does not exist on type 'never'` | Inferencia perdida en respuestas de Supabase | Tipar explícitamente la respuesta de la RPC |
| `Type 'any' is not assignable...` | Algo importó tipo de Supabase sin generar tipos | Considerar `supabase gen types typescript` |

## Cuándo correr

- Después de cada cambio del agente Backend
- Antes de cerrar cualquier sprint
- Antes de invocar al revisor caveman
