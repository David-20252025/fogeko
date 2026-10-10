# Fondation Gekoko (FOGEKO) — site et gestion des membres

Site public (accueil, à propos, administration, actions, actualités, galerie, adhésion en ligne, contact) et espace de gestion
(`/gestion` : membres, tableau de bord, exports, cartes de membre, contenus, utilisateurs).
Connexion : **`/connexion`** (ou lien « Connexion » en bas de chaque page).

**Technique** : Next.js 16 · Prisma 7 · PostgreSQL · Tailwind CSS 4 · Docker (Dokploy).
Déploiement : voir [DEPLOIEMENT_DOKPLOY.md](DEPLOIEMENT_DOKPLOY.md).

---

## 1. Installation sur un ordinateur (développement)

Prérequis : **Node.js 24** (https://nodejs.org). Aucun Docker ni PostgreSQL à installer : une base locale est fournie.

```bash
npm install
cp .env.example .env        # puis ouvrir .env et remplir les valeurs (voir plus bas)
```

Dans `.env`, générer un `AUTH_SECRET` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Puis, **dans un premier terminal** (laisser ouvert) :

```bash
npm run db
```

**Dans un second terminal** :

```bash
npx prisma migrate dev      # crée les tables
npm run db:seed             # communes, textes, premier compte admin (ADMIN_EMAIL / ADMIN_PASSWORD)
npm run db:demo             # optionnel : 100 membres FICTIFS pour essayer le tableau de bord
npm run dev                 # http://localhost:3000  — gestion : http://localhost:3000/gestion
```

### Variables d'environnement

| Variable | Rôle |
|---|---|
| `DATABASE_URL` | Connexion PostgreSQL (en local : `postgresql://fogeko:fogeko@localhost:54329/fogeko`) |
| `AUTH_SECRET` | Clé secrète des sessions, 32 caractères minimum. La changer déconnecte tout le monde. |
| `SITE_URL` | Adresse publique (`https://fogeko.com`), utilisée pour les aperçus WhatsApp/Facebook, le sitemap et les QR codes |
| `UPLOAD_DIR` | Dossier des photos envoyées (local : `./uploads`, Docker : `/app/uploads`) |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Premier compte administrateur, créé **une seule fois** si aucun compte n'existe |

## 2. Commandes utiles

| Commande | Effet |
|---|---|
| `npm run dev` | Site en développement |
| `npm run db` | Démarre la base PostgreSQL locale (port 54329, données dans `.pgdata/`) |
| `npm test` | Tests (téléphones, numéros FOGEKO, liens vidéo, mots de passe, filtres) |
| `npm run lint` | Vérification du code |
| `npm run build` | Build de production |
| `npm run db:demo -- --nombre=100` | Remplace les membres fictifs par N nouveaux (100 par défaut, marqués « DEMO ») |
| `npm run db:demo -- --supprimer` | Supprime les membres fictifs (et remet la numérotation à FOGEKO-0001 si la base est vide) |
| `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin` | Crée un administrateur, ou réinitialise son mot de passe et le débloque |
| `npx prisma studio` | Explorer la base dans le navigateur |

## 3. Organisation du code

```
prisma/schema.prisma        Schéma de la base (membres, communes, actualités, galerie…)
prisma/migrations/          Historique des modifications de la base (à committer)
prisma/seed.ts              Données initiales (idempotent : ne touche pas à ce qui a été modifié dans l'admin)
src/app/(site)/             Pages publiques
src/app/gestion/            Espace de gestion (connexion, tableau de bord, membres, contenus…)
src/app/gestion/impression/ Export PDF (liste) et cartes de membre à imprimer
src/components/             Composants (en-tête, pied de page, formulaire d'adhésion, admin/…)
src/lib/                    Logique : auth, base, validation, stockage des photos, filtres
public/img/                 Logo et photos du site (WebP)
uploads/                    Photos envoyées (membres = privé, contenus = public via /media) — NE PAS committer
tests/                      Tests automatiques
```

## 4. Rôles

| Rôle | Peut |
|---|---|
| **Administrateur** | Tout, y compris gérer les comptes et supprimer |
| **Secrétaire** | Gérer membres (valider, modifier, exporter, cartes) et contenus, sans rien supprimer |
| **Lecteur** | Consulter le tableau de bord et les fiches, sans modification ni export |

### Sécurité

- Mots de passe hachés (scrypt) ; session signée de 12 h, invalidée si le mot de passe change ou si le compte est supprimé.
- Connexion : compte bloqué 15 min après 5 échecs ; 20 échecs max par connexion (IP) toutes les 15 min.
- Formulaires publics limités par connexion (IP) : 30 adhésions / heure, 10 messages de contact / 10 min — seuils
  volontairement larges car beaucoup de téléphones partagent la même IP chez les opérateurs mobiles. Champ piège anti-robots.
  Limites gardées en mémoire : valables pour **une seule instance** du site (à déplacer en base si on passe à plusieurs réplicas).
- Rôle vérifié dans chaque action serveur (pas seulement dans le menu) ; photos des membres servies uniquement après connexion.
- Fichiers envoyés décodés et réencodés en WebP (un fichier qui n'est pas une vraie image est refusé).
- En-têtes : CSP (production), HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy ; protection CSRF native des actions Next.js.
- `npm audit --omit=dev` : reste une alerte dans `deepmerge-ts`, utilisé par Prisma uniquement pour lire `prisma.config.ts`
  (aucune donnée de visiteur) ; la corriger impose une version majeure non supportée par Prisma 7.10. À revoir à la prochaine mise à jour de Prisma.

## 5. Mettre à jour le site

**Contenus** (textes, chiffres, actualités, galerie, actions, frise, membres de l'administration) : depuis `/gestion`, sans toucher au code.

**Code** :
1. Modifier le code, vérifier : `npm run lint && npm test && npm run build`
2. Si le schéma de la base change : `npx prisma migrate dev --name description-courte` (crée un fichier dans `prisma/migrations/`)
3. Committer et pousser sur la branche déployée : Dokploy reconstruit l'image ; au démarrage, les migrations sont appliquées automatiquement.

## 6. Avant la mise en ligne — liste de contrôle

Déjà fait : coordonnées réelles, description de la fondation, textes sans marqueurs provisoires ; en production,
aucun membre ni article fictif n'est créé.

- [ ] Renseigner les chiffres clés (0 = masqué) et les pages Facebook / YouTube dans `/gestion/site`
- [ ] Compléter le parcours du fondateur et les dates de la frise chronologique (`/gestion/site`)
- [ ] Publier les membres de l'administration (photo, nom, post-nom, prénom, poste) dans `/gestion/administration`
- [ ] Faire relire la page **Confidentialité** (`src/app/(site)/confidentialite/page.tsx`)
- [ ] Choisir un mot de passe administrateur robuste (12 caractères ou plus, lettres + chiffres + symboles), créer les comptes secrétaires
- [ ] Vérifier que les sauvegardes fonctionnent (voir DEPLOIEMENT_DOKPLOY.md)

## 7. Choix et limites connus

- La catégorie d'actualités **Politique** existe mais est masquée : ses articles ne s'affichent pas tant qu'elle n'est pas rendue visible.
- L'export PDF passe par l'impression du navigateur (« Enregistrer au format PDF »), y compris sur Android.
- La photo d'un membre ne peut pas encore être remplacée depuis la gestion (supprimer puis réinscrire).
- Les formulaires nécessitent JavaScript.
- Les boutons rouges utilisent `#D01D37` (au lieu du rouge du logo `#EC2A45`) pour que le texte blanc reste lisible (contraste ≥ 4,5:1).
  Pour revenir au rouge exact : remplacer `bg-rouge-600` par `bg-rouge` dans `src/`.
- Hors périmètre V1 : module finances, emails professionnels.
