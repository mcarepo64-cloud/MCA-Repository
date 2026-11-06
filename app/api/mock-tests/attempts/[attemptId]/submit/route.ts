
import { NextResponse } from "next/server";
import { MockAttemptStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(
  _request: Request,
  context: RouteContext
) {
  try {
    const { attemptId } = await context.params;
    const now = new Date();

    const result = await prisma.$transaction(async (tx) => {
      // Claim the attempt so it cannot be submitted twice.
      const claim = await tx.mockAttempt.updateMany({
        where: {
          id: attemptId,
          status: MockAttemptStatus.IN_PROGRESS,
        },
        data: {
          status: MockAttemptStatus.SUBMITTED,
          submittedAt: now,
        },
      });

      if (claim.count === 0) {
        const existing = await tx.mockAttempt.findUnique({
          where: { id: attemptId },
          select: { status: true },
        });

        if (!existing) {
          throw new Error("ATTEMPT_NOT_FOUND");
        }

        throw new Error("ATTEMPT_ALREADY_SUBMITTED");
      }

      const attempt = await tx.mockAttempt.findUnique({
        where: { id: attemptId },
        include: {
          test: {
            select: {
              negativeMarks: true,
            },
          },
          questions: {
            orderBy: { order: "asc" },
            include: {
              options: true,
              answer: true,
            },
          },
        },
      });

      if (!attempt) {
        throw new Error("ATTEMPT_NOT_FOUND");
      }

      const expired =
        attempt.expiresAt !== null && now >= attempt.expiresAt;

      if (expired) {
        await tx.mockAttempt.update({
          where: { id: attemptId },
          data: { status: MockAttemptStatus.EXPIRED },
        });
      }

      let correctCount = 0;
      let incorrectCount = 0;
      let unansweredCount = 0;
      let calculatedMarks = 0;

      for (const question of attempt.questions) {
        const answer = question.answer;

        if (!answer || !answer.selectedOptionId) {
          unansweredCount++;
          continue;
        }

        const selectedOption = question.options.find(
          (option) => option.id === answer.selectedOptionId
        );

        const isCorrect = selectedOption?.isCorrect === true;

        const marksAwarded = isCorrect
          ? question.marks
          : -attempt.test.negativeMarks;

        if (isCorrect) {
          correctCount++;
        } else {
          incorrectCount++;
        }

        calculatedMarks += marksAwarded;

        await tx.mockAnswer.update({
          where: { id: answer.id },
          data: {
            isCorrect,
            marksAwarded,
            evaluatedAt: now,
          },
        });
      }

      // Final score cannot fall below zero.
      const obtainedMarks = Math.max(0, calculatedMarks);

      const updatedAttempt = await tx.mockAttempt.update({
        where: { id: attemptId },
        data: {
          obtainedMarks,
        },
        select: {
          id: true,
          status: true,
          totalMarks: true,
          obtainedMarks: true,
          submittedAt: true,
        },
      });

      return {
        attempt: updatedAttempt,
        summary: {
          totalQuestions: attempt.questions.length,
          correctCount,
          incorrectCount,
          unansweredCount,
          obtainedMarks,
          totalMarks: attempt.totalMarks,
        },
      };
    });

    return NextResponse.json({
      message: "Test submitted successfully.",
      ...result,
    });
  } catch (error) {
    console.error("Submit mock test error:", error);

    if (error instanceof Error) {
      if (error.message === "ATTEMPT_NOT_FOUND") {
        return NextResponse.json(
          { error: "Attempt not found." },
          { status: 404 }
        );
      }

      if (error.message === "ATTEMPT_ALREADY_SUBMITTED") {
        return NextResponse.json(
          { error: "This attempt has already been submitted." },
          { status: 409 }
        );
      }
    }

    return NextResponse.json(
      { error: "Unable to submit the test." },
      { status: 500 }
    );
  }
}
