
import { NextRequest, NextResponse } from "next/server";
import { MockTestMode, MockTestStatus, QuestionStatus } from "@prisma/client";
import { getCurrentStaff } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const staff = await getCurrentStaff();

    if (!staff) {
      return NextResponse.json(
        { error: "Please log in to continue." },
        { status: 401 }
      );
    }

    if (staff.isDeleted) {
      return NextResponse.json(
        { error: "Your staff account is inactive." },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      title,
      description,
      subjectId,
      mode,
      durationMinutes,
      questionCount,
      negativeMarks,
      passingMarks,
      shuffleQuestions,
      shuffleOptions,
      questionIds,
    } = body;

    if (
      !title?.trim() ||
      !subjectId ||
      !Object.values(MockTestMode).includes(mode)
    ) {
      return NextResponse.json(
        { error: "Please provide a title, subject and valid test mode." },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(durationMinutes) ||
      durationMinutes < 1
    ) {
      return NextResponse.json(
        { error: "Duration must be at least one minute." },
        { status: 400 }
      );
    }

    if (
      typeof negativeMarks !== "number" ||
      !Number.isFinite(negativeMarks) ||
      negativeMarks < 0
    ) {
      return NextResponse.json(
        { error: "Negative marks must be zero or greater." },
        { status: 400 }
      );
    }

    const subject = await prisma.subject.findUnique({
      where: { id: subjectId },
      select: { id: true },
    });

    if (!subject) {
      return NextResponse.json(
        { error: "Selected subject was not found." },
        { status: 404 }
      );
    }

    const isAdmin = staff.role === "ADMIN";

    if (!isAdmin) {
      const assignment = staff.assignments.find(
        (item) => item.subjectId === subjectId
      );

      if (!assignment) {
        return NextResponse.json(
          { error: "You are not assigned to this subject." },
          { status: 403 }
        );
      }
    }

    let totalMarks = 0;
    let finalQuestionCount = 0;
    let fixedQuestionIds: string[] = [];

    if (mode === MockTestMode.FIXED) {
      if (
        !Array.isArray(questionIds) ||
        questionIds.length === 0 ||
        questionIds.some((id: unknown) => typeof id !== "string") ||
        new Set(questionIds).size !== questionIds.length
      ) {
        return NextResponse.json(
          { error: "Select at least one valid question without duplicates." },
          { status: 400 }
        );
      }

      const questions = await prisma.questionBankQuestion.findMany({
        where: {
          id: { in: questionIds },
          subjectId,
          status: QuestionStatus.AVAILABLE,
        },
        select: {
          id: true,
          marks: true,
        },
      });

      if (questions.length !== questionIds.length) {
        return NextResponse.json(
          {
            error:
              "Some selected questions are unavailable or do not belong to this subject.",
          },
          { status: 400 }
        );
      }

      const questionMap = new Map(
        questions.map((question) => [question.id, question])
      );

      // Preserve the teacher's selected order.
      fixedQuestionIds = questionIds;

      totalMarks = fixedQuestionIds.reduce(
        (sum, id) => sum + (questionMap.get(id)?.marks ?? 0),
        0
      );

      finalQuestionCount = fixedQuestionIds.length;
    } else {
      if (
        !Number.isInteger(questionCount) ||
        questionCount < 1
      ) {
        return NextResponse.json(
          { error: "Enter a valid number of random questions." },
          { status: 400 }
        );
      }

      const availableQuestions =
        await prisma.questionBankQuestion.findMany({
          where: {
            subjectId,
            status: QuestionStatus.AVAILABLE,
          },
          select: {
            marks: true,
          },
        });

      if (availableQuestions.length < questionCount) {
        return NextResponse.json(
          {
            error: `Only ${availableQuestions.length} available questions exist. You requested ${questionCount}.`,
          },
          { status: 400 }
        );
      }

      const marksValues = [
        ...new Set(availableQuestions.map((question) => question.marks)),
      ];

      if (marksValues.length !== 1) {
        return NextResponse.json(
          {
            error:
              "Random tests currently require all available questions in this subject to have the same marks. Please standardize their marks first.",
          },
          { status: 400 }
        );
      }

      totalMarks = questionCount * marksValues[0];
      finalQuestionCount = questionCount;
    }

    if (
      passingMarks !== null &&
      passingMarks !== undefined &&
      (!Number.isInteger(passingMarks) ||
        passingMarks < 0 ||
        passingMarks > totalMarks)
    ) {
      return NextResponse.json(
        {
          error: `Passing marks must be between 0 and ${totalMarks}.`,
        },
        { status: 400 }
      );
    }

    const test = await prisma.mockTest.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        subjectId,
        createdById: staff.id,
        mode,
        durationMinutes,
        questionCount: finalQuestionCount,
        totalMarks,
        passingMarks: passingMarks ?? null,
        negativeMarks,
        shuffleQuestions: shuffleQuestions ?? true,
        shuffleOptions: shuffleOptions ?? true,
        status: MockTestStatus.DRAFT,

        ...(mode === MockTestMode.FIXED
          ? {
              fixedQuestions: {
                create: fixedQuestionIds.map((questionId, index) => ({
                  questionId,
                  order: index,
                })),
              },
            }
          : {}),
      },
      select: {
        id: true,
        title: true,
        mode: true,
        status: true,
        questionCount: true,
        totalMarks: true,
      },
    });

    return NextResponse.json(
      {
        message: "Mock test created successfully as a draft.",
        test,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Mock test creation error:", error);

    return NextResponse.json(
      { error: "Unable to create the mock test." },
      { status: 500 }
    );
  }
}
// GET: List mock tests available for this staff member
export async function GET(request: Request) {
  try {
    const staff = await getCurrentStaff();

    if (!staff || staff.isDeleted) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusParam = searchParams.get("status") || "ALL";

    const validStatuses = ["ALL", "DRAFT", "PUBLISHED", "ARCHIVED"];

    if (!validStatuses.includes(statusParam)) {
      return NextResponse.json(
        { error: "Invalid test status." },
        { status: 400 }
      );
    }

    const tests = await prisma.mockTest.findMany({
      where: {
        ...(staff.role === "ADMIN"
          ? {}
          : { createdById: staff.id }),

        ...(statusParam === "ALL"
          ? {}
          : { status: statusParam as MockTestStatus }),

        ...(search
          ? {
              OR: [
                {
                  title: {
                    contains: search,
                    mode: "insensitive",
                  },
                },
                {
                  subject: {
                    name: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
                {
                  subject: {
                    code: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        subject: {
          include: {
            semester: true,
          },
        },
        _count: {
          select: {
            attempts: true,
            fixedQuestions: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ tests });
  } catch (error) {
    console.error("GET mock tests error:", error);

    return NextResponse.json(
      { error: "Unable to load mock tests." },
      { status: 500 }
    );
  }
}

// PATCH: Publish, return to draft, or archive a mock test
export async function PATCH(request: Request) {
  try {
    const staff = await getCurrentStaff();

    if (!staff || staff.isDeleted) {
      return NextResponse.json(
        { error: "Unauthorized." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const testId = body.testId;
    const action = body.action;

    if (!testId || typeof testId !== "string") {
      return NextResponse.json(
        { error: "Test ID is required." },
        { status: 400 }
      );
    }

    const actionStatus: Record<string, MockTestStatus> = {
      publish: MockTestStatus.PUBLISHED,
      draft: MockTestStatus.DRAFT,
      archive: MockTestStatus.ARCHIVED,
    };

    const newStatus = actionStatus[action];

    if (!newStatus) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    const test = await prisma.mockTest.findFirst({
      where: {
        id: testId,
        ...(staff.role === "ADMIN"
          ? {}
          : { createdById: staff.id }),
      },
      include: {
        fixedQuestions: true,
      },
    });

    if (!test) {
      return NextResponse.json(
        { error: "Mock test not found or access denied." },
        { status: 404 }
      );
    }

    if (action === "publish") {
      if (test.mode === "FIXED" && test.fixedQuestions.length === 0) {
        return NextResponse.json(
          { error: "Add questions before publishing this test." },
          { status: 400 }
        );
      }

      if (test.mode === "RANDOM") {
        const availableCount = await prisma.questionBankQuestion.count({
          where: {
            subjectId: test.subjectId,
            status: "AVAILABLE",
          },
        });

        if (availableCount < test.questionCount) {
          return NextResponse.json(
            {
              error: `This test requires ${test.questionCount} questions, but only ${availableCount} are available.`,
            },
            { status: 400 }
          );
        }
      }
    }

    const updatedTest = await prisma.mockTest.update({
      where: { id: test.id },
      data: {
        status: newStatus,
        publishedAt:
          action === "publish"
            ? test.publishedAt ?? new Date()
            : action === "draft"
              ? null
              : test.publishedAt,
      },
    });

    return NextResponse.json({
      message: `Mock test ${action === "publish" ? "published" : action === "draft" ? "returned to draft" : "archived"} successfully.`,
      test: updatedTest,
    });
  } catch (error) {
    console.error("PATCH mock test error:", error);

    return NextResponse.json(
      { error: "Unable to update mock test." },
      { status: 500 }
    );
  }
}
