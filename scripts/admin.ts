// Crée un super administrateur, ou réinitialise son mot de passe et le débloque s'il existe déjà.
// Usage : ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin
import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword, passwordProblem } from "../src/lib/password";

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("ADMIN_EMAIL manquant ou invalide");
  const pb = passwordProblem(password);
  if (pb) throw new Error(pb);
  const passwordHash = await hashPassword(password);
  const role = await db.role.upsert({ where: { nom: "Super admin" }, update: { superAdmin: true }, create: { nom: "Super admin", superAdmin: true } });
  const u = await db.user.upsert({
    where: { email },
    update: { roleId: role.id, passwordHash, failedLogins: 0, lockedUntil: null },
    create: { email, name: "Super administrateur", roleId: role.id, passwordHash },
  });
  console.log(`Super administrateur prêt : ${u.email}`);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e.message); await db.$disconnect(); process.exit(1); });
