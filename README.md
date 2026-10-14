# Fondation Gekoko (FOGEKO) — site et gestion des membres

Site public (accueil, à propos, administration, actions, actualités, galerie, adhésion en ligne, contact) et espace de gestion
(`/gestion` : membres, tableau de bord, exports, cartes de membre, contenus, utilisateurs).
Connexion : **`/connexion`** (ou lien « Connexion » en bas de chaque page).

**Technique** : Next.js 16 · Prisma 7 · PostgreSQL · Tailwind CSS 4 · Docker (Dokploy).

---

## 0. Mise en ligne avec Dokploy — l'essentiel

Guide détaillé (captures des réglages, sauvegardes, dépannage) : **[DEPLOIEMENT_DOKPLOY.md](DEPLOIEMENT_DOKPLOY.md)**.

1. **Pousser le code** sur GitHub/GitLab (branche `main`). `.env`, `uploads/` et `.pgdata/` restent hors du dépôt (`.gitignore`).
2. **DNS** : enregistrements A `fogeko.com` et `www.fogeko.com` → IP du serveur Dokploy.
3. **Dokploy → Create Project « FOGEKO » → Create Service → Database → PostgreSQL** (base, utilisateur `fogeko`,
   mot de passe long) → *Deploy* → copier l'**Internal Connection URL**.
4. **Create Service → Application** : source = le dépôt, branche `main`, **Build Type : Dockerfile**.
5. **Environment** (modèle : [.env.production.example](.env.production.example)) :
   ```
   DATABASE_URL=<Internal Connection URL>
   AUTH_SECRET=<openssl rand -hex 32>
   SITE_URL=https://fogeko.com
   ADMIN_EMAIL=asumanid7@gmail.com
   ADMIN_PASSWORD=<10 caractères minimum>
   ```
6. **Volume** (indispensable) : volume nommé `fogeko-uploads` monté sur **`/app/uploads`** — il contient les photos
   **et les archives** (PDF, justificatifs). Sans lui, tout est perdu à chaque redéploiement.
7. **Domains** : `fogeko.com` et `www.fogeko.com`, port **3000**, HTTPS + Let's Encrypt.
8. **Deploy**, puis vérifier : `https://fogeko.com/health` → `{"status":"ok"}`, connexion sur `/connexion`.
9. **Le jour même** : sauvegardes automatiques de la base et du volume (section 4 du guide), puis retirer
   `ADMIN_EMAIL` / `ADMIN_PASSWORD` de l'Environment.

Au démarrage, le conteneur applique seul les migrations et les données initiales (communes, textes, rôles, premier
super admin) : rien à lancer à la main. Mise à jour du code = push sur `main` puis *Deploy*.

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
src/app/gestion/impression/ Cartes de membre à imprimer (la liste PDF est générée par membres/export?format=pdf)
src/components/             Composants (en-tête, pied de page, formulaire d'adhésion, admin/…)
src/lib/                    Logique : auth, base, validation, stockage des photos, filtres
public/img/                 Logo et photos du site (WebP)
uploads/                    Photos envoyées (membres = privé, contenus = public via /media) — NE PAS committer
tests/                      Tests automatiques
```

## 4. Rôles

Six rôles : **Super admin**, Administrateur, Trésorier, Secrétaire, Communication, Lecteur. Chaque rôle a des droits
(voir / créer / modifier / supprimer / exporter) sur les 9 modules, modifiables dans **Administration → Rôles** ;
un compte peut recevoir des droits personnalisés. Le super admin a tous les droits, crée les comptes (photo obligatoire),
déclare le fonds mensuel, désigne les membres rémunérés et seul peut supprimer une archive. Toutes les actions
sensibles sont inscrites dans **Administration → Journal**.

Le premier compte créé au déploiement (`ADMIN_EMAIL`) est super admin ; il doit toujours en rester au moins un.
Chacun change son mot de passe dans **Mon profil**.

### Cartes de membre

Dans **Membres**, cochez les membres puis « Cartes · format CR80 » (une carte par page, 85,6 × 54 mm, pour imprimante
à cartes ou PDF) ou « Cartes · planche A4 » (10 cartes à découper). Pour un PDF : fenêtre d'impression →
« Enregistrer au format PDF », marges **Aucune**, échelle **100 %**.

### Finances

**Finances** (administrateurs) : dons reçus (date, montant, devise USD/CDF, moyen, donateur ou anonyme, référence) et
fonds mensuel déclaré par un super administrateur (un par mois et par devise, une nouvelle déclaration remplace la
précédente). Résumé du mois et historique sur 12 mois ; les devises ne sont jamais additionnées entre elles.

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
- La liste des membres et les rapports financiers se téléchargent directement en PDF ; seules les cartes de membre passent par la fenêtre d'impression (format exact CR80).
- Les formulaires nécessitent JavaScript.
- Les boutons rouges utilisent `#D01D37` (au lieu du rouge du logo `#EC2A45`) pour que le texte blanc reste lisible (contraste ≥ 4,5:1).
  Pour revenir au rouge exact : remplacer `bg-rouge-600` par `bg-rouge` dans `src/`.
- Hors périmètre : modification d'un don (le supprimer puis le ressaisir), export Excel des finances, emails professionnels.
