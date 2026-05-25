import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { humanizeAuthError } from '@/lib/authErrors';

export enum AuthErrorCode {
  USERNAME_TAKEN = 'USERNAME_TAKEN',
}

export class AuthError extends Error {
  constructor(
    public code: AuthErrorCode | string,
    message: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export interface SignUpParams {
  email: string;
  password: string;
}

export interface SignUpResponse {
  userId: string;
  needsEmailConfirmation: boolean;
}

export async function signUp({ email, password }: SignUpParams): Promise<SignUpResponse> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }

  if (!data.user) {
    throw new AuthError('UNKNOWN', 'No se pudo crear el usuario.');
  }

  return {
    userId: data.user.id,
    needsEmailConfirmation: !data.session,
  };
}

export async function signIn(email: string, password: string): Promise<{ userId: string }> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }

  if (!data.user) {
    throw new AuthError('UNKNOWN', 'No se pudo obtener el usuario.');
  }

  return { userId: data.user.id };
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
}

export async function currentSession() {
  if (!isSupabaseConfigured) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  return data.session;
}

/**
 * Returns the authenticated user's id, or null if there's no session (or
 * Supabase isn't configured). Lets app/* code stay out of the supabase client.
 */
export async function getCurrentUserId(): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

export async function isProfileComplete(userId: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false;
  const { data, error } = await supabase.rpc('is_profile_complete', { uid: userId });
  if (error) return false;
  return !!data;
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  if (!isSupabaseConfigured) return true;
  const { data, error } = await supabase.rpc('check_username_available', {
    uname: username.toLowerCase().trim(),
  });
  if (error) {
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }
  return !!data;
}

export interface CompleteSignupParams {
  displayName: string;
  username: string;
  weightKg?: number;
  heightCm?: number;
  unit?: 'kg' | 'lb';
  level?: string;
  goal?: string;
  weeklyGoalDays?: number;
}

export async function completeSignup(params: CompleteSignupParams): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }

  const { error } = await supabase.rpc('complete_signup', {
    uname: params.username.toLowerCase().trim(),
    display_name: params.displayName.trim(),
    weight_kg: params.weightKg ?? null,
    height_cm: params.heightCm ?? null,
    level: params.level ?? null,
    goal: params.goal ?? null,
    weekly_goal_days: params.weeklyGoalDays ?? null,
  });

  if (error) {
    if ((error as { code?: string }).code === '23505') {
      throw new AuthError(AuthErrorCode.USERNAME_TAKEN, humanizeAuthError(error), error);
    }
    throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
  }
}

export async function resendConfirmationEmail(email: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: email.trim(),
  });
  if (error) throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
}

export async function resetPasswordForEmail(email: string, redirectTo?: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
  if (error) throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
}

export async function updatePassword(password: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new AuthError('UNKNOWN', 'Supabase no configurado');
  }
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new AuthError('UNKNOWN', humanizeAuthError(error), error);
}
