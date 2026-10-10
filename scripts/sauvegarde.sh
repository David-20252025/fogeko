#!/bin/sh
# Sauvegarde de secours, à lancer sur le serveur (cron) si les sauvegardes Dokploy vers S3 ne sont pas configurées.
# Sauvegarde la base PostgreSQL et le volume des photos, conserve 14 jours.
#   Exemple cron (tous les jours à 2 h) :
#   0 2 * * * PG_SERVICE=fogeko-db PG_USER=fogeko PG_DB=fogeko UPLOADS_VOLUME=fogeko-uploads /opt/fogeko/sauvegarde.sh
set -eu
: "${PG_SERVICE:?nom (ou début du nom) du conteneur PostgreSQL}"
: "${PG_USER:?utilisateur PostgreSQL}"
: "${PG_DB:?nom de la base}"
: "${UPLOADS_VOLUME:?nom du volume des photos}"
DEST="${DEST:-/var/backups/fogeko}"
GARDER_JOURS="${GARDER_JOURS:-14}"
D=$(date +%F_%H%M)
mkdir -p "$DEST"

PG=$(docker ps -q -f "name=$PG_SERVICE" | head -n 1)
[ -n "$PG" ] || { echo "Conteneur PostgreSQL « $PG_SERVICE » introuvable" >&2; exit 1; }

docker exec "$PG" pg_dump -U "$PG_USER" -Fc "$PG_DB" > "$DEST/base_$D.dump"
docker run --rm -v "$UPLOADS_VOLUME":/data:ro -v "$DEST":/backup alpine tar czf "/backup/photos_$D.tar.gz" -C /data .

# Une sauvegarde vide est une erreur, pas une réussite
[ -s "$DEST/base_$D.dump" ] || { echo "Sauvegarde de la base vide !" >&2; exit 1; }
find "$DEST" -type f \( -name 'base_*.dump' -o -name 'photos_*.tar.gz' \) -mtime +"$GARDER_JOURS" -delete
echo "OK : $DEST/base_$D.dump et photos_$D.tar.gz"
