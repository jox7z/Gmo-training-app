/**
 * Integra únicamente metadata/instrucciones de hasaneyldrm/exercises-dataset.
 *
 * La licencia MIT del repositorio NO cubre `images/` ni `videos/`: esos
 * archivos pertenecen a Gym visual y requieren una licencia propia. Este
 * script nunca descarga media. Conserva nuestros IDs estables y relaciona
 * cada ejercicio con el dataset mediante el nombre inglés ya documentado en
 * `fetch-exercise-images.mjs`.
 *
 * Uso:
 *   node scripts/sync-exercises-dataset.mjs
 *   node scripts/sync-exercises-dataset.mjs --write
 *   node scripts/sync-exercises-dataset.mjs --write --source ruta/exercises.json
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const REPOSITORY = 'hasaneyldrm/exercises-dataset';
const PINNED_COMMIT = '7455efae41b330c265e7cd4b78dfa848e7ce5ebd';
const DATA_URL =
  `https://raw.githubusercontent.com/${REPOSITORY}/${PINNED_COMMIT}/data/exercises.json`;
const MEDIA_LICENSE_WARNING =
  'No se importan images/ ni videos/: pertenecen a Gym visual y requieren licencia propia.';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const FETCH_SCRIPT = join(__dirname, 'fetch-exercise-images.mjs');
const OUTPUT_JSON = join(ROOT, 'src', 'data', 'exerciseDatasetDetails.generated.json');
const OUTPUT_AUDIT = join(ROOT, 'docs', 'memory', 'exercises-dataset-audit.md');
const args = process.argv.slice(2);
const shouldWrite = args.includes('--write');
const sourceArgIndex = args.indexOf('--source');
const sourcePath = sourceArgIndex >= 0 ? args[sourceArgIndex + 1] : undefined;

if (sourceArgIndex >= 0 && !sourcePath) {
  throw new Error('Falta la ruta después de --source.');
}

const dataset = sourcePath
  ? JSON.parse(await readFile(sourcePath, 'utf8'))
  : await fetchDataset();
const sourceMap = await readExistingSourceMap();
const matches = matchCatalog(sourceMap, dataset);
const accepted = matches.filter((match) => match.accepted);
const rejected = matches.filter((match) => !match.accepted);

console.log(`Dataset externo: ${dataset.length} ejercicios`);
console.log(`Catálogo local con referencia inglesa: ${matches.length}`);
console.log(`Matches conservadores: ${accepted.length}`);
console.log(`Sin match seguro: ${rejected.length}`);
console.log(MEDIA_LICENSE_WARNING);

if (shouldWrite) {
  await mkdir(dirname(OUTPUT_JSON), { recursive: true });
  await mkdir(dirname(OUTPUT_AUDIT), { recursive: true });
  await writeFile(OUTPUT_JSON, `${JSON.stringify(buildOutput(accepted), null, 2)}\n`);
  await writeFile(OUTPUT_AUDIT, buildAudit(matches, dataset.length));
  console.log(`Escrito: ${OUTPUT_JSON}`);
  console.log(`Escrito: ${OUTPUT_AUDIT}`);
} else {
  console.log('Dry-run: usa --write para actualizar los artefactos versionados.');
}

async function fetchDataset() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`No se pudo descargar metadata: HTTP ${response.status}`);
  }
  return response.json();
}

async function readExistingSourceMap() {
  const source = await readFile(FETCH_SCRIPT, 'utf8');
  const marker = 'const MAP = {';
  const markerIndex = source.indexOf(marker);
  const objectStart = source.indexOf('{', markerIndex);
  const objectEnd = source.indexOf('\n};', objectStart);
  if (markerIndex < 0 || objectStart < 0 || objectEnd < 0) {
    throw new Error('No se pudo leer MAP de fetch-exercise-images.mjs.');
  }
  const literal = source.slice(objectStart, objectEnd + 2);
  return vm.runInNewContext(`(${literal})`, Object.create(null), { timeout: 1_000 });
}

function matchCatalog(sourceMap, entries) {
  const candidates = entries
    .filter(isDatasetEntry)
    .map((entry) => ({
      entry,
      normalized: normalizeName(entry.name),
    }));

  return Object.entries(sourceMap).map(([localId, imagePath]) => {
    const sourceName = String(imagePath).split('/')[0].replaceAll('_', ' ');
    const normalizedSource = normalizeName(sourceName);
    const ranked = candidates
      .map((candidate) => ({
        entry: candidate.entry,
        score: similarity(normalizedSource, candidate.normalized),
      }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0];
    const second = ranked[1];
    const margin = best.score - second.score;
    const accepted =
      best.score === 1 ||
      (best.score >= 0.86 && margin >= 0.06);

    return {
      localId,
      sourceName,
      external: best.entry,
      score: best.score,
      margin,
      accepted,
    };
  });
}

function buildOutput(matches) {
  const exercises = Object.fromEntries(
    matches
      .sort((a, b) => a.localId.localeCompare(b.localId))
      .map(({ localId, external, score }) => [
        localId,
        {
          externalId: external.id,
          sourceName: external.name,
          instructionsEs: external.instructions.es,
          instructionsEn: external.instructions.en,
          matchScore: Number(score.toFixed(3)),
        },
      ]),
  );

  return {
    source: {
      repository: `https://github.com/${REPOSITORY}`,
      commit: PINNED_COMMIT,
      license: 'MIT para código, estructura, datos e instrucciones',
      mediaIncluded: false,
      mediaWarning: MEDIA_LICENSE_WARNING,
    },
    exercises,
  };
}

function buildAudit(matches, datasetCount) {
  const accepted = matches.filter((match) => match.accepted);
  const review = matches
    .filter((match) => !match.accepted || match.score < 0.94)
    .sort((a, b) => a.score - b.score);
  const rows = review
    .map(
      (match) =>
        `| \`${match.localId}\` | ${escapeCell(match.sourceName)} | ${escapeCell(match.external.name)} | ${match.score.toFixed(3)} | ${match.accepted ? 'aceptado' : 'revisar'} |`,
    )
    .join('\n');

  return `# Auditoría de exercises-dataset

> Fuente: [${REPOSITORY}](https://github.com/${REPOSITORY}) · commit \`${PINNED_COMMIT}\`.
> Generado por \`node scripts/sync-exercises-dataset.mjs --write\`.

## Resultado

- Dataset externo: ${datasetCount} ejercicios.
- Catálogo local: ${matches.length} ejercicios con referencia inglesa disponible.
- Instrucciones enlazadas con criterio conservador: ${accepted.length}.
- Pendientes de mapeo manual: ${matches.length - accepted.length}.
- IDs locales preservados: el historial y las rutinas no se migran.
- Media externa importada: **no**.

## Decisión de licencia

La licencia MIT cubre código, estructura, datos e instrucciones, pero excluye
expresamente \`images/\` y \`videos/\`. Esos archivos pertenecen a Gym visual y
clonar el repositorio no concede permiso de reutilización. Gmo conserva sus
WebP offline actuales, procedentes de \`yuhonas/free-exercise-db\` (Unlicense).

## Matches que requieren atención

| ID local | Referencia inglesa | Candidato externo | Score | Estado |
|---|---|---|---:|---|
${rows || '| — | — | — | — | sin pendientes |'}
`;
}

function isDatasetEntry(entry) {
  return (
    entry &&
    typeof entry.id === 'string' &&
    typeof entry.name === 'string' &&
    typeof entry.instructions?.es === 'string' &&
    typeof entry.instructions?.en === 'string'
  );
}

function normalizeName(value) {
  const aliases = new Map([
    ['flyes', 'fly'],
    ['pushups', 'push up'],
    ['pullups', 'pull up'],
    ['hyperextensions', 'hyperextension'],
    ['crunches', 'crunch'],
    ['rows', 'row'],
    ['curls', 'curl'],
    ['raises', 'raise'],
    ['extensions', 'extension'],
    ['lunges', 'lunge'],
    ['shrugs', 'shrug'],
  ]);
  const ignored = new Set([
    'medium',
    'grip',
    'version',
    'attachment',
    'style',
    'with',
    'on',
    'the',
  ]);

  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .flatMap((token) => (aliases.get(token) ?? token).split(' '))
    .filter((token) => !ignored.has(token))
    .join(' ');
}

function similarity(a, b) {
  if (a === b) return 1;
  const aTokens = new Set(a.split(' '));
  const bTokens = new Set(b.split(' '));
  const common = [...aTokens].filter((token) => bTokens.has(token)).length;
  const dice = (2 * common) / (aTokens.size + bTokens.size);
  const edit = 1 - levenshtein(a, b) / Math.max(a.length, b.length, 1);
  return dice * 0.72 + edit * 0.28;
}

function levenshtein(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(
        previous[j] + 1,
        previous[j - 1] + 1,
        diagonal + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      diagonal = above;
    }
  }
  return previous[b.length];
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|');
}
