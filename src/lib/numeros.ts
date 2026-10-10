import type { Prisma } from "@/generated/prisma/client";

/** Numéro suivant (REC-2026-0001, BOR-2026-0001…). À appeler dans la transaction de l'écriture : en cas d'échec, le numéro n'est pas consommé. */
export async function prochainNumero(tx: Prisma.TransactionClient, prefixe: "REC" | "BOR", date: Date) {
  const cle = `${prefixe}-${date.getUTCFullYear()}`;
  const c = await tx.compteur.upsert({ where: { cle }, create: { cle, valeur: 1 }, update: { valeur: { increment: 1 } } });
  return `${cle}-${String(c.valeur).padStart(4, "0")}`;
}
