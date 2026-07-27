/**
 * Password policy for Gmo Training App.
 * Used for live validation, strength scoring, and signup gating.
 */

export interface PasswordRule {
  id: string;
  label: string;
  test: (pwd: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
  { id: 'upper', label: 'Una mayúscula (A-Z)', test: (p) => /[A-Z]/.test(p) },
  { id: 'lower', label: 'Una minúscula (a-z)', test: (p) => /[a-z]/.test(p) },
  { id: 'number', label: 'Un número (0-9)', test: (p) => /\d/.test(p) },
  { id: 'special', label: 'Un carácter especial (!@#$…)', test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export type PasswordCheck = {
  rule: PasswordRule;
  passed: boolean;
};

export function checkPassword(pwd: string): PasswordCheck[] {
  return PASSWORD_RULES.map((rule) => ({ rule, passed: rule.test(pwd) }));
}

export function isPasswordValid(pwd: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(pwd));
}

/**
 * Returns a score 0-4 for the strength meter:
 *  0 = invalid (less than 2 rules)
 *  1 = weak    (2 rules)
 *  2 = fair    (3 rules)
 *  3 = good    (4 rules)
 *  4 = strong  (5 rules + length >= 12)
 */
export function passwordScore(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  const passed = PASSWORD_RULES.filter((r) => r.test(pwd)).length;
  if (passed < 2) return 0;
  if (passed === 2) return 1;
  if (passed === 3) return 2;
  if (passed === 4) return 3;
  // All 5 rules — boost to "strong" only if length >= 12
  return pwd.length >= 12 ? 4 : 3;
}

export function scoreLabel(score: 0 | 1 | 2 | 3 | 4): string {
  return ['Muy débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'][score];
}

// Simple email regex — good enough for client side; Supabase validates server-side too.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export function isEmailValid(email: string): boolean {
  return EMAIL_RE.test(email.trim());
}

// Username: 3-20 chars, lowercase letters, numbers, underscore
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;
export function isUsernameValid(username: string): boolean {
  return USERNAME_RE.test(username.trim());
}

export function suggestUsernameFromEmail(email: string): string {
  return email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);
}
