import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { clientIp } from "./client-ip";
import { db } from "./db";

/** Journal d'audit des actions sensibles : qui, quoi, quand, adresse IP. */
export async function audit(userId: string | null, action: string, entite?: string, entiteId?: string | number, details?: Prisma.InputJsonValue) {
  await db.auditLog.create({ data: { userId, action, entite, entiteId: entiteId?.toString(), details, ip: await clientIp() } });
}
