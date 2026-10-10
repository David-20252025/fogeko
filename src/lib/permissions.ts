import type { Module } from "@/generated/prisma/enums";

// Les 9 modules, dans l'ordre du menu
export const MODULES: { key: Module; label: string; href: string }[] = [
  { key: "MEMBRES", label: "Membres", href: "/gestion/membres" },
  { key: "ACTUALITES", label: "Actualités", href: "/gestion/actualites" },
  { key: "GALERIE", label: "Galerie", href: "/gestion/galerie" },
  { key: "ACTIONS", label: "Actions", href: "/gestion/actions" },
  { key: "FINANCES", label: "Finances", href: "/gestion/finances" },
  { key: "ARCHIVES", label: "Archives", href: "/gestion/archives" },
  { key: "ADMINISTRATION", label: "Administration", href: "/gestion/administration" },
  { key: "TEXTES", label: "Textes du site", href: "/gestion/site" },
  { key: "MESSAGES", label: "Messages", href: "/gestion/messages" },
];

export const ACTIONS = ["voir", "creer", "modifier", "supprimer", "exporter"] as const;
export type Action = (typeof ACTIONS)[number];
export const ACTION_LABELS: Record<Action, string> = { voir: "Voir", creer: "Créer", modifier: "Modifier", supprimer: "Supprimer", exporter: "Exporter" };

export type Perms = Record<Module, Record<Action, boolean>>;
type RolePerm = { module: Module } & Record<Action, boolean>;
type UserPerm = { module: Module } & Partial<Record<Action, boolean | null>>;

/** Permissions effectives : super admin = tout ; sinon la personnalisation du compte l'emporte sur le rôle. */
export function computePerms(superAdmin: boolean, rolePerms: RolePerm[], userPerms: UserPerm[] = []): Perms {
  const perms = {} as Perms;
  for (const { key } of MODULES) {
    const r = rolePerms.find((p) => p.module === key);
    const u = userPerms.find((p) => p.module === key);
    perms[key] = Object.fromEntries(
      ACTIONS.map((a) => [a, superAdmin || (u?.[a] ?? r?.[a] ?? false)]),
    ) as Record<Action, boolean>;
    // Sans « voir », aucune autre action n'a de sens (le module n'est pas accessible)
    if (!perms[key].voir) for (const a of ACTIONS) perms[key][a] = false;
  }
  return perms;
}

const LETTRES: Record<string, Action> = { V: "voir", C: "creer", M: "modifier", S: "supprimer", E: "exporter" };
/** « VCM » → { voir, creer, modifier } */
export const fromLetters = (l = ""): Record<Action, boolean> =>
  Object.fromEntries(ACTIONS.map((a) => [a, [...l].some((c) => LETTRES[c] === a)])) as Record<Action, boolean>;

// Permissions de départ des rôles (modifiables ensuite dans la matrice) — V voir, C créer, M modifier, S supprimer, E exporter
const CONTENUS = (l: string) => ({ ACTUALITES: l, GALERIE: l, ACTIONS: l, TEXTES: l });
export const DEFAULT_MATRIX: Record<string, Partial<Record<Module, string>>> = {
  Administrateur: { MEMBRES: "VCMSE", ...CONTENUS("VCMS"), FINANCES: "VCME", ARCHIVES: "VCE", ADMINISTRATION: "V", MESSAGES: "VMS" },
  Trésorier: { MEMBRES: "V", FINANCES: "VCME", ARCHIVES: "VCE" },
  Secrétaire: { MEMBRES: "VCME", ...CONTENUS("V"), ARCHIVES: "VC", MESSAGES: "VM" },
  Communication: { MEMBRES: "V", ...CONTENUS("VCMS"), ARCHIVES: "V", ADMINISTRATION: "V", MESSAGES: "VM" },
  Lecteur: { MEMBRES: "V", ...CONTENUS("V"), ARCHIVES: "V" },
};

/** Lit une grille de cases « p.MODULE.action » envoyée par un formulaire. */
export function parseGrid(f: FormData): Perms {
  return Object.fromEntries(
    MODULES.map(({ key }) => [key, Object.fromEntries(ACTIONS.map((a) => [a, f.get(`p.${key}.${a}`) === "on"]))]),
  ) as Perms;
}

/** Écarts entre la grille voulue et celle du rôle : seules les différences sont enregistrées sur le compte. */
export function overridesFrom(wanted: Perms, role: Perms) {
  return MODULES.flatMap(({ key }) => {
    const diff = Object.fromEntries(ACTIONS.filter((a) => wanted[key][a] !== role[key][a]).map((a) => [a, wanted[key][a]]));
    return Object.keys(diff).length ? [{ module: key, ...diff }] : [];
  });
}
