/**
 * CreateExerciseSheet — formulario corto para crear un ejercicio custom.
 *
 * Vive sobre AppBottomSheet y lo controla el PADRE (routine/[id]): nunca se
 * anida dentro de ExercisePickerSheet. El picker solo dispara `onCreatePress`,
 * que cierra el picker y abre este sheet. Al crear con éxito llama `onCreated`
 * con el ejercicio recién creado (para añadirlo directo a la rutina).
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { Text } from '@/components/ui/Text';
import { Chip } from '@/components/ui/Chip';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { colors, spacing, radius, fontSize } from '@/theme/tokens';
import {
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  type Exercise,
  type MuscleGroup,
  type Equipment,
} from '@/data/exercises';
import { useCreateCustomExercise } from '@/lib/queries/exercises';

interface Props {
  visible: boolean;
  onClose: () => void;
  onCreated?: (exercise: Exercise) => void;
}

const MUSCLES = Object.keys(MUSCLE_GROUP_LABELS) as MuscleGroup[];
const EQUIPMENTS = Object.keys(EQUIPMENT_LABELS) as Equipment[];

const TYPE_OPTIONS = [
  { value: 'compound', label: 'Compuesto' },
  { value: 'isolation', label: 'Aislamiento' },
] as const;

// Campo de texto sobre BottomSheetTextInput (keyboard-safe dentro de la hoja),
// con el mismo look que el Input compartido.
function LabeledField({
  label,
  value,
  onChangeText,
  placeholder,
  multiline,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
        {label}
      </Text>
      <BottomSheetTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.text.muted}
        multiline={multiline}
        style={{
          color: colors.text.primary,
          fontSize: fontSize.base,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: 14,
          minHeight: multiline ? 96 : undefined,
          textAlignVertical: multiline ? 'top' : 'center',
        }}
      />
    </View>
  );
}

export function CreateExerciseSheet({ visible, onClose, onCreated }: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const create = useCreateCustomExercise();

  const [name, setName] = useState('');
  const [muscle, setMuscle] = useState<MuscleGroup | undefined>();
  const [equipment, setEquipment] = useState<Equipment | undefined>();
  const [type, setType] = useState<'compound' | 'isolation'>('compound');
  const [instructions, setInstructions] = useState('');

  // Al cerrar limpia el formulario (el sheet se reutiliza).
  useEffect(() => {
    if (!visible) {
      setName('');
      setMuscle(undefined);
      setEquipment(undefined);
      setType('compound');
      setInstructions('');
    }
  }, [visible]);

  const valid = name.trim().length > 0 && muscle !== undefined && equipment !== undefined;

  const submit = () => {
    if (!valid || create.isPending) return;
    create.mutate(
      {
        name: name.trim(),
        muscle: muscle!,
        equipment: equipment!,
        isCompound: type === 'compound',
        instructions: instructions.trim(),
      },
      {
        onSuccess: (ex) => {
          toast.show({ message: 'Ejercicio creado', tone: 'success' });
          onCreated?.(ex);
          onClose();
        },
        onError: (err) => {
          toast.show({ message: err.message || 'No se pudo crear el ejercicio', tone: 'danger' });
        },
      },
    );
  };

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['85%']}
      keyboardBehavior="extend"
      title="Nuevo ejercicio"
    >
      <BottomSheetScrollView
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LabeledField
          label="Nombre"
          value={name}
          onChangeText={setName}
          placeholder="Ej. Press inclinado con banda"
        />

        <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
          Músculo principal
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {MUSCLES.map((m) => (
            <Chip
              key={m}
              label={MUSCLE_GROUP_LABELS[m]}
              selected={muscle === m}
              onPress={() => setMuscle(m)}
              variant="outline"
              size="sm"
            />
          ))}
        </View>

        <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
          Equipo
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg }}>
          {EQUIPMENTS.map((e) => (
            <Chip
              key={e}
              label={EQUIPMENT_LABELS[e]}
              selected={equipment === e}
              onPress={() => setEquipment(e)}
              variant="outline"
              size="sm"
            />
          ))}
        </View>

        <Text variant="label" tone="secondary" style={{ marginBottom: 6 }}>
          Tipo
        </Text>
        <SegmentedControl
          options={TYPE_OPTIONS}
          value={type}
          onChange={setType}
          style={{ marginBottom: spacing.lg }}
        />

        <LabeledField
          label="Instrucciones (opcional)"
          value={instructions}
          onChangeText={setInstructions}
          placeholder="Cómo ejecutar el movimiento"
          multiline
        />

        <Button
          title="Crear"
          onPress={submit}
          disabled={!valid}
          loading={create.isPending}
          fullWidth
          style={{ marginTop: spacing.sm }}
        />
      </BottomSheetScrollView>
    </AppBottomSheet>
  );
}
