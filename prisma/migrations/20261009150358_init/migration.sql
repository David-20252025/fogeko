-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SECRETAIRE', 'LECTEUR');

-- CreateEnum
CREATE TYPE "Sexe" AS ENUM ('F', 'M');

-- CreateEnum
CREATE TYPE "Categorie" AS ENUM ('MAMAN', 'PAPA', 'JEUNE', 'PASTEUR');

-- CreateEnum
CREATE TYPE "StatutMembre" AS ENUM ('EN_ATTENTE', 'ACTIF', 'SUSPENDU');

-- CreateEnum
CREATE TYPE "TypeMedia" AS ENUM ('PHOTO', 'VIDEO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'LECTEUR',
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Commune" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,

    CONSTRAINT "Commune_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "numero" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "postNom" TEXT,
    "prenom" TEXT NOT NULL,
    "sexe" "Sexe" NOT NULL,
    "dateNaissance" TIMESTAMP(3),
    "telephone" TEXT NOT NULL,
    "email" TEXT,
    "communeId" INTEGER NOT NULL,
    "quartier" TEXT NOT NULL,
    "profession" TEXT,
    "categorie" "Categorie" NOT NULL,
    "egliseMinistere" TEXT,
    "photo" TEXT NOT NULL,
    "photoThumb" TEXT NOT NULL,
    "dateAdhesion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "statut" "StatutMembre" NOT NULL DEFAULT 'EN_ATTENTE',
    "consentement" BOOLEAN NOT NULL,
    "consentementDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "heroTitre" TEXT NOT NULL,
    "heroSousTitre" TEXT NOT NULL,
    "statMembres" INTEGER NOT NULL,
    "statCommunes" INTEGER NOT NULL,
    "statActions" INTEGER NOT NULL,
    "mission" TEXT NOT NULL,
    "vision" TEXT NOT NULL,
    "valeurs" TEXT NOT NULL,
    "fondateurBio" TEXT NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "telephone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "adresse" TEXT NOT NULL,
    "facebook" TEXT,
    "youtube" TEXT,
    "tiktok" TEXT,
    "instagram" TEXT,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimelineEvent" (
    "id" SERIAL NOT NULL,
    "annee" TEXT NOT NULL,
    "titre" TEXT NOT NULL,
    "texte" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Action" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resume" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "publiee" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Action_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewsCategory" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "NewsCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Article" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categorieId" INTEGER NOT NULL,
    "image" TEXT NOT NULL,
    "extrait" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "publieLe" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publie" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Article_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" SERIAL NOT NULL,
    "type" "TypeMedia" NOT NULL,
    "titre" TEXT NOT NULL,
    "image" TEXT,
    "videoUrl" TEXT,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ordre" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContactMessage" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "telephone" TEXT,
    "email" TEXT,
    "message" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContactMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Commune_nom_key" ON "Commune"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "Member_numero_key" ON "Member"("numero");

-- CreateIndex
CREATE UNIQUE INDEX "Member_telephone_key" ON "Member"("telephone");

-- CreateIndex
CREATE INDEX "Member_nom_prenom_idx" ON "Member"("nom", "prenom");

-- CreateIndex
CREATE INDEX "Member_categorie_idx" ON "Member"("categorie");

-- CreateIndex
CREATE INDEX "Member_statut_idx" ON "Member"("statut");

-- CreateIndex
CREATE UNIQUE INDEX "Action_slug_key" ON "Action"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "NewsCategory_nom_key" ON "NewsCategory"("nom");

-- CreateIndex
CREATE UNIQUE INDEX "NewsCategory_slug_key" ON "NewsCategory"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Article_slug_key" ON "Article"("slug");

-- CreateIndex
CREATE INDEX "Article_publie_publieLe_idx" ON "Article"("publie", "publieLe");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_communeId_fkey" FOREIGN KEY ("communeId") REFERENCES "Commune"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Article" ADD CONSTRAINT "Article_categorieId_fkey" FOREIGN KEY ("categorieId") REFERENCES "NewsCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
