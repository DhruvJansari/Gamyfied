-- CreateEnum
CREATE TYPE "OnboardingGoal" AS ENUM ('GET_HIRED', 'BUILD_AUDIENCE', 'COMPETE');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('WEB_DEV', 'MOBILE_DEV', 'AI_ML', 'DSA_CP', 'DEVOPS_CLOUD', 'GAME_DEV', 'CYBERSECURITY', 'DATA_SCIENCE');

-- CreateTable
CREATE TABLE "onboarding" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "stack" TEXT[],
    "goal" "OnboardingGoal" NOT NULL,
    "categories" "SkillCategory"[],
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_user_id_key" ON "onboarding"("user_id");

-- AddForeignKey
ALTER TABLE "onboarding" ADD CONSTRAINT "onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
