import { useState } from 'react';
import { View, Pressable, Alert, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { Loader } from '@/components/ui/Loader';
import { colors, spacing, radius } from '@/theme/tokens';
import { useAppStore, Unit } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { isSupabaseConfigured } from '@/lib/supabase';
import { formatDuration } from '@/lib/units';

export default function SettingsScreen() {
  const router = useRouter();
  const profile = useAppStore((s) => s.profile);
  const setProfile = useAppStore((s) => s.setProfile);
  const signOut = useAppStore((s) => s.signOut);
  const history = useWorkoutsStore((s) => s.history);
  const [signingOut, setSigningOut] = useState(false);

  if (!profile) return <Loader />;

  const togglePrivacy = (k: keyof typeof profile.privacy) => {
    setProfile({ ...profile, privacy: { ...profile.privacy, [k]: !profile.privacy[k] } });
  };
  const toggleNotif = (k: keyof typeof profile.notifications) => {
    setProfile({ ...profile, notifications: { ...profile.notifications, [k]: !profile.notifications[k] } });
  };
  const toggleUnit = () => {
    const unit: Unit = profile.unit === 'kg' ? 'lb' : 'kg';
    setProfile({ ...profile, unit });
  };

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
            setSigningOut(false);
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    Alert.alert(
      'Borrar cuenta',
      'Esta función estará disponible próximamente. Mientras tanto, escríbenos para borrar tu cuenta manualmente.',
      [{ text: 'Entendido' }],
    );
  };

  const totalDuration = history.reduce((a, w) => a + (w.durationSeconds ?? 0), 0);

  return (
    <Screen>
      {/* Header */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: spacing.xl,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: radius.full,
              backgroundColor: colors.bg.elevated,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="chevron-left" size={18} color={colors.text.primary} />
          </View>
        </Pressable>
        <Text variant="heading" weight="bold">Configuración</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Profile preview */}
      <Pressable onPress={() => router.push('/profile/edit')}>
        <Card padding="lg" variant="raised">
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.lg }}>
            <View style={{ position: 'relative' }}>
              <Avatar uri={profile.avatarUrl} name={profile.displayName} size={64} />
              <View
                style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: colors.primary.DEFAULT,
                  borderWidth: 2,
                  borderColor: colors.bg.elevated,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name="camera" size={12} color="#FFFFFF" />
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="heading">{profile.displayName}</Text>
              <Text variant="caption" tone="muted">@{profile.username}</Text>
              <Text variant="caption" tone="brand" weight="semibold" style={{ marginTop: 4 }}>
                Editar perfil
              </Text>
            </View>
            <Icon name="chevron-right" size={18} color={colors.text.muted} />
          </View>
        </Card>
      </Pressable>

      {/* CUENTA */}
      <SectionTitle>Cuenta</SectionTitle>
      <Card padding={0}>
        <Row
          icon="edit"
          label="Editar perfil"
          subtitle="Nombre, username, bio, ubicación"
          onPress={() => router.push('/profile/edit')}
        />
        <Row
          icon="camera"
          label="Foto de perfil"
          onPress={() => router.push('/profile/edit')}
        />
        <Row
          icon="lock"
          label="Cambiar contraseña"
          onPress={() => router.push('/auth/forgot-password')}
          last
        />
      </Card>

      {/* PRIVACIDAD */}
      <SectionTitle>Privacidad</SectionTitle>
      <Card padding={0}>
        <ToggleRow
          icon="globe"
          label="Perfil público"
          subtitle="Cualquiera puede ver tu perfil"
          value={profile.privacy.profilePublic}
          onChange={() => togglePrivacy('profilePublic')}
        />
        <ToggleRow
          icon="eye"
          label="Mostrar actividad"
          subtitle="Tus entrenamientos en el feed"
          value={profile.privacy.showActivity}
          onChange={() => togglePrivacy('showActivity')}
        />
        <ToggleRow
          icon="target"
          label="Mostrar estadísticas"
          subtitle="Volumen, racha y rango"
          value={profile.privacy.showStats}
          onChange={() => togglePrivacy('showStats')}
          last
        />
      </Card>

      {/* NOTIFICACIONES */}
      <SectionTitle>Notificaciones</SectionTitle>
      <Card padding={0}>
        <ToggleRow
          icon="bell"
          label="Recordatorios de entrenamiento"
          value={profile.notifications.workoutReminders}
          onChange={() => toggleNotif('workoutReminders')}
        />
        <ToggleRow
          icon="users"
          label="Actividad social"
          subtitle="Likes, comentarios y seguidores"
          value={profile.notifications.socialUpdates}
          onChange={() => toggleNotif('socialUpdates')}
        />
        <ToggleRow
          icon="trophy"
          label="Logros desbloqueados"
          value={profile.notifications.achievements}
          onChange={() => toggleNotif('achievements')}
        />
        <ToggleRow
          icon="calendar"
          label="Reporte semanal"
          value={profile.notifications.weeklyReport}
          onChange={() => toggleNotif('weeklyReport')}
          last
        />
      </Card>

      {/* PREFERENCIAS */}
      <SectionTitle>Preferencias</SectionTitle>
      <Card padding={0}>
        <Row label="Unidad de peso" value={profile.unit.toUpperCase()} onPress={toggleUnit} />
        <Row label="Meta semanal" value={`${profile.weeklyGoalDays} días`} />
        <Row label="Nivel" value={profile.level} />
        <Row label="Objetivo" value={profile.goal} last />
      </Card>

      {/* ESTADÍSTICAS */}
      <SectionTitle>Estadísticas</SectionTitle>
      <Card padding={0}>
        <Row
          icon="dumbbell"
          label="Entrenamientos registrados"
          value={String(history.length)}
        />
        <Row
          icon="clock"
          label="Tiempo total"
          value={formatDuration(totalDuration)}
        />
        <Row
          icon="share"
          label="Actividades publicadas"
          value={String(history.filter((w) => w.isPublished).length)}
          last
        />
      </Card>

      {/* CUENTA — auth */}
      {isSupabaseConfigured && (
        <>
          <SectionTitle>Sesión</SectionTitle>
          <Button
            title="Cerrar sesión"
            variant="secondary"
            onPress={handleSignOut}
            loading={signingOut}
            leftIcon={<Icon name="logout" size={16} color={colors.text.primary} />}
            fullWidth
          />
          <Pressable
            onPress={handleDelete}
            hitSlop={10}
            style={{ marginTop: spacing.md, alignSelf: 'center', padding: spacing.sm }}
          >
            <Text variant="caption" style={{ color: colors.danger }} weight="semibold">
              Borrar cuenta
            </Text>
          </Pressable>
        </>
      )}

      <Text variant="caption" tone="muted" style={{ marginTop: spacing.xl, textAlign: 'center' }}>
        Gmo Training App · v0.1.0
      </Text>
    </Screen>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text
      variant="label"
      tone="muted"
      style={{ marginTop: spacing['2xl'], marginBottom: spacing.sm, paddingHorizontal: 4 }}
    >
      {children}
    </Text>
  );
}

function Row({
  icon,
  label,
  subtitle,
  value,
  onPress,
  last,
}: {
  icon?: IconName;
  label: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  last?: boolean;
}) {
  return (
    <Pressable onPress={onPress}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 14,
          paddingHorizontal: spacing.lg,
          borderBottomWidth: last ? 0 : 1,
          borderBottomColor: colors.border,
          gap: spacing.md,
        }}
      >
        {icon && (
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: radius.md,
              backgroundColor: colors.bg.elevated,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name={icon} size={16} color={colors.text.secondary} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text>{label}</Text>
          {subtitle && (
            <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text>
          )}
        </View>
        {value && (
          <Text tone="secondary" weight="semibold" style={{ textTransform: 'capitalize' }}>{value}</Text>
        )}
        {onPress && <Icon name="chevron-right" size={16} color={colors.text.muted} />}
      </View>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  label,
  subtitle,
  value,
  onChange,
  last,
}: {
  icon?: IconName;
  label: string;
  subtitle?: string;
  value: boolean;
  onChange: () => void;
  last?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: colors.border,
        gap: spacing.md,
      }}
    >
      {icon && (
        <View
          style={{
            width: 32,
            height: 32,
            borderRadius: radius.md,
            backgroundColor: colors.bg.elevated,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={16} color={colors.text.secondary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text>{label}</Text>
        {subtitle && (
          <Text variant="caption" tone="muted" style={{ marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.primary.DEFAULT }}
        thumbColor="#FFFFFF"
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}
