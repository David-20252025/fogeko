// Données initiales du site (idempotent : ne modifie jamais ce qui a été changé depuis l'admin).
// Les articles d'exemple et les chiffres fictifs ne sont créés qu'en développement.
import "dotenv/config";
import { db } from "../src/lib/db";
import { hashPassword } from "../src/lib/password";

const DEV = process.env.NODE_ENV !== "production";

const COMMUNES = [
  "Bandalungwa", "Barumbu", "Bumbu", "Gombe", "Kalamu", "Kasa-Vubu", "Kimbanseke", "Kinshasa",
  "Kintambo", "Kisenso", "Lemba", "Limete", "Lingwala", "Makala", "Maluku", "Masina", "Matete",
  "Mont-Ngafula", "Ndjili", "Ngaba", "Ngaliema", "Ngiri-Ngiri", "Nsele", "Selembao",
];

async function main() {
  // Premier compte (super administrateur), créé une seule fois à partir des variables d'environnement
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD && (await db.user.count()) === 0) {
    await db.user.create({ data: { email: ADMIN_EMAIL.toLowerCase(), name: "Super administrateur", role: "SUPERADMIN", passwordHash: await hashPassword(ADMIN_PASSWORD) } });
    console.log(`Compte administrateur créé : ${ADMIN_EMAIL}`);
  }

  for (const nom of COMMUNES) await db.commune.upsert({ where: { nom }, update: {}, create: { nom } });

  await db.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: {
      heroTitre: "Ensemble, pour un Kinshasa solidaire",
      heroSousTitre:
        "La Fondation Gekoko rassemble mamans, papas, jeunes et pasteurs autour d'actions concrètes pour nos quartiers.",
      // Chiffres fictifs en développement seulement ; en production : 0 = bloc masqué tant qu'ils ne sont pas saisis dans l'admin
      statMembres: DEV ? 500 : 0,
      statCommunes: DEV ? 12 : 0,
      statActions: DEV ? 30 : 0,
      mission: "La Fondation Gekoko est une organisation engagée dans l'éducation des jeunes, la lutte contre la pauvreté et le développement communautaire.",
      vision: "Un Kinshasa où chaque quartier dispose des infrastructures et de la solidarité dont il a besoin.",
      valeurs: "Paix · Solidarité · Proximité · Dignité",
      fondateurBio:
        "Gérard Mulumba (Gecoco Mulumba) est le fondateur et coordonnateur de la Fondation Gekoko.",
      whatsapp: "243907230023",
      telephone: "+243 898 928 888 / +243 896 370 519", // plusieurs numéros séparés par « / »
      email: "fogeko@gmail.com",
      adresse: "Limete / Kingabwa, Kinshasa, RDC",
    },
  });

  const actions = [
    { titre: "Action sociale", slug: "action-sociale", image: "/img/fondateur-hommage.webp",
      resume: "Soutien direct aux familles et aux personnes vulnérables de nos communes." },
    { titre: "Développement communautaire", slug: "developpement-communautaire", image: "/img/fondateur-assis.webp",
      resume: "Mobiliser mamans, papas, jeunes et pasteurs autour de projets de quartier." },
    { titre: "Infrastructures à Kingabwa / Limete", slug: "infrastructures-kingabwa", image: "/img/fondateur-sceptre.webp",
      resume: "Soutien aux travaux d'infrastructures au service des habitants de Kingabwa." },
    { titre: "Projet Tshilejelu", slug: "projet-tshilejelu", image: "/img/fondateur-peau.webp",
      resume: "La fondation salue et accompagne le projet Tshilejelu." },
  ];
  for (const [ordre, a] of actions.entries())
    await db.action.upsert({ where: { slug: a.slug }, update: {}, create: { ...a, contenu: a.resume, ordre } });

  if ((await db.timelineEvent.count()) === 0)
    await db.timelineEvent.createMany({
      data: [
        // Dates et détails à saisir dans /gestion/site : une année vide n'est pas affichée
        { annee: "", titre: "Création de la Fondation Gekoko", texte: "", ordre: 0 },
        { annee: "", titre: "Soutien aux infrastructures à Kingabwa", texte: "", ordre: 1 },
        { annee: "", titre: "Salut du projet Tshilejelu", texte: "", ordre: 2 },
      ],
    });

  if ((await db.galleryItem.count()) === 0)
    await db.galleryItem.createMany({
      data: [
        ["fondateur-portrait", "Le coordonnateur en tenue traditionnelle"],
        ["fondateur-hommage", "Accueil du coordonnateur par les membres"],
        ["fondateur-sceptre", "Salut à la foule"],
        ["fondateur-assis", "Rencontre avec les membres"],
        ["fondateur-peau", "Cérémonie traditionnelle"],
      ].map(([f, titre], ordre) => ({ type: "PHOTO" as const, titre, image: `/img/${f}.webp`, ordre })),
    });

  if ((await db.dirigeant.count()) === 0)
    await db.dirigeant.create({
      data: { prenom: "Gérard", nom: "Mulumba", poste: "Fondateur et coordonnateur", photo: "/img/fondateur-portrait.webp", ordre: 0 },
    });

  const cats = [
    { nom: "Vie de la fondation", slug: "vie-de-la-fondation", visible: true },
    { nom: "Actions sur le terrain", slug: "terrain", visible: true },
    { nom: "Politique", slug: "politique", visible: false }, // masquée tant que non validée
  ];
  for (const c of cats) await db.newsCategory.upsert({ where: { slug: c.slug }, update: {}, create: c });
  if (!DEV) return; // les articles d'exemple ne doivent jamais apparaître sur le vrai site
  const vie = await db.newsCategory.findUniqueOrThrow({ where: { slug: "vie-de-la-fondation" } });

  const articles = [
    { titre: "Exemple : rencontre avec les membres de Limete", slug: "exemple-rencontre-limete", image: "/img/fondateur-assis.webp" },
    { titre: "Exemple : cérémonie d'accueil du coordonnateur", slug: "exemple-ceremonie-accueil", image: "/img/fondateur-hommage.webp" },
    { titre: "Exemple : lancement des adhésions en ligne", slug: "exemple-adhesions-en-ligne", image: "/img/fondateur-portrait.webp" },
  ];
  for (const [i, a] of articles.entries())
    await db.article.upsert({
      where: { slug: a.slug },
      update: {},
      create: {
        ...a, categorieId: vie.id, publie: true,
        publieLe: new Date(Date.now() - i * 6 * 86400000),
        extrait: "Article de démonstration fictif, à remplacer par une vraie actualité depuis l'administration.",
        contenu: "Article de démonstration fictif, à remplacer par une vraie actualité depuis l'administration.",
      },
    });
}

main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
