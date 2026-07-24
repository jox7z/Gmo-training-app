/**
 * CommentSheet — contenedor fino de comentarios de posts.
 *
 * Sólo inyecta queries/mutations de feed en el núcleo compartido
 * `CommentSheetView`. La API pública hacia sus padres NO cambia.
 */
import { useCallback } from 'react';
import { CommentSheetView } from '@/components/comments/CommentSheetView';
import { useComments, useAddComment, useDeleteComment } from '@/lib/queries/feed';
import { useToast } from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  postId: string | null;
  postOwnerId: string | null;
  currentUserId: string | null;
  onClose: () => void;
}

export function CommentSheet({
  visible,
  postId,
  postOwnerId,
  currentUserId,
  onClose,
}: Props) {
  const { show: showToast } = useToast();
  const commentsQuery = useComments(visible ? postId ?? undefined : undefined);
  const { mutateAsync: sendComment } = useAddComment();
  const { mutate: removeComment } = useDeleteComment();

  const onSend = useCallback(
    async (text: string) => {
      if (!postId) return;
      try {
        await sendComment({ postId, body: text });
      } catch (err) {
        showToast({
          message: (err as Error)?.message ?? 'No se pudo enviar el comentario',
          tone: 'danger',
        });
        throw err; // re-lanza para que el compositor restaure el texto
      }
    },
    [sendComment, postId, showToast],
  );

  const onDeleteComment = useCallback(
    (commentId: string) => {
      if (!postId) return;
      removeComment(
        { commentId, postId },
        {
          onError: (err) =>
            showToast({
              message: err?.message ?? 'No se pudo borrar el comentario',
              tone: 'danger',
            }),
        },
      );
    },
    [removeComment, postId, showToast],
  );

  return (
    <CommentSheetView
      visible={visible}
      onClose={onClose}
      comments={commentsQuery.data ?? []}
      isLoading={commentsQuery.isLoading}
      currentUserId={currentUserId}
      ownerId={postOwnerId}
      onSend={onSend}
      onDeleteComment={onDeleteComment}
    />
  );
}
