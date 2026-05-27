import { useState } from 'react';
import {
  View,
  Modal,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/Text';
import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/Icon';
import { colors, radius, spacing, RANKS, RankId } from '@/theme/tokens';
import {
  useComments,
  useAddComment,
  useDeleteComment,
  type Comment,
} from '@/lib/queries/feed';
import { useToast } from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  postId: string | null;
  postOwnerId: string | null;
  currentUserId: string | null;
  onClose: () => void;
}

const MAX_BODY = 500;

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
  const diffD = Math.floor(diffH / 24);
  return `${diffD}d`;
}

function CommentRow({
  comment,
  canDelete,
  onDelete,
}: {
  comment: Comment;
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
        <Pressable onPress={onDelete} hitSlop={8}>
          <Icon name="close" size={14} color={colors.text.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function CommentSheet({
  visible,
  postId,
  postOwnerId,
  currentUserId,
  onClose,
}: Props) {
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const [body, setBody] = useState('');

  const commentsQuery = useComments(visible ? postId ?? undefined : undefined);
  const addComment = useAddComment();
  const deleteComment = useDeleteComment();

  const handleSend = () => {
    const trimmed = body.trim();
    if (!trimmed || !postId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const sent = body;
    setBody('');
    addComment.mutate(
      { postId, body: trimmed },
      {
        onError: (err) => {
          // Restaura lo que el usuario escribió para que pueda reintentar
          // sin volver a tipear todo.
          setBody(sent);
          toast.show({
            message: err?.message ?? 'No se pudo enviar el comentario',
            tone: 'danger',
          });
        },
      },
    );
  };

  const handleDelete = (comment: Comment) => {
    if (!postId) return;
    deleteComment.mutate(
      { commentId: comment.id, postId },
      {
        onError: (err) =>
          toast.show({
            message: err?.message ?? 'No se pudo borrar el comentario',
            tone: 'danger',
          }),
      },
    );
  };

  const comments = commentsQuery.data ?? [];
  const isLoading = commentsQuery.isLoading;
  const remaining = MAX_BODY - body.length;
  const overLimit = remaining < 0;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        onPress={onClose}
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}
      >
        {/* Empty overlay press-to-close area */}
      </Pressable>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          maxHeight: '80%',
        }}
      >
        <View
          style={{
            backgroundColor: colors.bg.base,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            borderTopWidth: 1,
            borderColor: colors.border,
            paddingBottom: insets.bottom,
          }}
        >
          {/* Grabber */}
          <View style={{ alignItems: 'center', paddingVertical: spacing.sm }}>
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: colors.borderStrong,
              }}
            />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: spacing.lg,
              paddingBottom: spacing.md,
              borderBottomWidth: 1,
              borderBottomColor: colors.border,
            }}
          >
            <Text variant="heading" style={{ flex: 1 }}>
              Comentarios
            </Text>
            <Pressable onPress={onClose} hitSlop={8}>
              <Icon name="close" size={18} color={colors.text.primary} />
            </Pressable>
          </View>

          {/* Comments list */}
          <View style={{ minHeight: 240, maxHeight: 420 }}>
            {isLoading ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <ActivityIndicator color={colors.primary.DEFAULT} />
              </View>
            ) : comments.length === 0 ? (
              <View style={{ padding: spacing.xl, alignItems: 'center' }}>
                <Icon name="chat" size={32} color={colors.text.muted} />
                <Text variant="caption" tone="muted" style={{ marginTop: spacing.sm }}>
                  Sé el primero en comentar
                </Text>
              </View>
            ) : (
              <FlatList<Comment>
                data={comments}
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ paddingHorizontal: spacing.lg }}
                renderItem={({ item }) => (
                  <CommentRow
                    comment={item}
                    canDelete={
                      !!currentUserId &&
                      (item.userId === currentUserId || postOwnerId === currentUserId)
                    }
                    onDelete={() => handleDelete(item)}
                  />
                )}
                keyboardShouldPersistTaps="handled"
              />
            )}
          </View>

          {/* Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'flex-end',
              gap: spacing.sm,
              padding: spacing.md,
              borderTopWidth: 1,
              borderTopColor: colors.border,
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
              <TextInput
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
            <Pressable
              onPress={handleSend}
              disabled={!body.trim() || overLimit || addComment.isPending}
              hitSlop={6}
              style={({ pressed }) => [
                {
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor:
                    !body.trim() || overLimit ? colors.bg.elevated : colors.primary.DEFAULT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor:
                    !body.trim() || overLimit ? colors.border : colors.primary.DEFAULT,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              {addComment.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon
                  name="send"
                  size={16}
                  color={!body.trim() || overLimit ? colors.text.muted : '#fff'}
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
