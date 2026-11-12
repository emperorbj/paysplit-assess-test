/**
 * Shared plumbing for the account-provisioning scripts.
 *
 * These scripts talk to Postgres directly rather than booting the Nest app:
 * createApplicationContext(AppModule) would boot every module and provider —
 * unwanted side effects for a one-shot CLI.
 */
import 'dotenv/config';
import { randomBytes, randomUUID } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { QueryTypes, Sequelize } from 'sequelize';

/** Matches auth.service.ts — a different cost would still verify, but keep parity. */
const BCRYPT_ROUNDS = 10;

export function connect(): Sequelize {
  const required = ['DB_HOST', 'DB_NAME', 'DB_USERNAME', 'DB_PASSWORD'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing database env vars: ${missing.join(', ')}`);
  }

  return new Sequelize(process.env.DB_NAME!, process.env.DB_USERNAME!, process.env.DB_PASSWORD!, {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 5432),
    dialect: 'postgres',
    logging: false,
    dialectOptions:
      process.env.DB_SSL === 'true' ? { ssl: { require: true, rejectUnauthorized: false } } : {},
  });
}

/**
 * Writing users into a live database is not something to do by accident, so
 * name the target and demand --yes when it is not obviously a dev box.
 */
export function confirmTarget(argv: string[]): void {
  const host = process.env.DB_HOST ?? 'unknown';
  const isLocal = /^(localhost|127\.0\.0\.1|::1)$/.test(host);

  console.log(`Target database: ${process.env.DB_NAME}@${host}`);

  if (isLocal || argv.includes('--yes')) return;

  throw new Error(
    `Refusing to write to a non-local database without confirmation.\n` +
      `Re-run with --yes if ${host} is really the intended target.`,
  );
}

/** URL-safe, ~24 chars, no ambiguous characters to mistype off a screen. */
export function generatePassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = randomBytes(24);
  let out = '';
  for (const byte of bytes) out += alphabet[byte % alphabet.length];
  // Guarantee the symbol/digit mix that most password policies expect.
  return `${out.slice(0, 20)}#${out.slice(20)}7`;
}

export function hash(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export async function lookupOne<T extends Record<string, unknown>>(
  db: Sequelize,
  sql: string,
  replacements: Record<string, unknown> = {},
): Promise<T | null> {
  const rows = await db.query<T>(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });
  return rows[0] ?? null;
}

export async function requireRoleId(db: Sequelize, name: string): Promise<string> {
  const row = await lookupOne<{ id: string }>(
    db,
    'SELECT id FROM roles WHERE name = :name LIMIT 1',
    { name },
  );
  if (!row) {
    throw new Error(
      `Role "${name}" is missing. Run \`npm run seed:run\` against this database first.`,
    );
  }
  return row.id;
}

export interface UpsertUserInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  roleId: string;
  /** Extra snake_case columns to set, e.g. { username: 'x', country_id: '...' }. */
  columns?: Record<string, unknown>;
}

export interface UpsertUserResult {
  id: string;
  created: boolean;
}

/**
 * Create the user, or update the existing row with the same email.
 *
 * Idempotent by design: these scripts get re-run (password rotation, a second
 * store submission, a fresh environment) and must never fail on the unique
 * email constraint or leave a half-configured account behind.
 */
export async function upsertUser(db: Sequelize, input: UpsertUserInput): Promise<UpsertUserResult> {
  const email = input.email.toLowerCase().trim();
  const existing = await lookupOne<{ id: string }>(
    db,
    'SELECT id FROM users WHERE lower(email) = :email LIMIT 1',
    { email },
  );

  const passwordHash = await hash(input.password);

  const base: Record<string, unknown> = {
    email,
    password: passwordHash,
    first_name: input.firstName,
    last_name: input.lastName,
    role_id: input.roleId,
    is_active: true,
    // Reviewers have no access to the verification inbox, so pre-verify.
    is_email_verified: true,
    // Clearing these matters on re-run: a previously deactivated or
    // soft-deleted account must come back fully usable.
    deactivated_at: null,
    deleted_at: null,
    ...input.columns,
  };

  if (existing) {
    const assignments = Object.keys(base)
      .map((column) => `"${column}" = :${column}`)
      .join(', ');

    await db.query(`UPDATE users SET ${assignments}, updated_at = NOW() WHERE id = :id`, {
      replacements: { ...serialize(base), id: existing.id },
      type: QueryTypes.UPDATE,
    });

    return { id: existing.id, created: false };
  }

  const id = randomUUID();
  const row: Record<string, unknown> = {
    id,
    ...base,
    ...input.columns,
  };

  const columns = Object.keys(row);
  await db.query(
    `INSERT INTO users (${columns.map((c) => `"${c}"`).join(', ')}, created_at, updated_at)
     VALUES (${columns.map((c) => `:${c}`).join(', ')}, NOW(), NOW())`,
    { replacements: serialize(row), type: QueryTypes.INSERT },
  );

  return { id, created: true };
}

/** Sequelize cannot bind plain objects/arrays — JSON-encode them for JSONB. */
function serialize(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] =
      value !== null && typeof value === 'object' && !(value instanceof Date)
        ? JSON.stringify(value)
        : value;
  }
  return out;
}

/** Read a password from env, or mint one. `generated` drives whether we print it. */
export function resolvePassword(envKey: string): { password: string; generated: boolean } {
  const fromEnv = process.env[envKey];
  if (fromEnv && fromEnv.trim().length > 0) {
    return { password: fromEnv.trim(), generated: false };
  }
  return { password: generatePassword(), generated: true };
}
