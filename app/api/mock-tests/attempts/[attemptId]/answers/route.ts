
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ attemptId: string }>;
};

export async function POST(
  request: Request,
  context: RouteContext
) {
  try {
    const { attemptId } = await context.params;
    const body = await request.json();

    const { attemptQuestionId, selectedOptionId } = body;

    if (
      typeof attemptQuestionId !== "string" ||
      typeof selectedOptionId !== "string"
    ) {
      return NextResponse.json(
        { error: "Invalid answer details." },
        { status: 400 }
      );
    }

    const attempt = await prisma.mockAttempt.findUnique({
      where: { id: attemptId },
      select: {
        id: true,
        status: true,
        expiresAt: true,
      },
    });

    if (!attempt || attempt.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "This attempt is not active." },
        { status: 409 }
      );
    }

    if (attempt.expiresAt && new Date() >= attempt.expiresAt) {
      return NextResponse.json(
        { error: "The test time has expired." },
        { status: 409 }
      );
    }

    const question = await prisma.attemptQuestion.findFirst({
      where: {
        id: attemptQuestionId,
        attemptId,
      },
      select: {
        id: true,
      },
    });

    if (!question) {
      return NextResponse.json(
        { error: "Question does not belong to this attempt." },
        { status: 400 }
      );
    }

    const option = await prisma.attemptOption.findFirst({
      where: {
        id: selectedOptionId,
        attemptQuestionId,
      },
      select: {
        id: true,
      },
    });

    if (!option) {
      return NextResponse.json(
        { error: "Invalid option selected." },
        { status: 400 }
      );
    }

    const answer = await prisma.mockAnswer.upsert({
      where: {
        attemptQuestionId,
      },
      create: {
        attemptId,
        attemptQuestionId,
        selectedOptionId,
      },
      update: {
        selectedOptionId,
        isCorrect: null,
        marksAwarded: 0,
        evaluatedAt: null,
      },
      select: {
        id: true,
        selectedOptionId: true,
      },
    });

    return NextResponse.json({
      message: "Answer saved.",
      answer,
    });
  } catch (error) {
    console.error("Save mock answer error:", error);

    return NextResponse.json(
      { error: "Unable to save answer." },
      { status: 500 }
    );
  }
}
