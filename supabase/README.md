# Supabase — Gmo Training App

## Migrations

Apply in order via the SQL Editor (or `supabase db push` if using the local CLI):

| File | What it does |
|---|---|
| `migrations/0001_init.sql` | Full schema, RLS policies, `handle_new_user` trigger, `recompute_workout_volume` trigger |
| `migrations/0002_rank_jobs.sql` | `recalc_weekly_ranks()` + `pg_cron` schedule (Mondays 06:00 UTC) |
| `migrations/0003_signup_hardening.sql` | Refines `handle_new_user`, adds `username` format check, exposes `check_username_available` + `complete_signup` RPCs |
| `migrations/0041_sync_workout_snapshot.sql` | Sincronización atómica del workout completo con ownership, validación JSONB y advisory lock por workout |
| `migrations/0042_lock_down_sync_workout_snapshot.sql` | Revoca grants automáticos de `anon`/`service_role`; conserva `EXECUTE` solo para `authenticated` |
| `migrations/0043_monotonic_workout_publication.sql` | Impide que un snapshot local stale cambie `is_published` de `true` a `false` |
| `migrations/0044_enrich_workout_post_metadata.sql` | Enriquece `publish_workout` con duración, series, reps, `kg·rep`, músculos y ejercicios reales; conserva firma y ACL |
| `migrations/0045_fix_workout_pr_history_cutoff.sql` | Limita el baseline de PR a workouts anteriores a la sesión publicada y estabiliza empates |
| `migrations/0046_fix_workout_pr_total_order.sql` | Desempata workouts con igual `started_at` mediante `coalesce(created_at, started_at)` e `id` |

Producción aplicada hasta `0046` (`20260722140530`, verificada 2026-07-22).

> **Bloqueo de ledger:** producción registra migraciones nuevas con timestamps,
> mientras este repo conserva nombres numéricos y el ledger hosted no contiene
> `0001–0028`. No ejecutar `supabase db push --include-all` ni reparar solo `0044`/`0045`/`0046`:
> podría reintentar migraciones antiguas. Primero link/autenticación CLI, auditoría
> completa del schema live y reconciliación total con `supabase migration repair`.

`0003` replaces (not duplicates) the `handle_new_user` function from `0001`. Re-running it is idempotent.

### Client-facing RPCs added in 0003

```sql
-- Pre-auth: validate availability while the user is still typing.
select check_username_available('eugene_li');         -- boolean

-- Post-signup: persist the onboarding payload onto the caller's own profile.
select complete_signup(
  'eugene_li',         -- uname
  'Eugene Li',         -- display_name
  78.5,                -- weight_kg (nullable)
  178,                 -- height_cm (nullable)
  'intermediate',      -- level: beginner | intermediate | advanced
  'hypertrophy',       -- goal:  strength | hypertrophy | fat_loss | general
  4                    -- weekly_goal_days (1..7)
);
```

Error codes raised by `complete_signup`:

| `errcode` | Meaning | Client handling |
|---|---|---|
| `28000` | not authenticated | force re-login |
| `22023` | invalid format / out of range | show field-level error |
| `23505` | username taken | suggest alternative |
| `P0002` | profile row missing | extremely rare — trigger should always create it; retry after a short delay |

---

## Dashboard settings to flip

The migrations cover the database. These are configured in the Supabase Dashboard (not in SQL):

### Authentication → Providers → Email
- **Enable email signup:** ON
- **Confirm email:**
  - **Production project:** ON
  - **Development project:** OFF (so local signups don't need a mailbox)
- **Secure email change:** ON (matches `double_confirm_changes = true` in `config.toml`)

### Authentication → Policies → Passwords
- **Minimum password length:** `8`
- **Password requirements:** at minimum *lowercase + digits* (recommended — stronger is fine)

### Authentication → Rate Limits
- **Signups (per IP, per hour):** `5`
- Other limits (token refresh, magic links) can stay at the defaults.

### Authentication → URL Configuration
- **Site URL:** `gmo://`
- **Redirect URLs** (one per line — must include the deep-link callback for native auth):
  ```
  gmo://
  gmo://auth/callback
  http://localhost:8081
  ```

The local `config.toml` already declares `site_url = "gmo://"` and `additional_redirect_urls`. The Dashboard values must mirror them — Dashboard wins when the hosted project diverges.

### Database → Extensions
- `pg_cron` — required by `0002_rank_jobs.sql`. Enable before applying that migration.
- `uuid-ossp`, `pgcrypto` — required by `0001_init.sql`. Usually enabled by default.

---

## Apply order checklist

1. Enable extensions: `uuid-ossp`, `pgcrypto`, `pg_cron`.
2. Run `0001_init.sql`.
3. Run `0002_rank_jobs.sql`.
4. Run `0003_signup_hardening.sql` and every later migration through `0046` in
   numeric order.
5. Flip the Dashboard settings above.
6. Verify: create a test user via the Auth UI and confirm a `profiles` row appears automatically with `current_rank = 'bronze'`, `weekly_goal_days = 4`, and a `user_<...>` placeholder username.
7. Verify `0041` with an authenticated client: sync the same workout twice and
   confirm exactly one ordered exercise/set tree remains.
8. Confirm `sync_workout_snapshot(uuid,jsonb)` has `EXECUTE` only for
   `authenticated` (plus owner `postgres`).
9. Sync a published workout with `is_published = false` and confirm it remains
   published; use a transaction with `ROLLBACK` for production smoke.
10. Confirm `publish_workout(uuid,text,text,text)` has `EXECUTE` only for
    `authenticated`, then publish a disposable workout and inspect metadata keys
    `duration_seconds`, `working_set_count`, `total_reps`, `volume_kg`,
    `muscle_groups` and `exercises`.
