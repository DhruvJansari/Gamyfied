-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('GITHUB', 'GITLAB', 'LINKEDIN', 'LEETCODE', 'CODEFORCES', 'STACKOVERFLOW', 'HACKERRANK', 'KAGGLE', 'DEVTO', 'HASHNODE', 'MEDIUM', 'X');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('CLAIMED', 'LINKED', 'VERIFIED');

-- CreateEnum
CREATE TYPE "ProjectType" AS ENUM ('PUBLIC', 'PRIVATE');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('NOT_VERIFIED', 'VERIFICATION_PENDING', 'VERIFIED', 'PARTIALLY_VERIFIED', 'FAILED', 'INACCESSIBLE');

-- CreateEnum
CREATE TYPE "ParticipationKind" AS ENUM ('HACKATHON', 'OPEN_SOURCE', 'COMMUNITY', 'EVENT', 'FREELANCE', 'COLLABORATION', 'OTHER');

-- CreateEnum
CREATE TYPE "VerificationSubject" AS ENUM ('PROJECT', 'SOCIAL_LINK', 'PARTICIPATION');

-- CreateEnum
CREATE TYPE "VerificationSource" AS ENUM ('MOCK', 'AGENT');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "avatar_url" VARCHAR(500),
ADD COLUMN     "profile_url" VARCHAR(500),
ADD COLUMN     "provider_username" VARCHAR(100);

-- CreateTable
CREATE TABLE "profiles" (
    "user_id" UUID NOT NULL,
    "avatar_url" VARCHAR(500),
    "headline" VARCHAR(120),
    "bio" VARCHAR(2000),
    "location" VARCHAR(80),
    "website_url" VARCHAR(500),
    "years_of_experience" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "social_links" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "trust_level" "TrustLevel" NOT NULL DEFAULT 'CLAIMED',
    "account_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "social_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "technologies" TEXT[],
    "repo_url" VARCHAR(500),
    "live_url" VARCHAR(500),
    "project_type" "ProjectType" NOT NULL DEFAULT 'PUBLIC',
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "kind" "ParticipationKind" NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "note" VARCHAR(500),
    "url" VARCHAR(500),
    "year" INTEGER,
    "verification_status" "VerificationStatus" NOT NULL DEFAULT 'NOT_VERIFIED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "participations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "subject_type" "VerificationSubject" NOT NULL,
    "subject_id" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'VERIFICATION_PENDING',
    "source" "VerificationSource" NOT NULL,
    "requested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "signals" JSONB,
    "result" JSONB,
    "points" INTEGER,
    "error_code" VARCHAR(64),

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profile_scores" (
    "user_id" UUID NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 0,
    "breakdown" JSONB NOT NULL,
    "rules_version" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_scores_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "scores" (
    "user_id" UUID NOT NULL,
    "base" INTEGER NOT NULL DEFAULT 1000,
    "total" INTEGER NOT NULL DEFAULT 1000,
    "is_ranked" BOOLEAN NOT NULL DEFAULT false,
    "ranked_at" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("user_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "social_links_user_id_platform_key" ON "social_links"("user_id", "platform");

-- CreateIndex
CREATE INDEX "projects_user_id_idx" ON "projects"("user_id");

-- CreateIndex
CREATE INDEX "participations_user_id_idx" ON "participations"("user_id");

-- CreateIndex
CREATE INDEX "verifications_subject_type_subject_id_requested_at_idx" ON "verifications"("subject_type", "subject_id", "requested_at");

-- CreateIndex
CREATE INDEX "verifications_user_id_idx" ON "verifications"("user_id");

-- CreateIndex
CREATE INDEX "scores_is_ranked_total_idx" ON "scores"("is_ranked", "total");

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "social_links" ADD CONSTRAINT "social_links_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participations" ADD CONSTRAINT "participations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifications" ADD CONSTRAINT "verifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "profile_scores" ADD CONSTRAINT "profile_scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: every existing user gets an empty profile and the 1000 base score, the same
-- rows `createUser` now writes for new sign-ups. profile_scores is left to the first
-- recompute so its breakdown is produced by the engine, never hand-written here.
INSERT INTO "profiles" ("user_id", "updated_at")
SELECT "id", CURRENT_TIMESTAMP FROM "users"
ON CONFLICT ("user_id") DO NOTHING;

INSERT INTO "scores" ("user_id", "updated_at")
SELECT "id", CURRENT_TIMESTAMP FROM "users"
ON CONFLICT ("user_id") DO NOTHING;
