import { useState } from 'react';
import { View, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Stat } from '@/components/ui/Stat';
import { Badge } from '@/components/ui/Badge';
import { RankBadge } from '@/components/RankBadge';
import { colors, spacing, radius } from '@/theme/tokens';
import { Loader } from '@/components/ui/Loader';
import { useAppStore, Unit } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { formatDuration } from '@/lib/units';
import { Heatmap } from '@/components/Heatmap';
import { Icon, IconName } from '@/components/Icon';

const BADGES: { id: string; label: string; icon: IconName; color: string; earned: boolean }[] = [
  { id: 'first', label: 'Primer workout', icon: 'medal', color: '#CD7F32', earned: true },
  { id: 'streak3', label: 'Racha 3 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: true },
  { id: 'streak10', label: 'Racha 10 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: false },
  { id: 'volume', label: 'Bestia (>10t)', icon: 'muscle', color: colors.primary.DEFAULT, earned: false },
  { id: 'early', label: 'Madrugador', icon: 'seedling', color: colors.success, earned: true },
  { id: 'social', label: 'Influencer', icon: 'target', color: colors.info.DEFAULT, earned: false },
];

export default function Profile() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const signOut = useAppStore((s) => s.signOut);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const history = useWorkoutsStore((s) => s.history);
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return <Loader />;

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir? Tus datos quedan guardados en la nube.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            setSigningOut(true);
            await signOut();
            // The auth subscription in _layout.tsx detects SIGNED_OUT and redirects.
            // No router.replace needed here.
            setSigningOut(false);
          },
        },
      ],
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Borrar cuenta',
      'Esta función estará disponible próximamente. Mientras tanto, escríbenos para borrar tu cuenta manualmente.',
      [{ text: 'Entendido' }],
    );
  };

  const totalSets = history.reduce(
    (a, w) => a + w.exercises.reduce((b, e) => b + e.sets.filter((s) => s.isCompleted && !s.isWarmup).length, 0),
    0,
  );
  const totalDuration = history.reduce((a, w) => a + (w.durationSeconds ?? 0), 0);

  const toggleUnit = () => {
    const unit: Unit = profile.unit === 'kg' ? 'lb' : 'kg';
    setProfile({ ...profile, unit });
  };

  return (
    <Screen>
      <View style={{ flexDirection: 'row', marginBottom: spacing.lg }}>
        <Pressable onPress={() => router.push('/coach')}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 22,
              backgroundColor: colors.info.soft,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: colors.info.DEFAULT,
            }}
          >
            <Icon name="robot" size={20} color={colors.info.DEFAULT} />
          </View>
        </Pressable>
      </View>
      <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
        <View
          style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 3,
            borderColor: colors.primary.DEFAULT,
          }}
        >
          <Text variant="display" weight="black">{profile.displayName[0]?.toUpperCase()}</Text>
        </View>
        <Text variant="title" style={{ marginTop: spacing.md }}>{profile.displayName}</Text>
        <Text variant="caption" tone="muted">@{profile.username}</Text>
        <View style={{ marginTop: spacing.md }}>
          <RankBadge points={profile.rankPoints} size="lg" showProgress />
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Workouts" value={history.length} tone="brand" />
        </Card>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Racha" value={streakWeeks} unit="sem" tone="accent" />
        </Card>
      </View>
      <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.md }}>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Sets totales" value={totalSets.toLocaleString()} tone="info" />
        </Card>
        <Card padding="lg" style={{ flex: 1 }}>
          <Stat label="Tiempo total" value={formatDuration(totalDuration)} tone="info" />
        </Card>
      </View>

      <View style={{ marginTop: spacing['2xl'] }}>
        <Heatmap />
      </View>

      <Text variant="heading" style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
        Logros
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
        {BADGES.map((b) => (
          <Card
            key={b.id}
            padding="md"
            variant={b.earned ? 'glow' : 'outlined'}
            glowColor={colors.accent.DEFAULT}
            style={{ width: '47%', alignItems: 'center', opacity: b.earned ? 1 : 0.4 }}
          >
            <Icon name={b.icon} size={32} color={b.color} />
            <Text variant="caption" weight="bold" style={{ marginTop: 4, textAlign: 'center' }}>
              {b.label}
            </Text>
            {b.earned && <Badge label="Conseguido" tone="accent" />}
          </Card>
        ))}
      </View>

      <Text variant="heading" style={{ marginTop: spacing['2xl'], marginBottom: spacing.md }}>
        Ajustes
      </Text>
      <Card padding={0}>
        <SettingRow label="Unidad de peso" value={profile.unit.toUpperCase()} onPress={toggleUnit} />
        <SettingRow label="Meta semanal" value={`${profile.weeklyGoalDays} días`} />
        <SettingRow label="Nivel" value={profile.level} />
        <SettingRow label="Objetivo" value={profile.goal} last />
      </Card>

      <Button
        title="Hablar con el Coach IA"
        variant="secondary"
        onPress={() => router.push('/coach')}
        style={{ marginTop: spacing.xl }}
        fullWidth
      />

      {/* Cuenta */}
      {isSupabaseConfigured && (
        <View style={{ marginTop: spacing['2xl'] }}>
          <Text variant="heading" style={{ marginBottom: spacing.md }}>
            Cuenta
          </Text>
          <Button
            title="Cerrar sesión"
            variant="secondary"
            onPress={handleSignOut}
            loading={signingOut}
            fullWidth
          />
          <Pressable
            onPress={handleDeleteAccount}
            hitSlop={10}
            style={{ marginTop: spacing.md, alignSelf: 'center', padding: spacing.sm }}
          >
            <Text variant="caption" style={{ color: colors.danger }} weight="semibold">
              Borrar cuenta
            </Text>
          </Pressable>
        </View>
      )}

      <Text variant="caption" tone="muted" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
        Gmo Training App · v0.1.0
      </Text>
    </Screen>
  );
}

function SettingRow({
  label,
  value,
  onPress,
  last,
}: {
  label: string;
  value: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
        }}
      >
        <Text>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text tone="secondary" weight="semibold">{value}</Text>
          {onPress && <Icon name="chevron-right" size={18} color={colors.text.muted} />}
        </View>
      </View>
    </Pressable>
  );
}
