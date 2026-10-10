# Déployer FOGEKO avec Dokploy (fogeko.com)

L'application est livrée sous forme de **Dockerfile**. Au démarrage, le conteneur applique les migrations,
complète les données initiales (sans écraser ce qui a été modifié dans l'admin), puis lance le site.

> Les intitulés de l'interface Dokploy peuvent varier légèrement selon la version installée.

## Ce qui est déjà prêt

Le premier démarrage sur une base vide a été simulé de bout en bout : migrations, données initiales, création de
l'administrateur `asumanid7@gmail.com`, coordonnées réelles (téléphones +243 898 928 888 / +243 896 370 519,
WhatsApp +243 907 230 023, fogeko@gmail.com), aucun contenu fictif (ni membres, ni articles d'exemple, ni chiffres),
première adhésion numérotée FOGEKO-0001.

## 0. Prérequis

- Un serveur (VPS) avec Dokploy installé : https://docs.dokploy.com/docs/core/installation
- Le code dans un dépôt Git (GitHub, GitLab, Gitea…). Le dossier `uploads/`, `.env` et `.pgdata/` ne doivent **jamais** être committés (déjà dans `.gitignore`).
- Chez le registrar du domaine : enregistrements **A** `fogeko.com` et `www.fogeko.com` → adresse IP du serveur.

## 1. Créer la base PostgreSQL

1. Dans Dokploy : **Projects → Create Project** « FOGEKO ».
2. Dans le projet : **Create Service → Database → PostgreSQL** (version 17 ou plus récente).
   - Database name : `fogeko` · User : `fogeko` · Password : un mot de passe long et aléatoire.
3. **Deploy**, puis noter l'**Internal Connection URL** (commence par `postgresql://…`). Ne pas exposer la base sur Internet.

## 2. Créer l'application

1. **Create Service → Application** « fogeko-site ».
2. Onglet **General** : source = votre dépôt Git, branche `main` ; **Build Type : Dockerfile** (chemin `./Dockerfile`).
3. Onglet **Environment** :

   Modèle prêt à remplir : [.env.production.example](.env.production.example)

   ```
   DATABASE_URL=<Internal Connection URL de l'étape 1>
   AUTH_SECRET=<64 caractères aléatoires : openssl rand -hex 32>
   SITE_URL=https://fogeko.com
   ADMIN_EMAIL=asumanid7@gmail.com
   ADMIN_PASSWORD=<votre mot de passe, 10 caractères minimum>
   ```

   `ADMIN_EMAIL` / `ADMIN_PASSWORD` ne servent qu'au tout premier démarrage (création du compte si aucun n'existe).
   Après la première connexion : changer le mot de passe dans **/gestion/utilisateurs**, puis supprimer ces deux variables.

4. **Advanced → Volumes / Mounts** → *Volume Mount* :
   - Volume name : `fogeko-uploads`
   - Mount path : `/app/uploads`

   ⚠️ Indispensable : sans ce volume, **les photos des membres et des actualités sont perdues à chaque redéploiement**.
   Utiliser un *volume nommé* (pas un bind mount) : c'est ce qui permet les Volume Backups (étape 4).

5. Onglet **Domains** → ajouter `fogeko.com` : path `/`, **container port `3000`**, **HTTPS activé**, certificat **Let's Encrypt**.
   Ajouter aussi `www.fogeko.com` (même réglage).

6. **Deploy**. Suivre l'onglet **Logs** : on doit voir les migrations, puis le démarrage de Next.js.

## 3. Vérifier

- `https://fogeko.com/health` répond `{"status":"ok"}` (si `503` : la base n'est pas joignable → vérifier `DATABASE_URL`).
- `https://fogeko.com` s'affiche, le cadenas HTTPS est présent.
- `https://fogeko.com/gestion` → connexion avec le compte administrateur.
- Faire une adhésion test depuis un téléphone, la retrouver dans **Membres**, puis la supprimer.
- Partager un lien d'actualité dans WhatsApp : l'aperçu (image + titre) doit apparaître.
- Lancer **Lighthouse** (Chrome → F12 → Lighthouse → Mobile) sur l'accueil et l'adhésion.

## 4. Sauvegardes automatiques (à faire le jour même)

Il faut sauvegarder **deux choses** : la base de données et le volume des photos.

1. **Destination S3** : *Settings → Destinations* (Backblaze B2, Cloudflare R2, AWS S3, Wasabi…) :
   Access key, Secret key, Bucket, Region, Endpoint. Le bucket doit déjà exister. Utiliser un fournisseur **hors du serveur**.
2. **Base** : service PostgreSQL → onglet **Backups** → destination, base `fogeko`, planification `0 2 * * *` (chaque nuit à 2 h),
   prefix `fogeko/db`. Cliquer sur **Test** pour vérifier.
3. **Photos** : section **Volume Backups** de l'application → volume `fogeko-uploads`, planification `30 2 * * *`, prefix `fogeko/photos`.
4. Configurer côté fournisseur S3 une règle de conservation (par ex. 30 jours).

Restauration : onglet **Backups** de la base → *Restore* ; **Volume Backups** → *Restore Volume*.
Faire **un essai de restauration** au moins une fois (sur une base de test) : une sauvegarde jamais restaurée n'est pas une sauvegarde.

Sans S3 : le script `scripts/sauvegarde.sh` sauvegarde base + photos sur le serveur via `cron`
(instructions en tête du fichier). C'est un dépannage : une copie restée sur le même serveur ne protège pas d'une panne de celui-ci.

Docs : [Backups](https://docs.dokploy.com/docs/core/databases/backups) · [Volume Backups](https://docs.dokploy.com/docs/core/volume-backups)

## 5. Mises à jour

- **Contenus** : depuis `/gestion`, aucune intervention technique.
- **Code** : pousser sur `main`, puis **Deploy** (ou activer le webhook dans l'onglet *Deployments* pour déployer à chaque push).
  Les migrations de base sont appliquées automatiquement au démarrage du nouveau conteneur.
- En cas de problème : onglet **Deployments** → redéployer la version précédente.

## 6. Dépannage

| Symptôme | Cause probable |
|---|---|
| Le conteneur redémarre en boucle, log « DATABASE_URL manquant » / « AUTH_SECRET manquant » | Variable absente dans *Environment* |
| `/health` renvoie 503 | Base arrêtée ou `DATABASE_URL` incorrecte |
| Photos disparues après un déploiement | Volume `/app/uploads` non monté (étape 2.4) |
| Erreur à l'envoi d'une photo (« permission denied ») | Volume monté sur un dossier hôte non accessible à l'utilisateur 1001 : utiliser un volume nommé |
| Aperçu WhatsApp sans image | `SITE_URL` incorrect ; vérifier aussi que le site est bien en HTTPS |
| « Trop de tentatives » à la connexion | Attendre 15 min, ou un administrateur clique sur *Débloquer* dans `/gestion/utilisateurs` |
| Mot de passe administrateur perdu | Terminal du conteneur dans Dokploy : `cd /app/tools && ADMIN_EMAIL=… ADMIN_PASSWORD=… node node_modules/tsx/dist/cli.mjs scripts/admin.ts` |

## Ce que fait l'image Docker

- Build Next.js en mode `standalone` (image légère, Node 24 Alpine), lancé avec l'utilisateur non-root `nextjs`.
- `docker-entrypoint.sh` : `prisma migrate deploy` → `prisma/seed.ts` (idempotent) → `node server.js`.
- Vérification de santé intégrée (`HEALTHCHECK` sur `/health`).
- En production, le seed ne crée **ni articles d'exemple ni chiffres fictifs** (les chiffres à 0 sont masqués sur l'accueil).
