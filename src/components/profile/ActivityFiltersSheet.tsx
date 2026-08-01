import { useEffect, useMemo, useState } from 'react';
import { View, type HostInstance, type ViewStyle } from 'react-native';

import { Icon } from '@/components/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import {
  DEFAULT_WORKOUT_HISTORY_FILTERS,
  type WorkoutHistoryFilters,
  workoutExerciseOptions,
  workoutRoutineOptions,
} from '@/lib/workoutHistoryFilters';
import type { Workout } from '@/store/workouts';
import { colors, radius, spacing } from '@/theme/tokens';

type Selector = 'exercise' | 'routine' | null;

interface Props {
  visible: boolean;
  history: readonly Workout[];
  value: WorkoutHistoryFilters;
  onChange: (filters: WorkoutHistoryFilters) => void;
  onClose: () => void;
  returnFocusTarget?: HostInstance | number | null;
}

export function ActivityFiltersSheet({
  visible,
  history,
  value,
  onChange,
  onClose,
  returnFocusTarget,
}: Props) {
  const [selector, setSelector] = useState<Selector>(null);
  const [query, setQuery] = useState('');
  const exerciseOptions = useMemo(() => workoutExerciseOptions(history), [history]);
  const routineOptions = useMemo(() => workoutRoutineOptions(history), [history]);

  useEffect(() => {
    if (!visible) {
      setSelector(null);
      setQuery('');
    }
  }, [visible]);

  const close = () => {
    if (selector) {
      setSelector(null);
      setQuery('');
      return;
    }
    onClose();
  };

  const openSelector = (next: Exclude<Selector, null>) => {
    setSelector(next);
    setQuery('');
  };

  const selectOption = (next: string | null) => {
    onChange({
      ...value,
      ...(selector === 'exercise' ? { exerciseId: next } : { routineName: next }),
    });
    setSelector(null);
    setQuery('');
  };

  const selectorOptions = selector === 'exercise' ? exerciseOptions : routineOptions;
  const normalizedQuery = normalize(query);
  const visibleOptions = selector
    ? selectorOptions.filter((option) => normalize(option.label).includes(normalizedQuery))
    : [];
  const selectedOption = selector === 'exercise' ? value.exerciseId : value.routineName;

  return (
    <Sheet
      visible={visible}
      onClose={close}
      title={selector === 'exercise' ? 'Filtrar por ejercicio' : selector === 'routine' ? 'Filtrar por rutina' : 'Filtrar actividad'}
      subtitle={selector ? 'Las opciones vienen de tu historial.' : 'Ajusta solo las filas de actividad.'}
      scroll
      maxHeightRatio={0.8}
      returnFocusTarget={returnFocusTarget}
      footer={
        selector ? (
          <Button title="Volver" variant="secondary" onPress={close} fullWidth />
        ) : (
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Button
              title="Limpiar filtros"
              variant="secondary"
              onPress={() => onChange(DEFAULT_WORKOUT_HISTORY_FILTERS)}
              style={{ flex: 1 }}
            />
            <Button title="Listo" onPress={onClose} style={{ flex: 1 }} />
          </View>
        )
      }
    >
      {selector ? (
        <>
          <Input
            label={selector === 'exercise' ? 'Buscar ejercicio' : 'Buscar rutina'}
            value={query}
            onChangeText={setQuery}
            placeholder="Buscar"
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="done"
          />
          <FilterOptionRow
            label={selector === 'exercise' ? 'Todos los ejercicios' : 'Todas las rutinas'}
            selected={selectedOption === null}
            onPress={() => selectOption(null)}
          />
          {visibleOptions.map((option) => (
            <FilterOptionRow
              key={option.value}
              label={option.label}
              selected={selectedOption === option.value}
              onPress={() => selectOption(option.value)}
            />
          ))}
          {visibleOptions.length === 0 ? (
            <Text variant="body" tone="muted" style={{ textAlign: 'center', paddingVertical: spacing.lg }}>
              No hay resultados.
            </Text>
          ) : null}
        </>
      ) : (
        <>
          <Text variant="label" tone="secondary">Periodo</Text>
          <SegmentedControl
            accessibilityLabel="Periodo de actividad"
            value={value.period}
            onValueChange={(period) => onChange({ ...value, period })}
            options={[
              { value: '30d', label: '30 días' },
              { value: '90d', label: '90 días' },
              { value: 'all', label: 'Todo' },
            ]}
          />
          <Text variant="label" tone="secondary">Visibilidad</Text>
          <SegmentedControl
            accessibilityLabel="Visibilidad de actividad"
            value={value.publishedOnly ? 'published' : 'all'}
            onValueChange={(next) => onChange({ ...value, publishedOnly: next === 'published' })}
            options={[
              { value: 'all', label: 'Todas' },
              { value: 'published', label: 'Publicadas' },
            ]}
          />
          <FilterSelectorRow
            label="Ejercicio"
            value={exerciseOptions.find((option) => option.value === value.exerciseId)?.label ?? 'Todos los ejercicios'}
            onPress={() => openSelector('exercise')}
          />
          <FilterSelectorRow
            label="Rutina"
            value={value.routineName ?? 'Todas las rutinas'}
            onPress={() => openSelector('routine')}
          />
        </>
      )}
    </Sheet>
  );
}

function FilterSelectorRow({
  label,
  value,
  onPress,
}: {
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      accessibilityHint={`Abre el selector de ${label.toLocaleLowerCase('es')}`}
      onPress={onPress}
      haptic={false}
      pressScale={0.98}
      style={rowStyle}
    >
      <View style={{ flex: 1, gap: spacing.xs }}>
        <Text variant="caption" tone="muted">{label}</Text>
        <Text weight="semibold" numberOfLines={1}>{value}</Text>
      </View>
      <Icon name="chevron-right" size={18} color={colors.text.muted} />
    </PressableScale>
  );
}

function FilterOptionRow({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      haptic={false}
      pressScale={0.98}
      style={[rowStyle, selected && { borderColor: colors.primary.DEFAULT, backgroundColor: colors.primary.muted }]}
    >
      <Text weight={selected ? 'bold' : 'semibold'} style={{ flex: 1 }} numberOfLines={1}>{label}</Text>
      {selected ? <Icon name="check" size={18} color={colors.primary.DEFAULT} /> : null}
    </PressableScale>
  );
}

const rowStyle = {
  minHeight: 52,
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.md,
  borderRadius: radius.md,
  borderWidth: 1,
  borderColor: colors.border,
  backgroundColor: colors.bg.elevated,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
} satisfies ViewStyle;

function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
}
