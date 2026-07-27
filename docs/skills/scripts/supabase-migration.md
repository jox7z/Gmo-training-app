# Script: aplicar migration de Supabase

## Qué hace

Aplica un archivo `.sql` nuevo de `supabase/migrations/` al proyecto
en producción.

## Pre-requisitos

- Acceso al Dashboard de Supabase del proyecto
- Migration ya creada en `supabase/migrations/00XX_nombre.sql`

## Cómo aplicar

### Opción 1: SQL Editor del Dashboard (recomendado para una sola migration)

1. Entra a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto `gmo-training`
3. **SQL Editor → New query**
4. Copia el contenido completo de `supabase/migrations/00XX_*.sql`
5. Pega y pulsa **Run**
6. Verifica:
   - "Success. No rows returned" → migration aplicada
   - Cualquier error → no hubo cambios (las migrations bien escritas son
     transaccionales)

### Opción 2: CLI de Supabase (cuando tengas varias y quieras tracking)

```powershell
npm install -g supabase
supabase login
supabase link --project-ref <project-ref>
supabase db push
```

`db push` aplica todas las migrations nuevas en orden.

## Verificación post-migration

| Cambio aplicado | Cómo verificar |
|---|---|
| Tabla nueva | `Table Editor` debe mostrarla |
| RPC nueva | `select rpc_name(...)` desde SQL Editor devuelve resultado |
| Trigger nuevo | Inserta una fila de prueba en la tabla origen y verifica efecto |
| RLS nueva | Intenta query no autorizada con otro usuario — debe fallar |
| Bucket nuevo | `Storage` lo lista |

## Errores comunes

| Error | Solución |
|---|---|
| `relation "X" already exists` | Migration no es idempotente — añadir `if not exists` |
| `permission denied for schema public` | Olvidaste `grant execute` o `grant usage` |
| `function ... does not exist` cuando el RPC se ve en lista | Cierra y reabre SQL Editor (cache de tipos) |
| `RLS denied` al probar como usuario | La política no cubre el caso — revisa policy y `auth.uid()` |

## Cuándo aplicar

- En cuanto el agente Supabase entregue una migration nueva
- **Antes** de que el agente Backend empiece — si no, las RPCs no
  existen y el Backend va a fallar
- En desarrollo: aplica al proyecto de Supabase de dev
- En producción: aplica con cuidado, idealmente en horario de bajo tráfico

## Notas

- Las migrations son **inmutables**. Una vez aplicada en producción,
  NO la modifiques — crea una nueva con el cambio
- Si una migration falla a mitad, Supabase hace rollback automático
  (todo va en transacción), siempre que la migration esté escrita
  como un solo bloque
- Backup automático del proyecto está activo, pero NO lo uses como
  único safety net — revisa el SQL dos veces antes de Run
