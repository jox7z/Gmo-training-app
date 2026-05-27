import { View, Pressable, ScrollView, Share, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Avatar } from '@/components/Avatar';
import { Icon, IconName } from '@/components/Icon';
import { colors, radius, spacing, rankFromPoints } from '@/theme/tokens';
import { Loader } from '@/components/ui/Loader';
import { useAppStore } from '@/store/app';
import { useProfileCounters } from '@/lib/queries/profile';
import { useToast } from '@/components/ui/Toast';

const BADGES: { id: string; label: string; icon: IconName; color: string; earned: boolean }[] = [
  { id: 'first', label: 'Primer workout', icon: 'medal', color: '#CD7F32', earned: true },
  { id: 'streak3', label: 'Racha 3 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: true },
  { id: 'streak10', label: 'Racha 10 sem', icon: 'fire', color: colors.accent.DEFAULT, earned: false },
  { id: 'volume', label: 'Bestia +10t', icon: 'muscle', color: colors.primary.DEFAULT, earned: false },
  { id: 'early', label: 'Madrugador', icon: 'seedling', color: colors.success, earned: true },
  { id: 'social', label: 'Influencer', icon: 'target', color: colors.info.DEFAULT, earned: false },
];

export default function Profile() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const profile = useAppStore((s) => s.profile);
  const streakWeeks = useAppStore((s) => s.streakWeeks);
  const signOut = useAppStore((s) => s.signOut);

  const countersQuery = useProfileCounters(profile?.id);

  if (!profile) return <Loader />;

  const rank = rankFromPoints(profile.rankPoints);
  const followersCount = countersQuery.data?.followers ?? 0;
  const followingCount = countersQuery.data?.following ?? 0;
  const postsCount = countersQuery.data?.posts ?? 0;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Sígueme en Gmo Training: gmo://profile/${profile.username}`,
      });
    } catch (e) {
      toast.show({ message: (e as Error)?.message ?? 'No se pudo compartir', tone: 'danger' });
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: () => {
            signOut().catch(() => {});
          },
        },
      ],
    );
  };

  const earnedCount = BADGES.filter((b) => b.earned).length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg.base }} edges={['top']}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: insets.bottom + 100,
          gap: spacing.md,
        }}
      >
        {/* Hero */}
        <Card padding="xl" style={{ alignItems: 'center', overflow: 'hidden' }}>
          <LinearGradient
            colors={rank.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 110,
              opacity: 0.25,
            }}
          />
          <Avatar
            uri={profile.avatarUrl}
            name={profile.displayName}
            size={110}
            borderColor={rank.color}
          />
          <Text variant="title" style={{ marginTop: spacing.md }}>
            {profile.displayName}
          </Text>
          <Text variant="caption" tone="muted">@{profile.username}</Text>
          <View style={{ marginTop: spacing.md }}>
            <View
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: 6,
                borderRadius: radius.full,
                overflow: 'hidden',
              }}
            >
              <LinearGradient
                colors={rank.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
              />
              <Text weight="black" style={{ color: '#0B0B0B', letterSpacing: 1 }}>
                {rank.label.toUpperCase()}
              </Text>
            </View>
          </View>
          {streakWeeks > 0 && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: spacing.sm,
              }}
            >
              <Icon name="fire" size={14} color={colors.accent.DEFAULT} />
              <Text variant="caption" tone="accent" weight="bold">
                {streakWeeks} {streakWeeks === 1 ? 'semana' : 'semanas'} seguidas
              </Text>
            </View>
          )}
          {!!profile.bio && (
            <Text
              variant="caption"
              tone="secondary"
              style={{ marginTop: spacing.md, textAlign: 'center' }}
            >
              {profile.bio}
            </Text>
          )}
        </Card>

        {/* Social stats row */}
        <Card padding="lg" style={{ flexDirection: 'row' }}>
          <SocialStat
            label="Seguidores"
            value={followersCount}
            onPress={() => router.push({ pathname: '/profile/connections', params: { type: 'followers' } })}
          />
          <Divider />
          <SocialStat
            label="Siguiendo"
            value={followingCount}
            onPress={() => router.push({ pathname: '/profile/connections', params: { type: 'following' } })}
          />
          <Divider />
          <SocialStat label="Posts" value={postsCount} />
        </Card>

        {/* Share */}
        <Button
          title="Compartir perfil"
          variant="secondary"
          leftIcon={<Icon name="share" size={16} color={colors.text.primary} />}
          onPress={handleShare}
          fullWidth
        />

        {/* Achievements */}
        <SectionHeader title="Logros" right={`${earnedCount}/${BADGES.length}`} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
          {BADGES.map((b) => (
            <Card
              key={b.id}
              padding="md"
              variant={b.earned ? 'glow' : 'outlined'}
              glowColor={b.color}
              style={{ width: '47%', alignItems: 'center', opacity: b.earned ? 1 : 0.45 }}
            >
              <Icon name={b.icon} size={28} color={b.color} />
              <Text
                variant="caption"
                weight="bold"
                style={{ marginTop: 6, textAlign: 'center' }}
              >
                {b.label}
              </Text>
              {b.earned && <Badge label="Conseguido" tone="accent" />}
            </Card>
          ))}
        </View>

        {/* Actions */}
        <SectionHeader title="Cuenta" />
        <RowButton
          icon="edit"
          label="Personalizar perfil"
          onPress={() => router.push('/profile/edit')}
        />
        <RowButton
          icon="settings"
          label="Ajustes"
          onPress={() => router.push('/profile/settings')}
        />
        <RowButton
          icon="robot"
          label="Coach IA"
          onPress={() => router.push('/coach')}
          tone="info"
        />
        <RowButton
          icon="logout"
          label="Cerrar sesión"
          onPress={handleSignOut}
          tone="danger"
        />

        <Text
          variant="caption"
          tone="muted"
          style={{ marginTop: spacing.xl, textAlign: 'center' }}
        >
          Gmo Training App · v0.1.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function SocialStat({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const inner = (
    <View style={{ flex: 1, alignItems: 'center', paddingVertical: spacing.sm }}>
      <Text variant="heading" weight="bold" numeric>
        {value.toLocaleString()}
      </Text>
      <Text variant="label" tone="muted" style={{ marginTop: 2 }}>
        {label}
      </Text>
    </View>
  );
  if (!onPress) {
    return <View style={{ flex: 1 }}>{inner}</View>;
  }
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [{ flex: 1 }, pressed && { opacity: 0.7 }]}
    >
      {inner}
    </Pressable>
  );
}

function Divider() {
  return (
    <View
      style={{
        width: 1,
        backgroundColor: colors.border,
        marginVertical: spacing.xs,
      }}
    />
  );
}

function SectionHeader({ title, right }: { title: string; right?: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.xl,
        marginBottom: spacing.sm,
      }}
    >
      <Text variant="heading">{title}</Text>
      {right ? (
        <Text variant="caption" tone="secondary" weight="semibold">
          {right}
        </Text>
      ) : null}
    </View>
  );
}

function RowButton({
  icon,
  label,
  onPress,
  tone = 'default',
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'info' | 'danger';
}) {
  const fg =
    tone === 'danger' ? colors.danger
    : tone === 'info' ? colors.info.DEFAULT
    : colors.text.primary;
  const iconBg =
    tone === 'danger' ? 'rgba(239,68,68,0.15)'
    : tone === 'info' ? colors.info.soft
    : colors.bg.elevated;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          backgroundColor: colors.bg.card,
          borderWidth: 1,
          borderColor: colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: iconBg,
        }}
      >
        <Icon name={icon} size={16} color={fg} />
      </View>
      <Text weight="semibold" style={{ flex: 1, color: fg }}>
        {label}
      </Text>
      <Icon name="chevron-right" size={16} color={colors.text.muted} />
    </Pressable>
  );
}
