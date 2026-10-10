"use server";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import { formatNumero } from "@/lib/members";
import { parseMemberFields } from "@/lib/member-validate";
import { removeFiles, saveMemberPhoto } from "@/lib/storage";

export type AdhesionState = { ok?: boolean; numero?: string; prenom?: string; error?: string };

const MAX_PHOTO = 900 * 1024; // la photo arrive déjà recadrée/compressée par le navigateur

const str = (f: FormData, k: string, max = 120) => String(f.get(k) ?? "").trim().slice(0, max);

export async function createMember(_: AdhesionState, f: FormData): Promise<AdhesionState> {
  if (str(f, "site_web")) return { ok: true, numero: "—" }; // champ piège anti-robots
  // Généreux : beaucoup de téléphones partagent la même IP chez les opérateurs mobiles
  if (!rateLimit(`adhesion:${await clientIp()}`, 30, 60 * 60_000)) return { error: "Trop d'inscriptions depuis cette connexion. Réessayez dans une heure ou contactez la fondation." };

  const parsed = await parseMemberFields(f);
  if ("error" in parsed) return parsed;
  const photo = f.get("photo");
  if (f.get("consentement") !== "on") return { error: "Votre accord sur l'utilisation des données est nécessaire." };
  if (!(photo instanceof File) || photo.size === 0) return { error: "La photo de profil est obligatoire." };
  if (photo.size > MAX_PHOTO) return { error: "La photo est trop lourde. Merci d'en choisir une autre." };

  const id = randomUUID();
  let files: { photo: string; photoThumb: string };
  try {
    files = await saveMemberPhoto(Buffer.from(await photo.arrayBuffer()), id);
  } catch {
    return { error: "Le fichier envoyé n'est pas une photo valide (JPG, PNG ou WebP)." };
  }

  try {
    const m = await db.member.create({
      data: {
        id, ...parsed.data,
        consentement: true,
        ...files,
      },
    });
    return { ok: true, numero: formatNumero(m.numero), prenom: m.prenom };
  } catch (e) {
    await removeFiles(files.photo, files.photoThumb);
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      return { error: "Ce numéro de téléphone est déjà inscrit. Contactez la fondation si vous pensez qu'il s'agit d'une erreur." };
    throw e;
  }
}
