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
// Catalog ids with no reasonable match in free-exercise-db are intentionally
// absent (the picker falls back to an icon): machine-lateral-raise,
// single-leg-calf-raise, burpee.
const MAP = {
  // ── pecho ──
  'bench-press': 'Barbell_Bench_Press_-_Medium_Grip/0.jpg',
  'incline-bench-press': 'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg',
  'decline-bench-press': 'Decline_Barbell_Bench_Press/0.jpg',
  'incline-db-press': 'Incline_Dumbbell_Press/0.jpg',
  'flat-db-press': 'Dumbbell_Bench_Press/0.jpg',
  'decline-db-press': 'Decline_Dumbbell_Bench_Press/0.jpg',
  'smith-bench-press': 'Smith_Machine_Bench_Press/0.jpg',
  'chest-press-machine': 'Machine_Bench_Press/0.jpg',
  'db-fly': 'Dumbbell_Flyes/0.jpg',
  'incline-db-fly': 'Incline_Dumbbell_Flyes/0.jpg',
  'cable-fly': 'Cable_Crossover/0.jpg',
  'cable-crossover': 'Cable_Crossover/0.jpg',
  'low-cable-fly': 'Low_Cable_Crossover/0.jpg',
  'pec-deck': 'Butterfly/0.jpg',
  'push-up': 'Pushups/0.jpg',
  'chest-dips': 'Dips_-_Chest_Version/0.jpg',
  // ── espalda ──
  'pull-up': 'Pullups/0.jpg',
  'chin-up': 'Chin-Up/0.jpg',
  'assisted-pull-up': 'Band_Assisted_Pull-Up/0.jpg',
  'inverted-row': 'Inverted_Row/0.jpg',
  'barbell-row': 'Bent_Over_Barbell_Row/0.jpg',
  'pendlay-row': 'Bent_Over_Barbell_Row/0.jpg',
  't-bar-row': 'T-Bar_Row_with_Handle/0.jpg',
  'single-arm-db-row': 'One-Arm_Dumbbell_Row/0.jpg',
  'chest-supported-row': 'Dumbbell_Incline_Row/0.jpg',
  'seated-cable-row': 'Seated_Cable_Rows/0.jpg',
  'machine-row': 'Leverage_Iso_Row/0.jpg',
  'lat-pulldown': 'Wide-Grip_Lat_Pulldown/0.jpg',
  'close-grip-lat-pulldown': 'Close-Grip_Front_Lat_Pulldown/0.jpg',
  'straight-arm-pulldown': 'Straight-Arm_Pulldown/0.jpg',
  'db-pullover': 'Bent-Arm_Dumbbell_Pullover/0.jpg',
  'face-pull': 'Face_Pull/0.jpg',
  'back-extension': 'Hyperextensions_Back_Extensions/0.jpg',
  'rack-pull': 'Rack_Pulls/0.jpg',
  'barbell-shrug': 'Barbell_Shrug/0.jpg',
  'db-shrug': 'Dumbbell_Shrug/0.jpg',
  // ── hombro frontal ──
  'overhead-press': 'Standing_Military_Press/0.jpg',
  'seated-db-shoulder-press': 'Dumbbell_Shoulder_Press/0.jpg',
  'arnold-press': 'Arnold_Dumbbell_Press/0.jpg',
  'machine-shoulder-press': 'Machine_Shoulder_Military_Press/0.jpg',
  'smith-shoulder-press': 'Smith_Machine_Overhead_Shoulder_Press/0.jpg',
  'push-press': 'Push_Press/0.jpg',
  'landmine-press': 'Landmine_Linear_Jammer/0.jpg',
  'front-raise': 'Front_Dumbbell_Raise/0.jpg',
  // ── hombro lateral ──
  'lateral-raise': 'Side_Lateral_Raise/0.jpg',
  'cable-lateral-raise': 'Standing_Low-Pulley_Deltoid_Raise/0.jpg',
  'upright-row': 'Upright_Barbell_Row/0.jpg',
  // ── hombro posterior ──
  'rear-delt-fly': 'Reverse_Flyes/0.jpg',
  'reverse-pec-deck': 'Reverse_Machine_Flyes/0.jpg',
  'cable-rear-delt-fly': 'Cable_Rear_Delt_Fly/0.jpg',
  // ── bíceps ──
  'biceps-curl': 'Dumbbell_Bicep_Curl/0.jpg',
  'barbell-curl': 'Barbell_Curl/0.jpg',
  'ez-bar-curl': 'EZ-Bar_Curl/0.jpg',
  'hammer-curl': 'Hammer_Curls/0.jpg',
  'incline-db-curl': 'Incline_Dumbbell_Curl/0.jpg',
  'preacher-curl': 'Preacher_Curl/0.jpg',
  'concentration-curl': 'Concentration_Curls/0.jpg',
  'cable-curl': 'Standing_Biceps_Cable_Curl/0.jpg',
  'machine-biceps-curl': 'Machine_Bicep_Curl/0.jpg',
  'spider-curl': 'Spider_Curl/0.jpg',
  'reverse-curl': 'Reverse_Barbell_Curl/0.jpg',
  // ── tríceps ──
  'triceps-pushdown': 'Triceps_Pushdown/0.jpg',
  'rope-pushdown': 'Triceps_Pushdown_-_Rope_Attachment/0.jpg',
  'skull-crusher': 'Lying_Triceps_Press/0.jpg',
  'close-grip-bench-press': 'Close-Grip_Barbell_Bench_Press/0.jpg',
  'overhead-cable-extension': 'Cable_Rope_Overhead_Triceps_Extension/0.jpg',
  'overhead-db-extension': 'Standing_Dumbbell_Triceps_Extension/0.jpg',
  'triceps-kickback': 'Tricep_Dumbbell_Kickback/0.jpg',
  'machine-triceps-extension': 'Machine_Triceps_Extension/0.jpg',
  'bench-dips': 'Bench_Dips/0.jpg',
  'diamond-push-up': 'Push-Ups_-_Close_Triceps_Position/0.jpg',
  // ── cuádriceps ──
  'squat': 'Barbell_Squat/0.jpg',
  'front-squat': 'Front_Barbell_Squat/0.jpg',
  'smith-squat': 'Smith_Machine_Squat/0.jpg',
  'hack-squat': 'Hack_Squat/0.jpg',
  'goblet-squat': 'Goblet_Squat/0.jpg',
  'leg-press': 'Leg_Press/0.jpg',
  'leg-extension': 'Leg_Extensions/0.jpg',
  'lunges': 'Dumbbell_Lunges/0.jpg',
  'walking-lunges': 'Bodyweight_Walking_Lunge/0.jpg',
  'bulgarian-split-squat': 'Split_Squat_with_Dumbbells/0.jpg',
  'step-up': 'Dumbbell_Step_Ups/0.jpg',
  'sissy-squat': 'Weighted_Sissy_Squat/0.jpg',
  // ── isquiotibiales ──
  'romanian-deadlift': 'Romanian_Deadlift/0.jpg',
  'db-romanian-deadlift': 'Stiff-Legged_Dumbbell_Deadlift/0.jpg',
  'stiff-leg-deadlift': 'Stiff-Legged_Barbell_Deadlift/0.jpg',
  'leg-curl': 'Lying_Leg_Curls/0.jpg',
  'seated-leg-curl': 'Seated_Leg_Curl/0.jpg',
  'good-morning': 'Good_Morning/0.jpg',
  'nordic-curl': 'Natural_Glute_Ham_Raise/0.jpg',
  'glute-ham-raise': 'Glute_Ham_Raise/0.jpg',
  // ── glúteos ──
  'hip-thrust': 'Barbell_Hip_Thrust/0.jpg',
  'machine-hip-thrust': 'Smith_Machine_Hip_Raise/0.jpg',
  'glute-bridge': 'Butt_Lift_Bridge/0.jpg',
  'sumo-deadlift': 'Sumo_Deadlift/0.jpg',
  'cable-kickback': 'One-Legged_Cable_Kickback/0.jpg',
  'cable-pull-through': 'Pull_Through/0.jpg',
  'hip-abduction-machine': 'Thigh_Abductor/0.jpg',
  // ── gemelos ──
  'standing-calf': 'Standing_Calf_Raises/0.jpg',
  'seated-calf-raise': 'Seated_Calf_Raise/0.jpg',
  'calf-press': 'Calf_Press_On_The_Leg_Press_Machine/0.jpg',
  'smith-calf-raise': 'Smith_Machine_Calf_Raise/0.jpg',
  // ── core ──
  'plank': 'Plank/0.jpg',
  'side-plank': 'Side_Bridge/0.jpg',
  'hanging-leg-raise': 'Hanging_Leg_Raise/0.jpg',
  'lying-leg-raise': 'Flat_Bench_Lying_Leg_Raise/0.jpg',
  'crunch': 'Crunches/0.jpg',
  'bicycle-crunch': 'Air_Bike/0.jpg',
  'decline-sit-up': 'Decline_Crunch/0.jpg',
  'cable-crunch': 'Cable_Crunch/0.jpg',
  'machine-crunch': 'Ab_Crunch_Machine/0.jpg',
  'russian-twist': 'Russian_Twist/0.jpg',
  'mountain-climbers': 'Mountain_Climbers/0.jpg',
  'dead-bug': 'Dead_Bug/0.jpg',
  'ab-wheel': 'Ab_Roller/0.jpg',
  'pallof-press': 'Pallof_Press/0.jpg',
  // ── cuerpo completo ──
  'deadlift': 'Barbell_Deadlift/0.jpg',
  'trap-bar-deadlift': 'Trap_Bar_Deadlift/0.jpg',
  'clean-and-press': 'Clean_and_Press/0.jpg',
  'thruster': 'Kettlebell_Thruster/0.jpg',
  'kettlebell-swing': 'One-Arm_Kettlebell_Swings/0.jpg',
  'turkish-getup': 'Kettlebell_Turkish_Get-Up_Squat_style/0.jpg',
  'farmers-walk': 'Farmers_Walk/0.jpg',
  // ── comunes añadidos ──
  'incline-chest-press-machine': 'Leverage_Incline_Chest_Press/0.jpg',
  'decline-chest-press-machine': 'Leverage_Decline_Chest_Press/0.jpg',
  'smith-incline-press': 'Smith_Machine_Incline_Bench_Press/0.jpg',
  'smith-decline-press': 'Smith_Machine_Decline_Press/0.jpg',
  'incline-cable-press': 'Incline_Cable_Chest_Press/0.jpg',
  'incline-cable-fly': 'Incline_Cable_Flye/0.jpg',
  'single-arm-cable-crossover': 'Single-Arm_Cable_Crossover/0.jpg',
  'floor-press': 'Floor_Press/0.jpg',
  'db-floor-press': 'Dumbbell_Floor_Press/0.jpg',
  'wide-grip-bench-press': 'Wide-Grip_Barbell_Bench_Press/0.jpg',
  'one-arm-db-press': 'One_Arm_Dumbbell_Bench_Press/0.jpg',
  'incline-push-up': 'Incline_Push-Up/0.jpg',
  'decline-push-up': 'Decline_Push-Up/0.jpg',
  'wide-push-up': 'Push-Up_Wide/0.jpg',
  'wide-grip-lat-pulldown': 'Wide-Grip_Lat_Pulldown/0.jpg',
  'underhand-pulldown': 'Underhand_Cable_Pulldowns/0.jpg',
  'v-bar-pulldown': 'V-Bar_Pulldown/0.jpg',
  'one-arm-lat-pulldown': 'One_Arm_Lat_Pulldown/0.jpg',
  'smith-row': 'Smith_Machine_Bent_Over_Row/0.jpg',
  'reverse-grip-row': 'Reverse_Grip_Bent-Over_Rows/0.jpg',
  'two-arm-db-row': 'Bent_Over_Two-Dumbbell_Row/0.jpg',
  'seated-one-arm-cable-row': 'Seated_One-arm_Cable_Pulley_Rows/0.jpg',
  'leverage-high-row': 'Leverage_High_Row/0.jpg',
  'machine-shrug': 'Leverage_Shrug/0.jpg',
  'cable-shrug': 'Cable_Shrugs/0.jpg',
  'rope-straight-arm-pulldown': 'Rope_Straight-Arm_Pulldown/0.jpg',
  'barbell-pullover': 'Bent-Arm_Barbell_Pullover/0.jpg',
  'weighted-pull-up': 'Weighted_Pull_Ups/0.jpg',
  'seated-barbell-press': 'Seated_Barbell_Military_Press/0.jpg',
  'cable-shoulder-press': 'Cable_Shoulder_Press/0.jpg',
  'single-arm-db-shoulder-press': 'Dumbbell_One-Arm_Shoulder_Press/0.jpg',
  'cable-front-raise': 'Front_Cable_Raise/0.jpg',
  'barbell-front-raise': 'Standing_Front_Barbell_Raise_Over_Head/0.jpg',
  'seated-lateral-raise': 'Seated_Side_Lateral_Raise/0.jpg',
  'one-arm-side-lateral': 'One-Arm_Side_Laterals/0.jpg',
  'cable-upright-row': 'Upright_Cable_Row/0.jpg',
  'db-upright-row': 'Standing_Dumbbell_Upright_Row/0.jpg',
  'seated-rear-delt-fly': 'Seated_Bent-Over_Rear_Delt_Raise/0.jpg',
  'lying-rear-delt-raise': 'Lying_Rear_Delt_Raise/0.jpg',
  'cable-rope-rear-delt-row': 'Cable_Rope_Rear-Delt_Rows/0.jpg',
  'cable-hammer-curl': 'Cable_Hammer_Curls_-_Rope_Attachment/0.jpg',
  'seated-db-curl': 'Seated_Dumbbell_Curl/0.jpg',
  'alternating-db-curl': 'Dumbbell_Alternate_Bicep_Curl/0.jpg',
  'zottman-curl': 'Zottman_Curl/0.jpg',
  'drag-curl': 'Drag_Curl/0.jpg',
  'cross-body-hammer-curl': 'Cross_Body_Hammer_Curl/0.jpg',
  'cable-preacher-curl': 'Cable_Preacher_Curl/0.jpg',
  'machine-preacher-curl': 'Machine_Preacher_Curls/0.jpg',
  'wide-grip-barbell-curl': 'Wide-Grip_Standing_Barbell_Curl/0.jpg',
  'v-bar-pushdown': 'Triceps_Pushdown_-_V-Bar_Attachment/0.jpg',
  'reverse-grip-pushdown': 'Reverse_Grip_Triceps_Pushdown/0.jpg',
  'single-arm-pushdown': 'Cable_One_Arm_Tricep_Extension/0.jpg',
  'ez-skull-crusher': 'EZ-Bar_Skullcrusher/0.jpg',
  'db-skull-crusher': 'Lying_Dumbbell_Tricep_Extension/0.jpg',
  'seated-db-triceps-press': 'Seated_Triceps_Press/0.jpg',
  'dip-machine': 'Dip_Machine/0.jpg',
  'parallel-bar-dip': 'Dips_-_Triceps_Version/0.jpg',
  'close-grip-db-press': 'Close-Grip_Dumbbell_Press/0.jpg',
  'smith-close-grip-press': 'Smith_Machine_Close-Grip_Bench_Press/0.jpg',
  'standing-overhead-barbell-extension': 'Standing_Overhead_Barbell_Triceps_Extension/0.jpg',
  'box-squat': 'Box_Squat/0.jpg',
  'dumbbell-squat': 'Dumbbell_Squat/0.jpg',
  'barbell-lunge': 'Barbell_Lunge/0.jpg',
  'reverse-lunge': 'Dumbbell_Rear_Lunge/0.jpg',
  'barbell-walking-lunge': 'Barbell_Walking_Lunge/0.jpg',
  'narrow-stance-leg-press': 'Narrow_Stance_Leg_Press/0.jpg',
  'single-leg-extension': 'Single-Leg_Leg_Extension/0.jpg',
  'barbell-step-up': 'Barbell_Step_Ups/0.jpg',
  'plie-squat': 'Plie_Dumbbell_Squat/0.jpg',
  'standing-leg-curl': 'Standing_Leg_Curl/0.jpg',
  'single-leg-rdl': 'Kettlebell_One-Legged_Deadlift/0.jpg',
  'reverse-hyperextension': 'Reverse_Hyperextension/0.jpg',
  'smith-stiff-leg-deadlift': 'Smith_Machine_Stiff-Legged_Deadlift/0.jpg',
  'barbell-glute-bridge': 'Barbell_Glute_Bridge/0.jpg',
  'single-leg-glute-bridge': 'Single_Leg_Glute_Bridge/0.jpg',
  'glute-kickback': 'Glute_Kickback/0.jpg',
  'donkey-calf-raise': 'Donkey_Calf_Raises/0.jpg',
  'db-standing-calf-raise': 'Standing_Dumbbell_Calf_Raise/0.jpg',
  'reverse-crunch': 'Reverse_Crunch/0.jpg',
  'cable-woodchopper': 'Standing_Cable_Wood_Chop/0.jpg',
  'captains-chair-leg-raise': 'Knee_Hip_Raise_On_Parallel_Bars/0.jpg',
  'sit-up': 'Sit-Up/0.jpg',
  'cable-russian-twist': 'Cable_Russian_Twists/0.jpg',
  'weighted-side-bend': 'Dumbbell_Side_Bend/0.jpg',
  'v-up': 'Jackknife_Sit-Up/0.jpg',
  'oblique-crunch': 'Oblique_Crunches/0.jpg',
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
