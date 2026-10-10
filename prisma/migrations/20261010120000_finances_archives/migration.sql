-- Finances (dons, dépenses, budgets, membres rémunérés, paiements) et archives.
-- CreateEnum
CREATE TYPE "TypeDonateur" AS ENUM ('MEMBRE', 'PASTEUR', 'EXTERNE', 'ANONYME');

-- CreateEnum
CREATE TYPE "CategorieDepense" AS ENUM ('ACTION_SOCIALE', 'EVENEMENT', 'COMMUNICATION', 'TRANSPORT', 'FONCTIONNEMENT', 'REMUNERATIONS', 'AUTRE');

-- CreateEnum
CREATE TYPE "Periodicite" AS ENUM ('MENSUEL', 'TRIMESTRIEL', 'PONCTUEL');

-- CreateEnum
CREATE TYPE "PeriodeBudget" AS ENUM ('MENSUEL', 'ANNUEL');

-- CreateEnum
CREATE TYPE "CategorieArchive" AS ENUM ('ADMINISTRATIF', 'FINANCIER', 'JURIDIQUE', 'EVENEMENT', 'AUTRE');

-- AlterEnum
CREATE TYPE "MoyenPaiement_new" AS ENUM ('ESPECES', 'MPESA', 'AIRTEL_MONEY', 'ORANGE_MONEY', 'BANQUE');
-- Anciens moyens de paiement -> nouveaux (mobile money générique -> M-Pesa, virement -> banque, autre -> espèces)
ALTER TABLE "Don" ALTER COLUMN "moyen" TYPE "MoyenPaiement_new" USING (
  CASE "moyen"::text WHEN 'MOBILE_MONEY' THEN 'MPESA' WHEN 'VIREMENT' THEN 'BANQUE' WHEN 'AUTRE' THEN 'ESPECES' ELSE "moyen"::text END
)::"MoyenPaiement_new";
ALTER TYPE "MoyenPaiement" RENAME TO "MoyenPaiement_old";
ALTER TYPE "MoyenPaiement_new" RENAME TO "MoyenPaiement";
DROP TYPE "public"."MoyenPaiement_old";

-- AlterTable
ALTER TABLE "Don" ADD COLUMN     "annuleLe" TIMESTAMP(3),
ADD COLUMN     "annuleParId" TEXT,
ADD COLUMN     "membreId" TEXT,
ADD COLUMN     "motif" TEXT,
ADD COLUMN     "motifAnnulation" TEXT,
ADD COLUMN     "numeroRecu" TEXT,
ADD COLUMN     "preuveId" INTEGER,
ADD COLUMN     "typeDonateur" "TypeDonateur";

-- Dons existants : numéro de reçu et type de donateur déduits
UPDATE "Don" SET "numeroRecu" = 'REC-' || to_char("date", 'YYYY') || '-' || lpad("id"::text, 4, '0'),
                 "typeDonateur" = CASE WHEN "donateur" IS NULL THEN 'ANONYME' ELSE 'EXTERNE' END::"TypeDonateur";
ALTER TABLE "Don" ALTER COLUMN "numeroRecu" SET NOT NULL, ALTER COLUMN "typeDonateur" SET NOT NULL;

-- CreateTable
CREATE TABLE "Depense" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" "Devise" NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "beneficiaire" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "justificatifId" INTEGER,
    "saisiParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annuleLe" TIMESTAMP(3),
    "annuleParId" TEXT,
    "motifAnnulation" TEXT,

    CONSTRAINT "Depense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" SERIAL NOT NULL,
    "categorie" "CategorieDepense" NOT NULL,
    "devise" "Devise" NOT NULL,
    "periode" "PeriodeBudget" NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembreRemunere" (
    "id" SERIAL NOT NULL,
    "membreId" TEXT NOT NULL,
    "fonction" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" "Devise" NOT NULL,
    "periodicite" "Periodicite" NOT NULL,
    "debut" DATE NOT NULL,
    "actif" BOOLEAN NOT NULL DEFAULT true,
    "designeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembreRemunere_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paiement" (
    "id" SERIAL NOT NULL,
    "numeroBordereau" TEXT NOT NULL,
    "remunereId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "periode" TEXT NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" "Devise" NOT NULL,
    "moyen" "MoyenPaiement" NOT NULL,
    "reference" TEXT,
    "preuveId" INTEGER,
    "valideParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "annuleLe" TIMESTAMP(3),
    "annuleParId" TEXT,
    "motifAnnulation" TEXT,

    CONSTRAINT "Paiement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Compteur" (
    "cle" TEXT NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Compteur_pkey" PRIMARY KEY ("cle")
);

-- CreateTable
CREATE TABLE "Archive" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "categorie" "CategorieArchive" NOT NULL,
    "dateDocument" DATE,
    "description" TEXT,
    "motsCles" TEXT[],
    "fichier" TEXT NOT NULL,
    "nomOriginal" TEXT NOT NULL,
    "mime" TEXT NOT NULL,
    "taille" INTEGER NOT NULL,
    "importeParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "supprimeeLe" TIMESTAMP(3),
    "supprimeeParId" TEXT,
    "motifSuppression" TEXT,

    CONSTRAINT "Archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Depense_date_idx" ON "Depense"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_categorie_devise_periode_key" ON "Budget"("categorie", "devise", "periode");

-- CreateIndex
CREATE UNIQUE INDEX "MembreRemunere_membreId_key" ON "MembreRemunere"("membreId");

-- CreateIndex
CREATE UNIQUE INDEX "Paiement_numeroBordereau_key" ON "Paiement"("numeroBordereau");

-- CreateIndex
CREATE INDEX "Paiement_periode_idx" ON "Paiement"("periode");

-- CreateIndex
CREATE INDEX "Archive_categorie_idx" ON "Archive"("categorie");

-- CreateIndex
CREATE INDEX "Archive_createdAt_idx" ON "Archive"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Don_numeroRecu_key" ON "Don"("numeroRecu");

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Member"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_preuveId_fkey" FOREIGN KEY ("preuveId") REFERENCES "Archive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_justificatifId_fkey" FOREIGN KEY ("justificatifId") REFERENCES "Archive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Depense" ADD CONSTRAINT "Depense_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembreRemunere" ADD CONSTRAINT "MembreRemunere_membreId_fkey" FOREIGN KEY ("membreId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembreRemunere" ADD CONSTRAINT "MembreRemunere_designeParId_fkey" FOREIGN KEY ("designeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_remunereId_fkey" FOREIGN KEY ("remunereId") REFERENCES "MembreRemunere"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_preuveId_fkey" FOREIGN KEY ("preuveId") REFERENCES "Archive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_valideParId_fkey" FOREIGN KEY ("valideParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Paiement" ADD CONSTRAINT "Paiement_annuleParId_fkey" FOREIGN KEY ("annuleParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archive" ADD CONSTRAINT "Archive_importeParId_fkey" FOREIGN KEY ("importeParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Archive" ADD CONSTRAINT "Archive_supprimeeParId_fkey" FOREIGN KEY ("supprimeeParId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

