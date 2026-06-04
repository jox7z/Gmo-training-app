/**
 * WeightChart — evolución de peso corporal.
 *
 * Delegación completa a TimeSeriesChart; mantiene su API pública intacta
 * para no romper progress.tsx ni WeightDetailModal.tsx.
 */

import { useMemo } from 'react';
import { toDisplay } from '@/lib/units';
import type { Unit } from '@/store/app';
import type { BodyTimelinePoint } from '@/lib/queries/body';
import { TimeSeriesChart } from '@/components/TimeSeriesChart';

interface Props {
  data: BodyTimelinePoint[];
  unit: Unit;
  chartWidth?: number;
  chartHeight?: number;
}

export function WeightChart({ data, unit, chartWidth, chartHeight = 160 }: Props) {
  const points = useMemo(
    () =>
      data.map((p) => ({
        ms: new Date(p.recordedAt).getTime(),
        value: toDisplay(p.weightKg, unit),
      })),
    [data, unit],
  );

  return (
    <TimeSeriesChart
      data={points}
      chartWidth={chartWidth}
      chartHeight={chartHeight}
      formatLabel={(v) => v.toFixed(1)}
      emptyMessage="Registra al menos 2 mediciones para ver tu evolución."
    />
  );
}
