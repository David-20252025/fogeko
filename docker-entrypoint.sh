#!/bin/sh
# Au démarrage du conteneur : applique les migrations, complète les données initiales, puis lance le site.
set -e
: "${DATABASE_URL:?DATABASE_URL manquant}"
: "${AUTH_SECRET:?AUTH_SECRET manquant (32 caractères minimum)}"

cd /app/tools
node node_modules/prisma/build/index.js migrate deploy
# Idempotent : ne modifie jamais ce qui a été changé depuis l'admin
node node_modules/tsx/dist/cli.mjs prisma/seed.ts

cd /app
exec node server.js
