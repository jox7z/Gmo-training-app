# Fixes — Estado

> Rounds 2, 3, 4, 5 completados. SOCIAL-V2 SB3/BE3/FE3 aplicados con observaciones. Round 6 abajo.

---

## Histórico

- [x] **Round 2** — backend + frontend: enum auth, `Session['user']`, `useFeed` generic, `checkUsernameAvailable` antes del signUp, `usernameOverride` en onboarding.
- [x] **Round 3** — `setProfile` después del `completeSignup` (regresionado y restaurado en Round 5).
- [x] **Round 4** — gate `ready` en `_layout.tsx`, `signOut` reordenado, `useMemo` arriba del early return en `(tabs)/profile.tsx`.
- [x] **SIMPL-1A / 1B** — signup email-only, `is_profile_complete`, redirect forzado a onboarding, debounce username en onboarding.
- [x] **Round 5** — restauración del orden `setProfile` después de `completeSignup`, fix botón signup post-autologin, gate `canAdvance` en step `profile`.
- [x] **SOCIAL-V2 SB3** — `0007_social_feed_v2.sql`: posts extendido, comments, storage `post-photos`, RPCs publish/comment/share, feed v2.
- [x] **SOCIAL-V2 BE3** — `posts.ts` con tipo `Post`/`Comment`, `storage/photos.ts`, hooks `useComments`/`useAddComment`/`useDeleteComment`/`usePublishManualPost`/`useIncrementShare` con optimistic.
- [x] **SOCIAL-V2 FE3** — `(tabs)/index.tsx` como feed real, `publish.tsx`, `discover.tsx`, `profile/[username].tsx`, `today.tsx`, `CommentSheet`, `FeedItem`. Borrado: `(tabs)/feed.tsx` y `mockSocial.ts`.

---

# Fixes Round 6

Limpieza post-SOCIAL-V2. Tres puntos: scope creep no pedido, casts de tipo que sobran, mejora UX en commentario perdido. Nada bloqueante para correr la app, pero hay que cerrarlo antes del próximo sprint.

## Decisiones tomadas (no las debatas)

1. **`app/(tabs)/train.tsx` se ELIMINA.** No estaba en ningún prompt. Si más adelante se quiere un atajo central a "Empezar entreno", se diseña aparte. Hoy es código sin contrato.
2. **Casts `as unknown as Href` se REMUEVEN** tras un primer arranque que regenere los tipos de expo-router. Si tras `expo start` los tipos siguen sin resolver, se documenta el porqué en UN solo punto, no en tres.
3. **`onShareWorkoutHint` con copy-paste muerto se simplifica.** Una sola string o se elimina la prop.
4. **`CommentSheet` preserva el texto si falla el envío.** No es opcional: el user no debería perder lo que escribió.

## Orden de ejecución

1. **Frontend** (único agente trabajando).
2. Backend y DB: nada.

---

## AGENTE FRONTEND

Archivos a tocar (y SOLO estos):
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/train.tsx` (BORRAR)
- `app/(tabs)/index.tsx`
- `src/components/feed/CommentSheet.tsx`

NO toques nada más. NO crees archivos. NO renombres rutas.

### Cambio 1 — Eliminar la pestaña `train`

1. Borrar el archivo `app/(tabs)/train.tsx`.
2. En `app/(tabs)/_layout.tsx`, eliminar el bloque:
   ```tsx
   <Tabs.Screen
     name="train"
     options={{
       title: '',
       tabBarIcon: () => <TabIcon name="train" color="" focused={false} />,
     }}
   />
   ```
3. Si `TabIcon` ya no recibe el case `"train"` desde ningún otro caller, **NO lo borres del switch**. Otro componente puede usarlo más adelante. Solo limpia su uso en _layout.

Resultado esperado: tabs visibles → Feed, Hoy, Rutinas, Perfil. (4 tabs, no 5.)

### Cambio 2 — Limpiar casts `Href` en `app/(tabs)/index.tsx`

Líneas afectadas (busca el patrón `as unknown as Href`):
- `handleOpenProfile` (~258-262)
- `goManualPublish` (~266-269)
- `goShareWorkout` (~270-276)
- `goSharePR` (~277-284)

Paso 1: ejecuta `npx expo start --clear` localmente (o pide al usuario que lo haga) para que `expo-router` regenere `.expo/types/router.d.ts` con las rutas nuevas (`/publish`, `/profile/[username]`).

Paso 2: tras regenerar, intenta quitar los `as unknown as Href` y dejar las llamadas como:
```ts
router.push('/publish');
router.push({ pathname: '/publish', params: { mode: 'workout', workoutId: recentWorkout.id } });
router.push({ pathname: '/publish', params: { mode: 'pr' } });
router.push({ pathname: '/profile/[username]', params: { username: post.user.username } });
```

Paso 3: corre `npx tsc --noEmit`. Si compila limpio:
- Borra el `import { type Href } from 'expo-router';` (o como esté nombrado) si ya no se usa en el archivo.
- Borra el comentario "expo-router's typed routes are regenerated…" — ya no aplica.

Paso 4 (solo si tsc sigue fallando tras `--clear`): consolida el comentario explicativo a UN solo lugar, arriba del primer cast. NO repitas el mismo comentario en 3 sitios.

### Cambio 3 — Quitar `onShareWorkoutHint` muerto en `app/(tabs)/index.tsx`

Hoy en las dos invocaciones del `<Composer>` (líneas ~345-353 y ~383-392):
```tsx
onShareWorkoutHint={recentWorkout ? 'Workout' : 'Workout'}
```

El ternario devuelve la misma string. Acciones:
1. Borra la prop `onShareWorkoutHint` de ambas invocaciones del `<Composer>`.
2. En la definición del componente `Composer` (mismo archivo, busca `function Composer(`), borra la prop del tipo y del destructuring. Si el hint se usaba para pintar algo, sustituye por la string literal `'Workout'` directamente.

NO añadas una nueva prop ni un nuevo hint.

### Cambio 4 — `CommentSheet` preserva el texto si el envío falla

En `src/components/feed/CommentSheet.tsx`, función `handleSend` (líneas ~112-126):

Hoy:
```ts
const handleSend = () => {
  const trimmed = body.trim();
  if (!trimmed || !postId) return;
  addComment.mutate(
    { postId, body: trimmed },
    {
      onError: (err) =>
        toast.show({ message: err?.message ?? 'No se pudo enviar el comentario', tone: 'danger' }),
    },
  );
  setBody('');
};
```

Cambia a:
```ts
const handleSend = () => {
  const trimmed = body.trim();
  if (!trimmed || !postId) return;
  const sent = body;
  setBody('');
  addComment.mutate(
    { postId, body: trimmed },
    {
      onError: (err) => {
        // Restaura lo que el usuario escribió para que pueda reintentar
        // sin volver a tipear todo.
        setBody(sent);
        toast.show({ message: err?.message ?? 'No se pudo enviar el comentario', tone: 'danger' });
      },
    },
  );
};
```

NO cambies nada más en el archivo. NO modifiques `useAddComment` (la lógica de optimistic ya está bien en el hook).

### Verificación esperada

1. `(tabs)/_layout.tsx`: 4 tabs (Feed, Hoy, Rutinas, Perfil). `train.tsx` no existe.
2. `npx tsc --noEmit` limpio en `app/(tabs)/index.tsx` sin los casts (o con UN solo comentario justificado).
3. En la app: enviar un comentario con red caída → el texto se restaura en el input, toast rojo aparece.
4. `grep -n "as unknown as Href" app/` → idealmente cero hits. Máximo uno bien documentado.

### NO hacer

- No mover archivos.
- No añadir `useMemo`/`useCallback` nuevos.
- No tocar `FeedItem.tsx`, `FeedSkeleton.tsx`, `FeedEmptyState.tsx`.
- No tocar `publish.tsx` ni `discover.tsx` ni `profile/[username].tsx`.
- No tocar los hooks de `src/lib/queries/feed.ts`.

---

## AGENTE BACKEND

Nada. Confirma con "OK, sin cambios".

## AGENTE DB

Nada. Confirma con "OK, sin cambios".

---

## REGLAS GLOBALES

- Cero `any` nuevos. Cero `as any` nuevos.
- Cero `useMemo` / `useCallback` / `React.memo` nuevos.
- Cero archivos nuevos. (Sí archivos BORRADOS — solo `train.tsx`.)
- Cero dependencias nuevas.
- Si un Edit falla porque el archivo no coincide, NO inventes — para y reporta.
- Entrega: diff por archivo + `npx tsc --noEmit` debe pasar.
