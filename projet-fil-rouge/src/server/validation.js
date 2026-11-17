import { NextResponse } from 'next/server';
import { z } from 'zod';

export const GAME_SLUGS = ['sebi-run', 'james-hibou'];

const requiredString = (label) =>
  z.string({ required_error: `${label} requis`, invalid_type_error: `${label} invalide` });

const email = requiredString('Email').trim().toLowerCase().email('Email invalide');
const newPassword = requiredString('Mot de passe')
  .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
  .max(128, 'Mot de passe trop long');
const personName = (label) => requiredString(label).trim().min(1, `${label} requis`).max(50, `${label} trop long`);
const gameSlug = z.enum(GAME_SLUGS, { errorMap: () => ({ message: 'Jeu inconnu' }) });

export const loginSchema = z.object({
  email,
  password: requiredString('Mot de passe').min(1, 'Mot de passe requis').max(128, 'Mot de passe trop long'),
});

export const registerSchema = z.object({
  firstName: personName('Prénom'),
  lastName: personName('Nom'),
  age: z.coerce.number({ invalid_type_error: 'Âge invalide' }).int('Âge invalide').min(4, 'Âge invalide').max(120, 'Âge invalide'),
  email,
  password: newPassword,
  parentEmail: z.union([email, z.literal('')]).optional(),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: requiredString('Lien').regex(/^[a-f0-9]{64}$/, 'Lien invalide'),
  newPassword,
});

export const scoreSchema = z.object({
  gameSlug,
  score: z.number({ invalid_type_error: 'Score invalide', required_error: 'Score requis' }).finite().nonnegative('Score invalide'),
});

export const gameSlugSchema = z.object({ gameSlug });

/**
 * Type checks are what block NoSQL injection: an operator object such as
 * { "$ne": null } sent as an email is rejected because it is not a string.
 *
 * @returns {Promise<{ data: object } | { errorResponse: NextResponse }>}
 */
export async function parseJsonBody(req, schema) {
  let body;
  try {
    body = await req.json();
  } catch {
    return { errorResponse: NextResponse.json({ message: 'Requête invalide' }, { status: 400 }) };
  }

  const result = schema.safeParse(body);
  if (!result.success) {
    return { errorResponse: NextResponse.json({ message: result.error.issues[0].message }, { status: 400 }) };
  }
  return { data: result.data };
}
