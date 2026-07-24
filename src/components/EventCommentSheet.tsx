/**
 * EventCommentSheet — contenedor fino de comentarios de eventos.
 *
 * Sólo inyecta queries/mutations de eventos en el núcleo compartido
 * `CommentSheetView`. La API pública hacia sus padres NO cambia:
 *  - canDelete = autor ó creador del evento (eventOwnerId → ownerId).
 */
import { useCallback } from 'react';
import { CommentSheetView } from '@/components/comments/CommentSheetView';
import {
  useEventComments,
  useAddEventComment,
  useDeleteEventComment,
} from '@/lib/queries/events';
import { useToast } from '@/components/ui/Toast';

interface Props {
  visible: boolean;
  eventId: string | null;
  eventOwnerId: string | null;
  currentUserId: string | null;
  onClose: () => void;
}

export function EventCommentSheet({
  visible,
  eventId,
  eventOwnerId,
  currentUserId,
  onClose,
}: Props) {
  const { show: showToast } = useToast();
  const commentsQuery = useEventComments(visible ? eventId ?? undefined : undefined);
  const { mutateAsync: sendComment } = useAddEventComment();
  const { mutate: removeComment } = useDeleteEventComment();

  const onSend = useCallback(
    async (text: string) => {
      if (!eventId) return;
      try {
        await sendComment({ eventId, body: text });
      } catch (err) {
        showToast({
          message: (err as Error)?.message ?? 'No se pudo enviar el comentario',
          tone: 'danger',
        });
        throw err; // re-lanza para que el compositor restaure el texto
      }
    },
    [sendComment, eventId, showToast],
  );

  const onDeleteComment = useCallback(
    (commentId: string) => {
      if (!eventId) return;
      removeComment(
        { commentId, eventId },
        {
          onError: (err) =>
            showToast({
              message: err?.message ?? 'No se pudo borrar el comentario',
              tone: 'danger',
            }),
        },
      );
    },
    [removeComment, eventId, showToast],
  );

  return (
    <CommentSheetView
      visible={visible}
      onClose={onClose}
      comments={commentsQuery.data ?? []}
      isLoading={commentsQuery.isLoading}
      currentUserId={currentUserId}
      ownerId={eventOwnerId}
      onSend={onSend}
      onDeleteComment={onDeleteComment}
    />
  );
}
