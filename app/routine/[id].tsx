import { useState } from 'react';
import { View, ScrollView } from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PressableScale } from '@/components/ui/PressableScale';
import { Chip } from '@/components/ui/Chip';
import { IconButton } from '@/components/ui/IconButton';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { colors, spacing } from '@/theme/tokens';
import { useRoutinesStore, Routine, RoutineDay, RoutineDayExercise, nid } from '@/store/routines';
import { useAppStore, LOCAL_USER_ID } from '@/store/app';
import { saveRoutine } from '@/lib/repos/routines';
import { isSupabaseConfigured } from '@/lib/supabase';
import { exerciseById } from '@/data/exercises';
import { ExercisePickerSheet } from '@/components/ExercisePickerSheet';
import { CreateExerciseSheet } from '@/components/CreateExerciseSheet';
import { Icon } from '@/components/Icon';
import { supersetLabel, dissolveNonContiguousGroups } from '@/lib/supersets';

// Tope de miembros por grupo: 2 superset, 3 triset, 4 circuito.
const MAX_GROUP_SIZE = 4;

const EMPTY_ROUTINE = (): Routine => ({
  id: nid(),
  name: 'Nueva rutina',
  splitType: 'custom',
  days: [{ id: nid(), name: 'Día 1', exercises: [] }],
  createdAt: new Date().toISOString(),
});

// Saneo defensivo al cargar: una rutina persistida (AsyncStorage/Supabase) pudo
// guardarse con una versión anterior del editor donde un bug de contigüidad aún no
// estaba arreglado. Corre `dissolveNonContiguousGroups` por día al entrar al editor
// para que cualquier residuo se limpie solo, en vez de arrastrar un grupo corrupto
// silenciosamente.
function sanitizeRoutine(routine: Routine): Routine {
  return { ...routine, days: routine.days.map((d) => ({ ...d, exercises: dissolveNonContiguousGroups(d.exercises) })) };
}

export default function RoutineEditor() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const existing = useRoutinesStore((s) => s.routines.find((r) => r.id === id));
  const upsert = useRoutinesStore((s) => s.upsertRoutine);
  const profile = useAppStore((s) => s.profile);

  const [routine, setRoutine] = useState<Routine>(() => sanitizeRoutine(existing ?? EMPTY_ROUTINE()));
  const [activeDayIdx, setActiveDayIdx] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  // groupId del grupo que se está extendiendo con el picker (Parte G "agregar
  // miembro"). null = el picker agrega un ejercicio suelto al final del día.
  const [addToGroupTarget, setAddToGroupTarget] = useState<string | null>(null);
  // Modo agrupar: seleccionar 2-4 ejercicios y unirlos en un grupo.
  const [groupMode, setGroupMode] = useState(false);
  const [groupSelection, setGroupSelection] = useState<string[]>([]);

  const day = routine.days[activeDayIdx];

  const addDay = () => {
    const newDay: RoutineDay = { id: nid(), name: `Día ${routine.days.length + 1}`, exercises: [] };
    setRoutine({ ...routine, days: [...routine.days, newDay] });
    setActiveDayIdx(routine.days.length);
  };

  const removeDay = (idx: number) => {
    if (routine.days.length === 1) return;
    const days = routine.days.filter((_, i) => i !== idx);
    setRoutine({ ...routine, days });
    setActiveDayIdx(Math.max(0, idx - 1));
  };

  const updateDayName = (name: string) => {
    const days = routine.days.map((d, i) => (i === activeDayIdx ? { ...d, name } : d));
    setRoutine({ ...routine, days });
  };

  const addExercise = (exerciseId: string) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: [
              ...d.exercises,
              {
                id: nid(),
                exerciseId,
                targetSets: 3,
                targetRepsMin: 8,
                targetRepsMax: 12,
                restSeconds: 90,
              },
            ],
          }
        : d,
    );
    setRoutine({ ...routine, days });
    setPickerOpen(false);
  };

  const removeExercise = (exId: string) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? { ...d, exercises: dissolveNonContiguousGroups(d.exercises.filter((e) => e.id !== exId)) }
        : d,
    );
    setRoutine({ ...routine, days });
  };

  // Alterna la selección de un ejercicio en modo agrupar (tope MAX_GROUP_SIZE).
  const toggleGroupSelect = (exId: string) => {
    setGroupSelection((sel) => {
      if (sel.includes(exId)) return sel.filter((id) => id !== exId);
      if (sel.length >= MAX_GROUP_SIZE) return sel;
      return [...sel, exId];
    });
  };

  const exitGroupMode = () => {
    setGroupMode(false);
    setGroupSelection([]);
  };

  // Une los 2-4 seleccionados en un grupo: ordena por índice actual, usa el primero
  // como ancla y reagrupa al resto justo detrás (preservando su orden relativo),
  // asignándoles un supersetGroupId compartido. Mantiene contiguos a los miembros.
  const groupSelected = () => {
    if (groupSelection.length < 2) return;
    const days = routine.days.map((d, i) => {
      if (i !== activeDayIdx) return d;
      const exercises = [...d.exercises];
      const sortedIdxs = groupSelection
        .map((id) => exercises.findIndex((e) => e.id === id))
        .filter((idx) => idx >= 0)
        .sort((a, b) => a - b);
      if (sortedIdxs.length < 2) return d;
      const anchor = sortedIdxs[0];
      // Extrae el resto (todos con índice > ancla) de atrás hacia adelante para no
      // invalidar los índices menores aún por extraer; acumula con unshift para
      // conservar su orden relativo original. El ancla no se mueve.
      const rest = sortedIdxs.slice(1);
      const moved: RoutineDayExercise[] = [];
      for (let k = rest.length - 1; k >= 0; k--) {
        const [m] = exercises.splice(rest[k], 1);
        moved.unshift(m);
      }
      // Reinserta el bloque justo después del ancla y asigna el grupo compartido a
      // las posiciones [anchor, anchor + moved.length].
      exercises.splice(anchor + 1, 0, ...moved);
      const groupId = nid();
      for (let p = anchor; p <= anchor + moved.length; p++) {
        // groupRestEnabled se resetea a false explícito (no se hereda): un miembro
        // que ya vino de un grupo anterior podría cargar un valor colgado y dejar el
        // grupo nuevo con miembros en desacuerdo (buildStepSequence lee el flag del
        // primer miembro, la UI muestra el del último — divergirían en silencio).
        exercises[p] = { ...exercises[p], supersetGroupId: groupId, groupRestEnabled: false };
      }
      // Si algún miembro ya pertenecía a otro grupo, su antiguo grupo puede quedar
      // huérfano (<2 miembros) — disolverlo en vez de dejar un grupo incompleto.
      return { ...d, exercises: dissolveNonContiguousGroups(exercises) };
    });
    setRoutine({ ...routine, days });
    exitGroupMode();
  };

  // Quita SOLO este ejercicio del grupo (no desarma el grupo entero). Si el grupo
  // queda con <2 miembros contiguos, `dissolveNonContiguousGroups` disuelve al
  // compañero restante — para pares reproduce el viejo "desagrupar" gratis.
  const removeFromGroup = (exId: string) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: dissolveNonContiguousGroups(
              d.exercises.map((e) =>
                e.id === exId ? { ...e, supersetGroupId: undefined, groupRestEnabled: undefined } : e,
              ),
            ),
          }
        : d,
    );
    setRoutine({ ...routine, days });
  };

  // Fija el descanso intra-grupo de TODOS los miembros del grupo al mismo valor
  // explícito (nunca "negar el propio" por miembro: si por lo que sea llegaran a
  // estar en desacuerdo, negar cada uno los dejaría igual de divergentes, solo que
  // invertidos — fijar un valor único siempre converge). Parte F: decide SI se mide
  // descanso entre miembros del round-robin.
  const toggleGroupRest = (groupId: string, nextValue: boolean) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: d.exercises.map((ex) =>
              ex.supersetGroupId === groupId ? { ...ex, groupRestEnabled: nextValue } : ex,
            ),
          }
        : d,
    );
    setRoutine({ ...routine, days });
  };

  // Agrega un ejercicio a un grupo existente: lo inserta justo detrás del último
  // miembro contiguo del grupo, heredando su `groupRestEnabled`. Mantiene contiguos
  // a los miembros; `dissolveNonContiguousGroups` es defensa (no debería disolver
  // nada aquí porque insertamos adyacente al último miembro).
  const addToGroup = (exerciseId: string) => {
    if (!addToGroupTarget) return;
    const groupId = addToGroupTarget;
    const days = routine.days.map((d, i) => {
      if (i !== activeDayIdx) return d;
      const exercises = [...d.exercises];
      const lastIdx = exercises.map((e) => e.supersetGroupId).lastIndexOf(groupId);
      if (lastIdx < 0) return d;
      const groupRestEnabled = exercises[lastIdx].groupRestEnabled;
      exercises.splice(lastIdx + 1, 0, {
        id: nid(),
        exerciseId,
        targetSets: 3,
        targetRepsMin: 8,
        targetRepsMax: 12,
        restSeconds: 90,
        supersetGroupId: groupId,
        groupRestEnabled,
      });
      return { ...d, exercises: dissolveNonContiguousGroups(exercises) };
    });
    setRoutine({ ...routine, days });
    setAddToGroupTarget(null);
    setPickerOpen(false);
  };

  // Selección del picker: en modo "agregar miembro" extiende el grupo objetivo;
  // si no, agrega un ejercicio suelto al final del día.
  const handlePickerSelect = (exerciseId: string) => {
    if (addToGroupTarget) addToGroup(exerciseId);
    else addExercise(exerciseId);
  };

  const updateExercise = (exId: string, patch: Partial<RoutineDayExercise>) => {
    const days = routine.days.map((d, i) =>
      i === activeDayIdx
        ? {
            ...d,
            exercises: d.exercises.map((e) =>
              e.id === exId ? { ...e, ...patch } : e,
            ),
          }
        : d,
    );
    setRoutine({ ...routine, days });
  };

  const handleSave = () => {
    upsert(routine);
    if (isSupabaseConfigured && profile?.id && profile.id !== LOCAL_USER_ID) {
      saveRoutine(profile.id, routine).catch(() => {});
    }
    router.back();
  };

  // Conteo de miembros por grupo del día activo, para etiquetar el chip entre
  // miembros como Superset / Triset / Circuito según su tamaño total.
  const groupSizes = new Map<string, number>();
  for (const e of day.exercises) {
    if (e.supersetGroupId) groupSizes.set(e.supersetGroupId, (groupSizes.get(e.supersetGroupId) ?? 0) + 1);
  }

  // Provider LOCAL: esta ruta se presenta como modal nativo (presentation:'modal');
  // el portal al provider del root quedaría DETRÁS del modal en iOS.
  return (
    <BottomSheetModalProvider>
    <Screen padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        {/* Botón cerrar — icono pequeño, escala 0.9 */}
        <PressableScale onPress={() => router.back()} hitSlop={12} pressScale={0.9}>
          <Text variant="heading" tone="muted">✕</Text>
        </PressableScale>
        <Text variant="heading">Editar rutina</Text>
        <Button title="Guardar" size="sm" onPress={handleSave} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
        <Input
          label="Nombre de la rutina"
          value={routine.name}
          onChangeText={(name) => setRoutine({ ...routine, name })}
        />

        {/* Visibilidad: pública comparte la rutina en el explorador (solo lectura) */}
        <View style={{ marginTop: spacing.md }}>
          <Text variant="label" tone="muted" style={{ marginBottom: spacing.xs }}>
            Visibilidad
          </Text>
          <SegmentedControl
            options={[
              { value: 'private', label: 'Privada' },
              { value: 'public', label: 'Pública' },
            ]}
            value={routine.isPublic ? 'public' : 'private'}
            onChange={(v) => setRoutine({ ...routine, isPublic: v === 'public' })}
          />
        </View>

        {routine.aiReasoning && (
          <Card variant="outlined" padding="md" style={{ marginTop: spacing.md, borderColor: colors.info.DEFAULT }}>
            <Text variant="label" tone="info">¿Por qué esta rutina?</Text>
            <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
              {routine.aiReasoning}
            </Text>
          </Card>
        )}

        {/* Tabs de días */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing.xl }}>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            {/* Tab de día — long-press para eliminar */}
            {routine.days.map((d, i) => (
              <Chip
                key={d.id}
                label={d.name}
                selected={i === activeDayIdx}
                onPress={() => setActiveDayIdx(i)}
                onLongPress={() => removeDay(i)}
              />
            ))}
            {/* Botón añadir día */}
            <Chip label="+ Día" variant="dashed" onPress={addDay} />
          </View>
        </ScrollView>

        <View style={{ marginTop: spacing.lg }}>
          <Input label="Nombre del día" value={day.name} onChangeText={updateDayName} />
        </View>

        <View style={{ marginTop: spacing.lg }}>
          {day.exercises.length === 0 && (
            <Card variant="raised" padding="xl" style={{ alignItems: 'center' }}>
              <Icon name="dumbbell" size={40} color={colors.text.muted} />
              <Text variant="heading" style={{ marginTop: spacing.sm }}>Día vacío</Text>
              <Text variant="caption" tone="secondary" style={{ marginTop: 4 }}>
                Agrega ejercicios para empezar.
              </Text>
            </Card>
          )}
          {day.exercises.map((e, i) => {
            const ex = exerciseById(e.exerciseId);
            const groupId = e.supersetGroupId;
            // Miembros de un mismo grupo son contiguos: detecta vecinos por grupo.
            const prevSameGroup =
              i > 0 && !!groupId && day.exercises[i - 1].supersetGroupId === groupId;
            const nextSameGroup =
              i < day.exercises.length - 1 &&
              !!groupId &&
              day.exercises[i + 1].supersetGroupId === groupId;
            const selected = groupMode && groupSelection.includes(e.id);
            // Descanso intra-grupo del grupo de ESTE ejercicio (todos comparten valor).
            const groupRestForThisGroup = !!e.groupRestEnabled;
            // ¿Es el último miembro visual de un grupo que aún no llegó al tope?
            const canAddToGroup =
              !nextSameGroup && !!groupId && (groupSizes.get(groupId) ?? 0) < MAX_GROUP_SIZE;

            const card = (
              <Card
                padding="md"
                style={{
                  // Miembros del par van "pegados": el 1º casi sin margen inferior.
                  marginBottom: nextSameGroup ? spacing.xs : spacing.sm,
                  ...(selected ? { borderWidth: 2, borderColor: colors.primary.DEFAULT } : {}),
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                  {/* Columna central: nombre + steppers */}
                  <View style={{ flex: 1, alignItems: 'center' }}>
                    <Text
                      weight="semibold"
                      numberOfLines={2}
                      style={{ textAlign: 'center', marginBottom: spacing.sm }}
                    >
                      {ex?.name ?? e.exerciseId}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.lg }}>
                      <StepperField
                        label="Sets"
                        value={e.targetSets}
                        min={1}
                        max={20}
                        step={1}
                        onChange={(v) => updateExercise(e.id, { targetSets: v })}
                      />
                    </View>
                  </View>
                  {/* En modo agrupar el tap selecciona la Card, así que ocultamos
                      las acciones para no anidar pulsables. */}
                  {!groupMode && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
                      {/* Agregar miembro: solo en el último miembro de un grupo que no
                          llegó al tope. Abre el picker en modo "extender grupo". */}
                      {canAddToGroup && (
                        <IconButton
                          icon="plus"
                          onPress={() => {
                            setAddToGroupTarget(groupId!);
                            setPickerOpen(true);
                          }}
                          size={40}
                          iconSize={20}
                          tone="elevated"
                          pressScale={0.88}
                          hitSlop={12}
                        />
                      )}
                      {/* Quitar de grupo: saca SOLO este ejercicio del superset. */}
                      {groupId && (
                        <IconButton
                          icon="unlink"
                          onPress={() => removeFromGroup(e.id)}
                          size={40}
                          iconSize={20}
                          tone="elevated"
                          pressScale={0.88}
                          hitSlop={12}
                        />
                      )}
                      {/* Botón quitar — círculo danger */}
                      <IconButton
                        icon="close"
                        onPress={() => removeExercise(e.id)}
                        size={40}
                        iconSize={22}
                        tone="danger"
                        pressScale={0.88}
                        hitSlop={12}
                      />
                    </View>
                  )}
                </View>
              </Card>
            );

            return (
              // Animated.View para animar inserción/eliminación de ejercicios
              <Animated.View
                key={e.id}
                entering={FadeInDown.springify().damping(18)}
                layout={LinearTransition.springify().damping(18)}
              >
                {/* Indicador de grupo entre miembros contiguos (una vez, antes de cada
                    miembro posterior al primero); etiqueta según el tamaño del grupo. */}
                {prevSameGroup && (
                  <View style={{ alignItems: 'center', marginVertical: spacing.xs }}>
                    <Chip
                      label={`${supersetLabel(groupId ? (groupSizes.get(groupId) ?? 0) : 0)}${groupRestForThisGroup ? ' · con descanso' : ''}`}
                      leftIcon={groupRestForThisGroup ? 'clock' : 'link'}
                      variant={groupRestForThisGroup ? 'solid' : 'outline'}
                      selected={groupRestForThisGroup}
                      size="sm"
                      onPress={() => groupId && toggleGroupRest(groupId, !groupRestForThisGroup)}
                    />
                  </View>
                )}
                {groupMode ? (
                  <PressableScale onPress={() => toggleGroupSelect(e.id)} pressScale={0.98}>
                    {card}
                  </PressableScale>
                ) : (
                  card
                )}
              </Animated.View>
            );
          })}
        </View>

        {/* Acciones: agregar / agrupar — o confirmar/cancelar en modo agrupar */}
        {!groupMode ? (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Button
              title="+ Agregar ejercicio"
              variant="secondary"
              // Reset explícito: este botón SIEMPRE agrega suelto, nunca extiende un
              // grupo (evita un addToGroupTarget stale de un flujo previo cancelado).
              onPress={() => {
                setAddToGroupTarget(null);
                setPickerOpen(true);
              }}
              fullWidth
            />
            {day.exercises.length >= 2 && (
              <Button
                title="Agrupar ejercicios"
                variant="ghost"
                leftIcon={<Icon name="link" size={18} color={colors.text.primary} />}
                onPress={() => setGroupMode(true)}
                fullWidth
              />
            )}
          </View>
        ) : (
          <View style={{ gap: spacing.md, marginTop: spacing.md }}>
            <Text variant="caption" tone="muted" style={{ textAlign: 'center' }}>
              Elige 2 a 4 ejercicios para agrupar ({groupSelection.length}/{MAX_GROUP_SIZE})
            </Text>
            <Button
              title="Agrupar ejercicios"
              onPress={groupSelected}
              disabled={groupSelection.length < 2}
              fullWidth
            />
            <Button title="Cancelar" variant="secondary" onPress={exitGroupMode} fullWidth />
          </View>
        )}
      </ScrollView>

      <ExercisePickerSheet
        visible={pickerOpen}
        // Cerrar sin elegir también sale del modo "extender grupo".
        onClose={() => {
          setPickerOpen(false);
          setAddToGroupTarget(null);
        }}
        onSelect={(ex) => handlePickerSelect(ex.id)}
        title="Ejercicios"
        onCreatePress={() => {
          // Cierra el picker antes de abrir el sheet de creación: nunca dos
          // AppBottomSheet apilados a la vez. Conserva addToGroupTarget para que un
          // ejercicio recién creado también se una al grupo objetivo.
          setPickerOpen(false);
          setCreateOpen(true);
        }}
      />

      <CreateExerciseSheet
        visible={createOpen}
        // Cancelar la creación también limpia el target de grupo (si venía del flujo
        // "agregar miembro" y el usuario cerró sin crear).
        onClose={() => {
          setCreateOpen(false);
          setAddToGroupTarget(null);
        }}
        onCreated={(ex) => handlePickerSelect(ex.id)}
      />
    </Screen>
    </BottomSheetModalProvider>
  );
}

function StepperField({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  const display = format ? format(value) : String(value);

  return (
    <View style={{ alignItems: 'center' }}>
      <Text
        variant="caption"
        tone="muted"
        tracking="snug"
        style={{ marginBottom: 6, fontSize: 12, textTransform: 'uppercase' }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        {/* Botón decrementar — escala 0.9, hitSlop generoso */}
        <PressableScale
          onPress={dec}
          hitSlop={10}
          pressScale={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.bg.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text weight="bold" style={{ fontSize: 18, lineHeight: 20, color: colors.text.primary }}>−</Text>
        </PressableScale>
        <Text weight="bold" style={{ minWidth: 44, textAlign: 'center', fontSize: 22 }}>
          {display}
        </Text>
        {/* Botón incrementar */}
        <PressableScale
          onPress={inc}
          hitSlop={10}
          pressScale={0.9}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: colors.bg.elevated,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text weight="bold" style={{ fontSize: 18, lineHeight: 20, color: colors.text.primary }}>+</Text>
        </PressableScale>
      </View>
    </View>
  );
}

