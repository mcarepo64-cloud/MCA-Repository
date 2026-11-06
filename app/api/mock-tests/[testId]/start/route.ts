import { NextResponse } from "next/server";
import {
  MockTestStatus,
  QuestionStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ testId: string }>;
};

function shuffle<T>(items: T[]): T[] {
  const result = [...items];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { testId } = await context.params;
    const body = await request.json();

    const participantName =
      typeof body.participantName === "string"
        ? body.participantName.trim()
        : "";

    const participantEmail =
      typeof body.participantEmail === "string"
        ? body.participantEmail.trim().toLowerCase()
        : "";

    if (!participantName || participantName.length > 100) {
      return NextResponse.json(
        { error: "Enter a valid name (maximum 100 characters)." },
        { status: 400 }
      );
    }

    if (
      participantEmail &&
      (participantEmail.length > 254 ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(participantEmail))
    ) {
      return NextResponse.json(
        { error: "Enter a valid email address." },
        { status: 400 }
      );
    }

    const test = await prisma.mockTest.findFirst({
      where: {
        id: testId,
        status: MockTestStatus.PUBLISHED,
      },
      include: {
        fixedQuestions: {
          orderBy: { order: "asc" },
          include: {
            question: {
              include: {
                options: {
                  orderBy: { order: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "This mock test is unavailable." },
        { status: 404 }
      );
    }

    let selectedQuestions;

    if (test.mode === "FIXED") {
      selectedQuestions = test.fixedQuestions.map((item) => item.question);
    } else {
      const availableQuestions =
        await prisma.questionBankQuestion.findMany({
          where: {
            subjectId: test.subjectId,
            status: QuestionStatus.AVAILABLE,
          },
          include: {
            options: {
              orderBy: { order: "asc" },
            },
          },
        });

      if (availableQuestions.length < test.questionCount) {
        return NextResponse.json(
          { error: "There are not enough available questions for this test." },
          { status: 400 }
        );
      }

      selectedQuestions = shuffle(availableQuestions).slice(
        0,
        test.questionCount
      );
    }

    if (selectedQuestions.length !== test.questionCount) {
      return NextResponse.json(
        { error: "The test question configuration is incomplete." },
        { status: 400 }
      );
    }

    for (const question of selectedQuestions) {
      if (
        question.options.length !== 4 ||
        question.options.filter((option) => option.isCorrect).length !== 1
      ) {
        return NextResponse.json(
          { error: "A question in this test has invalid options." },
          { status: 400 }
        );
      }
    }

    const orderedQuestions = test.shuffleQuestions
      ? shuffle(selectedQuestions)
      : selectedQuestions;

    const questionSnapshots = orderedQuestions.map((question, index) => {
      const options = test.shuffleOptions
        ? shuffle(question.options)
        : question.options;

      return {
        bankQuestionId: question.id,
        questionText: question.questionText,
        explanation: question.explanation,
        marks: question.marks,
        order: index + 1,
        options: {
          create: options.map((option, optionIndex) => ({
            optionText: option.optionText,
            isCorrect: option.isCorrect,
            order: optionIndex + 1,
          })),
        },
      };
    });

    const actualTotalMarks = orderedQuestions.reduce(
      (total, question) => total + question.marks,
      0
    );

    const startedAt = new Date();
    const expiresAt = new Date(
      startedAt.getTime() + test.durationMinutes * 60 * 1000
    );

    const attempt = await prisma.mockAttempt.create({
      data: {
        testId: test.id,
        participantName,
        participantEmail: participantEmail || null,
        status: "IN_PROGRESS",
        startedAt,
        expiresAt,
        totalMarks: actualTotalMarks,
        questions: {
          create: questionSnapshots,
        },
      },
      select: {
        id: true,
        startedAt: true,
        expiresAt: true,
        totalMarks: true,
      },
    });

    return NextResponse.json(
      {
        message: "Test started successfully.",
        attempt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Start mock test error:", error);

    return NextResponse.json(
      { error: "Unable to start the mock test." },
      { status: 500 }
    );
  }
}