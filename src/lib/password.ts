import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

// Format stocké : scrypt$<sel hex>$<hash hex>
export async function hashPassword(pw: string) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${(await scryptAsync(pw, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [algo, salt, hash] = stored.split("$");
  if (algo !== "scrypt" || !salt || !hash) return false;
  const got = await scryptAsync(pw, Buffer.from(salt, "hex"), 64);
  return timingSafeEqual(got, Buffer.from(hash, "hex"));
}

export const passwordProblem = (pw: string) =>
  pw.length < 10 ? "Le mot de passe doit contenir au moins 10 caractères." : null;
