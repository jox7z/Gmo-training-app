import { useRef, useEffect } from 'react';
import { View, ScrollView } from 'react-native';
import { colors, radius, spacing } from '@/theme/tokens';
import { Text } from '@/components/ui/Text';
import { Card } from '@/components/ui/Card';
import { useWorkoutsStore } from '@/store/workouts';

const CELL = 11;
const GAP = 2;
const STEP = CELL + GAP;
const NUM_WEEKS = 53;

const DAY_LABELS = ['L', '', 'X', '', 'V', '', 'D'];
const MONTH_LABELS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Empty → primary at increasing opacity
const HEAT_COLORS = [
  colors.bg.elevated,        // 0 — sin workout
  'rgba(255,59,59,0.18)',    // 1
  'rgba(255,59,59,0.42)',    // 2
  'rgba(255,59,59,0.68)',    // 3
  colors.primary.DEFAULT,    // 4 — máximo
];

function localDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function intensityLevel(reps: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (max === 0 || reps === 0) return 0;
  const r = reps / max;
  if (r < 0.25) return 1;
  if (r < 0.5) return 2;
  if (r < 0.75) return 3;
  return 4;
}

interface DayCell {
  dateKey: string;
  level: 0 | 1 | 2 | 3 | 4;
  isFuture: boolean;
}

interface Week {
  id: string;
  firstMonth: number;
  cells: DayCell[];
}

function buildGrid(repsByDay: Record<string, number>, max: number): Week[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = localDateKey(today);

  // Grid starts on Monday, NUM_WEEKS ago
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const gridStart = new Date(today);
  gridStart.setDate(today.getDate() - daysSinceMonday - (NUM_WEEKS - 1) * 7);

  const weeks: Week[] = [];
  for (let w = 0; w < NUM_WEEKS; w++) {
    const cells: DayCell[] = [];
    let firstMonth = 0;
    for (let d = 0; d < 7; d++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + w * 7 + d);
      const key = localDateKey(date);
      const isFuture = key > todayKey;
      if (d === 0) firstMonth = date.getMonth();
      cells.push({
        dateKey: key,
        level: isFuture ? 0 : intensityLevel(repsByDay[key] ?? 0, max),
        isFuture,
      });
    }
    weeks.push({ id: `w${w}`, firstMonth, cells });
  }
  return weeks;
}

export function Heatmap() {
  const history = useWorkoutsStore((s) => s.history);
  const scrollRef = useRef<ScrollView>(null);

  // Aggregate reps per calendar day
  const repsByDay: Record<string, number> = {};
  for (const w of history) {
    const k = localDateKey(new Date(w.startedAt));
    repsByDay[k] = (repsByDay[k] ?? 0) + w.totalReps;
  }
  const maxReps = history.length > 0 ? Math.max(...Object.values(repsByDay)) : 0;

  const weeks = buildGrid(repsByDay, maxReps);

  // Month label: show when the month changes week-to-week
  const monthMarkers = new Map<number, string>();
  let prevMonth = -1;
  weeks.forEach((week, i) => {
    if (week.firstMonth !== prevMonth) {
      monthMarkers.set(i, MONTH_LABELS[week.firstMonth]);
      prevMonth = week.firstMonth;
    }
  });

  useEffect(() => {
    // Slight delay so layout is complete before scrolling
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 80);
    return () => clearTimeout(t);
  }, []);

  return (
    <Card padding="lg">
      <Text variant="label" tone="muted" style={{ marginBottom: spacing.sm }}>
        Último año
      </Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <View>
          {/* Month labels row */}
          <View style={{ flexDirection: 'row', marginLeft: 18, height: 14, marginBottom: 3 }}>
            {weeks.map((week, i) => (
              <View key={week.id} style={{ width: STEP }}>
                {monthMarkers.has(i) && (
                  <Text
                    style={{
                      fontSize: 9,
                      color: colors.text.muted,
                      position: 'absolute',
                      left: 0,
                      lineHeight: 12,
                    }}
                  >
                    {monthMarkers.get(i)}
                  </Text>
                )}
              </View>
            ))}
          </View>

          {/* Grid body */}
          <View style={{ flexDirection: 'row' }}>
            {/* Day-of-week labels */}
            <View style={{ width: 16, marginRight: 2 }}>
              {DAY_LABELS.map((label, i) => (
                <View
                  key={i}
                  style={{
                    height: CELL,
                    marginBottom: i < 6 ? GAP : 0,
                    justifyContent: 'center',
                  }}
                >
                  <Text style={{ fontSize: 8, color: colors.text.muted, lineHeight: CELL }}>
                    {label}
                  </Text>
                </View>
              ))}
            </View>

            {/* Week columns */}
            {weeks.map((week) => (
              <View key={week.id} style={{ marginRight: GAP }}>
                {week.cells.map((cell, d) => (
                  <View
                    key={cell.dateKey}
                    style={{
                      width: CELL,
                      height: CELL,
                      borderRadius: radius.sm,
                      marginBottom: d < 6 ? GAP : 0,
                      backgroundColor: cell.isFuture ? 'transparent' : HEAT_COLORS[cell.level],
                    }}
                  />
                ))}
              </View>
            ))}
          </View>

          {/* Legend */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              marginTop: spacing.sm,
              gap: GAP,
            }}
          >
            <Text style={{ fontSize: 9, color: colors.text.muted, marginRight: 3 }}>Menos</Text>
            {HEAT_COLORS.map((color, i) => (
              <View
                key={i}
                style={{ width: CELL, height: CELL, borderRadius: radius.sm, backgroundColor: color }}
              />
            ))}
            <Text style={{ fontSize: 9, color: colors.text.muted, marginLeft: 3 }}>Más</Text>
          </View>
        </View>
      </ScrollView>
    </Card>
  );
}
