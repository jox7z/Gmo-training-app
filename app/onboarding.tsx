import { useEffect, useState } from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Icon, IconName } from '@/components/Icon';
import { colors, spacing, radius } from '@/theme/tokens';
import { useAppStore, Goal, Level, Unit, LOCAL_USER_ID } from '@/store/app';
import { isSupabaseConfigured } from '@/lib/supabase';
import { completeSignup, getCurrentUserId, getCurrentUser, checkUsernameAvailable, AuthError, AuthErrorCode } from '@/lib/auth';
import { upsertProfile } from '@/lib/repos/profile';
import { isUsernameValid } from '@/lib/passwordPolicy';

const STEPS = ['welcome', 'profile', 'level', 'goal', 'frequency', 'final'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const router = useRouter();
  const setProfile = useAppStore((s) => s.setProfile);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [usernameCheck, setUsernameCheck] = useState<
    { state: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'; message?: string }
  >({ state: 'idle' });
  const [weight, setWeight] = useState('75');
  const [height, setHeight] = useState('175');
  const [unit, setUnit] = useState<Unit>('kg');
  const [level, setLevel] = useState<Level>('intermediate');
  const [goal, setGoal] = useState<Goal>('hypertrophy');
  const [days, setDays] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usernameOverride, setUsernameOverride] = useState<string | null>(null);

  // Validación debounced de username contra la RPC. Solo dispara el RPC
  // cuando el formato local ya es válido — evita pedir al backend que
  // valide cadenas obviamente malas.
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) {
      setUsernameCheck({ state: 'idle' });
      return;
    }
    if (!isUsernameValid(trimmed)) {
      setUsernameCheck({ state: 'invalid', message: 'Solo minúsculas, números o _ (3-20)' });
      return;
    }
    setUsernameCheck({ state: 'checking' });
    const handle = setTimeout(async () => {
      try {
        const ok = await checkUsernameAvailable(trimmed);
        setUsernameCheck(ok ? { state: 'available' } : { state: 'taken', message: 'Ese username ya está tomado.' });
      } catch (e) {
        setUsernameCheck({
          state: 'error',
          message: e instanceof AuthError ? e.message : 'No pudimos validar el username.',
        });
      }
    }, 400);
    return () => clearTimeout(handle);
  }, [username]);

  const idx = STEPS.indexOf(step);
  const next = () => setStep(STEPS[Math.min(STEPS.length - 1, idx + 1)]);
  const back = () => setStep(STEPS[Math.max(0, idx - 1)]);

  const finish = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const authUser = await getCurrentUser();
      const userId = authUser?.id ?? LOCAL_USER_ID;
      const userEmail = authUser?.email ?? '';

      // Prioridad: override (lo que el usuario escribió en el step final tras
      // un USERNAME_TAKEN) > lo capturado en el step profile > fallback derivado
      // del nombre. El último 'gmo_athlete' es solo defensa de último recurso.
      const typed = username.trim().toLowerCase() || name.trim().toLowerCase().replace(/\s+/g, '_');
      const finalUsername = (usernameOverride ?? typed) || 'gmo_athlete';

      const profileData = {
        id: userId,
        email: userEmail,
        username: finalUsername,
        displayName: name.trim() || 'Atleta',
        fullName: '',
        bio: '',
        location: '',
        country: '',
        followers: 0,
        following: 0,
        weightKg: parseFloat(weight) || 75,
        heightCm: parseFloat(height) || 175,
        unit,
        level,
        goal,
        weeklyGoalDays: days,
        rankPoints: 0,
        currentRank: 'rookie' as const,
        privacy: { profilePublic: true, showActivity: true, showStats: true },
        notifications: { workoutReminders: true, socialUpdates: true, achievements: true, weeklyReport: true },
      };

      // Push to backend FIRST. Solo si el backend acepta el perfil, mutamos
      // el store local. Evita dejar el store con un username/datos que el
      // servidor rechazó (regresión del Round 3, ver historial del MD).
      if (isSupabaseConfigured && userId !== LOCAL_USER_ID) {
        try {
          await completeSignup({
            username: finalUsername,
            displayName: profileData.displayName,
            weightKg: profileData.weightKg,
            heightCm: profileData.heightCm,
            unit: profileData.unit,
            level: profileData.level,
            goal: profileData.goal,
            weeklyGoalDays: profileData.weeklyGoalDays,
          });
          // Save email (and all profile fields) via direct upsert so the
          // profiles table row created by complete_signup also gets the email.
          await upsertProfile(profileData);
        } catch (e) {
          if (e instanceof AuthError && e.code === AuthErrorCode.USERNAME_TAKEN) {
            setError('Ese username ya está tomado. Elige otro.');
            setUsernameOverride(usernameOverride ?? finalUsername);
          } else {
            setError(e instanceof AuthError ? e.message : 'No pudimos guardar tu perfil. Inténtalo de nuevo.');
          }
          return;
        }
      }

      await setProfile(profileData);
      await completeOnboarding();
      router.replace('/(tabs)');
    } finally {
      setSubmitting(false);
    }
  };

  // Reglas para avanzar desde el step `profile`: necesitamos nombre con
  // al menos 2 chars y un username verificado como disponible por el RPC.
  // Los demás steps no necesitan gate — los inputs tienen defaults válidos.
  const canAdvance =
    step !== 'profile' ||
    (name.trim().length >= 2 && usernameCheck.state === 'available');

  return (
    <Screen scroll={false} padded={false}>
      <LinearGradient
        colors={[colors.primary.muted, 'transparent']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 320 }}
      />
      <ScrollView contentContainerStyle={{ padding: spacing.xl, paddingBottom: 120 }}>
        <View style={{ height: 8, flexDirection: 'row', gap: 6, marginBottom: spacing['2xl'] }}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                backgroundColor: i <= idx ? colors.primary.DEFAULT : colors.bg.card,
              }}
            />
          ))}
        </View>

        {step === 'welcome' && (
          <View>
            <Text variant="display" tone="brand">GMO</Text>
            <Text variant="title" style={{ marginTop: 4 }}>Entrena. Compite. Evoluciona.</Text>
            <Text variant="body" tone="secondary" style={{ marginTop: spacing.md }}>
              La app que convierte tu disciplina en progreso medible. Rachas, rangos y un coach IA siempre a tu lado.
            </Text>
            <View style={{ marginTop: spacing['3xl'], gap: spacing.md }}>
              <FeatureRow icon="fire" color={colors.accent.DEFAULT} title="Rachas que motivan" desc="Visualiza tu constancia semana a semana." />
              <FeatureRow icon="trophy" color="#FFD700" title="Sistema Ranked" desc="Sube de rango por consistencia, no por ego." />
              <FeatureRow icon="robot" color={colors.info.DEFAULT} title="Coach IA 24/7" desc="Resuelve dudas de técnica y nutrición al instante." />
            </View>
          </View>
        )}

        {step === 'profile' && (
          <Section title="Cuéntanos sobre ti" subtitle="Personalizamos tu experiencia">
            <Input
              label="Tu nombre"
              placeholder="Ej: Adrián"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoComplete="name"
            />
            <Input
              label="Username"
              placeholder="adrian_lifts"
              value={username}
              onChangeText={(v) => setUsername(v.toLowerCase())}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              containerStyle={{ marginTop: spacing.md }}
              hint={
                usernameCheck.state === 'idle' ? '3-20 caracteres · letras, números o _' :
                usernameCheck.state === 'checking' ? 'Verificando…' :
                usernameCheck.state === 'available' ? 'Disponible' :
                undefined
              }
              error={
                usernameCheck.state === 'invalid' || usernameCheck.state === 'taken' || usernameCheck.state === 'error'
                  ? usernameCheck.message
                  : undefined
              }
            />
            <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
              <Input
                label="Peso"
                placeholder="75"
                keyboardType="numeric"
                value={weight}
                onChangeText={setWeight}
                containerStyle={{ flex: 1 }}
                rightAdornment={<Text tone="muted">{unit}</Text>}
              />
              <Input
                label="Altura"
                placeholder="175"
                keyboardType="numeric"
                value={height}
                onChangeText={setHeight}
                containerStyle={{ flex: 1 }}
                rightAdornment={<Text tone="muted">cm</Text>}
              />
            </View>
            <Text variant="label" tone="secondary" style={{ marginTop: spacing.lg, marginBottom: 6 }}>
              Unidad de peso
            </Text>
            <SegmentedToggle
              options={[{ value: 'kg', label: 'KG' }, { value: 'lb', label: 'LB' }]}
              value={unit}
              onChange={(v) => setUnit(v as Unit)}
            />
          </Section>
        )}

        {step === 'level' && (
          <Section title="¿Cuál es tu nivel?" subtitle="Sé honesto, ajustaremos las recomendaciones">
            <ChoiceCard
              selected={level === 'beginner'}
              onPress={() => setLevel('beginner')}
              icon="seedling"
              iconColor={colors.success}
              title="Principiante"
              desc="Menos de 6 meses entrenando o vuelvo después de mucho tiempo."
            />
            <ChoiceCard
              selected={level === 'intermediate'}
              onPress={() => setLevel('intermediate')}
              icon="dumbbell"
              iconColor={colors.info.DEFAULT}
              title="Intermedio"
              desc="6 meses a 2 años con rutina constante."
            />
            <ChoiceCard
              selected={level === 'advanced'}
              onPress={() => setLevel('advanced')}
              icon="fire"
              iconColor={colors.accent.DEFAULT}
              title="Avanzado"
              desc="Más de 2 años, conozco mi cuerpo y mis pesos."
            />
          </Section>
        )}

        {step === 'goal' && (
          <Section title="¿Cuál es tu objetivo?" subtitle="Elige el principal — luego puedes cambiarlo">
            <ChoiceCard selected={goal === 'hypertrophy'} onPress={() => setGoal('hypertrophy')} icon="muscle" iconColor={colors.primary.DEFAULT} title="Hipertrofia" desc="Ganar masa muscular y tamaño." />
            <ChoiceCard selected={goal === 'strength'} onPress={() => setGoal('strength')} icon="lightning" iconColor="#FFD700" title="Fuerza" desc="Levantar más peso, ser más fuerte." />
            <ChoiceCard selected={goal === 'fat_loss'} onPress={() => setGoal('fat_loss')} icon="fire" iconColor={colors.accent.DEFAULT} title="Pérdida de grasa" desc="Definir y reducir % de grasa." />
            <ChoiceCard selected={goal === 'general'} onPress={() => setGoal('general')} icon="target" iconColor={colors.success} title="Salud general" desc="Mantenerme activo y en forma." />
          </Section>
        )}

        {step === 'frequency' && (
          <Section title="¿Cuántos días por semana?" subtitle="Tu meta de racha. Sé realista.">
            <Card padding="xl" style={{ alignItems: 'center', marginTop: spacing.lg }}>
              <Text variant="display" tone="accent" numeric>{days}</Text>
              <Text variant="body" tone="secondary">días por semana</Text>
              <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg }}>
                {[2, 3, 4, 5, 6].map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => setDays(n)}
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: days === n ? colors.primary.DEFAULT : colors.bg.elevated,
                      borderWidth: 1,
                      borderColor: days === n ? colors.primary.DEFAULT : colors.border,
                    }}
                  >
                    <Text weight="bold">{n}</Text>
                  </Pressable>
                ))}
              </View>
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.md, textAlign: 'center' }}>
                Cumplir tu meta semanal te da +30 puntos de rango.
              </Text>
            </Card>
          </Section>
        )}

        {step === 'final' && (
          <Section title="¡Todo listo!" subtitle="Tu primer paso comienza ahora.">
            <Card variant="glow" padding="xl" style={{ marginTop: spacing.lg }}>
              <Text variant="heading" tone="brand">Tu plan</Text>
              <Text variant="body" tone="secondary" style={{ marginTop: spacing.sm }}>
                Empezarás en rango <Text tone="accent" weight="bold">Bronze</Text> con meta de{' '}
                <Text weight="bold">{days} días/semana</Text>. Usa la rutina sugerida o crea la tuya.
              </Text>
            </Card>
            <Card padding="lg" style={{ marginTop: spacing.md }}>
              <Text variant="label" tone="muted">Recomendación</Text>
              <Text variant="body" style={{ marginTop: 6 }}>
                {goal === 'strength' && 'Split Upper/Lower 4 días con bajas reps.'}
                {goal === 'hypertrophy' && days >= 5 && 'PPL (Push/Pull/Legs) con volumen moderado-alto.'}
                {goal === 'hypertrophy' && days < 5 && 'Upper/Lower o Full Body 3-4 días.'}
                {goal === 'fat_loss' && 'Full body con énfasis en compuestos + cardio.'}
                {goal === 'general' && 'Full body 3 días, simple y sostenible.'}
              </Text>
            </Card>
            {usernameOverride !== null && (
              <Input
                label="Username"
                value={usernameOverride}
                onChangeText={setUsernameOverride}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                containerStyle={{ marginTop: spacing.md }}
              />
            )}
            {error && (
              <Card
                variant="outlined"
                padding="md"
                style={{ marginTop: spacing.md, borderColor: colors.danger }}
              >
                <Text variant="caption" style={{ color: colors.danger }}>{error}</Text>
              </Card>
            )}
          </Section>
        )}
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: spacing.lg,
          backgroundColor: colors.bg.base,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          flexDirection: 'row',
          gap: spacing.md,
        }}
      >
        {idx > 0 && <Button title="Atrás" variant="ghost" onPress={back} disabled={submitting} />}
        {step !== 'final' ? (
          <Button title="Continuar" onPress={next} disabled={!canAdvance} fullWidth style={{ flex: 1 }} />
        ) : (
          <Button
            title="Comenzar"
            variant="accent"
            onPress={finish}
            loading={submitting}
            disabled={submitting}
            fullWidth
            style={{ flex: 1 }}
          />
        )}
      </View>
    </Screen>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View>
      <Text variant="title">{title}</Text>
      {subtitle && (
        <Text variant="body" tone="secondary" style={{ marginTop: 4 }}>
          {subtitle}
        </Text>
      )}
      <View style={{ marginTop: spacing.xl }}>{children}</View>
    </View>
  );
}

function FeatureRow({ icon, color, title, desc }: { icon: IconName; color: string; title: string; desc: string }) {
  return (
    <Card padding="md" style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: color + '22',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="heading">{title}</Text>
        <Text variant="caption" tone="secondary">{desc}</Text>
      </View>
    </Card>
  );
}

function ChoiceCard({
  selected,
  onPress,
  icon,
  iconColor,
  title,
  desc,
}: {
  selected: boolean;
  onPress: () => void;
  icon: IconName;
  iconColor: string;
  title: string;
  desc: string;
}) {
  return (
    <Pressable onPress={onPress} style={{ marginBottom: spacing.md }}>
      <Card
        variant={selected ? 'glow' : 'default'}
        padding="lg"
        style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: iconColor + '22',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={24} color={iconColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="heading">{title}</Text>
          <Text variant="caption" tone="secondary" style={{ marginTop: 2 }}>{desc}</Text>
        </View>
        <View
          style={{
            width: 22,
            height: 22,
            borderRadius: 11,
            borderWidth: 2,
            borderColor: selected ? colors.primary.DEFAULT : colors.border,
            backgroundColor: selected ? colors.primary.DEFAULT : 'transparent',
          }}
        />
      </Card>
    </Pressable>
  );
}

function SegmentedToggle({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: colors.bg.elevated,
        borderRadius: radius.lg,
        padding: 4,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={{
              flex: 1,
              paddingVertical: 10,
              alignItems: 'center',
              borderRadius: radius.md,
              backgroundColor: active ? colors.primary.DEFAULT : 'transparent',
            }}
          >
            <Text weight="bold" tone={active ? 'primary' : 'secondary'}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
