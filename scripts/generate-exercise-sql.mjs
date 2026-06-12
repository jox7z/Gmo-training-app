/**
 * Genera supabase/seed/exercises.sql y supabase/migrations/0032_exercise_catalog_v2.sql
 * a partir de src/data/exercises.ts (fuente única de verdad).
 *
 * Uso: node scripts/generate-exercise-sql.mjs
 *
 * Captura el campo opcional `secondary` (sinergistas) y lo persiste en la columna
 * secondary_muscles text[]. La migración usa upsert idempotente (on conflict do
 * update), así que re-aplicar todo el catálogo es seguro.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/data/exercises.ts'), 'utf8');

// `secondary` es opcional y va entre `muscle` y `equipment`. Si falta, el grupo
// queda undefined. Grupos: 1 id, 2 name, 3 muscle, 4 secondary?, 5 equipment,
// 6 isCompound, 7 instructions.
const rowRe =
  /\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)',\s*muscle:\s*'([^']+)',\s*(?:secondary:\s*\[([^\]]*)\],\s*)?equipment:\s*'([^']+)',\s*isCompound:\s*(true|false),\s*instructions:\s*'([^']+)'\s*\}/g;

const parseSecondary = (raw) =>
  raw ? Array.from(raw.matchAll(/'([^']+)'/g), (m) => m[1]) : [];

const rows = [];
for (const m of src.matchAll(rowRe)) {
  rows.push({
    id: m[1],
    name: m[2],
    muscle: m[3],
    secondary: parseSecondary(m[4]),
    equipment: m[5],
    isCompound: m[6],
    instructions: m[7],
  });
}

if (rows.length === 0) {
  console.error('No se encontraron ejercicios — revisa el formato de exercises.ts');
  process.exit(1);
}

const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sqlArray = (arr) =>
  arr.length ? `array[${arr.map(q).join(', ')}]::text[]` : `'{}'::text[]`;

const values = rows
  .map(
    (r) =>
      `  (${q(r.id)}, ${q(r.name)}, ${q(r.muscle)}, ${sqlArray(r.secondary)}, ${q(r.equipment)}, ${r.isCompound}, ${q(r.instructions)})`,
  )
  .join(',\n');

const upsert = `insert into public.exercises (id, name, muscle_group, secondary_muscles, equipment, is_compound, instructions) values
${values}
on conflict (id) do update set
  name = excluded.name,
  muscle_group = excluded.muscle_group,
  secondary_muscles = excluded.secondary_muscles,
  equipment = excluded.equipment,
  is_compound = excluded.is_compound,
  instructions = excluded.instructions;
`;

const seedHeader = `-- Seed catálogo de ejercicios. GENERADO por scripts/generate-exercise-sql.mjs
-- desde src/data/exercises.ts — no editar a mano.
`;

const migrationHeader = `-- 0032: catálogo ampliado de ejercicios (${rows.length} ejercicios).
-- GENERADO por scripts/generate-exercise-sql.mjs desde src/data/exercises.ts.
-- Upsert idempotente: persiste secondary_muscles e inserta los ejercicios nuevos
-- sin tocar los existentes (no hay DELETE → no rompe FKs de rutinas).
`;

writeFileSync(join(root, 'supabase/seed/exercises.sql'), seedHeader + upsert);
writeFileSync(
  join(root, 'supabase/migrations/0032_exercise_catalog_v2.sql'),
  migrationHeader + upsert,
);

console.log(`OK — ${rows.length} ejercicios escritos en seed y migración 0032.`);
