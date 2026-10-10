-- RBAC : les rôles deviennent une table (permissions par module), avec reprise des comptes existants.

-- 1. L'ancien type enum « Role » libère son nom (une table et un type ne peuvent pas porter le même nom)
ALTER TYPE "Role" RENAME TO "Role_ancien";

CREATE TYPE "Module" AS ENUM ('MEMBRES', 'ACTUALITES', 'GALERIE', 'ACTIONS', 'FINANCES', 'ARCHIVES', 'ADMINISTRATION', 'TEXTES', 'MESSAGES');

CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "superAdmin" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Role_nom_key" ON "Role"("nom");

-- 2. Rôles de départ (les permissions par module sont créées par le seed)
INSERT INTO "Role" ("nom", "superAdmin") VALUES
  ('Super admin', true), ('Administrateur', false), ('Trésorier', false),
  ('Secrétaire', false), ('Communication', false), ('Lecteur', false);

-- 3. Reprise des comptes existants
ALTER TABLE "User" ADD COLUMN "roleId" INTEGER, ADD COLUMN "photo" TEXT;
UPDATE "User" u SET "roleId" = r."id" FROM "Role" r
WHERE r."nom" = CASE u."role"::text
  WHEN 'SUPERADMIN' THEN 'Super admin'
  WHEN 'ADMIN' THEN 'Administrateur'
  WHEN 'SECRETAIRE' THEN 'Secrétaire'
  ELSE 'Lecteur' END;
ALTER TABLE "User" ALTER COLUMN "roleId" SET NOT NULL;
ALTER TABLE "User" DROP COLUMN "role";
DROP TYPE "Role_ancien";
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Permissions, personnalisations, journal, paramètres
CREATE TABLE "RolePermission" (
    "roleId" INTEGER NOT NULL,
    "module" "Module" NOT NULL,
    "voir" BOOLEAN NOT NULL DEFAULT false,
    "creer" BOOLEAN NOT NULL DEFAULT false,
    "modifier" BOOLEAN NOT NULL DEFAULT false,
    "supprimer" BOOLEAN NOT NULL DEFAULT false,
    "exporter" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId","module")
);
CREATE TABLE "UserPermission" (
    "userId" TEXT NOT NULL,
    "module" "Module" NOT NULL,
    "voir" BOOLEAN,
    "creer" BOOLEAN,
    "modifier" BOOLEAN,
    "supprimer" BOOLEAN,
    "exporter" BOOLEAN,
    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("userId","module")
);
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entite" TEXT,
    "entiteId" TEXT,
    "details" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");
CREATE TABLE "Parametres" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "adresseFondation" TEXT,
    "tauxUsdCdf" DECIMAL(14,4),
    CONSTRAINT "Parametres_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPermission" ADD CONSTRAINT "UserPermission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
