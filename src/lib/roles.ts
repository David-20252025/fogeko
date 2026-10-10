import type { Role } from "@/generated/prisma/enums";

export const ROLE_LABELS: Record<Role, string> = {
  SUPERADMIN: "Super administrateur — tout, y compris les fonds mensuels",
  ADMIN: "Administrateur — tout sauf les fonds mensuels",
  SECRETAIRE: "Secrétaire — membres et contenus, sans suppression ni finances",
  LECTEUR: "Lecteur — consultation seulement",
};

/** Rôles qu'un utilisateur peut attribuer : seul un super administrateur crée d'autres super administrateurs. */
export const assignableRoles = (me: Role): Role[] =>
  me === "SUPERADMIN" ? ["SUPERADMIN", "ADMIN", "SECRETAIRE", "LECTEUR"] : me === "ADMIN" ? ["ADMIN", "SECRETAIRE", "LECTEUR"] : [];

/** Un administrateur ne peut ni modifier, ni débloquer, ni supprimer un super administrateur. */
export const canManage = (me: Role, target: Role) => me === "SUPERADMIN" || (me === "ADMIN" && target !== "SUPERADMIN");
