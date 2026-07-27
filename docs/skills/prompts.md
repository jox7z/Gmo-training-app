# Prompts activos

> Al terminar un sprint, se borran de este archivo y se marca el progreso en
> `docs/memory/checklist.md`.
>
> **Orden:** ejecutar en orden numérico de sprint. Dentro de cada
> sprint, respetar Supabase → Backend → Frontend → Revisor.

---

## SPRINT 4.1 — Bugfixes post-S4

Sprint 4 completado. Estos 4 bugs quedaron sin cerrar.
NO hay cambios de schema (no se necesita migración).

---

### SP4.1-BE → Agente Backend

```
Corrige 3 bugs en src/lib/queries/social.ts y src/lib/repos/social.ts.
NO toques JSX ni schema BD.

1. BUG-1 — invalidar ['search','users',...] en follow/unfollow

   Archivo: src/lib/queries/social.ts
   En useFollow → onSettled añade:
     qc.invalidateQueries({ queryKey: ['search', 'users'] });

   En useUnfollow → onSettled añade lo mismo.

   Nota: `invalidateQueries({ queryKey: ['search','users'] })` usa
   prefix match en TanStack Query v5 — invalida todas las variantes
   ['search','users',<normalizedQuery>] de golpe.

2. BUG-2 — rankPoints en list_followers / list_following

   El RPC list_followers / list_following (0010) no devuelve rank_points.
   Dos opciones (elige la más limpia):

   Opción A (SQL) — añade rank_points al SELECT en ambas funciones
   en una nueva migración 0011_follow_rank_points.sql:
     p.rank_points

   Opción B (TS) — acepta que rankPoints = 0 y en toFollowProfile
   documenta que es "no disponible sin cambio de RPC".

   Usa la Opción A. Crea supabase/migrations/0011_follow_rank_points.sql:

   create or replace function public.list_followers(target_user_id uuid)
   returns table (
     id           uuid,
     username     text,
     display_name text,
     current_rank text,
     rank_points  int,
     is_following boolean
   )
   language sql security definer set search_path = public stable
   as $$
     select
       p.id, p.username, p.display_name, p.current_rank,
       coalesce(p.rank_points, 0)::int,
       exists (
         select 1 from public.follows f
         where f.follower_id = auth.uid() and f.following_id = p.id
       ) as is_following
     from public.follows fl
     join public.profiles p on p.id = fl.follower_id
     where fl.following_id = target_user_id
     order by fl.created_at desc;
   $$;
   grant execute on function public.list_followers(uuid) to authenticated;

   -- Misma estructura para list_following (follower_id/following_id invertidos).
   -- Ver migración 0010 como referencia del shape completo.

   Actualiza DbFollowRow en repos/social.ts para incluir rank_points:
     rank_points: number;
   Y mapea en toFollowProfile:
     rankPoints: row.rank_points ?? 0,

3. Typecheck limpio tras los cambios.

Entregable:
- social.ts invalidaciones actualizadas
- 0011_follow_rank_points.sql (si va Opción A)
- repos/social.ts DbFollowRow actualizado
- npm run typecheck 0 errores
```

---

### SP4.1-FE → Agente Frontend

```
Corrige 2 bugs de UI. NO toques src/lib/ ni schema BD.

1. BUG-3 — propio perfil muestra "Perfil no encontrado"

   Archivo: app/profile/[username].tsx

   search_users excluye al auth.uid(), por eso el propio usuario
   no aparece en resultados. Solución: si el username buscado
   coincide con el del usuario autenticado (me?.username), usar
   me.id directamente sin esperar a searchQuery.

   En la resolución de targetUserId:
   const isSelf = !!me && me.username.toLowerCase() === username;
   const targetUserId = isSelf
     ? me.id
     : (searchQuery.data ?? []).find((u) => u.username.toLowerCase() === username)?.id;

   Cuando isSelf=true, no mostrar el botón Seguir/Dejar de seguir
   (ya existe la lógica `!isSelf` — solo verifica que funcione con
   la nueva derivación de targetUserId).

   También bloquea searchQuery cuando isSelf para no hacer el RPC:
   useSearchUsers(isSelf ? '' : username)
   (query vacía → enabled=false ya que length < 2)

2. BUG-4 — N+1 queries en ConnectionRow

   Archivo: app/profile/connections.tsx

   Cada fila llama useIsFollowing(user.id) = una query por fila.
   El fix correcto: la RPC list_followers/list_following ya devuelve
   is_following (relativo al auth.uid()). Úsalo directamente:

   - En ConnectionRow, elimina useIsFollowing(user.id)
   - Usa user.isFollowing (ya disponible en FollowProfile)
   - El estado "siguiendo" puede quedar optimista tras follow/unfollow
     porque useFollow/useUnfollow ahora invalidan ['followers',...] y
     ['following',...] en onSettled → la lista se refresca sola.

   Ajusta handleToggle para usar user.isFollowing en vez del hook.

Entregable:
- profile/[username].tsx: propio perfil visible sin "no encontrado"
- connections.tsx: sin useIsFollowing por fila
- npm run typecheck 0 errores
```

---

## SPRINT 4.2 — Polish de red social

Objetivo macro: que la app **se sienta como Instagram/Strava social**,
no como un formulario con BD detrás. Los detalles que faltan:

1. Botones Seguir/Siguiendo no cambian visualmente al pulsar
   (no hay feedback inmediato, el usuario duda si funcionó)
2. No se puede deslizar horizontalmente entre tabs
3. Las 3 reacciones (🔥 💪 👏) son demasiado y confusas — reducir a 2
   con identidad clara: **bíceps** (apoyo gym) y **corazón** (me gusta general)
4. Falta feedback háptico y micro-animaciones en interacciones clave

---

### SP4.2-SB → Agente Supabase

```
CONTEXTO UX

En una red social las reacciones tienen significado emocional claro.
3 opciones (fire/muscle/clap) diluyen la intención. Reducimos a 2:
- 'muscle' (bíceps) → apoyo gym, "buen entreno bro"
- 'heart'  (corazón) → me gusta general, agnóstico al contenido

Esto requiere migrar el constraint de post_reactions y consolidar
los registros viejos (fire+clap se mapean a heart, muscle se queda).

---

CAMBIOS

Crea supabase/migrations/0012_reactions_to_two_types.sql.

1. Migra datos existentes ANTES de cambiar el constraint:

   -- fire y clap se convierten a heart; muscle queda igual
   update public.post_reactions
      set type = 'heart'
    where type in ('fire', 'clap');

   -- Borra duplicados que la migración podría haber creado
   -- (un user que había puesto fire Y heart al mismo post)
   delete from public.post_reactions a
    using public.post_reactions b
    where a.post_id = b.post_id
      and a.user_id = b.user_id
      and a.type    = b.type
      and a.ctid    < b.ctid;

2. Cambia el CHECK constraint:

   alter table public.post_reactions
     drop constraint if exists post_reactions_type_check;
   alter table public.post_reactions
     add  constraint post_reactions_type_check
          check (type in ('muscle', 'heart'));

3. Actualiza cualquier RPC que retorne conteos de reacciones
   (feed_for_user, list_user_posts) para devolver solo:
   {
     "muscle": int,
     "heart":  int
   }

   Y my_reactions:
   {
     "muscle": bool,
     "heart":  bool
   }

   Quita TODOS los references a fire y clap en los SELECT.

4. NO hace falta tocar toggle_reaction — sigue funcionando porque
   recibe el type como parámetro y el CHECK lo valida.

Entregable: archivo SQL idempotente. Documenta al final que el
Backend debe actualizar tipos PostType.reactions y la UI debe
quitar el botón fire/clap.
```

---

### SP4.2-BE → Agente Backend

```
CONTEXTO UX

Hay 2 problemas de fondo:

1. El botón Seguir no da feedback visual al pulsarlo. Los usuarios
   pulsan, no ven cambio, vuelven a pulsar (double-tap = unfollow
   inmediato). En redes sociales el botón cambia al estado opuesto
   ANTES de que el servidor responda — esto se llama "optimistic
   update". Si el servidor falla, se revierte.

2. Las 3 reacciones (fire/muscle/clap) se reducen a 2 (muscle/heart).
   Hay que ajustar tipos y mutaciones.

---

CAMBIOS

NO toques JSX. Solo src/lib/.

1. REACTIONS — actualizar tipos en src/lib/repos/posts.ts

   export type ReactionType = 'muscle' | 'heart';

   En el interface Post:
     reactions:   { muscle: number; heart: number };
     myReactions: { muscle: boolean; heart: boolean };

   Quita fire y clap de TODO. Busca con grep en src/lib/.

2. REACTIONS — actualizar toggleReaction y queries

   toggleReaction(postId, type: ReactionType) sigue igual de signature.
   useToggleReaction debe hacer optimistic update sobre el cache de
   useFeed:
   - Antes de la mutación: invierte myReactions[type] y suma/resta 1
     a reactions[type] en el cache
   - Si la mutación falla: revierte
   - Al éxito: invalida ['feed'] para confirmar

   Esto da el "tap → contador cambia al instante" de Instagram.

3. FOLLOW — asegurar optimistic update visible en useFollow/useUnfollow

   El bug visual del botón Seguir es porque el componente lee de un
   estado que tarda en cambiar. Refuerza el flujo en
   src/lib/queries/social.ts:

   useFollow(targetId):
     onMutate: async () => {
       await qc.cancelQueries({ queryKey: ['isFollowing', targetId] });
       const previous = qc.getQueryData(['isFollowing', targetId]);
       qc.setQueryData(['isFollowing', targetId], true);
       // También bumpea contadores optimista en cache de profileCounters
       qc.setQueryData(['profileCounters', targetId], (old: any) =>
         old ? { ...old, followers: old.followers + 1 } : old);
       return { previous };
     },
     onError: (_err, _vars, ctx) => {
       qc.setQueryData(['isFollowing', targetId], ctx?.previous);
       qc.invalidateQueries({ queryKey: ['profileCounters', targetId] });
     },
     onSettled: () => {
       qc.invalidateQueries({ queryKey: ['isFollowing', targetId] });
       qc.invalidateQueries({ queryKey: ['profileCounters'] });
       qc.invalidateQueries({ queryKey: ['followers'] });
       qc.invalidateQueries({ queryKey: ['following'] });
       qc.invalidateQueries({ queryKey: ['search', 'users'] });
     }

   useUnfollow → análogo pero invierte el delta a -1 y false.

   NOTA: SP4.1-FE eliminó useIsFollowing por fila a favor de
   user.isFollowing del row. Para conectar el optimistic en
   connections.tsx, useFollow/useUnfollow deben ALSO actualizar el
   cache de useFollowers/useFollowing:

   onMutate adicional:
     qc.setQueriesData({ queryKey: ['followers'] }, (old: any) => ...)
     qc.setQueriesData({ queryKey: ['following'] }, (old: any) => ...)
     // mapeando para cambiar isFollowing del row con id===targetId

4. NO crear nuevas dependencias. Todo va con TanStack Query v5
   ya instalado.

Entregable:
- Tipos actualizados (sin fire, sin clap)
- Optimistic updates en toggleReaction, follow, unfollow
- npm run typecheck 0 errores
- Documentar en el resumen QUÉ hooks devuelven datos con shape nuevo
  (para que FE no se rompa)
```

---

### SP4.2-FE → Agente Frontend

```
CONTEXTO UX

La app debe sentirse como una red social en TRES dimensiones:

A) NAVEGACIÓN FLUIDA — el usuario debe poder cambiar de pestaña
   con un gesto, no solo tocando. Instagram, Twitter, Strava: todas
   permiten swipe horizontal entre tabs principales. Hoy expo-router
   Tabs no lo hace por defecto — hay que envolver con PagerView.

B) FEEDBACK INMEDIATO — cada acción debe responder visualmente en
   <100ms aunque el servidor tarde 500ms. El usuario nunca debe
   dudar si "el tap registró".
   - Botón Seguir: cambia a "Siguiendo" al instante (color, label)
   - Reacción: ícono cambia de outline a relleno, contador +1
   - Cualquier acción importante: vibración háptica suave

C) IDENTIDAD VISUAL DE REACCIONES — 2 botones claros:
   - 💪 Bíceps (icon "muscle") → apoyo gym, color primary
   - ❤️ Corazón (icon "heart") → me gusta, color rojo brillante
   Fuera fire/clap. Menos opciones, más significado.

---

CAMBIOS

NO toques src/lib/ ni schema BD.

1. SWIPE ENTRE TABS — el cambio más visible

   Instala react-native-pager-view si falta:
     npx expo install react-native-pager-view

   En app/(tabs)/_layout.tsx, REEMPLAZA el componente Tabs por un
   layout custom:
   - Un PagerView ocupa el flex:1 superior, con 4 pages que renderizan
     manualmente los 4 screens (Feed, Routines, Progress, Profile)
   - Un tab bar inferior fijo (mismo diseño actual con BlurView) que
     muestra el índice activo
   - onPageSelected del PagerView → actualiza el índice del tab bar
   - onPress de cada tab → llama setPage del PagerView ref

   Pseudo:
     const ref = useRef<PagerView>(null);
     const [index, setIndex] = useState(0);

     <View style={{flex:1}}>
       <PagerView
         ref={ref}
         style={{flex:1}}
         initialPage={0}
         onPageSelected={(e) => setIndex(e.nativeEvent.position)}
       >
         <View key="0"><FeedScreen /></View>
         <View key="1"><RoutinesScreen /></View>
         <View key="2"><ProgressScreen /></View>
         <View key="3"><ProfileScreen /></View>
       </PagerView>
       <TabBar
         current={index}
         onChange={(i) => ref.current?.setPage(i)}
       />
     </View>

   IMPORTANTE: cada screen ahora debe importarse y montarse en
   _layout.tsx, NO como rutas separadas. Mueve la lógica de cada
   archivo de (tabs)/*.tsx a componentes en src/screens/ si quieres
   limpieza, o impórtalos directo desde app/(tabs)/index, routines,
   progress, profile.

   Pierdes el deep-linking automático de expo-router a /(tabs)/X.
   Para mantenerlo, intercepta segments en _layout y haz setPage al
   índice correspondiente. Esto es opcional pero recomendado.

   Si esto rompe la arquitectura actual de expo-router demasiado,
   alternativa más conservadora: usa Material Top Tabs de
   @react-navigation/material-top-tabs renderizadas DENTRO de un
   stack que pone el tab bar abajo. Más estable, menos custom.
   Decide según veas — explica tu elección.

2. REACCIONES — 2 botones (muscle, heart)

   En src/components/feed/FeedItem.tsx:
   - Quita el botón Fire y Clap
   - Deja solo Muscle (💪) y Heart (❤️)
   - Cada botón:
     · Ícono outline si !myReactions[type], filled si sí
     · Contador a la derecha con valor de reactions[type]
     · Color: muscle=colors.primary, heart=colors.danger
     · Tap → useToggleReaction.mutate({ postId, type })
     · Antes del mutate.call: Haptics.impactAsync(Light)
     · Scale animado 1.0 → 1.3 → 1.0 en 200ms al tap (Reanimated o
       Animated nativo, ya tienes Reanimated instalado)

   Asegúrate de que el ícono "muscle" y "heart" existen en
   src/components/Icon.tsx. Si "heart" no existe, añádelo como un
   path SVG. Para outline vs filled, dos variantes:
   <Icon name="muscle" filled={myReactions.muscle} />

   En src/components/Icon.tsx, IconName añade 'heart-outline',
   'heart-filled', 'muscle-outline', 'muscle-filled'. O un prop
   `filled: boolean` que cambie el fill del path. Lo segundo
   es más limpio.

3. BOTÓN SEGUIR/SIGUIENDO — feedback visual inmediato

   Bug actual: el botón no cambia al pulsar. Causa probable:
   - Lee de un estado que no se actualiza optimista
   - O el componente no re-renderiza porque la prop no cambia

   Tras los fixes de SP4.2-BE, useFollow ya hace optimistic. Asegura
   que el componente Button:

   - Recibe isFollowing como prop (no como hook interno)
   - Cambia label, color y borde basado en isFollowing:
     · false → label "Seguir", bg primary, texto blanco
     · true  → label "Siguiendo", bg transparent, borde + texto primary
   - onPress llama directamente la mutación; NO use loading state que
     bloquee el cambio visual (el optimistic ya cambió el cache)
   - Añade Haptics.impactAsync(Medium) al tap
   - Anima un scale 1.0 → 0.95 → 1.0 en 120ms para sentir el tap
     (Pressable con onPressIn/onPressOut + Animated.Value, o
     Reanimated useSharedValue)

   Aplica a TODOS los lugares con el botón Seguir:
   - app/profile/[username].tsx
   - app/profile/connections.tsx
   - app/discover.tsx

   Considera crear src/components/FollowButton.tsx reusable:
     <FollowButton userId={...} isFollowing={...} />
   con toda la lógica (mutation, haptics, animación) adentro.
   Si lo creas, los 3 sitios lo consumen y borras código duplicado.

4. MICRO-DETALLES ADICIONALES (rápidos, alto impacto)

   - Reactions: el tap hace scale + haptics + cambio de color juntos
   - Comments: enviar comentario → haptics Light + scroll to bottom
   - Composer publicar: éxito → haptics Success + toast "Publicado"
   - Navegación entre tabs: vibración suave al cambiar (Light)
   - Pull-to-refresh: ya debería estar, verifica que vibra al disparar

   Si Haptics no está importado: `import * as Haptics from 'expo-haptics';`
   (ya está instalado, expo-haptics ~15.0.8 según package.json).

Entregable:
- Swipe entre las 4 tabs funcional
- 2 reacciones (muscle, heart) con feedback visual y háptico
- Botón Seguir/Siguiendo cambia al instante al pulsar (verificable
  apagando WiFi: pulsa, cambia visual; al volver WiFi, mutation
  intenta y el cache se sincroniza)
- Screenshots o gif corto demostrando swipe + tap en reacción
- npm run typecheck 0 errores
```
