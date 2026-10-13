# Déployer FOGEKO sur Vercel (fogeko.com)

Vercel construit le site à chaque `git push`. Pendant le build, la commande `vercel-build` de `package.json`
applique les migrations, crée les données initiales (communes, textes, rôles, premier super admin) puis compile le site :
rien à lancer à la main.

> Les intitulés de l'interface Vercel peuvent varier légèrement.

## Différences avec Dokploy (à connaître)

- **Fichiers** (photos, archives, justificatifs) : stockés dans **Vercel Blob** en mode **privé**, car le disque d'une
  fonction Vercel est effacé. Ils restent servis uniquement après connexion, comme avant.
- **Taille maximale d'un fichier envoyé : 4 Mo** (Vercel refuse les requêtes de plus de 4,5 Mo). Les photos de
  l'adhésion sont déjà réduites dans le téléphone avant l'envoi.
- **Limites anti-abus** (connexion, adhésion, contact) gardées en mémoire : sur Vercel, chaque instance a ses propres
  compteurs, la protection est donc plus souple. Le blocage du compte après 5 échecs, lui, est en base et reste fiable.

## 1. Mettre le code sur GitHub

Le dépôt `https://github.com/David-20252025/fogeko` doit contenir le projet à la racine (`package.json`, `src/`, `prisma/`…).
Ne jamais committer `.env` ni `uploads/` (déjà dans `.gitignore`).

## 2. Créer le projet Vercel

1. https://vercel.com → **Add New… → Project** → importer le dépôt `fogeko`.
2. Framework : **Next.js** (détecté). Root Directory : `./`. Ne pas changer les commandes : Vercel utilise
   automatiquement le script `vercel-build`.
3. Ne pas encore cliquer sur Deploy : ajouter d'abord la base et le stockage (étapes 3 et 4).

## 3. Base de données PostgreSQL

Dans le projet Vercel : **Storage → Create Database → Neon (Postgres)**, région **Frankfurt (fra1)** ou la plus proche.
Vercel ajoute la variable `DATABASE_URL` au projet.

⚠️ Utiliser l'URL **sans pooler** (connexion directe, l'hôte ne contient pas `-pooler`) : les migrations Prisma
ne fonctionnent pas à travers le pooler. Si Vercel a mis l'URL avec `-pooler`, la remplacer dans
*Settings → Environment Variables* par l'URL « direct » affichée dans le tableau de bord Neon.

Région des fonctions : *Settings → Functions → Function Region* = la même région que la base (ex. `fra1`).

## 4. Stockage des fichiers (Vercel Blob)

**Storage → Create → Blob** → accès **Private** → connecter au projet.
Vercel ajoute la variable `BLOB_READ_WRITE_TOKEN` : sa présence active automatiquement le stockage Blob.

## 5. Variables d'environnement

*Settings → Environment Variables* (environnement **Production**) :

```
AUTH_SECRET=<64 caractères aléatoires : openssl rand -hex 32>
SITE_URL=https://fogeko.com
ADMIN_EMAIL=asumanid7@gmail.com
ADMIN_PASSWORD=<10 caractères minimum>
NEXT_TELEMETRY_DISABLED=1
```

`DATABASE_URL` et `BLOB_READ_WRITE_TOKEN` sont ajoutées par les étapes 3 et 4.
`ADMIN_EMAIL` / `ADMIN_PASSWORD` ne servent qu'au premier déploiement (base vide) ; les supprimer ensuite et changer
le mot de passe dans **Mon profil**.

## 6. Déployer et brancher le domaine

1. **Deployments → Redeploy** (ou un `git push`). Dans les logs du build : migrations, « Compte super admin créé », puis Next.js.
2. *Settings → Domains* → ajouter `fogeko.com` et `www.fogeko.com`, puis créer chez le registrar les enregistrements
   DNS indiqués par Vercel. Le certificat HTTPS est automatique.

## 7. Vérifier

- `https://fogeko.com/health` → `{"status":"ok"}` (sinon : `DATABASE_URL` incorrecte).
- Connexion sur `/connexion`, puis envoi d'une photo de profil et d'une archive PDF : elles doivent s'afficher.
- **Finances → Rapports** : le PDF s'ouvre avec le logo.
- Une adhésion test depuis un téléphone, puis la supprimer.

## 8. Sauvegardes

- **Base** : Neon garde un historique (restauration à un instant donné, durée selon l'offre). Pour une copie hors Neon :
  `pg_dump "<DATABASE_URL>" > sauvegarde.sql` régulièrement.
- **Fichiers Blob** : pas de sauvegarde automatique ; à exporter si besoin avec l'API Blob (`list` puis téléchargement).

## Dépannage

| Symptôme | Cause probable |
|---|---|
| Build en échec sur `prisma migrate deploy` | `DATABASE_URL` absente ou URL avec `-pooler` |
| `/health` renvoie 503 | Base suspendue ou `DATABASE_URL` incorrecte |
| « Fichier manquant » sur une photo ou une archive | `BLOB_READ_WRITE_TOKEN` absent ou store Blob non connecté |
| Erreur à l'envoi d'un fichier | Fichier de plus de 4 Mo |
| Mot de passe administrateur perdu | En local, avec la `DATABASE_URL` de production : `ADMIN_EMAIL=… ADMIN_PASSWORD=… npm run admin` |
