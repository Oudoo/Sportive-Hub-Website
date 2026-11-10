import bcrypt from "bcryptjs";

/**
 * bcrypt with a work factor of 12 (~250 ms per hash on a modern CPU).
 * The hash embeds its own random salt, so equal passwords get different hashes.
 */
const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

/**
 * Accounts that have no password yet (a member who joined with a phone number, a staff
 * account waiting for its invitation) store a marker instead of a hash. bcrypt can never
 * produce a value starting with "!", so nothing matches it.
 */
const UNUSABLE_PREFIX = "!";

export function isUnusablePasswordHash(hash: string): boolean {
  return hash.startsWith(UNUSABLE_PREFIX);
}

export function unusableHashMarker(random: string): string {
  return UNUSABLE_PREFIX + random;
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (isUnusablePasswordHash(hash)) {
    // Same cost as a real check, so the login endpoint cannot be timed to find passwordless accounts.
    await bcrypt.compare(password, await dummyHash());
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

let dummy: Promise<string> | undefined;

/**
 * A throwaway hash to compare against when the email is unknown. Running bcrypt
 * either way keeps "no such user" and "wrong password" the same speed, so an
 * attacker cannot tell which emails have accounts by timing the login endpoint.
 */
export function dummyHash(): Promise<string> {
  dummy ??= bcrypt.hash("not-a-real-password", COST);
  return dummy;
}
