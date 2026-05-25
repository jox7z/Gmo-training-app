# Gmo Training App — Prompts para agentes

> Catálogo de prompts para los 3 agentes (Supabase / Backend / Frontend) + el Revisor.
> Estado y bitácora de avance: ver [CHECKLIST.md](CHECKLIST.md).
>
> **Reglas de oro:**
> - Supabase → solo SQL en `supabase/`, NUNCA toca código TS
> - Backend → solo `src/lib/`, NUNCA toca JSX
> - Frontend → solo `app/` + `src/components/`, NUNCA llama `supabase.*` directo
>
> **Orden por feature:** Supabase → Backend → Frontend → Revisor.

---

## Índice

- ✅ Aplicados (referencia histórica)
  - Prompt 1 — Score de optimización
  - Prompts A–G — Cableado, safe area, iconos, FAB coach, etc.
  - Prompts SB1 / BE1 / FE1 — Flujo de registro v1
  - Prompts SB2 / BE2 / FE2 — Feed social v1 (logros mínimos)
- 🚧 Próximos
  - **SIMPL-1A** y **SIMPL-1B** — Simplificar registro a email+password
  - **SOCIAL-V2 SB3** — Schema feed LinkedIn (comments, photos, share)
  - **SOCIAL-V2 BE3** — Repos y hooks
  - **SOCIAL-V2 FE3** — UI de feed
- 🦴 Revisor caveman

---

# 🚧 PRÓXIMOS PROMPTS (aplicar en orden)

## SIMPL-1A — Agente Supabase: ajuste mínimo al trigger

```
Crea supabase/migrations/0004_signup_email_only.sql.

El nuevo flujo de signup solo pasa email + password (sin display_name
ni username en el metadata). El trigger handle_new_user debe seguir
funcionando — verifica que la versión actual (en 0003_signup_hardening.sql)
NO falle si raw_user_meta_data está vacío:

- v_username debe caer al fallback "user_<short_id>" cuando metadata
  no tenga username (ya lo hace ✅, solo verificar)
- v_display debe caer a "Atleta" cuando no haya display_name
  (ya lo hace ✅, solo verificar)

Si todo está OK, este archivo solo necesita un comentario explicando
que el trigger ya es compatible con signup email-only. No hace falta
re-crear el trigger.

Además, añade una función helper:

create or replace function public.is_profile_complete(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = uid
      and username !~ '^user_[a-f0-9]{15}$'  -- no es el temporal del trigger
      and weight_kg is not null
      and height_cm is not null
  );
$$;

grant execute on function public.is_profile_complete(uuid) to authenticated;

Esta RPC la usa el cliente para decidir si forzar onboarding al
abrir la app.

Entregable: el archivo SQL listo para aplicar en SQL Editor.
```

---

## SIMPL-1B — Backend + Frontend: registro email-only + force-onboarding

```
Cambios coordinados en src/lib/auth/ y app/auth/ + app/_layout.tsx.

1. BACKEND — src/lib/auth/index.ts

   - signUp({ email, password }): quita el parámetro displayName.
     El call a supabase.auth.signUp ya no necesita options.data.
   - Añade isProfileComplete(userId: string): Promise<boolean> que
     llama supabase.rpc('is_profile_complete', { uid: userId }).
     Si error, retorna false (asumir incompleto = mandar a onboarding).

2. FRONTEND — app/auth/signup.tsx

   Reduce el formulario a solo:
   - Email
   - Contraseña
   - Confirmar contraseña
   - Checkbox de términos
   - Botón "Crear cuenta"

   Quita: campo Nombre, campo Usuario, PasswordChecklist (deja solo
   el PasswordStrengthMeter), auto-suggest de username, todo el
   useEffect de username. Mantén validación de email + fuerza de
   password. PasswordInput sigue.

   La llamada queda: await signUp({ email, password });

   Tras éxito, si needsEmailConfirmation → /auth/check-email,
   sino → /onboarding (la lógica de redirect ya está, no la dupliques
   manualmente — el _layout decide).

3. FRONTEND — app/_layout.tsx (redirect logic)

   En el useEffect de redirect centralizado, ANTES de mandar a /(tabs)
   en CASE 4 (signed in + onboarded), añade un chequeo extra:

   - Si hay sesión Y onboarded=true en store local PERO
     isProfileComplete(userId) devuelve false → forzar /onboarding.
   - Esto cubre el caso "registró cuenta, cerró app, volvió a abrirla
     sin terminar onboarding".

   Cachea el resultado de isProfileComplete en el sessionStore para
   no llamar al RPC en cada cambio de segmento — recálculo solo en
   SIGNED_IN o cuando el perfil se actualiza.

4. FRONTEND — app/onboarding.tsx

   Verifica que el primer paso ("welcome") pida explícitamente:
   - Nombre completo (display name)
   - Username (con validación contra check_username_available, debounced)
   - El resto de pasos sigue igual

   Al finalizar, completeSignup() ya guarda todo. Sin cambios ahí.

NO toques: schema BD, capa de repos, otras pantallas.
Entregable: signup simplificado, redirect que fuerza onboarding
si perfil incompleto, onboarding pide nombre + username.
```

---

## SOCIAL-V2 SB3 — Agente Supabase: feed con comentarios, fotos y share

```
Crea supabase/migrations/0005_social_feed_v2.sql.
Este archivo extiende el modelo del feed (que en v1 era solo logros
mínimos) a uno tipo LinkedIn: posts con foto + texto libre,
comentarios, conteo de shares, mejor visibilidad pública.

1. EXTENDER LA TABLA posts (creada en 0004_social_feed.sql)

   Si 0004_social_feed.sql NO existe todavía (depende de si SOCIAL v1
   se aplicó), créala primero con la estructura base:

   create table public.posts (
     id           uuid primary key default gen_random_uuid(),
     user_id      uuid not null references auth.users on delete cascade,
     type         text not null check (type in
                    ('workout','pr','rank_up','streak','achievement','manual')),
     ref_id       uuid,
     title        text,
     subtitle     text,
     caption      text,
     photo_url    text,
     share_count  int  not null default 0,
     metadata     jsonb not null default '{}'::jsonb,
     created_at   timestamptz not null default now()
   );

   Si YA existe, añade columnas:
   alter table public.posts add column if not exists photo_url   text;
   alter table public.posts add column if not exists share_count int not null default 0;
   alter table public.posts drop constraint if exists posts_type_check;
   alter table public.posts add constraint posts_type_check
     check (type in ('workout','pr','rank_up','streak','achievement','manual'));

2. NUEVA TABLA post_comments

   create table public.post_comments (
     id          uuid primary key default gen_random_uuid(),
     post_id     uuid not null references public.posts on delete cascade,
     user_id     uuid not null references auth.users on delete cascade,
     body        text not null check (length(trim(body)) between 1 and 500),
     created_at  timestamptz not null default now()
   );
   create index post_comments_post_idx on post_comments (post_id, created_at);

3. POLÍTICAS RLS

   posts:
     SELECT — authenticated puede leer todo (feed público entre usuarios)
     INSERT — solo si user_id = auth.uid()
     UPDATE — solo share_count vía RPC (resto bloqueado)
     DELETE — solo si user_id = auth.uid()

   post_comments:
     SELECT — authenticated
     INSERT — solo si user_id = auth.uid()
     UPDATE — bloqueado (comentarios inmutables)
     DELETE — si user_id = auth.uid() OR si eres dueño del post
              (un user puede borrar comentarios en sus posts)

4. STORAGE — bucket post-photos

   - Crear bucket post-photos (privado por defecto pero con signed URLs)
   - Política RLS storage: INSERT solo si auth.uid() es prefijo del path
     (ej: post-photos/{auth.uid()}/{filename})
   - Política SELECT: authenticated puede leer (firmamos URLs en cliente)

5. RPCs nuevas o actualizadas

   a) publish_manual_post(caption text, photo_url text) returns uuid
      - Inserta post type='manual' con caption + photo_url opcional
      - Devuelve post.id

   b) add_comment(post_id uuid, body text) returns uuid
      - Valida que el post existe
      - Inserta y devuelve el id del comentario

   c) delete_comment(comment_id uuid) returns void
      - Valida que auth.uid() es el autor del comentario O el dueño del post

   d) list_comments(post_id uuid, lim int default 50) returns table(...)
      - Devuelve comentarios con join a profiles (display_name, username,
        current_rank), ordenados por created_at asc

   e) increment_share(post_id uuid) returns int
      - Hace update posts set share_count = share_count + 1 where id = post_id
      - Devuelve el nuevo conteo
      - No requiere ser dueño (cualquiera puede compartir y suma el contador)

   f) feed_for_user(cursor_ts timestamptz default null, lim int default 20)
      - Si ya existe, ACTUALÍZALA para incluir:
        · photo_url
        · share_count
        · comment_count (subquery a post_comments)
      - Sigue devolviendo posts de quienes sigues + propios

   Todas con grant execute to authenticated.

6. TRIGGERS automáticos (ya pensados, verifica que sigan):
   - rank_history insert → post type='rank_up'
   - streaks.current_weeks múltiplo de 4 → post type='streak'

   Si no existían, créalos respetando profiles.auto_publish_achievements.

Entregable: archivo SQL listo. Si 0004_social_feed.sql ya existía
con tablas viejas, el archivo nuevo debe ser idempotente (alter table
add column if not exists, etc).
```

---

## SOCIAL-V2 BE3 — Agente Backend: repos para feed v2

```
Extiende src/lib/repos/posts.ts y src/lib/repos/social.ts con la
nueva funcionalidad. NO toques JSX.

1. src/lib/repos/posts.ts — añadir/actualizar tipos

   export interface Post {
     id: string;
     userId: string;
     user: { displayName: string; username: string; currentRank: RankId };
     type: 'workout' | 'pr' | 'rank_up' | 'streak' | 'achievement' | 'manual';
     refId?: string;
     title?: string;
     subtitle?: string;
     caption?: string;
     photoUrl?: string;
     shareCount: number;
     commentCount: number;
     metadata: Record<string, any>;
     createdAt: string;
     reactions: { fire: number; muscle: number; clap: number };
     myReactions: { fire: boolean; muscle: boolean; clap: boolean };
   }

   export interface Comment {
     id: string;
     postId: string;
     userId: string;
     user: { displayName: string; username: string; currentRank: RankId };
     body: string;
     createdAt: string;
   }

2. Funciones nuevas en posts.ts

   - publishManualPost(caption: string, photoUrl?: string): Promise<string>
     → rpc('publish_manual_post', { caption, photo_url: photoUrl ?? null })

   - listComments(postId: string): Promise<Comment[]>
     → rpc('list_comments', { post_id: postId, lim: 50 })

   - addComment(postId: string, body: string): Promise<string>
     → rpc('add_comment', { post_id: postId, body }), devuelve id

   - deleteComment(commentId: string): Promise<void>

   - incrementShare(postId: string): Promise<number>
     → rpc('increment_share', { post_id: postId })

   - Asegúrate que listFeed() mapee photo_url, share_count, comment_count
     a los campos camelCase del tipo Post.

3. NUEVO: src/lib/storage/photos.ts

   - uploadPostPhoto(userId: string, fileUri: string): Promise<string>
     · Sube el archivo a Supabase Storage bucket 'post-photos'
       en path: `${userId}/${timestamp}-${random}.jpg`
     · Devuelve la URL pública (o signed si bucket es privado)
     · Usa expo-image-picker en el caller, esta función solo recibe el URI
       local y se encarga del upload

   - getPostPhotoUrl(path: string): Promise<string>
     · Si bucket privado, devuelve signed URL (1h)
     · Si público, devuelve URL directa

4. React Query hooks en src/lib/queries/feed.ts

   - useFeed() — useInfiniteQuery (ya existe en v1, refresca tipo Post)
   - useComments(postId) — useQuery, queryKey ['comments', postId]
   - useAddComment() — mutation con optimistic update sobre useComments
   - useDeleteComment() — mutation con optimistic
   - usePublishManualPost() — mutation, invalida ['feed']
   - useIncrementShare() — mutation, actualiza share_count en el cache

5. NO consumir Supabase directo desde JSX — todo via estos hooks.
   NO uses any en los retornos de RPCs — define tipos explícitos.

Entregable: archivos actualizados + npm run typecheck limpio.
```

---

## SOCIAL-V2 FE3 — Agente Frontend: UI estilo LinkedIn

```
Rediseña la sección del Feed completa para que se sienta como LinkedIn
o Strava social, no como un timeline mínimo. Solo consumes los hooks
de src/lib/queries/feed.ts — NO llames supabase directo.

1. PANTALLA app/(tabs)/index.tsx (Home = feed)

   Layout vertical:
   - Header sticky con saludo + CoachFab arriba-izquierda
   - Composer card en el tope:
     "¿Qué lograste hoy?" + íconos para:
       · 📷 Foto (abre image picker)
       · 💪 Compartir último workout (si hay <24h)
       · ✨ Compartir PR (modal con form)
     Al pulsar abre app/publish.tsx (modal full screen)
   - FlashList virtualizada de FeedItem
   - Empty state: "Sigue atletas para llenar tu feed →" → /discover

2. COMPONENTE src/components/feed/FeedItem.tsx

   Card grande, alto generoso, jerarquía clara:

   HEADER (tap → abre perfil del autor):
   - Avatar 44px (inicial del nombre con borde del color del rango)
   - Display name + badge rango
   - "@username · hace 3h"
   - Botón "..." arriba derecha (solo si es post propio → menú "Eliminar")

   BODY según type:
   - manual → caption + foto si existe (full width, aspect ratio 4:5 max)
   - workout → card con ícono dumbbell + título + chips de ejercicios
   - pr → trophy con glow + ejercicio en grande + peso×reps grande
   - rank_up → gradient del color del rango nuevo + "Subió a {rango}"
   - streak → fire con animación + "X semanas seguidas"
   - achievement → target + nombre del badge

   FOOTER ACTIONS (row horizontal):
   - 🔥 Fire {count} — pulsa toggle, optimistic
   - 💪 Muscle {count}
   - 👏 Clap {count}
   - 💬 Coment. {count} — pulsa abre bottom sheet con comentarios
   - ↗ Compartir — pulsa abre Share sheet nativo, llama incrementShare

   Long-press sobre post propio → confirmar y borrar.

3. COMPONENTE src/components/feed/CommentSheet.tsx

   Bottom sheet modal (usa react-native-gesture-handler ya instalado):
   - Header: "Comentarios" + botón cerrar
   - Lista de comentarios (useComments(postId)):
     · Avatar pequeño + nombre + badge rango
     · Body del comentario
     · "hace Xm" + botón borrar (si es propio o eres dueño del post)
   - Footer sticky con TextInput + botón enviar (useAddComment)
   - KeyboardAvoidingView para que el input quede sobre el teclado
   - Optimistic: el comentario aparece arriba al instante

4. PANTALLA app/publish.tsx (modal)

   Form para crear post manual:
   - Avatar + nombre del usuario arriba (preview de cómo se verá)
   - TextArea grande "¿Qué lograste hoy?" (max 500 chars, contador)
   - Botón ➕ adjuntar foto (abre expo-image-picker)
   - Preview de la foto con botón "Quitar"
   - Footer sticky: botón "Publicar" (deshabilitado si vacío)
   - Al éxito → cierra modal, invalida feed, vuelve a Home

   Upload flow:
   - Usuario elige foto local
   - Al pulsar Publicar:
     1. uploadPostPhoto(userId, uri) → devuelve URL
     2. publishManualPost(caption, photoUrl)
     3. Cierra modal, optimistic insert al cache de useFeed

5. PANTALLA app/discover.tsx (sin cambios respecto a v1 — déjala si existe)
   Si no existe, créala: lista de useDiscover() con botón Seguir.

6. PANTALLA app/profile/[username].tsx (perfil público de OTRO usuario)

   - Header con avatar, nombre, badge rango, racha
   - Stats: workouts totales, seguidores, siguiendo
   - Botón Seguir / Dejar de seguir (useFollow / useUnfollow)
   - Grid de posts del usuario (query parametrizada por user_id)
   - Tap en post → abrir detalle (opcional v2, por ahora solo el grid)

7. ROUTING — app/_layout.tsx

   Añade Stack.Screen para:
   - 'publish' (presentation: modal, animation: slide_from_bottom)
   - 'discover' (slide_from_right)
   - 'profile/[username]' (slide_from_right)

   Añade 'publish' y 'discover' y 'profile' a inAllowedAuthedRoute.

8. UX no negociables

   - Pull-to-refresh en el feed
   - Skeleton loaders mientras carga primera página
   - Optimistic updates en: reacciones, comentarios, share
   - Si una mutation falla, revertir Y mostrar toast inferior
   - Long-press para borrar requiere confirmación
   - Share sheet usa la API nativa (Share.share de react-native)

9. ARCHIVOS A QUITAR

   - El "feed v1" estaba en (tabs)/feed.tsx con MOCK_FEED. Esa tab
     deja de existir — el feed pasa a Home (index.tsx). Quita
     'feed' del Tabs en (tabs)/_layout.tsx y borra app/(tabs)/feed.tsx.
   - Mueve el contenido viejo de Home (anillo de racha, "Hoy toca",
     stats) a una pestaña nueva (tabs)/today.tsx o intégralo como
     header colapsable arriba del feed. NO LO PIERDAS.
   - src/data/mockSocial.ts → bórralo (ya no se usa).

NO toques: capa src/lib/, schema BD, otras pantallas no listadas.

Entregable:
- Home funcionando como feed real con datos de Supabase
- Composer + creación de post con foto
- Comments sheet
- Share funcional
- Perfiles públicos de otros usuarios
- Screenshots de cada estado (vacío, cargando, con posts)
```

---

# 🦴 REVISOR CAVEMAN (read-only, después de cada sprint)

## Prompt de sistema

```
Eres un revisor de código senior con filosofía CAVEMAN: código
simple, lineal, directo. Tu trabajo NO es construir, es decir qué
está mal y qué sobra. Hablas en español, sin diplomacia, sin
preámbulos.

PRINCIPIOS QUE DEFIENDES

1. Código que se lee de arriba abajo > código "elegante" con
   indirección. Una función de 80 líneas lineal es MEJOR que
   8 funciones de 10 líneas que saltan entre archivos.

2. Duplicación < abstracción equivocada. Si dos cosas se parecen
   pero pueden divergir, NO las unifiques.

3. Sin patrones de diseño "por si acaso". Sin factories, sin
   wrappers, sin "service classes". Si no resuelve un problema
   HOY, fuera.

4. TypeScript: tipos explícitos en límites de módulo. Inferencia
   adentro. NADA de genéricos con 4 parámetros, NADA de
   "DeepPartial<Omit<T, K> & { ... }>". Si necesitas eso, el
   diseño está mal.

5. Comentarios: solo explican PORQUÉ, nunca QUÉ. Si necesitas
   comentar el qué, renombra la variable.

6. Estados: una sola fuente de verdad por dato. Si veo lo mismo
   en 2 stores, marcas el bug.

7. Errores: o se manejan visiblemente o se propagan. NUNCA un
   catch vacío. NUNCA un catch que solo console.log.

8. Async: una función o es async o no es. NADA de mezclar .then
   con await en el mismo bloque.

9. Performance no especulativa. Sin useMemo/useCallback salvo
   que tengas un bug medido. Sin React.memo "por si acaso".

10. Dependencias: cada paquete nuevo cuesta. Si la lib hace algo
    que se resuelve en 20 líneas, esas 20 líneas ganan.

QUÉ REVISAS (en este orden de prioridad)

1. BUGS reales (lógica rota, race conditions, errores tragados,
   memory leaks, RLS por saltar)
2. ARQUITECTURA rota (frontend llamando supabase.* directo,
   backend importando JSX, store mutado fuera del store)
3. SOBRE-INGENIERÍA (abstracciones de un solo uso, wrappers
   inútiles, capas que no aportan)
4. DUPLICACIÓN no intencional (mismo código pegado en 3 sitios)
5. INCONSISTENCIAS (emojis sueltos cuando hay Icon component,
   estilos inline cuando hay tokens, fetch directo cuando hay
   queries)
6. PERFORMANCE obvio (loops anidados sobre toda la BD, renders
   en cascada, listas largas sin virtualizar)
7. TYPESCRIPT laxo (any, as any, ts-ignore, tipos perdidos)

FORMATO DE SALIDA — siempre así, sin excepción

## 🩸 Sangrado crítico
- archivo:línea — qué está mal en 1 frase — qué hacer en 1 frase

## ⚠️ Cosas raras
- archivo:línea — explica brevemente — sugerencia

## 🗑️ Quemar / borrar
- archivo o función — por qué sobra

## ✅ Bien hecho
- 2-3 cosas que están sólidas (para no desmoralizar al equipo)

REGLAS DE CONDUCTA

- NO escribes código de fix. Solo señalas y describes el cambio
  en 1 línea. El equipo lo aplica.
- NO inventas archivos ni líneas. Si dudas del path, di "verificar
  en src/lib/X".
- NO repites el problema con 5 sinónimos. Una vez basta.
- NO usas frases como "considera", "tal vez", "podría ser bueno".
  Usa imperativos: "borra", "renombra", "muévelo".
- Si una sección está vacía (ej. nada crítico), pon "(nada)".
- Máximo 30 hallazgos por revisión.
- Solo herramientas de lectura (read/grep/glob). NUNCA Edit ni Write.
```

## Cómo invocarlo después de cada sprint

```
Revisión caveman de los últimos cambios. Mira:
- todos los archivos modificados/nuevos en git status
- foco en: [poner aquí el área del sprint, ej "feed v2 LinkedIn"]
- ignora node_modules, supabase/migrations y assets

Aplica el formato de salida estándar. Sin diplomacia.
```

---

# ✅ PROMPTS APLICADOS (referencia histórica)

> Estos prompts ya se ejecutaron. Se dejan archivados para entender
> decisiones pasadas o repetirlos en caso de regresión.

## Prompt 1 — Score de optimización del entreno

Creó `src/lib/optimizationScore.ts` con 5 métricas (frequency,
volumeBalance, recovery, progression, variety) y card visible
inicialmente en Home (después movida a Routines en Prompt D).

## Prompt A — Cableado real a Supabase

Conectó `src/lib/repos/` (workouts, profile, routines) a las
pantallas: workout/active llama saveWorkout, onboarding llama
upsertProfile (luego sustituido por completeSignup RPC), routines
llama saveRoutine/deleteRoutineRemote, login llama getProfile.

## Prompt B — Safe area en iPhone

Aplicó useSafeAreaInsets en headers de workout/active y coach
para evitar overlap con notch/dynamic island.

## Prompt C — Quitar emojis y usar Icon

Sustituyó emojis sueltos en JSX por `<Icon>` SVG custom
(`src/components/Icon.tsx`).

## Prompt D — Score de optimización movido a Routines

Score salió de Home y entró a la pestaña Routines, junto a
la card de rutina activa.

## Prompt E — Workout interactivo estilo Strava

Rediseñó `app/workout/active.tsx` a flujo guiado set-by-set con
cronómetro de descanso automático. Eliminó la métrica de volumen
en kg de toda la UI (se sigue guardando en BD pero no se muestra).

## Prompt F — Sugerencia automática del día + anti-spam

`canStartWorkout()` bloquea iniciar workouts si ya hay 2 ese día
o si pasaron <3h desde el último. Home sugiere ejercicio según
día de la semana.

## Prompt G — CoachFab arriba-izquierda

`src/components/CoachFab.tsx` montado una vez en `(tabs)/_layout.tsx`
para aparecer en todas las tabs. Se quitó el botón duplicado del
header de Home y el "Hablar con el Coach IA" de Profile.

## Prompts SB1 / BE1 / FE1 — Flujo de registro v1

- **SB1** — Migration 0003_signup_hardening.sql: trigger
  handle_new_user, RPCs check_username_available y complete_signup,
  constraints, RLS confirmadas.
- **BE1** — Capa `src/lib/auth/` con AuthError tipado, signUp,
  signIn, signOut, completeSignup (usa RPC), checkUsernameAvailable
  (usa RPC), session hook con onAuthStateChange.
- **FE1** — Pantallas login, signup, forgot-password, check-email,
  reset-password. PasswordStrengthMeter, PasswordChecklist,
  PasswordInput, OAuthButtons placeholder.

## Prompts SB2 / BE2 / FE2 — Feed social v1 (logros mínimos)

Versión mínima del feed con posts de logros (workout, pr, rank_up,
streak, achievement), reacciones, follow, sin comentarios ni fotos
ni share. **Reemplazado por SOCIAL-V2** (este documento).
