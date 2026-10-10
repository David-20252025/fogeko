-- CreateEnum
CREATE TYPE "Devise" AS ENUM ('USD', 'CDF');

-- CreateEnum
CREATE TYPE "MoyenPaiement" AS ENUM ('ESPECES', 'MOBILE_MONEY', 'VIREMENT', 'AUTRE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'SUPERADMIN';

-- CreateTable
CREATE TABLE "Don" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" "Devise" NOT NULL,
    "donateur" TEXT,
    "telephone" TEXT,
    "moyen" "MoyenPaiement" NOT NULL,
    "reference" TEXT,
    "note" TEXT,
    "saisiParId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Don_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FondsMensuel" (
    "id" SERIAL NOT NULL,
    "mois" DATE NOT NULL,
    "montant" DECIMAL(14,2) NOT NULL,
    "devise" "Devise" NOT NULL,
    "note" TEXT,
    "declareParId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FondsMensuel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Don_date_idx" ON "Don"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FondsMensuel_mois_devise_key" ON "FondsMensuel"("mois", "devise");

-- AddForeignKey
ALTER TABLE "Don" ADD CONSTRAINT "Don_saisiParId_fkey" FOREIGN KEY ("saisiParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FondsMensuel" ADD CONSTRAINT "FondsMensuel_declareParId_fkey" FOREIGN KEY ("declareParId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
