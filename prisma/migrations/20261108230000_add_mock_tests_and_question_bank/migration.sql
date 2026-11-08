-- CreateEnum
CREATE TYPE "MockTestStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MockAttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuestionSource" AS ENUM ('MANUAL', 'AI', 'UPLOAD');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('AVAILABLE', 'PENDING_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MockTestMode" AS ENUM ('RANDOM', 'FIXED');

-- CreateEnum
CREATE TYPE "QuestionUploadStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- DropIndex
DROP INDEX "StaffSubject_staffId_subjectId_academicYear_key";

-- CreateTable
CREATE TABLE "QuestionUploadBatch" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "status" "QuestionUploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "errorReport" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionUploadBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBankQuestion" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "uploadBatchId" TEXT,
    "questionText" TEXT NOT NULL,
    "explanation" TEXT,
    "marks" INTEGER NOT NULL DEFAULT 1,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "source" "QuestionSource" NOT NULL DEFAULT 'MANUAL',
    "status" "QuestionStatus" NOT NULL DEFAULT 'AVAILABLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuestionBankQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionBankOption" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "QuestionBankOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTest" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "subjectId" TEXT NOT NULL,
    "createdById" TEXT,
    "mode" "MockTestMode" NOT NULL DEFAULT 'RANDOM',
    "durationMinutes" INTEGER NOT NULL,
    "questionCount" INTEGER NOT NULL,
    "totalMarks" INTEGER NOT NULL,
    "passingMarks" INTEGER,
    "negativeMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "shuffleQuestions" BOOLEAN NOT NULL DEFAULT true,
    "shuffleOptions" BOOLEAN NOT NULL DEFAULT true,
    "status" "MockTestStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MockTest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockTestQuestion" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MockTestQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockAttempt" (
    "id" TEXT NOT NULL,
    "testId" TEXT NOT NULL,
    "participantName" TEXT,
    "participantEmail" TEXT,
    "status" "MockAttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "totalMarks" INTEGER NOT NULL,
    "obtainedMarks" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "MockAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptQuestion" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "bankQuestionId" TEXT,
    "questionText" TEXT NOT NULL,
    "explanation" TEXT,
    "marks" INTEGER NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttemptQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttemptOption" (
    "id" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "optionText" TEXT NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AttemptOption_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MockAnswer" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "attemptQuestionId" TEXT NOT NULL,
    "selectedOptionId" TEXT,
    "isCorrect" BOOLEAN,
    "marksAwarded" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "evaluatedAt" TIMESTAMP(3),

    CONSTRAINT "MockAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuestionUploadBatch_subjectId_createdAt_idx" ON "QuestionUploadBatch"("subjectId", "createdAt");

-- CreateIndex
CREATE INDEX "QuestionUploadBatch_uploadedById_idx" ON "QuestionUploadBatch"("uploadedById");

-- CreateIndex
CREATE INDEX "QuestionBankQuestion_subjectId_status_idx" ON "QuestionBankQuestion"("subjectId", "status");

-- CreateIndex
CREATE INDEX "QuestionBankQuestion_createdById_idx" ON "QuestionBankQuestion"("createdById");

-- CreateIndex
CREATE INDEX "QuestionBankQuestion_uploadBatchId_idx" ON "QuestionBankQuestion"("uploadBatchId");

-- CreateIndex
CREATE INDEX "QuestionBankQuestion_source_status_idx" ON "QuestionBankQuestion"("source", "status");

-- CreateIndex
CREATE INDEX "QuestionBankOption_questionId_order_idx" ON "QuestionBankOption"("questionId", "order");

-- CreateIndex
CREATE INDEX "MockTest_subjectId_status_idx" ON "MockTest"("subjectId", "status");

-- CreateIndex
CREATE INDEX "MockTest_createdById_idx" ON "MockTest"("createdById");

-- CreateIndex
CREATE INDEX "MockTest_mode_status_idx" ON "MockTest"("mode", "status");

-- CreateIndex
CREATE INDEX "MockTestQuestion_testId_order_idx" ON "MockTestQuestion"("testId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MockTestQuestion_testId_questionId_key" ON "MockTestQuestion"("testId", "questionId");

-- CreateIndex
CREATE INDEX "MockAttempt_testId_status_idx" ON "MockAttempt"("testId", "status");

-- CreateIndex
CREATE INDEX "MockAttempt_participantEmail_idx" ON "MockAttempt"("participantEmail");

-- CreateIndex
CREATE INDEX "MockAttempt_startedAt_idx" ON "MockAttempt"("startedAt");

-- CreateIndex
CREATE INDEX "AttemptQuestion_bankQuestionId_idx" ON "AttemptQuestion"("bankQuestionId");

-- CreateIndex
CREATE UNIQUE INDEX "AttemptQuestion_attemptId_order_key" ON "AttemptQuestion"("attemptId", "order");

-- CreateIndex
CREATE INDEX "AttemptOption_attemptQuestionId_order_idx" ON "AttemptOption"("attemptQuestionId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "MockAnswer_attemptQuestionId_key" ON "MockAnswer"("attemptQuestionId");

-- CreateIndex
CREATE INDEX "MockAnswer_selectedOptionId_idx" ON "MockAnswer"("selectedOptionId");

-- CreateIndex
CREATE UNIQUE INDEX "MockAnswer_attemptId_attemptQuestionId_key" ON "MockAnswer"("attemptId", "attemptQuestionId");

-- CreateIndex
CREATE INDEX "StaffSubject_staffId_subjectId_academicYear_idx" ON "StaffSubject"("staffId", "subjectId", "academicYear");

-- AddForeignKey
ALTER TABLE "QuestionUploadBatch" ADD CONSTRAINT "QuestionUploadBatch_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionUploadBatch" ADD CONSTRAINT "QuestionUploadBatch_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankQuestion" ADD CONSTRAINT "QuestionBankQuestion_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankQuestion" ADD CONSTRAINT "QuestionBankQuestion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankQuestion" ADD CONSTRAINT "QuestionBankQuestion_uploadBatchId_fkey" FOREIGN KEY ("uploadBatchId") REFERENCES "QuestionUploadBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionBankOption" ADD CONSTRAINT "QuestionBankOption_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuestionBankQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTest" ADD CONSTRAINT "MockTest_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTest" ADD CONSTRAINT "MockTest_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestion" ADD CONSTRAINT "MockTestQuestion_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockTest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockTestQuestion" ADD CONSTRAINT "MockTestQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "QuestionBankQuestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAttempt" ADD CONSTRAINT "MockAttempt_testId_fkey" FOREIGN KEY ("testId") REFERENCES "MockTest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "MockAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptQuestion" ADD CONSTRAINT "AttemptQuestion_bankQuestionId_fkey" FOREIGN KEY ("bankQuestionId") REFERENCES "QuestionBankQuestion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttemptOption" ADD CONSTRAINT "AttemptOption_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "MockAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_attemptQuestionId_fkey" FOREIGN KEY ("attemptQuestionId") REFERENCES "AttemptQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MockAnswer" ADD CONSTRAINT "MockAnswer_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "AttemptOption"("id") ON DELETE SET NULL ON UPDATE CASCADE;
