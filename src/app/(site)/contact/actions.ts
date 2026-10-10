"use server";

import { db } from "@/lib/db";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";

export type ContactState = { ok?: boolean; error?: string };

const str = (f: FormData, k: string, max: number) => String(f.get(k) ?? "").trim().slice(0, max);

export async function sendContact(_: ContactState, f: FormData): Promise<ContactState> {
  if (str(f, "site_web", 100)) return { ok: true }; // champ piège anti-robots : on fait semblant d'accepter
  if (!rateLimit(`contact:${await clientIp()}`, 10, 10 * 60_000)) return { error: "Trop de messages envoyés. Réessayez dans quelques minutes." };
  const nom = str(f, "nom", 120);
  const telephone = str(f, "telephone", 30);
  const email = str(f, "email", 160);
  const message = str(f, "message", 4000);
  if (nom.length < 2) return { error: "Merci d'indiquer votre nom." };
  if (!telephone && !email) return { error: "Indiquez un téléphone ou un email pour que nous puissions vous répondre." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "L'adresse email semble incorrecte." };
  if (message.length < 10) return { error: "Votre message est trop court." };
  await db.contactMessage.create({ data: { nom, telephone: telephone || null, email: email || null, message } });
  return { ok: true };
}
