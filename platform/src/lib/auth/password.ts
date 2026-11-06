import bcrypt from "bcryptjs";

/**
 * bcrypt with a work factor of 12 (~250 ms per hash on a modern CPU).
 * The hash embeds its own random salt, so equal passwords get different hashes.
 */
const COST = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
