import { useState, useRef, useEffect, useMemo } from 'react';
import { View, Pressable, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { Input } from '@/components/ui/Input';
import { colors, spacing, radius } from '@/theme/tokens';
import { askCoach, CoachMessage, CoachContext, WorkoutSummary } from '@/lib/coach';
import { useAppStore } from '@/store/app';
import { useWorkoutsStore } from '@/store/workouts';
import { computeOptimizationScore } from '@/lib/optimizationScore';
import { Icon } from '@/components/Icon';

const SUGGESTIONS = [
  '¿Cómo hago bien la sentadilla?',
  '¿Cuánta proteína debo comer?',
  '¿Cómo sé si estoy sobreentrenando?',
  'Tengo dolor en la rodilla, ¿qué hago?',
];

export default function Coach() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const profile = useAppStore((s) => s.profile);
  const history = useWorkoutsStore((s) => s.history);

  const coachContext = useMemo<CoachContext>(() => {
    const opt = profile
      ? computeOptimizationScore(history, profile)
      : { score: 0, breakdown: { frequency: 0, volumeBalance: 0, recovery: 100, progression: 50, variety: 50 }, weakGroups: [] };

    const recentWorkouts: WorkoutSummary[] = history.slice(0, 5).map((w) => ({
      date: w.startedAt.slice(0, 10),
      durationMin: Math.round((w.durationSeconds ?? 0) / 60),
      volumeKg: w.totalVolumeKg,
      exercises: w.exercises.map((e) => e.exerciseName),
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trainedDays = new Set(history.map((w) => w.startedAt.slice(0, 10)));
    const trainingGaps: string[] = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const k = d.toISOString().slice(0, 10);
      if (!trainedDays.has(k)) trainingGaps.push(k);
    }

    return { ...opt, recentWorkouts, trainingGaps };
  }, [history, profile]);

  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'init',
      role: 'assistant',
      content: 'Hola 👋 Soy tu coach virtual. Pregúntame sobre técnica, rutinas, recuperación o nutrición.',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, loading]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const userMsg: CoachMessage = { id: Math.random().toString(36).slice(2), role: 'user', content, createdAt: Date.now() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await askCoach(next, coachContext);
      setMessages((m) => [
        ...m,
        { id: Math.random().toString(36).slice(2), role: 'assistant', content: res.reply, createdAt: Date.now() },
      ]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          id: Math.random().toString(36).slice(2),
          role: 'assistant',
          content: `Error contactando al coach: ${e?.message ?? 'desconocido'}. Reintenta en unos segundos.`,
          createdAt: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: insets.top + spacing.md,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        }}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Icon name="close" size={20} color={colors.text.muted} />
        </Pressable>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: colors.info.soft,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="robot" size={18} color={colors.info.DEFAULT} />
          </View>
          <View>
            <Text weight="bold">Coach IA</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Icon name="dot" size={8} color={colors.success} />
                <Text variant="caption" tone="success">Online</Text>
              </View>
          </View>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {messages.map((m) => (
            <View
              key={m.id}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                marginBottom: spacing.sm,
              }}
            >
              <View
                style={{
                  backgroundColor: m.role === 'user' ? colors.primary.DEFAULT : colors.bg.card,
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: radius.lg,
                  borderTopRightRadius: m.role === 'user' ? 4 : radius.lg,
                  borderTopLeftRadius: m.role === 'assistant' ? 4 : radius.lg,
                }}
              >
                <Text style={{ color: '#fff' }}>{m.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={{ alignSelf: 'flex-start', flexDirection: 'row', gap: 6, marginTop: spacing.sm }}>
              <ActivityIndicator color={colors.info.DEFAULT} />
              <Text variant="caption" tone="muted">Coach pensando...</Text>
            </View>
          )}
        </ScrollView>

        {messages.length === 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.sm }}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {SUGGESTIONS.map((s) => (
              <Pressable
                key={s}
                onPress={() => send(s)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: radius.full,
                  backgroundColor: colors.info.soft,
                  borderWidth: 1,
                  borderColor: colors.info.DEFAULT,
                }}
              >
                <Text variant="caption" tone="info" weight="semibold">{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        <View
          style={{
            padding: spacing.lg,
            borderTopWidth: 1,
            borderTopColor: colors.border,
            backgroundColor: colors.bg.base,
          }}
        >
          <Input
            value={input}
            onChangeText={setInput}
            placeholder="Pregúntame algo..."
            returnKeyType="send"
            onSubmitEditing={() => send()}
            rightAdornment={
              <Pressable onPress={() => send()} disabled={!input.trim() || loading}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: input.trim() && !loading ? colors.primary.DEFAULT : colors.bg.card,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginLeft: 4,
                  }}
                >
                  <Icon name="send" size={18} color="#fff" />
                </View>
              </Pressable>
            }
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
