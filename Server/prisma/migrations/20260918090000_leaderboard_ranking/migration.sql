-- CreateEnum
CREATE TYPE "ScoreDomain" AS ENUM ('PROFILE', 'ACTIVITY', 'POPULARITY', 'CLAN', 'EVENT');

-- CreateEnum
CREATE TYPE "RankSnapshotReason" AS ENUM ('SCORE_CHANGE', 'PLACED', 'DAILY');

-- profile_scores becomes score_components: the same rows, now keyed by (user, domain) with
-- every existing row being the PROFILE domain. Renamed in place (not dropped and recreated)
-- so stored breakdowns survive. Hand-written for that reason — do not regenerate.
ALTER TABLE "profile_scores" RENAME TO "score_components";
ALTER TABLE "score_components" RENAME CONSTRAINT "profile_scores_user_id_fkey" TO "score_components_user_id_fkey";
ALTER TABLE "score_components" ADD COLUMN "domain" "ScoreDomain" NOT NULL DEFAULT 'PROFILE';
ALTER TABLE "score_components" ALTER COLUMN "domain" DROP DEFAULT;
ALTER TABLE "score_components" ALTER COLUMN "breakdown" DROP NOT NULL;
ALTER TABLE "score_components" DROP CONSTRAINT "profile_scores_pkey";
ALTER TABLE "score_components" ADD CONSTRAINT "score_components_pkey" PRIMARY KEY ("user_id", "domain");

-- AlterTable: when the total last changed value. Backfilled from updated_at, the closest thing
-- we have for existing rows.
ALTER TABLE "scores" ADD COLUMN "total_changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "scores" SET "total_changed_at" = "updated_at";

-- CreateTable
CREATE TABLE "rank_snapshots" (
    "id" UUID NOT NULL,
    "board_key" VARCHAR(64) NOT NULL,
    "user_id" UUID NOT NULL,
    "rank" INTEGER NOT NULL,
    "tier" VARCHAR(4) NOT NULL,
    "tier_rules_version" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "total_ranked" INTEGER NOT NULL,
    "reason" "RankSnapshotReason" NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rank_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rank_snapshots_user_id_board_key_captured_at_idx" ON "rank_snapshots"("user_id", "board_key", "captured_at" DESC);

-- AddForeignKey
ALTER TABLE "rank_snapshots" ADD CONSTRAINT "rank_snapshots_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
