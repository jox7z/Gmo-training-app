/**
 * CommentSheetView — núcleo presentacional compartido por CommentSheet (posts) y
 * EventCommentSheet (eventos). Vive sobre AppBottomSheet: lista virtualizada con
 * BottomSheetFlatList + input fijo con BottomSheetFooter/BottomSheetTextInput
 * (nada de KeyboardAvoidingView: el teclado lo gestionan las piezas de gorhom).
 *
 * Sin queries/mutations aquí: los contenedores finos (CommentSheet /
 * EventCommentSheet) inyectan datos y callbacks. `onSend` debe RECHAZAR en error
 * para que el compositor restaure el texto y el usuario reintente sin retipear.
 */
import { memo, useCallback, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  BottomSheetFlatList,
  BottomSheetFooter,
  BottomSheetTextInput,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBottomSheet } from '@/components/ui/AppBottomSheet';
import { SkeletonRow } from '@/components/ui/Skeleton';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { colors, radius, spacing, RANKS, type RankId } from '@/theme/tokens';

const MAX_BODY = 500;

/** Forma mínima que la vista necesita; Comment y EventComment son asignables. */
export interface CommentSheetComment {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  user: {
    displayName: string;
    username: string;
    currentRank: RankId;
  };
}

interface CommentSheetViewProps {
  visible: boolean;
  onClose: () => void;
  comments: CommentSheetComment[];
  isLoading: boolean;
  /** Autor actual: habilita borrar sus propios comentarios. */
  currentUserId: string | null;
  /** Dueño del post/evento: puede borrar cualquier comentario. */
  ownerId: string | null;
  /** Debe rechazar (throw) en error para restaurar el texto tipeado. */
  onSend: (text: string) => Promise<void>;
  onDeleteComment?: (id: string) => void;
  title?: string;
}

function rankInfo(id: RankId) {
  return RANKS.find((r) => r.id === id) ?? RANKS[0];
}

function formatRelative(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000));
  if (diffSec < 60) return 'ahora';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h`;
  return `${Math.floor(diffH / 24)}d`;
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: CommentSheetComment;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const info = rankInfo(comment.user.currentRank);
  return (
    <View
      style={{
        flexDirection: 'row',
        gap: spacing.md,
        paddingVertical: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
      }}
    >
      <Avatar name={comment.user.displayName} size={32} borderColor={info.color} />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
          <Text weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
            {comment.user.displayName || `@${comment.user.username}`}
          </Text>
          <Badge label={info.label} tone="muted" />
          <Text variant="caption" tone="muted">
            · {formatRelative(comment.createdAt)}
          </Text>
        </View>
        <Text variant="body" style={{ marginTop: 2 }}>
          {comment.body}
        </Text>
      </View>
      {canDelete && (
        <PressableScale onPress={onDelete} hitSlop={8}>
          <Icon name="close" size={14} color={colors.text.muted} />
        </PressableScale>
      )}
    </View>
  );
}

/**
 * Compositor del input. Es un componente memoizado que posee su propio estado
 * (`body`, `sending`) para que el tecleo NO re-renderice el sheet ni remonte el
 * footer (perdería el foco del teclado). Vive dentro de BottomSheetFooter.
 */
const CommentComposer = memo(function CommentComposer({
  onSend,
  insetsBottom,
}: {
  onSend: (text: string) => Promise<void>;
  insetsBottom: number;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const remaining = MAX_BODY - body.length;
  const overLimit = remaining < 0;
  const canSend = body.trim().length > 0 && !overLimit && !sending;

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || sending) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const sent = body;
    setBody('');
    setSending(true);
    try {
      await onSend(trimmed);
    } catch {
      // El contenedor ya muestra el toast; restauramos para reintentar.
      setBody(sent);
    } finally {
      setSending(false);
    }
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
        paddingBottom: insetsBottom + spacing.sm,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        backgroundColor: colors.bg.card,
      }}
    >
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: overLimit ? colors.danger : colors.border,
          backgroundColor: colors.bg.elevated,
          borderRadius: radius.lg,
          paddingHorizontal: spacing.md,
          paddingVertical: 8,
        }}
      >
        <BottomSheetTextInput
          value={body}
          onChangeText={setBody}
          placeholder="Escribe un comentario…"
          placeholderTextColor={colors.text.muted}
          multiline
          style={{ color: colors.text.primary, fontSize: 15, maxHeight: 100 }}
        />
        {body.length > 0 && (
          <Text
            variant="caption"
            tone={overLimit ? 'danger' : 'muted'}
            numeric
            style={{ alignSelf: 'flex-end' }}
          >
            {remaining}
          </Text>
        )}
      </View>
      <PressableScale
        onPress={handleSend}
        disabled={!canSend}
        hitSlop={6}
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: canSend ? colors.primary.DEFAULT : colors.bg.elevated,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: canSend ? colors.primary.DEFAULT : colors.border,
        }}
      >
        {sending ? (
          <ActivityIndicator size="small" color={colors.text.primary} />
        ) : (
          <Icon
            name="send"
            size={16}
            color={canSend ? colors.text.primary : colors.text.muted}
          />
        )}
      </PressableScale>
    </View>
  );
});

export function CommentSheetView({
  visible,
  onClose,
  comments,
  isLoading,
  currentUserId,
  ownerId,
  onSend,
  onDeleteComment,
  title = 'Comentarios',
}: CommentSheetViewProps) {
  const insets = useSafeAreaInsets();

  // Footer estable: sólo depende de referencias que no cambian al teclear, así
  // el BottomSheetTextInput nunca se remonta ni pierde el foco.
  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) => (
      <BottomSheetFooter {...props}>
        <CommentComposer onSend={onSend} insetsBottom={insets.bottom} />
      </BottomSheetFooter>
    ),
    [onSend, insets.bottom],
  );

  return (
    <AppBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={['60%', '95%']}
      keyboardBehavior="extend"
      title={title}
      footerComponent={renderFooter}
    >
      <BottomSheetFlatList<CommentSheetComment>
        data={comments}
        keyExtractor={(c) => c.id}
        // gorhom añade automáticamente el margen inferior del footer animado.
        enableFooterMarginAdjustment
        contentContainerStyle={{
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          flexGrow: 1,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <CommentRow
            comment={item}
            canDelete={
              !!currentUserId &&
              (item.userId === currentUserId || ownerId === currentUserId)
            }
            onDelete={() => onDeleteComment?.(item.id)}
          />
        )}
        ListEmptyComponent={
          isLoading ? (
            <View style={{ paddingVertical: spacing.md, gap: spacing.md }}>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </View>
          ) : (
            <View style={{ padding: spacing.xl, alignItems: 'center' }}>
              <Icon name="chat" size={32} color={colors.text.muted} />
              <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                Sé el primero en comentar
              </Text>
            </View>
          )
        }
      />
    </AppBottomSheet>
  );
}
