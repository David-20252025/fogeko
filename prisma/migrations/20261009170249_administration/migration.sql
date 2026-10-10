-- CreateTable
CREATE TABLE "Dirigeant" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "postNom" TEXT,
    "prenom" TEXT NOT NULL,
    "poste" TEXT NOT NULL,
    "photo" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dirigeant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dirigeant_publie_ordre_idx" ON "Dirigeant"("publie", "ordre");
