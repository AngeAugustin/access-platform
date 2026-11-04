-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('REQUESTED', 'ACTIVE', 'DECLINED', 'CANCELLED', 'ENDED');

-- CreateEnum
CREATE TYPE "FollowUpTaskKind" AS ENUM ('LESSONS', 'HOMEWORK', 'SCHOOL_VISIT', 'OTHER');

-- CreateEnum
CREATE TYPE "OccurrenceStatus" AS ENUM ('PENDING', 'DONE', 'PARTIAL', 'NOT_DONE', 'MISSED');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TUTOR';

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "zone" TEXT,
    "occupation" TEXT,
    "bio" TEXT,
    "guarantorName" TEXT,
    "guarantorPhone" TEXT,
    "payoutPhone" TEXT,
    "payoutOperator" "MobileOperator",
    "status" "ProfileStatus" NOT NULL DEFAULT 'INCOMPLETE',
    "rejectionReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "validatedAt" TIMESTAMP(3),
    "validatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorDocument" (
    "id" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "originalName" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "parentId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'REQUESTED',
    "startDate" DATE NOT NULL,
    "message" TEXT,
    "monthlyPrice" INTEGER NOT NULL,
    "commissionPercent" INTEGER NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "declineReason" TEXT,
    "endedAt" TIMESTAMP(3),
    "endReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpChild" (
    "followUpId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,

    CONSTRAINT "FollowUpChild_pkey" PRIMARY KEY ("followUpId","childId")
);

-- CreateTable
CREATE TABLE "FollowUpTask" (
    "id" TEXT NOT NULL,
    "followUpId" TEXT NOT NULL,
    "kind" "FollowUpTaskKind" NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "childIds" TEXT[],
    "days" "Weekday"[],
    "intervalWeeks" INTEGER NOT NULL DEFAULT 1,
    "dueHour" INTEGER NOT NULL DEFAULT 21,
    "photoRequired" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowUpTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskOccurrence" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "status" "OccurrenceStatus" NOT NULL DEFAULT 'PENDING',
    "comment" TEXT,
    "grades" JSONB,
    "reportedAt" TIMESTAMP(3),
    "parentSeenAt" TIMESTAMP(3),
    "parentComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OccurrencePhoto" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OccurrencePhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_status_idx" ON "TutorProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TutorDocument_storageKey_key" ON "TutorDocument"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "TutorDocument_tutorId_type_key" ON "TutorDocument"("tutorId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "FollowUp_reference_key" ON "FollowUp"("reference");

-- CreateIndex
CREATE INDEX "FollowUp_parentId_idx" ON "FollowUp"("parentId");

-- CreateIndex
CREATE INDEX "FollowUp_tutorId_idx" ON "FollowUp"("tutorId");

-- CreateIndex
CREATE INDEX "FollowUp_status_idx" ON "FollowUp"("status");

-- CreateIndex
CREATE INDEX "FollowUpTask_followUpId_idx" ON "FollowUpTask"("followUpId");

-- CreateIndex
CREATE INDEX "TaskOccurrence_status_dueAt_idx" ON "TaskOccurrence"("status", "dueAt");

-- CreateIndex
CREATE INDEX "TaskOccurrence_childId_date_idx" ON "TaskOccurrence"("childId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "TaskOccurrence_taskId_childId_date_key" ON "TaskOccurrence"("taskId", "childId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "OccurrencePhoto_storageKey_key" ON "OccurrencePhoto"("storageKey");

-- CreateIndex
CREATE INDEX "OccurrencePhoto_occurrenceId_idx" ON "OccurrencePhoto"("occurrenceId");

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorDocument" ADD CONSTRAINT "TutorDocument_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUp" ADD CONSTRAINT "FollowUp_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpChild" ADD CONSTRAINT "FollowUpChild_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpChild" ADD CONSTRAINT "FollowUpChild_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpTask" ADD CONSTRAINT "FollowUpTask_followUpId_fkey" FOREIGN KEY ("followUpId") REFERENCES "FollowUp"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "FollowUpTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskOccurrence" ADD CONSTRAINT "TaskOccurrence_childId_fkey" FOREIGN KEY ("childId") REFERENCES "Child"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OccurrencePhoto" ADD CONSTRAINT "OccurrencePhoto_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "TaskOccurrence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
