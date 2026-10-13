import { AdminForm, type FormState } from "@/components/admin/admin-form";
import { Text } from "@/components/admin/fields";
import { PhotoCrop } from "@/components/admin/photo-crop";
import { PageHead } from "@/components/admin/page-head";
import { audit } from "@/lib/audit";
import { createSession, getUser, hashPassword, requireUser, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { photoUrl } from "@/lib/members";
import { passwordProblem } from "@/lib/password";
import { removeFiles, saveMemberPhoto } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

// Chacun gère sa propre photo (obligatoire) et son mot de passe
async function saveProfil(_: FormState, f: FormData): Promise<FormState> {
  "use server";
  const me = await getUser();
  if (!me) throw new Error("Accès refusé");
  const photo = f.get("image");
  const actuel = String(f.get("actuel") ?? ""), nouveau = String(f.get("nouveau") ?? "");
  const hasPhoto = photo instanceof File && photo.size > 0;
  if (!hasPhoto && !nouveau) return { error: "Rien à enregistrer." };
  if (!hasPhoto && !me.photo && !nouveau) return { error: "Choisissez une photo." };
  const data: { photo?: string; passwordHash?: string } = {};
  if (hasPhoto) {
    if (photo.size > 12 * 1024 * 1024) return { error: "Photo trop lourde (12 Mo maximum)." };
    try {
      // Nouveau nom à chaque envoi : jamais d'ancienne photo restée en cache
      data.photo = (await saveMemberPhoto(Buffer.from(await photo.arrayBuffer()), `compte-${me.id}-${randomUUID().slice(0, 8)}`)).photo;
    } catch {
      return { error: "Le fichier n'est pas une photo valide (JPG, PNG ou WebP)." };
    }
  }
  if (nouveau) {
    const u = await db.user.findUniqueOrThrow({ where: { id: me.id } });
    if (!(await verifyPassword(actuel, u.passwordHash))) return { error: "Mot de passe actuel incorrect." };
    const pb = passwordProblem(nouveau);
    if (pb) return { error: pb };
    data.passwordHash = await hashPassword(nouveau);
  }
  const updated = await db.user.update({ where: { id: me.id }, data });
  // La session est liée au mot de passe : on la renouvelle pour ne pas déconnecter l'utilisateur
  if (data.passwordHash) await createSession(updated);
  if (data.photo && me.photo) await removeFiles(me.photo, me.photo.replace(".webp", "-mini.webp"));
  await audit(me.id, "profil.modification", "User", me.id, { photo: !!data.photo, motDePasse: !!data.passwordHash });
  revalidatePath("/gestion", "layout");
  return { ok: true };
}

export default async function ProfilPage() {
  const user = await requireUser();
  return (
    <div className="space-y-4">
      <PageHead title="Mon profil" sub={`${user.name} · ${user.email} · ${user.role.nom}`} />
      <section className="rounded-3xl bg-white p-6">
        <AdminForm action={saveProfil}>
          <PhotoCrop key={user.photo} name="image" label="Photo de profil (obligatoire)" current={user.photo ? photoUrl(user.photo) : null} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Text name="actuel" label="Mot de passe actuel" type="password" autoComplete="current-password" hint="Seulement pour changer de mot de passe." />
            <Text name="nouveau" label="Nouveau mot de passe (10 caractères min.)" type="password" minLength={10} autoComplete="new-password" />
          </div>
        </AdminForm>
      </section>
    </div>
  );
}
