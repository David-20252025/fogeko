// Membres de DÉMONSTRATION entièrement fictifs (noms inventés, avatars générés).
// Usage : npm run db:demo [-- --nombre=100]        Suppression : npm run db:demo -- --supprimer
import "dotenv/config";
import sharp from "sharp";
import { db } from "../src/lib/db";
import { removeFiles, saveMemberPhoto } from "../src/lib/storage";

const NOMS = ["Kabongo", "Mbuyi", "Tshibangu", "Ilunga", "Kalala", "Mukendi", "Ngalula", "Kasongo", "Mutombo", "Lukusa", "Banza", "Kanku", "Mpiana", "Nkulu", "Tshilombo", "Mwamba"];
const PRENOMS_F = ["Grâce", "Esther", "Marie", "Ruth", "Sarah", "Jolie", "Nadine", "Christelle", "Rachel", "Bénédicte"];
const PRENOMS_M = ["Jean", "Patrick", "Daniel", "Joseph", "Fiston", "Christian", "Pascal", "David", "Elie", "Junior"];
const QUARTIERS = ["Kingabwa", "Mososo", "Salongo", "Industriel", "Résidentiel", "Mombele", "Funa", "Righini"];
const PROFESSIONS = ["Commerçante", "Enseignant", "Étudiant", "Infirmière", "Chauffeur", "Couturière", "Mécanicien", "Pasteur", null];
const COULEURS = ["#0A1360", "#EC2A45", "#C9892B", "#E8761E", "#121C78"];
const DEMO_TAG = "DEMO";

const pick = <T>(a: T[]) => a[Math.floor(Math.random() * a.length)];

async function avatar(initiales: string, bg: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400"><rect width="400" height="400" fill="${bg}"/><text x="200" y="250" font-family="Georgia" font-size="150" font-weight="bold" fill="#fff" text-anchor="middle">${initiales}</text></svg>`;
  return sharp(Buffer.from(svg)).jpeg().toBuffer();
}

async function main() {
  const anciens = await db.member.findMany({ where: { profession: { endsWith: DEMO_TAG } }, select: { id: true, photo: true, photoThumb: true } });
  for (const m of anciens) await removeFiles(m.photo, m.photoThumb);
  await db.member.deleteMany({ where: { id: { in: anciens.map((m) => m.id) } } });
  // Base vide : la numérotation repart à FOGEKO-0001
  if ((await db.member.count()) === 0) await db.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"Member"', 'numero'), 1, false)`);
  if (process.argv.includes("--supprimer")) return console.log(`${anciens.length} membres de démo supprimés.`);
  const nombre = Math.min(5000, Math.max(1, Number(process.argv.find((a) => a.startsWith("--nombre="))?.split("=")[1]) || 100));

  const communes = await db.commune.findMany();
  const proches = communes.filter((c) => ["Limete", "Matete", "Lemba", "Masina", "Ndjili", "Kalamu", "Ngaba"].includes(c.nom));
  for (let i = 0; i < nombre; i++) {
    const sexe = Math.random() < 0.55 ? "F" : "M";
    const categorie = sexe === "F" ? pick(["MAMAN", "MAMAN", "JEUNE", "PASTEUR"] as const) : pick(["PAPA", "PAPA", "JEUNE", "PASTEUR"] as const);
    const nom = pick(NOMS), prenom = pick(sexe === "F" ? PRENOMS_F : PRENOMS_M);
    const id = crypto.randomUUID();
    const files = await saveMemberPhoto(await avatar(`${prenom[0]}${nom[0]}`, pick(COULEURS)), id);
    const age = categorie === "JEUNE" ? 18 + Math.random() * 12 : 28 + Math.random() * 35;
    await db.member.create({
      data: {
        id, nom, prenom, sexe, categorie, ...files,
        postNom: Math.random() < 0.6 ? pick(NOMS) : null,
        telephone: `+24389${String(1000000 + i).padStart(7, "0")}`, // plage fictive
        communeId: (Math.random() < 0.7 ? pick(proches) : pick(communes)).id,
        quartier: pick(QUARTIERS),
        profession: `${pick(PROFESSIONS) ?? "Sans profession"} · ${DEMO_TAG}`,
        egliseMinistere: categorie === "PASTEUR" ? "Église fictive de démonstration" : null,
        dateNaissance: new Date(Date.now() - age * 31_557_600_000),
        dateAdhesion: new Date(Date.now() - Math.random() * 90 * 86_400_000),
        statut: pick(["ACTIF", "ACTIF", "ACTIF", "EN_ATTENTE", "SUSPENDU"] as const),
        consentement: true,
      },
    });
  }
  console.log(`${nombre} membres de démonstration fictifs créés.`);
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
