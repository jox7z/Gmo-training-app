/**
 * One-off asset pipeline: downloads a demonstration image for each catalog
 * exercise from the public-domain free-exercise-db (yuhonas/free-exercise-db,
 * Unlicense), resizes and re-encodes it to an optimized WebP, and writes it to
 * assets/exercises/<exerciseId>.webp.
 *
 * Run: node scripts/fetch-exercise-images.mjs
 * Requires: sharp (devDependency).
 *
 * Images are intentionally bundled (not remote) so the picker works offline and
 * has no runtime licensing/availability dependency. Source is public domain.
 */
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'assets', 'exercises');
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// our catalog id -> free-exercise-db image path (frame 0 = start position)
const MAP = {
  'bench-press': 'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
  'incline-db-press': 'Incline_Dumbbell_Press/0.jpg',
  'cable-fly': 'Cable_Crossover/0.jpg',
  'pull-up': 'Pullups/0.jpg',
  'barbell-row': 'Bent_Over_Barbell_Row/0.jpg',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown/0.jpg',
  'face-pull': 'Face_Pull/0.jpg',
  'deadlift': 'Barbell_Deadlift/0.jpg',
  'overhead-press': 'Standing_Military_Press/0.jpg',
  'lateral-raise': 'Side_Lateral_Raise/0.jpg',
  'rear-delt-fly': 'Reverse_Flyes/0.jpg',
  'biceps-curl': 'Dumbbell_Bicep_Curl/0.jpg',
  'hammer-curl': 'Hammer_Curls/0.jpg',
  'triceps-pushdown': 'Triceps_Pushdown/0.jpg',
  'skull-crusher': 'Lying_Triceps_Press/0.jpg',
  'squat': 'Barbell_Squat/0.jpg',
  'leg-press': 'Leg_Press/0.jpg',
  'lunges': 'Dumbbell_Lunges/0.jpg',
  'romanian-deadlift': 'Romanian_Deadlift/0.jpg',
  'leg-curl': 'Lying_Leg_Curls/0.jpg',
  'hip-thrust': 'Barbell_Hip_Thrust/0.jpg',
  'standing-calf': 'Standing_Calf_Raises/0.jpg',
  'plank': 'Plank/0.jpg',
  'hanging-leg-raise': 'Hanging_Leg_Raise/0.jpg',
};

// Display size in the picker is ~64-96px; demonstration card up to ~340px wide.
// 480px keeps it crisp on high-DPI while staying tiny once WebP-compressed.
const TARGET_WIDTH = 480;
const WEBP_QUALITY = 80;

await mkdir(OUT_DIR, { recursive: true });

let total = 0;
const results = [];
for (const [id, imgPath] of Object.entries(MAP)) {
  const url = `${BASE}/${imgPath}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const out = await sharp(buf)
      .resize({ width: TARGET_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer();
    await writeFile(join(OUT_DIR, `${id}.webp`), out);
    total += out.length;
    results.push(`${id.padEnd(20)} ${(out.length / 1024).toFixed(1)} KB`);
  } catch (e) {
    results.push(`${id.padEnd(20)} FAILED: ${e.message}`);
  }
}

console.log(results.join('\n'));
console.log(`\n${Object.keys(MAP).length} exercises, total ${(total / 1024).toFixed(0)} KB`);
