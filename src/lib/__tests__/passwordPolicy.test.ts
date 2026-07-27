/**
 * passwordPolicy — validación en vivo, scoring de fortaleza (0-4) y gating de signup.
 * Reglas: longitud >=8, mayúscula, minúscula, número, especial. El score 4 ("Excelente")
 * exige además longitud >=12 con las 5 reglas cumplidas.
 */
import {
  PASSWORD_RULES,
  checkPassword,
  isPasswordValid,
  passwordScore,
  scoreLabel,
  isEmailValid,
  isUsernameValid,
  suggestUsernameFromEmail,
} from '@/lib/passwordPolicy';

describe('passwordScore', () => {
  it('contraseña débil obvia da score bajo', () => {
    // "123456": solo cumple la regla "number" (1 de 5) -> inválida (< 2 reglas)
    expect(passwordScore('123456')).toBe(0);
  });

  it('contraseña vacía da score 0', () => {
    expect(passwordScore('')).toBe(0);
  });

  it('contraseña fuerte (mayus+minus+numero+simbolo+longitud>=12) da score máximo', () => {
    expect(passwordScore('Str0ng!Passw0rd')).toBe(4);
  });

  it('cumple las 5 reglas pero longitud < 12 queda en "buena", no "excelente"', () => {
    // "Ab1!Ab1!": 8 chars, cumple las 5 reglas pero no llega a 12
    expect(passwordScore('Ab1!Ab1!')).toBe(3);
  });

  it('mapea la cantidad de reglas cumplidas a cada score intermedio', () => {
    expect(passwordScore('aaaaaaaa')).toBe(1); // length + lower = 2 reglas
    expect(passwordScore('Aaaaaaaa')).toBe(2); // length + lower + upper = 3 reglas
    expect(passwordScore('Aaaaaaa1')).toBe(3); // length + lower + upper + number = 4 reglas
  });
});

describe('checkPassword', () => {
  it('contraseña débil marca varios requisitos como no cumplidos', () => {
    const checks = checkPassword('123456');
    const failed = checks.filter((c) => !c.passed).map((c) => c.rule.id);
    expect(failed).toEqual(expect.arrayContaining(['length', 'upper', 'lower', 'special']));
    const passed = checks.find((c) => c.rule.id === 'number');
    expect(passed?.passed).toBe(true);
  });

  it('contraseña fuerte cumple todos los requisitos', () => {
    const checks = checkPassword('Str0ng!Passw0rd');
    expect(checks.every((c) => c.passed)).toBe(true);
    expect(checks).toHaveLength(PASSWORD_RULES.length);
  });
});

describe('isPasswordValid', () => {
  it('rechaza una contraseña que no cumple todas las reglas', () => {
    expect(isPasswordValid('123456')).toBe(false);
  });

  it('acepta una contraseña que cumple las 5 reglas aunque no llegue a "excelente"', () => {
    expect(isPasswordValid('Ab1!Ab1!')).toBe(true);
  });
});

describe('scoreLabel', () => {
  it('mapea cada score a su etiqueta en español', () => {
    expect(scoreLabel(0)).toBe('Muy débil');
    expect(scoreLabel(1)).toBe('Débil');
    expect(scoreLabel(2)).toBe('Aceptable');
    expect(scoreLabel(3)).toBe('Buena');
    expect(scoreLabel(4)).toBe('Excelente');
  });
});

describe('isEmailValid', () => {
  it('acepta un email bien formado', () => {
    expect(isEmailValid('user@example.com')).toBe(true);
  });

  it('rechaza formatos inválidos', () => {
    expect(isEmailValid('no-arroba.com')).toBe(false);
    expect(isEmailValid('user@sin-dominio')).toBe(false);
    expect(isEmailValid('')).toBe(false);
  });

  it('ignora espacios alrededor', () => {
    expect(isEmailValid('  user@example.com  ')).toBe(true);
  });
});

describe('isUsernameValid', () => {
  it('acepta minúsculas, números y guión bajo entre 3 y 20 caracteres', () => {
    expect(isUsernameValid('gmo_user1')).toBe(true);
  });

  it('rechaza mayúsculas, símbolos no permitidos o longitud fuera de rango', () => {
    expect(isUsernameValid('Gmo')).toBe(false); // mayúscula
    expect(isUsernameValid('ab')).toBe(false); // muy corto
    expect(isUsernameValid('a'.repeat(21))).toBe(false); // muy largo
    expect(isUsernameValid('user-name')).toBe(false); // guión medio no permitido
  });
});

describe('suggestUsernameFromEmail', () => {
  it('toma la parte local del email, la normaliza y recorta a 20 caracteres', () => {
    expect(suggestUsernameFromEmail('Juan.Perez+gym@example.com')).toBe('juan_perez_gym');
  });

  it('recorta usernames largos a 20 caracteres', () => {
    const email = `${'a'.repeat(25)}@example.com`;
    const suggested = suggestUsernameFromEmail(email);
    expect(suggested).toHaveLength(20);
  });
});
